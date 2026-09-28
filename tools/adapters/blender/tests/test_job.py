from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
import sys

ADAPTER_DIR = Path(__file__).resolve().parents[1]
if str(ADAPTER_DIR) not in sys.path:
    sys.path.insert(0, str(ADAPTER_DIR))

from job import JobValidationError, load_job, validate_job_dict


class CharacterEditJobValidationTests(unittest.TestCase):
    def _valid_job(self) -> dict:
        return {
            "schema_version": 1,
            "asset_id": "character.ploy",
            "source": {"path": "ploy.glb"},
            "outputs": {
                "master_blend": "out/ploy.blend",
                "runtime_glb": "out/ploy.glb",
            },
            "preserve": ["identity", "face", "skeleton"],
            "operations": [
                {
                    "type": "set_shape_key_value",
                    "object": "Body",
                    "key": "Smile",
                    "value": 0.2,
                },
                {
                    "type": "set_object_transform",
                    "object": "Glasses",
                    "scale": [1.0, 1.0, 1.0],
                },
            ],
        }

    def test_valid_job_is_accepted(self) -> None:
        job = validate_job_dict(self._valid_job())
        self.assertEqual(job.asset_id, "character.ploy")
        self.assertEqual(len(job.operations), 2)

    def test_unknown_operation_is_rejected(self) -> None:
        payload = self._valid_job()
        payload["operations"] = [{"type": "execute_python", "code": "print('no')"}]
        with self.assertRaises(JobValidationError):
            validate_job_dict(payload)

    def test_shape_key_value_must_be_normalized(self) -> None:
        payload = self._valid_job()
        payload["operations"][0]["value"] = 3.0
        with self.assertRaises(JobValidationError):
            validate_job_dict(payload)

    def test_load_job_from_disk(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "job.json"
            path.write_text(json.dumps(self._valid_job()), encoding="utf-8")
            job = load_job(path)
            self.assertEqual(job.master_blend_path.suffix, ".blend")
            self.assertEqual(job.runtime_glb_path.suffix, ".glb")


if __name__ == "__main__":
    unittest.main()
