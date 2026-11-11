"""Real unit tests for Part 7 server-side differential patch authorization."""
import copy
import importlib.util
from pathlib import Path
import unittest

MODULE = Path(__file__).resolve().parents[1] / "tools" / "ugir-geometry-linter" / "hard_lock_enforcer.py"
spec = importlib.util.spec_from_file_location("hard_lock_enforcer", MODULE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Enforcer = mod.DifferentialPatchLockEnforcer
Violation = mod.HardLockViolation


def seam_fixture():
    return {
        "coordinate_system": {"unit": "cm", "up_axis": "+Z"},
        "layout_nodes": [
            {"instance_name": "Floor", "placement_mode": "place_bounds_box", "min_xyz_cm": [-500,-500,-20],"max_xyz_cm": [500,500,0],"is_ground":True},
            {"instance_name": "WallLeft", "placement_mode": "place_bounds_box", "min_xyz_cm": [-50,-10,0],"max_xyz_cm": [0,10,100]},
            {"instance_name": "WallRight", "placement_mode": "place_bounds_box", "min_xyz_cm": [1,-10,0],"max_xyz_cm": [50,10,100]},
        ],
        "expected_adjacent_seams": [["WallLeft","WallRight"]],
    }


def patch(scope, name="WallLeft", field="max_xyz_cm", axis=0, value=1):
    return {"base_sha256":scope["source_sha256"],"patches":[{"instance_name":name,"field":field,"axis":axis,"value":value}]}


class Part7Locks(unittest.TestCase):
    def setUp(self):
        self.base=seam_fixture();self.controller=Enforcer(self.base);self.scope=self.controller.lock_passing_nodes()

    def test_repair_allowed_axis(self):
        r=self.controller.apply_verified_patch(patch(self.scope))
        self.assertTrue(r["complete"]);self.assertEqual(r["issues_after"],0)
        self.assertEqual(r["state"]["layout_nodes"][1]["max_xyz_cm"][0],1)
        self.assertEqual(self.base["layout_nodes"][1]["max_xyz_cm"][0],0)
        self.assertEqual(r["state"]["layout_nodes"][0],self.base["layout_nodes"][0])

    def test_frozen_node_blocked(self):
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,name="Floor",value=499))

    def test_unknown_node_blocked(self):
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,name="Arbitrary",value=12))

    def test_stale_revision_blocked(self):
        p=patch(self.scope);p["base_sha256"]="0"*64
        with self.assertRaises(Violation):self.controller.apply_verified_patch(p)

    def test_unrelated_dimension_locked(self):
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,axis=2,value=12))

    def test_reject_arbitrary_metadata_and_modes(self):
        p=patch(self.scope);p["patches"][0]["placement_mode"]="attach_to_anchor"
        with self.assertRaises(Violation):self.controller.apply_verified_patch(p)

    def test_reject_invalid_bounds(self):
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,value=-60))

    def test_reject_duplicate_edits(self):
        p=patch(self.scope);p["patches"].append(copy.deepcopy(p["patches"][0]))
        with self.assertRaises(Violation):self.controller.apply_verified_patch(p)

    def test_reject_nan_and_boolean(self):
        for value in [float("nan"),float("inf"),True]:
            with self.subTest(value=value):
                with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,value=value))

    def test_reject_untrusted_lint(self):
        controller=Enforcer(self.base)
        with self.assertRaises(Violation):controller.lock_passing_nodes({"source_sha256":"fake","diagnostics":[]})

    def test_reject_noop(self):
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,value=0))

    def test_model_cannot_mutate_snapshot(self):
        exposed=self.controller.ugir_state;exposed["layout_nodes"][0]["max_xyz_cm"][0]=123456
        self.assertEqual(self.controller.ugir_state["layout_nodes"][0]["max_xyz_cm"][0],500)

    def test_optional_forward_axis_is_supported_and_invalid_forward_is_rejected(self):
        base=seam_fixture();base["coordinate_system"]["forward_axis"]="+Y"
        enforcer=Enforcer(base)
        self.assertEqual(enforcer.lock_passing_nodes()["editable_axes"]["WallLeft"],[0])
        base["coordinate_system"]["forward_axis"]="+X"
        with self.assertRaises(Violation):Enforcer(base)

    def test_reject_unsupported_anchors(self):
        base=seam_fixture();base["layout_nodes"][1]["placement_mode"]="attach_to_anchor"
        with self.assertRaises(Violation):Enforcer(base)

    def test_reject_already_passing(self):
        self.controller.apply_verified_patch(patch(self.scope))
        with self.assertRaises(Violation):self.controller.lock_passing_nodes()

    def test_second_round_invalidates_scope(self):
        self.controller.apply_verified_patch(patch(self.scope,value=0.5))
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,value=1))
        scope2=self.controller.lock_passing_nodes()
        r=self.controller.apply_verified_patch(patch(scope2,value=1))
        self.assertTrue(r["complete"])

    def test_strict_tool_schema_and_dynamic_mask(self):
        schema=self.controller.get_allowed_tool_schema_for_repair()
        self.assertTrue(schema["strict"])
        props=schema["parameters"]["properties"]
        self.assertEqual(set(schema["parameters"]["required"]),set(props))
        item=props["patches"]["items"]
        self.assertEqual(set(item["required"]),set(item["properties"]))
        self.assertEqual(item["properties"]["instance_name"]["enum"],["WallLeft","WallRight"])
        self.assertNotIn("finish_task",mod.allowed_tools_for_stage("geometry_built"))
        with self.assertRaises(Violation):mod.assert_tool_allowed("geometry_built","finish_task")
        with self.assertRaises(Violation):mod.assert_tool_allowed("rendered","patch_failing_layout_nodes")

    def test_reject_new_geometry_defect(self):
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,value=10))

    def test_new_collision_fails_if_it_creates_piercing(self):
        # Move a wall past the repair seam into the other wall, creating overlap.
        with self.assertRaises(Violation):self.controller.apply_verified_patch(patch(self.scope,value=3))

    def test_floating_object_uses_only_z_axis(self):
        base=seam_fixture();base.pop("expected_adjacent_seams");base["layout_nodes"][1]["min_xyz_cm"][2]=20;base["layout_nodes"][1]["max_xyz_cm"][2]=120
        # The floating wall is above the floor; another wall may overlap spatially. Prior diagnostics can include a separate seam/overlap; no issue with that.
        controller=Enforcer(base);scope=controller.lock_passing_nodes()
        self.assertIn(2,scope["editable_axes"]["WallLeft"])


if __name__=="__main__":unittest.main()