"""KHOSAN local 3D MCP. Official SDK stdio transport; Blender runs asynchronously."""
import argparse
import json
from pathlib import Path
import sys

from core import Jobs
from schema import SceneError, digest, parse_source


def create_server(jobs):
    from mcp.server.fastmcp import FastMCP, Image
    from mcp.types import ToolAnnotations

    server = FastMCP("khosan-local3d", instructions="Local procedural 3D scenes. Validate, build, poll, inspect all four preview images, record an independent critique, then repair only failed objects. Technical PASS never means visual or human approval. Static supported recipes only; unsupported features fail explicitly.", log_level="WARNING")
    read = ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False)
    write = ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False)

    @server.tool(annotations=read)
    def local3d_doctor() -> dict:
        """Report local Blender, package fingerprint and exact supported capabilities."""
        return jobs.doctor()

    @server.tool(annotations=read)
    def validate_weave_script(weave_code: str) -> dict:
        """Validate the strict KHOSAN Weave v1 subset. This is not Oriverse-language compatibility."""
        try:
            spec = parse_source(weave_code, "weave")
            return {"valid": True, "spec_sha256": digest(spec), "scene_id": spec["scene_id"], "status": "SPEC_VALID_ONLY", "art_review": "NOT_RUN"}
        except SceneError as exc:
            return {"valid": False, "diagnostics": [exc.diagnostic]}

    @server.tool(annotations=read)
    def compile_weave_to_ir(weave_code: str) -> dict:
        """Compile the documented local subset to validated scene IR; does not claim a built model."""
        spec = parse_source(weave_code, "weave")
        return {"status": "COMPILED_ONLY", "spec_sha256": digest(spec), "ir": spec}

    @server.tool(annotations=write)
    def local3d_build_scene(source: str, source_format: str = "weave", timeout_seconds: int = 180) -> dict:
        """Start one bounded headless Blender job; returns immediately. Poll local3d_job_status."""
        return jobs.start(source, source_format, timeout_seconds)

    @server.tool(annotations=read)
    def local3d_job_status(job_id: str) -> dict:
        """Read persisted progress and verify all source/output hashes before returning PASS."""
        return jobs.status(job_id)

    @server.tool(annotations=write)
    def local3d_cancel_job(job_id: str) -> dict:
        """Cancel this server's active build and preserve partial evidence; never kills other workers."""
        return jobs.cancel(job_id)

    @server.tool(annotations=read)
    def local3d_review_bundle(job_id: str) -> dict:
        """Return the exact image hashes, artifact digest and dimensions a separate critic must inspect."""
        return jobs.review_bundle(job_id)

    @server.tool(annotations=read)
    def local3d_preview(job_id: str, view: str = "hero") -> Image:
        """Read an actual rendered preview for visual review. view: hero/front/side/back."""
        if view not in ("hero", "front", "side", "back"):
            raise ValueError("Choose hero, front, side or back.")
        jobs.review_bundle(job_id)
        return Image(path=str(jobs.path(job_id) / f"preview_{view}.png"))

    @server.tool(annotations=write)
    def local3d_record_review(job_id: str, artifact_digest: str, reviewer: str, verdict: str, findings: list[dict], summary: str) -> dict:
        """Record a separate critic's evidence-bound PASS/REWORK. This is never human approval."""
        return jobs.record_review(job_id, artifact_digest, reviewer, verdict, findings, summary)

    @server.tool(annotations=write)
    def local3d_repair_scene(job_id: str, artifact_digest: str, changes: list[dict], timeout_seconds: int = 180) -> dict:
        """After REWORK, change only failing objects (object_id/field/value); limit three revisions."""
        return jobs.repair(job_id, artifact_digest, changes, timeout_seconds)

    @server.tool(annotations=read)
    def local3d_harness_manifest(job_id: str) -> dict:
        """Return a source-bound static asset contract for the separate Harness V4 preview provider."""
        return jobs.harness_manifest(job_id)

    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stdio", action="store_true", help="Run official MCP SDK stdio (default). No TCP port is opened.")
    parser.add_argument("--project-root", type=Path, required=True, help="Existing explicit project root. MCP requests cannot change it.")
    parser.add_argument("--blender", help="Trusted local Blender executable path.")
    parser.add_argument("--doctor", action="store_true", help="Print a diagnostic JSON and exit; no SDK needed.")
    args = parser.parse_args()
    jobs = Jobs(args.project_root, args.blender)
    try:
        if args.doctor:
            print(json.dumps(jobs.doctor(), indent=2, ensure_ascii=False))
        else:
            create_server(jobs).run(transport="stdio")
    finally:
        jobs.close()


if __name__ == "__main__":
    main()
