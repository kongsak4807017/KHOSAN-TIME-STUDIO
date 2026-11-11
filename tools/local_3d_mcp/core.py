"""Bounded local build jobs, artifact integrity, cache and honest review state."""
from __future__ import annotations

import atexit
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid

from schema import RECIPES, SceneError, canonical, digest, fail, parse_source

PACKAGE_ROOT = Path(__file__).resolve().parent
ARTIFACTS = ("scene.blend", "scene.glb", "measured.json", "preview_front.png", "preview_side.png", "preview_back.png", "preview_hero.png", "request.json", "source.txt")
JOB_ID = re.compile(r"^job-[a-f0-9]{16}$")
TERMINAL = {"REVIEW_REQUIRED", "FAILED", "CANCELLED", "REWORK", "VISUAL_REVIEW_RECORDED"}


def file_sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()


def atomic_json(path, data):
    path = Path(path)
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def read_json(path):
    if Path(path).stat().st_size > 4*1024*1024:
        raise ValueError("JSON evidence exceeds the 4 MiB limit.")
    return json.loads(Path(path).read_text(encoding="utf-8"), parse_constant=lambda v: (_ for _ in ()).throw(ValueError(f"Invalid constant {v}")))


def within(path, root):
    resolved = Path(path).resolve()
    if not resolved.is_relative_to(Path(root).resolve()):
        fail("path", "Path leaves the configured project root.", "PATH_ESCAPE")
    return resolved


def implementation_digest():
    paths = list(PACKAGE_ROOT.glob("*.py"))
    for directory, children, names in os.walk(PACKAGE_ROOT / "adapter"):
        children[:] = [name for name in children if name not in ("node_modules", "test", "qa", "dist")]
        paths.extend(Path(directory) / name for name in names if name.endswith((".mjs", ".cjs", ".ts", ".tsx")))
    return digest({str(p.relative_to(PACKAGE_ROOT)).replace("\\", "/"): file_sha(p) for p in sorted(paths)})


def discover_blender(explicit=None):
    candidates = [explicit, os.environ.get("KHOSAN_BLENDER_PATH"), shutil.which("blender")]
    if os.name == "nt":
        candidates.append(r"C:\KHOSAN\Blender 5.2\blender.exe")
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            path = Path(candidate).resolve()
            try:
                result = subprocess.run([str(path), "--version"], capture_output=True, text=True, timeout=15, check=True)
                version = result.stdout.splitlines()[0]
                if not version.startswith("Blender "):
                    continue
                return path, version
            except (OSError, subprocess.SubprocessError, IndexError):
                continue
    raise RuntimeError("Blender executable not found. Configure --blender or KHOSAN_BLENDER_PATH.")


class BuildLock:
    """OS-owned advisory lock; released even if the Python process crashes."""
    def __init__(self, path):
        self.handle = Path(path).open("a+b")
        try:
            self.handle.seek(0, os.SEEK_END)
            if self.handle.tell() == 0:
                self.handle.write(b"0")
                self.handle.flush()
            self.handle.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BaseException:
            self.handle.close()
            raise

    def close(self):
        self.handle.close()


