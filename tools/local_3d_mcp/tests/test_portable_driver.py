"""Portability regressions for path transport and checkout-local setup.

The SDK test runs the real protocol but stubs Blender discovery explicitly.
It does not claim to render a model; fresh-machine Blender proofs are separate.
"""
from __future__ import annotations

import asyncio
from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
import json
import os
from pathlib import Path, PureWindowsPath
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


REPOSITORY = Path(__file__).resolve().parents[3]
REAL_PACKAGE = REPOSITORY / "tools" / "local_3d_mcp"
SPEC = importlib.util.spec_from_file_location("khosan_portable_driver_for_tests", REPOSITORY / "scripts" / "local3d.py")
driver = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(driver)


class PortableDriverTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="khosan-portability-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "สถานี ทดสอบ & Studio"
        self.root.mkdir()
        self.package = self.root / "tools" / "local_3d_mcp"
        self.package.mkdir(parents=True)
        for name, value in {
            "ROOT": self.root,
            "PACKAGE": self.package,
            "STATE": self.root / ".khosan" / "local3d-machine.json",
            "CLIENT_CONFIG": self.root / ".khosan" / "local3d-mcp.json",
            "ENVIRONMENT": self.root / ".venv-local3d",
        }.items():
            patcher = patch.object(driver, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.blender = self.root / "โปรแกรม Blender & 5.2" / "blender.exe"
        self.blender.parent.mkdir()
        self.blender.write_text("PORTABILITY TEST FIXTURE, NOT A BLENDER EXECUTABLE", encoding="utf-8")

    def make_fixture(self, elephant=True, reference=True):
        fixtures = self.package / "fixtures"
        fixtures.mkdir(exist_ok=True)
        name = "elephant_scene.json" if elephant else "proof_scene.json"
        (fixtures / name).write_text("{}", encoding="utf-8")
        if elephant and reference:
            references = self.package / "references"
            references.mkdir(exist_ok=True)
            (references / "ep02_elephant_ref_r7.png").write_bytes(b"TEST PRESENCE ONLY")

    def test_explicit_missing_blender_does_not_fall_back_to_environment(self):
        missing = self.root / "wrong Blender.exe"
        with patch.dict(os.environ, {"KHOSAN_BLENDER_PATH": str(self.blender)}):
            with self.assertRaisesRegex(RuntimeError, "does not exist"):
                driver.select_blender(str(missing))

    def test_saved_blender_selection_survives_a_fresh_shell(self):
        driver.write_json(driver.STATE, {
            "schema": "khosan.local3d-machine/1", "blender": str(self.blender),
        })
        with patch.dict(os.environ, {}, clear=True), patch.object(driver.shutil, "which", return_value=None):
            self.assertEqual(driver.select_blender(), self.blender.resolve())

    def test_windows_standard_discovery_uses_environment_root_with_thai_and_spaces(self):
        program_files = self.root / "D drive โปรแกรม Files"
        standard = program_files / "Blender Foundation" / "Blender 5.2" / "blender.exe"
        standard.parent.mkdir(parents=True)
        standard.write_bytes(b"TEST DISCOVERY FIXTURE")
        windows_environment = SimpleNamespace(
            name="nt", environ={"ProgramFiles": str(program_files)}, path=os.path,
        )
        with patch.object(driver, "os", windows_environment), patch.object(driver.shutil, "which", return_value=None):
            self.assertEqual(driver.select_blender(), standard.resolve())

    def test_generated_windows_d_drive_config_is_utf8_and_preserves_argument_boundaries(self):
        checkout = PureWindowsPath("D:/งาน ทดสอบ & Studio")
        package = checkout / "tools/local_3d_mcp"
        executable = checkout / ".venv-local3d/Scripts/python.exe"
        blender = PureWindowsPath("E:/โปรแกรม Blender 5.2/blender.exe")
        with patch.object(driver, "PACKAGE", package), patch.object(driver, "require_environment", return_value=executable):
            configuration = driver.client_configuration(blender, checkout)
        driver.write_json(driver.CLIENT_CONFIG, configuration)
        raw = driver.CLIENT_CONFIG.read_bytes()
        self.assertFalse(raw.startswith((b"\xff\xfe", b"\xfe\xff", b"\xef\xbb\xbf")))
        self.assertIn("งาน ทดสอบ".encode("utf-8"), raw)
        server = json.loads(raw.decode("utf-8"))["mcpServers"]["khosan-local3d"]
        self.assertEqual(server["command"], str(executable))
        self.assertEqual(server["args"], [str(package / "server.py"), "--stdio", "--project-root", str(checkout), "--blender", str(blender)])
        self.assertEqual(server["env"], {"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"})
        self.assertFalse(any(value.startswith('"') or value.endswith('"') for value in server["args"]))

    def test_proof_forwards_selected_blender_to_sdk_client_as_one_argument(self):
        self.make_fixture()
        with patch.object(driver, "check_blender", return_value="Blender TEST"), \
             patch.object(driver, "require_environment", return_value=Path(sys.executable)), \
             patch.object(driver, "run") as run:
            driver.main(["proof", "--fixture", "elephant", "--blender", str(self.blender)])
        argv = [str(value) for value in run.call_args.args[0]]
        self.assertEqual(argv[argv.index("--blender") + 1], str(self.blender.resolve()))
        self.assertEqual(argv[argv.index("--project-root") + 1], str(self.root))
        self.assertEqual(argv[argv.index("--source") + 1], str(self.package / "fixtures/elephant_scene.json"))
        self.assertEqual(argv[argv.index("--evidence-name") + 1], "elephant-proof.json")

    def test_incomplete_elephant_checkout_fails_before_proof_process(self):
        self.make_fixture(reference=False)
        with patch.object(driver, "check_blender", return_value="Blender TEST"), patch.object(driver, "run") as run:
            with self.assertRaisesRegex(RuntimeError, "reference is missing"):
                driver.main(["proof", "--fixture", "elephant", "--blender", str(self.blender)])
        run.assert_not_called()

    def test_draft_is_a_distinct_render_spec_before_spawn_without_changing_geometry_or_fixture(self):
        for fixture, filename in (("props", "proof_scene.json"), ("elephant", "elephant_scene.json")):
            with self.subTest(fixture=fixture):
                self.make_fixture(elephant=fixture == "elephant")
                original_path = self.package / "fixtures" / filename
                original_bytes = (REAL_PACKAGE / "fixtures" / filename).read_bytes()
                original_path.write_bytes(original_bytes)
                original = json.loads(original_bytes.decode("utf-8"))
                submitted = []

                def observe_sdk_spawn(argv):
                    argv = [str(value) for value in argv]
                    source_path = Path(argv[argv.index("--source") + 1])
                    self.assertNotEqual(source_path, original_path)
                    self.assertTrue(source_path.is_relative_to(self.root / ".khosan"))
                    self.assertEqual(original_path.read_bytes(), original_bytes)
                    submitted.append(json.loads(source_path.read_text(encoding="utf-8")))

                with patch.object(driver, "check_blender", return_value="Blender TEST"), \
                     patch.object(driver, "require_environment", return_value=Path(sys.executable)), \
                     patch.object(driver, "run", side_effect=observe_sdk_spawn), redirect_stderr(io.StringIO()):
                    driver.main(["proof", "--fixture", fixture, "--quality", "draft", "--blender", str(self.blender)])

                self.assertEqual(len(submitted), 1)
                draft = submitted[0]
                self.assertNotEqual(draft["scene_id"], original["scene_id"])
                self.assertTrue(draft["scene_id"].endswith("_draft"))
                self.assertEqual(draft["render"], {"width": 640, "height": 360, "samples": 8})
                for field in set(original) - {"scene_id", "render"}:
                    self.assertEqual(draft[field], original[field], field)
                self.assertEqual(original_path.read_bytes(), original_bytes)

    def test_serve_preserves_protocol_stdout_and_literal_argv(self):
        output = io.StringIO()
        with patch.object(driver, "check_blender", return_value="Blender TEST"), \
             patch.object(driver, "require_environment", return_value=Path(sys.executable)), \
             patch.object(driver.subprocess, "call", return_value=0) as call, redirect_stdout(output):
            self.assertEqual(driver.main(["serve", "--blender", str(self.blender)]), 0)
        self.assertEqual(output.getvalue(), "")
        argv = call.call_args.args[0]
        self.assertEqual(argv[argv.index("--blender") + 1], str(self.blender.resolve()))
        self.assertFalse(call.call_args.kwargs.get("shell", False))
        self.assertEqual(call.call_args.kwargs["env"]["PYTHONIOENCODING"], "utf-8")

    def test_real_sdk_stdio_preserves_unicode_and_explicit_blender_without_node_path(self):
        if importlib.util.find_spec("mcp") is None:
            self.skipTest("Official MCP SDK is not installed; setup is required before this protocol test")
        # The actual server is used. Only executable discovery is a labeled fixture,
        # so this tests generated config -> official SDK -> server argv, not rendering.
        launcher = (
            "from pathlib import Path\nimport sys\n"
            f"sys.path.insert(0, {str(REAL_PACKAGE)!r})\n"
            "import core\n"
            "def fixture_discovery(explicit=None):\n"
            "    if not explicit: raise RuntimeError('EXPLICIT_BLENDER_ARGUMENT_MISSING')\n"
            "    return Path(explicit).resolve(strict=True), 'Blender PORTABILITY_TEST_FIXTURE'\n"
            "core.discover_blender = fixture_discovery\n"
            "import server\nserver.main()\n"
        )
        (self.package / "server.py").write_text(launcher, encoding="utf-8")
        with patch.object(driver, "require_environment", return_value=Path(sys.executable)):
            configuration = driver.client_configuration(self.blender.resolve(), self.root)
        configured = configuration["mcpServers"]["khosan-local3d"]

        async def probe():
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client
            parameters = StdioServerParameters(
                command=configured["command"], args=configured["args"],
                env={**configured["env"], "PATH": ""},
            )
            async with stdio_client(parameters) as (read, write):
                async with ClientSession(read, write) as client:
                    await client.initialize()
                    response = await client.call_tool("local3d_doctor", {})
                    self.assertFalse(response.isError)
                    result = response.structuredContent or json.loads(response.content[0].text)
                    self.assertEqual(Path(result["project_root"]), self.root)
                    self.assertEqual(Path(result["blender"]), self.blender.resolve())
                    self.assertEqual(result["blender_version"], "Blender PORTABILITY_TEST_FIXTURE")

        async def bounded_probe():
            await asyncio.wait_for(probe(), timeout=20)

        with patch.dict(os.environ, {"KHOSAN_BLENDER_PATH": str(self.root / "must not be inherited.exe")}):
            asyncio.run(bounded_probe())


if __name__ == "__main__":
    unittest.main(verbosity=2)