class Jobs:
    def __init__(self, project_root, blender=None):
        self.project_root = Path(project_root).resolve(strict=True)
        self.store = within(self.project_root / ".khosan" / "local3d", self.project_root)
        self.jobs_root = within(self.store / "jobs", self.project_root)
        self.cache_root = within(self.store / "cache", self.project_root)
        self.jobs_root.mkdir(parents=True, exist_ok=True)
        self.cache_root.mkdir(parents=True, exist_ok=True)
        self.blender, self.blender_version = discover_blender(blender)
        self.guard = threading.RLock()
        self.running = {}
        atexit.register(self.close)

    def doctor(self):
        return {"server": "khosan-local3d", "version": "0.2.0", "project_root": str(self.project_root), "blender": str(self.blender), "blender_version": self.blender_version, "python": sys.version.split()[0], "implementation_sha256": implementation_digest(), "recipes": list(RECIPES), "lighting_presets": ["storybook", "elephant_studio"], "transports": ["stdio"], "network_required_for_build": False, "max_concurrent_builds": 1, "capabilities": {"scene_generation": True, "glb_export": True, "blend_export": True, "multi_view_render": True, "arbitrary_image_to_3d": False, "animation": False, "rigging": False, "physics": False, "autonomous_vision_model": False}}

    def path(self, job_id):
        if not isinstance(job_id, str) or not JOB_ID.fullmatch(job_id):
            fail("job_id", "Invalid job identifier.")
        within(self.jobs_root, self.project_root)
        path = within(self.jobs_root / job_id, self.jobs_root)
        if not path.is_dir():
            fail("job_id", "Unknown job.", "NOT_FOUND")
        return path

    def reference_hashes(self, spec):
        result = {}
        for name in spec["provenance"]["reference_paths"]:
            if Path(name).is_absolute() or re.match(r"^[A-Za-z]:", name) or "://" in name:
                fail("reference_paths", "References must be relative local files.", "PATH_ESCAPE")
            p = within(self.project_root / name, self.project_root)
            if not p.is_file() or p.stat().st_size > 20*1024*1024:
                fail("reference_paths", "Reference missing or exceeds 20 MiB.", "MISSING_REFERENCE")
            result[name] = file_sha(p)
        return result

    def start(self, source, source_format="weave", timeout_seconds=180, *, lineage=None):
        started = time.monotonic()
        for directory in (self.store, self.jobs_root, self.cache_root):
            within(directory, self.project_root)
        if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int) or not 15 <= timeout_seconds <= 600:
            fail("timeout_seconds", "Use an integer from 15 to 600.")
        spec = parse_source(source, source_format)
        refs = self.reference_hashes(spec)
        impl = implementation_digest()
        source_sha = hashlib.sha256(source.encode("utf-8")).hexdigest()
        key = digest({"spec": spec, "source_sha256": source_sha, "implementation": impl, "blender": self.blender_version, "references": refs, "lineage": lineage or {}})
        cache_path = within(self.cache_root / (key + ".json"), self.store)
        if cache_path.is_file():
            try:
                cached = self.status(read_json(cache_path)["job_id"])
                identity_matches = cached.get("cache_key") == key and cached.get("spec_sha256") == digest(spec) and cached.get("source_sha256") == source_sha and cached.get("implementation_sha256") == impl and cached.get("blender_version") == self.blender_version and cached.get("reference_sha256") == refs
                if identity_matches and cached["status"] in ("REVIEW_REQUIRED", "VISUAL_REVIEW_RECORDED", "REWORK") and cached.get("integrity") == "PASS":
                    return {**cached, "cache_hit": True, "request_seconds": round(time.monotonic()-started, 6)}
            except (OSError, ValueError, KeyError):
                pass
        with self.guard:
            try:
                lock = BuildLock(within(self.store / "worker.lock", self.store))
            except OSError:
                return {"status": "BUSY", "message": "One Blender build is already active for this project. Poll or cancel it before submitting another.", "active_jobs": list(self.running)}
            job_id = "job-" + uuid.uuid4().hex[:16]
            folder = within(self.jobs_root / job_id, self.jobs_root)
            folder.mkdir()
            manifest = {"schema": "khosan.local3d.job/1.0", "job_id": job_id, "scene_id": spec["scene_id"], "status": "QUEUED", "spec_sha256": digest(spec), "source_sha256": source_sha, "implementation_sha256": impl, "blender_version": self.blender_version, "reference_sha256": refs, "cache_key": key, "source_format": source_format, "timeout_seconds": timeout_seconds, "technical_build": "NOT_RUN", "export_reimport": "NOT_RUN", "visual_review": "NOT_REVIEWED", "human_acceptance": "NOT_REVIEWED", "production_ready": False, "v4_render_integration": "NOT_TESTED", "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "builder": "khosan-local3d-worker", "capabilities": {"animation": False, "rigging": False, "physics": False}}
            manifest["lineage"] = lineage or {"revision": 0, "parent_job_id": None}
            try:
                atomic_json(folder / "request.json", spec)
                (folder / "source.txt").write_text(source, encoding="utf-8", newline="\n")
                atomic_json(folder / "manifest.json", manifest)
                event = threading.Event()
                thread = threading.Thread(target=self._run, args=(folder, spec, manifest, lock, event), name=job_id, daemon=True)
                self.running[job_id] = {"thread": thread, "cancel": event, "process": None}
                thread.start()
            except BaseException:
                lock.close()
                self.running.pop(job_id, None)
                raise
        return {"job_id": job_id, "status": "QUEUED", "spec_sha256": manifest["spec_sha256"], "cache_hit": False, "request_seconds": round(time.monotonic()-started, 6)}

    def _run(self, folder, spec, manifest, lock, cancelled):
        began = time.monotonic()
        process = None
        try:
            manifest["status"] = "BUILDING"
            atomic_json(folder / "manifest.json", manifest)
            cmd = [str(self.blender), "--background", "--factory-startup", "--disable-autoexec", "--python-exit-code", "1", "--python", str(PACKAGE_ROOT / "worker.py"), "--", "--spec", str(folder / "request.json"), "--output", str(folder)]
            with (folder / "worker.log").open("wb") as log:
                process = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, cwd=str(PACKAGE_ROOT), shell=False)
                with self.guard:
                    self.running[manifest["job_id"]]["process"] = process
                while process.poll() is None:
                    if cancelled.wait(.15):
                        self._stop(process)
                        raise InterruptedError("Build cancelled; partial evidence preserved.")
                    if time.monotonic() - began > manifest["timeout_seconds"]:
                        self._stop(process)
                        raise TimeoutError("Blender exceeded the job timeout; partial evidence preserved.")
                if cancelled.is_set():
                    raise InterruptedError("Build cancelled.")
                if process.returncode != 0:
                    raise RuntimeError(f"Blender exited with code {process.returncode}. Inspect worker.log.")
            measured = read_json(folder / "measured.json")
            self._check_measurements(measured, spec)
            if implementation_digest() != manifest["implementation_sha256"] or self.reference_hashes(spec) != manifest["reference_sha256"]:
                raise RuntimeError("Source implementation or references changed during build. Rebuild required.")
            if file_sha(folder / "source.txt") != manifest["source_sha256"] or digest(read_json(folder / "request.json")) != manifest["spec_sha256"]:
                raise RuntimeError("Source or normalized request changed during build.")
            artifacts = {}
            for name in ARTIFACTS:
                path = within(folder / name, folder)
                if not path.is_file() or path.stat().st_size == 0:
                    raise RuntimeError(f"Missing artifact: {name}")
                if name.endswith(".png"):
                    with path.open("rb") as stream:
                        header = stream.read(24)
                    if header[:8] != b"\x89PNG\r\n\x1a\n" or int.from_bytes(header[16:20], "big") != spec["render"]["width"] or int.from_bytes(header[20:24], "big") != spec["render"]["height"]:
                        raise RuntimeError(f"Invalid PNG size/header: {name}")
                if name.endswith(".glb"):
                    with path.open("rb") as stream:
                        header = stream.read(12)
                    if header[:4] != b"glTF" or int.from_bytes(header[4:8], "little") != 2 or int.from_bytes(header[8:12], "little") != path.stat().st_size:
                        raise RuntimeError("Invalid GLB header or declared file length.")
                artifacts[name] = {"sha256": file_sha(path), "bytes": path.stat().st_size, "relative_path": name}
            artifact_digest = digest({"spec_sha256": manifest["spec_sha256"], "implementation_sha256": manifest["implementation_sha256"], "artifacts": artifacts})
            manifest.update(status="REVIEW_REQUIRED", technical_build="PASS", export_reimport="PASS", artifacts=artifacts, artifact_digest=artifact_digest, measurements=measured, build_seconds=round(time.monotonic()-began, 4))
            atomic_json(folder / "manifest.json", manifest)
            atomic_json(self.cache_root / (manifest["cache_key"] + ".json"), {"job_id": manifest["job_id"]})
        except BaseException as exc:
            if process and process.poll() is None:
                self._stop(process)
            manifest.update(status="CANCELLED" if isinstance(exc, InterruptedError) else "FAILED", technical_build="FAIL", error={"code": type(exc).__name__, "message": str(exc)}, build_seconds=round(time.monotonic()-began, 4))
            atomic_json(folder / "manifest.json", manifest)
        finally:
            lock.close()
            with self.guard:
                self.running.pop(manifest["job_id"], None)

    @staticmethod
    def _stop(process):
        if process.poll() is not None:
            return
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)

    @staticmethod
    def _check_measurements(measured, spec):
        if measured.get("schema") != "khosan.measurements/1.0" or measured.get("scene_id") != spec["scene_id"]:
            raise RuntimeError("Wrong measurement schema or scene.")
        for key, maximum in (("triangle_count", spec["budget"]["max_triangles"]), ("mesh_object_count", spec["budget"]["max_objects"])):
            value = measured.get(key)
            if type(value) is not int or not 1 <= value <= maximum:
                raise RuntimeError(f"Measured {key} fails its budget.")
        rt = measured.get("roundtrip", {})
        if rt.get("passed") is not True:
            raise RuntimeError("GLB export/reimport did not pass.")
        bounds = measured.get("world_bounds", {})
        for key in ("min", "max"):
            values = bounds.get(key)
            if not isinstance(values, list) or len(values) != 3 or any(type(v) not in (float, int) or not math.isfinite(v) for v in values):
                raise RuntimeError("Invalid measured scene bounds.")
        if any(a >= b for a, b in zip(bounds["min"], bounds["max"])):
            raise RuntimeError("Empty or inverted scene bounds.")
        expected = {o["id"] for o in spec["objects"]}
        actual = {o.get("id") for o in measured.get("objects", [])}
        if actual != expected:
            raise RuntimeError("Semantic objects missing or unexpected in output measurements.")

    def status(self, job_id):
        folder = self.path(job_id)
        manifest = read_json(within(folder / "manifest.json", folder))
        if manifest.get("schema") != "khosan.local3d.job/1.0" or manifest.get("job_id") != job_id:
            fail("manifest", "Job manifest identity does not match its directory.", "CORRUPT_MANIFEST")
        result = {**manifest, "artifact_directory": str(folder), "production_ready": False, "human_acceptance": "NOT_REVIEWED"}
        if manifest.get("technical_build") == "PASS":
            problems = []
            if manifest.get("implementation_sha256") != implementation_digest():
                problems.append("IMPLEMENTATION_CHANGED")
            artifacts = manifest.get("artifacts", {})
            if set(artifacts) != set(ARTIFACTS):
                problems.append("INCOMPLETE_ARTIFACT_MANIFEST")
            for name, info in artifacts.items():
                if name not in ARTIFACTS:
                    problems.append("UNEXPECTED_ARTIFACT_NAME")
                    continue
                try:
                    p = within(folder / name, folder)
                    if p.stat().st_size != info["bytes"] or file_sha(p) != info["sha256"]:
                        problems.append(f"ARTIFACT_CHANGED:{name}")
                except (OSError, ValueError, KeyError):
                    problems.append(f"ARTIFACT_MISSING:{name}")
            try:
                spec = read_json(within(folder / "request.json", folder))
                if digest(spec) != manifest["spec_sha256"] or self.reference_hashes(spec) != manifest["reference_sha256"]:
                    problems.append("SPEC_OR_REFERENCE_CHANGED")
                if manifest.get("scene_id") != spec.get("scene_id"):
                    problems.append("SCENE_IDENTITY_CHANGED")
                measured = read_json(within(folder / "measured.json", folder))
                if measured != manifest.get("measurements"):
                    problems.append("MEASUREMENTS_CHANGED")
                self._check_measurements(measured, spec)
                result["measurements"] = measured
            except (OSError, ValueError, KeyError, RuntimeError):
                problems.append("SPEC_OR_REFERENCE_UNAVAILABLE")
            expected_digest = digest({"spec_sha256": manifest["spec_sha256"], "implementation_sha256": manifest["implementation_sha256"], "artifacts": artifacts})
            if expected_digest != manifest.get("artifact_digest"):
                problems.append("ARTIFACT_MANIFEST_CHANGED")
            if artifacts.get("source.txt", {}).get("sha256") != manifest.get("source_sha256"):
                problems.append("SOURCE_PROVENANCE_CHANGED")
            expected_status = {"PASS": "VISUAL_REVIEW_RECORDED", "REWORK": "REWORK", "NOT_REVIEWED": "REVIEW_REQUIRED"}.get(manifest.get("visual_review"))
            if expected_status is None or expected_status != manifest.get("status"):
                problems.append("REVIEW_STATE_INCONSISTENT")
            if manifest.get("visual_review") in ("PASS", "REWORK") and "latest_review" not in manifest:
                problems.append("REVIEW_EVIDENCE_MISSING")
            if "latest_review" in manifest:
                try:
                    review_path = within(folder / manifest["latest_review"], folder)
                    review = read_json(review_path)
                    if file_sha(review_path) != manifest.get("latest_review_sha256") or review.get("artifact_digest") != manifest.get("artifact_digest") or review.get("verdict") != manifest.get("visual_review"):
                        problems.append("REVIEW_CHANGED")
                except (OSError, ValueError, KeyError):
                    problems.append("REVIEW_MISSING")
            result["integrity"] = "FAIL" if problems else "PASS"
            if problems:
                result.update(status="STALE", technical_build="STALE", visual_review="STALE", problems=problems)
        else:
            result["integrity"] = "NOT_READY"
            if manifest.get("status") in ("QUEUED", "BUILDING") and job_id not in self.running:
                result["process_ownership"] = "EXTERNAL_OR_INTERRUPTED"
        return result

    def cancel(self, job_id):
        self.path(job_id)
        with self.guard:
            item = self.running.get(job_id)
            if not item:
                return {"job_id": job_id, "cancelled": False, "message": "No job owned by this server is active; no unrelated process was stopped."}
            item["cancel"].set()
        return {"job_id": job_id, "status": "CANCEL_REQUESTED"}

    def review_bundle(self, job_id):
        state = self.status(job_id)
        if state["integrity"] != "PASS":
            fail("job_id", "Verified artifacts are required before review.", "NOT_READY")
        folder = self.path(job_id)
        return {"job_id": job_id, "artifact_digest": state["artifact_digest"], "spec_sha256": state["spec_sha256"], "technical_build": state["technical_build"], "visual_review": state["visual_review"], "measurements": state["measurements"], "views": {name: {"path": str(folder / name), **state["artifacts"][name]} for name in ARTIFACTS if name.endswith(".png")}, "review_dimensions": ["silhouette", "proportions", "connections", "materials", "lighting", "composition"], "limitations": ["No image-understanding model is bundled.", "Review must inspect the exact hashed images, then submit object-specific findings.", "Reviewer identity is supplied by the trusted local agent; this is an audit record, not authenticated identity or human approval."]}

    def record_review(self, job_id, artifact_digest, reviewer, verdict, findings, summary):
        state = self.status(job_id)
        if state["integrity"] != "PASS" or artifact_digest != state.get("artifact_digest"):
            fail("artifact_digest", "Review refers to missing or changed evidence.", "STALE_REVIEW")
        if not isinstance(reviewer, str) or not 1 <= len(reviewer) <= 100 or reviewer == state["builder"]:
            fail("reviewer", "Supply the separate reviewer's identity, not the worker identity.")
        if verdict not in ("PASS", "REWORK"):
            fail("verdict", "Use PASS or REWORK; human approval is a separate decision.")
        if not isinstance(summary, str) or not 1 <= len(summary) <= 4000:
            fail("summary", "Supply a bounded review summary.")
        if not isinstance(findings, list) or len(findings) > 30:
            fail("findings", "Expected up to 30 findings.")
        ids = {o["id"] for o in state["measurements"]["objects"]} | {"scene"}
        for finding in findings:
            if not isinstance(finding, dict) or set(finding) != {"object_id", "dimension", "severity", "instruction"}:
                fail("findings", "Each finding requires object_id, dimension, severity and instruction.")
            if finding["object_id"] not in ids or finding["dimension"] not in ("silhouette", "proportions", "connections", "materials", "lighting", "composition", "technical") or finding["severity"] not in ("info", "warning", "error") or not isinstance(finding["instruction"], str) or not 1 <= len(finding["instruction"]) <= 2000:
                fail("findings", "Invalid object, dimension, severity or repair instruction.")
        if verdict == "PASS" and any(f["severity"] == "error" for f in findings):
            fail("verdict", "A review with error findings cannot pass.")
        if verdict == "REWORK" and not any(f["severity"] == "error" for f in findings):
            fail("findings", "Rework requires at least one actionable error.")
        folder = self.path(job_id)
        with self.guard:
            review = {"schema": "khosan.local3d.review/1.0", "reviewer": reviewer, "identity_verified": False, "artifact_digest": artifact_digest, "verdict": verdict, "findings": findings, "summary": summary, "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "human_acceptance": "NOT_REVIEWED"}
            review_name = "review-" + uuid.uuid4().hex[:12] + ".json"
            atomic_json(folder / review_name, review)
            manifest = read_json(folder / "manifest.json")
            manifest.update(visual_review=verdict, status="VISUAL_REVIEW_RECORDED" if verdict == "PASS" else "REWORK", latest_review=review_name, latest_review_sha256=file_sha(folder / review_name))
            atomic_json(folder / "manifest.json", manifest)
        return {"job_id": job_id, "visual_review": verdict, "review_file": str(folder / review_name), "production_ready": False, "human_acceptance": "NOT_REVIEWED"}

    def harness_manifest(self, job_id):
        state = self.status(job_id)
        if state["integrity"] != "PASS":
            fail("job_id", "Cannot load an unverified or stale build into the preview.", "NOT_READY")
        spec = read_json(within(self.path(job_id) / "request.json", self.path(job_id)))
        if digest(spec) != state["spec_sha256"]:
            fail("spec", "Presentation source changed after integrity verification.", "NOT_READY")
        return {"schema": "khosan.harness-asset/1.0", "scene_id": state["scene_id"], "job_id": job_id, "spec_sha256": state["spec_sha256"], "implementation_sha256": state["implementation_sha256"], "artifact_digest": state["artifact_digest"], "coordinates": {"handedness": "right", "up_axis": "+Y", "asset_forward": "+Z", "unit": "meter", "conversion_already_applied": True}, "capabilities": state["capabilities"], "artifacts": state["artifacts"], "presentation": {"lighting": spec.get("lighting", {"preset": "storybook"}), "camera": spec["camera"]}, "technical_build": state["technical_build"], "export_reimport": state["export_reimport"], "visual_review": state["visual_review"], "human_acceptance": "NOT_REVIEWED", "v4_render_integration": "NOT_TESTED", "production_ready": False, "world_provider": "group / objects / update(absoluteSeconds) / dispose", "glb_path": str(self.path(job_id) / "scene.glb"), "animation_note": "Static scene; update validates absolute time but does not simulate or animate."}

    def repair(self, job_id, artifact_digest, changes, timeout_seconds=180):
        state = self.status(job_id)
        if state["integrity"] != "PASS" or artifact_digest != state.get("artifact_digest") or state.get("visual_review") != "REWORK":
            fail("job_id", "A current independent REWORK record is required before a targeted repair.", "REVIEW_REQUIRED")
        revision = state.get("lineage", {}).get("revision", 0)
        if revision >= 3:
            fail("job_id", "Three automatic repair revisions exhausted; return findings to the owner.", "REPAIR_LIMIT")
        if not isinstance(changes, list) or not 1 <= len(changes) <= 16:
            fail("changes", "Provide 1–16 object-property patches.")
        folder = self.path(job_id)
        review = read_json(within(folder / state["latest_review"], folder))
        editable = {f["object_id"] for f in review["findings"] if f["severity"] == "error"}
        if "scene" in editable:
            fail("changes", "This revision supports object-property repairs only. Scene-level camera/light/composition errors require a new explicit scene specification.", "UNSUPPORTED_REPAIR")
        spec = read_json(folder / "request.json")
        before = {o["id"]: digest(o) for o in spec["objects"]}
        objects = {o["id"]: o for o in spec["objects"]}
        touched = set()
        for patch in changes:
            if not isinstance(patch, dict) or set(patch) != {"object_id", "field", "value"}:
                fail("changes", "Each patch requires object_id, field, value.")
            oid, field = patch["object_id"], patch["field"]
            if not isinstance(oid, str) or oid not in editable or oid not in objects:
                fail("changes.object_id", "Only explicitly failing object IDs are editable; passing objects are locked.", "LOCKED_OBJECT")
            if field in ("position", "rotation", "scale", "material"):
                objects[oid][field] = patch["value"]
            elif isinstance(field, str) and field.startswith("parameters.") and field.count(".") == 1:
                objects[oid]["parameters"][field.split(".", 1)[1]] = patch["value"]
            else:
                fail("changes.field", "Only transform, material reference or recipe parameter patches are supported.")
            touched.add(oid)
        if all(before[oid] == digest(objects[oid]) for oid in touched):
            fail("changes", "Repair makes no change.")
        untouched_hashes = {oid: h for oid, h in before.items() if oid not in touched}
        for oid, h in untouched_hashes.items():
            if digest(objects[oid]) != h:
                fail("changes", "Locked object changed.", "LOCKED_OBJECT")
        return self.start(canonical(spec), "json", timeout_seconds, lineage={"revision": revision+1, "parent_job_id": job_id, "parent_artifact_digest": artifact_digest, "changed_objects": sorted(touched), "locked_object_sha256": untouched_hashes})

    def close(self):
        with self.guard:
            running = list(self.running.values())
            for item in running:
                item["cancel"].set()
        for item in running:
            if item["thread"] is not threading.current_thread():
                item["thread"].join(timeout=10)
