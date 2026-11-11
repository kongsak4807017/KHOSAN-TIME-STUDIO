import asyncio
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from schema import SceneError, canonical, digest, normalize_scene, parse_source
from core import ARTIFACTS, BuildLock, Jobs, atomic_json, file_sha, implementation_digest

WEAVE = '''scene demo {
 seed=7
 material clay { base_color="#BC704E" roughness=0.8 }
 object vessel { recipe="amphora" material="clay" parameters {height=1.2 radius=0.3} }
 camera {position=(4,3,6) target=(0,0.6,0)}
}'''


class ContractTests(unittest.TestCase):
    def test_static_elephant_parameters_and_lighting(self):
        source = WEAVE.replace('recipe="amphora"', 'recipe="elephant"').replace('height=1.2 radius=0.3','height=3.0 body_length=3.9 ear_size=1.0 tusk_length=0.72 skin_detail=1.0')
        source = source.replace('camera {','lighting {preset="elephant_studio"} camera {')
        spec = parse_source(source)
        self.assertEqual(spec, parse_source(canonical(spec), 'json'))
        self.assertEqual(spec['objects'][0]['recipe'], 'elephant')
        self.assertEqual(spec['lighting']['preset'], 'elephant_studio')
        for field, bad in [('height', 0.1), ('body_length', 20), ('ear_size', 5), ('tusk_length', -1), ('skin_detail', 2), ('height', True)]:
            changed = copy.deepcopy(spec)
            changed['objects'][0]['parameters'][field] = bad
            with self.subTest(field=field,bad=bad), self.assertRaises(SceneError):
                normalize_scene(changed)

    def test_lighting_is_explicit_bounded_and_optional(self):
        spec = parse_source(WEAVE)
        self.assertNotIn('lighting', spec)
        for lighting in ({'preset':'unknown'}, {'preset':'elephant_studio','arbitrary_python':'x'}, {}, {'preset':True}):
            changed = copy.deepcopy(spec)
            changed['lighting'] = lighting
            with self.subTest(lighting=lighting), self.assertRaises(SceneError):
                normalize_scene(changed)

    def test_valid_weave_json_parity(self):
        spec = parse_source(WEAVE)
        self.assertEqual(spec, parse_source(canonical(spec), "json"))
        self.assertEqual(spec["objects"][0]["parameters"]["height"], 1.2)

    def test_unknown_block_fails(self):
        for block in ('character Hero {}', 'physics World {}', 'object bad {recipe="sphere" material="clay"}'):
            with self.subTest(block=block), self.assertRaises(SceneError):
                parse_source(WEAVE.replace('camera {', block+' camera {'))

    def test_unsupported_property_not_silently_discarded(self):
        for prop in ('objects=[]', 'materials=[]', 'fps=30', 'animation=true'):
            with self.subTest(prop=prop), self.assertRaises(SceneError):
                parse_source(WEAVE.replace('seed=7', 'seed=7 '+prop))

    def test_nested_invalid_fields_fail(self):
        spec = parse_source(WEAVE)
        for mutation in (lambda s: s["objects"][0].update(physics=True), lambda s: s["objects"][0]["parameters"].update(radius=-1), lambda s: s["objects"][0].update(material="missing"), lambda s: s["camera"].update(position=[0, 0, 0], target=[0, 0, 0])):
            altered = copy.deepcopy(spec)
            mutation(altered)
            with self.assertRaises(SceneError):
                normalize_scene(altered)

    def test_empty_invalid_nan_duplicate_inputs(self):
        for source, fmt in (("", "weave"), ("{}", "json"), ('{"schema":1,"schema":2}', 'json'), ('{"seed":NaN}', 'json'), ('scene x {seed=1 seed=2}', 'weave'), (WEAVE+' scene two {}', 'weave')):
            with self.subTest(source=source), self.assertRaises(SceneError):
                parse_source(source, fmt)

    def test_duplicate_object_ids(self):
        spec = parse_source(WEAVE)
        spec["objects"].append(copy.deepcopy(spec["objects"][0]))
        with self.assertRaises(SceneError):
            normalize_scene(spec)

    def test_reject_bool_numbers_and_infinity(self):
        for value in (True, float('inf'), float('nan'), '1'):
            spec = parse_source(WEAVE)
            spec["objects"][0]["parameters"]["height"] = value
            with self.subTest(value=value), self.assertRaises(SceneError):
                normalize_scene(spec)

    def test_bounds_and_coordinate_contract(self):
        spec = parse_source(WEAVE)
        spec["up_axis"] = "Z"
        with self.assertRaises(SceneError):
            normalize_scene(spec)
        spec = parse_source(WEAVE)
        spec["render"] = {"width":1920,"height":1920,"samples":32}
        with self.assertRaises(SceneError):
            normalize_scene(spec)

    def test_source_and_nesting_limits(self):
        with self.assertRaises(SceneError):
            parse_source('x'*131073)
        with self.assertRaises(SceneError):
            parse_source('scene S {a '+('{a '*20)+('{}'+ '}'*21))


class IntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.project = Path(self.temp.name)
        with patch('core.discover_blender', return_value=(Path(sys.executable), 'Blender TEST_FIXTURE')):
            self.jobs = Jobs(self.project)
        self.job_id = 'job-0123456789abcdef'
        self.folder = self.jobs.jobs_root / self.job_id
        self.folder.mkdir()
        self.spec = parse_source(WEAVE)
        for name in ARTIFACTS:
            (self.folder/name).write_bytes(b'SYNTHETIC integrity fixture only')
        (self.folder/'source.txt').write_text(WEAVE, encoding='utf-8', newline='\n')
        atomic_json(self.folder/'request.json', self.spec)
        measured={'schema':'khosan.measurements/1.0','scene_id':'demo','triangle_count':100,'mesh_object_count':1,'world_bounds':{'min':[0,0,0],'max':[1,1,1]},'objects':[{'id':'vessel'}],'roundtrip':{'passed':True}}
        atomic_json(self.folder/'measured.json',measured)
        artifacts = {n:{'sha256':file_sha(self.folder/n),'bytes':(self.folder/n).stat().st_size,'relative_path':n} for n in ARTIFACTS}
        self.manifest = {'schema':'khosan.local3d.job/1.0','job_id':self.job_id,'scene_id':'demo','status':'REVIEW_REQUIRED','technical_build':'PASS','export_reimport':'PASS','visual_review':'NOT_REVIEWED','human_acceptance':'NOT_REVIEWED','production_ready':False,'spec_sha256':digest(self.spec),'source_sha256':hashlib.sha256(WEAVE.encode()).hexdigest(),'implementation_sha256':implementation_digest(),'artifacts':artifacts,'reference_sha256':{},'builder':'khosan-local3d-worker','capabilities':{'animation':False,'rigging':False,'physics':False},'measurements':{'objects':[{'id':'vessel'}]},'lineage':{'revision':0}}
        self.manifest['artifact_digest'] = digest({k:self.manifest[k] for k in ('spec_sha256','implementation_sha256','artifacts')})
        self.manifest['measurements']=measured
        atomic_json(self.folder/'manifest.json', self.manifest)

    def tearDown(self):
        self.jobs.close()
        self.temp.cleanup()

    def test_unchanged_artifacts_are_current(self):
        self.assertEqual(self.jobs.status(self.job_id)['integrity'], 'PASS')
        self.assertEqual(self.jobs.harness_manifest(self.job_id)['human_acceptance'], 'NOT_REVIEWED')
        self.assertFalse(self.jobs.harness_manifest(self.job_id)['production_ready'])
        self.assertEqual(self.jobs.harness_manifest(self.job_id)['presentation'], {'lighting':{'preset':'storybook'},'camera':self.spec['camera']})

    def test_each_output_mutation_invalidates_cache(self):
        for name in ('scene.glb','preview_hero.png','source.txt','request.json'):
            original=(self.folder/name).read_bytes()
            (self.folder/name).write_bytes(original+b'x')
            self.assertEqual(self.jobs.status(self.job_id)['status'],'STALE',name)
            (self.folder/name).write_bytes(original)

    def test_deleted_artifact_blocks_review(self):
        (self.folder/'preview_side.png').unlink()
        with self.assertRaises(SceneError):
            self.jobs.review_bundle(self.job_id)

    def test_code_change_stales_evidence(self):
        with patch('core.implementation_digest',return_value='a'*64):
            self.assertEqual(self.jobs.status(self.job_id)['status'],'STALE')

    def test_manifest_cannot_misreport_measured_counts(self):
        self.manifest['measurements']['triangle_count']=1
        atomic_json(self.folder/'manifest.json',self.manifest)
        state=self.jobs.status(self.job_id)
        self.assertEqual(state['status'],'STALE')
        self.assertEqual(state['measurements']['triangle_count'],100)

    def test_cache_index_cannot_select_a_different_verified_scene(self):
        source_sha=hashlib.sha256(WEAVE.encode()).hexdigest()
        key=digest({'spec':self.spec,'source_sha256':source_sha,'implementation':implementation_digest(),'blender':self.jobs.blender_version,'references':{},'lineage':{}})
        atomic_json(self.jobs.cache_root/(key+'.json'),{'job_id':self.job_id})
        lock=BuildLock(self.jobs.store/'worker.lock')
        try:
            self.assertEqual(self.jobs.start(WEAVE)['status'],'BUSY')
        finally:
            lock.close()

    def test_changed_provenance_rejected(self):
        self.manifest['source_sha256']='f'*64
        atomic_json(self.folder/'manifest.json',self.manifest)
        self.assertIn('SOURCE_PROVENANCE_CHANGED',self.jobs.status(self.job_id)['problems'])

    def test_missing_or_changed_review_invalidates(self):
        result=self.jobs.record_review(self.job_id,self.manifest['artifact_digest'],'independent-test-reviewer','PASS',[],'Test record; not a real visual evaluation.')
        self.assertEqual(self.jobs.status(self.job_id)['visual_review'],'PASS')
        Path(result['review_file']).write_text('{}')
        self.assertEqual(self.jobs.status(self.job_id)['status'],'STALE')

    def test_review_pass_requires_actual_record(self):
        self.manifest.update(visual_review='PASS',status='VISUAL_REVIEW_RECORDED')
        atomic_json(self.folder/'manifest.json',self.manifest)
        self.assertIn('REVIEW_EVIDENCE_MISSING',self.jobs.status(self.job_id)['problems'])

    def test_manifest_identity_must_match_job_and_spec(self):
        self.manifest['job_id']='job-fedcba9876543210'
        atomic_json(self.folder/'manifest.json',self.manifest)
        with self.assertRaises(SceneError):
            self.jobs.status(self.job_id)
        self.manifest['job_id']=self.job_id
        self.manifest['scene_id']='wrong_scene'
        atomic_json(self.folder/'manifest.json',self.manifest)
        self.assertIn('SCENE_IDENTITY_CHANGED',self.jobs.status(self.job_id)['problems'])

    def test_review_cannot_be_its_own_maker_or_stale(self):
        for reviewer, h in (('khosan-local3d-worker',self.manifest['artifact_digest']),('reviewer','0'*64)):
            with self.assertRaises(SceneError):
                self.jobs.record_review(self.job_id,h,reviewer,'PASS',[],'Synthetic')

    def test_rework_with_errors_cannot_pass(self):
        finding={'object_id':'vessel','dimension':'proportions','severity':'error','instruction':'Reduce height.'}
        with self.assertRaises(SceneError):
            self.jobs.record_review(self.job_id,self.manifest['artifact_digest'],'reviewer','PASS',[finding],'Synthetic')

    def test_targeted_repair_and_revision_limit(self):
        self.jobs.record_review(self.job_id,self.manifest['artifact_digest'],'reviewer','REWORK',[{'object_id':'vessel','dimension':'proportions','severity':'error','instruction':'Reduce height.'}],'Synthetic')
        with patch.object(self.jobs,'start',return_value={'status':'CAPTURED'}) as submit:
            result=self.jobs.repair(self.job_id,self.manifest['artifact_digest'],[{'object_id':'vessel','field':'parameters.height','value':1.0}])
            self.assertEqual(result['status'],'CAPTURED')
            spec=json.loads(submit.call_args.args[0])
            self.assertEqual(spec['objects'][0]['parameters']['height'],1.0)
            self.assertEqual(submit.call_args.kwargs['lineage']['revision'],1)
        with self.assertRaises(SceneError):
            self.jobs.repair(self.job_id,self.manifest['artifact_digest'],[{'object_id':'not-failing','field':'position','value':[0,0,0]}])
        latest=json.loads((self.folder/'manifest.json').read_text())
        latest['lineage']['revision']=3
        atomic_json(self.folder/'manifest.json',latest)
        with self.assertRaises(SceneError):
            self.jobs.repair(self.job_id,self.manifest['artifact_digest'],[{'object_id':'vessel','field':'parameters.height','value':1.0}])

    def test_job_path_escape(self):
        for value in ('../outside',str(self.project),'job-../../escape'):
            with self.assertRaises(SceneError):
                self.jobs.path(value)

    def test_reference_escape(self):
        for value in ('../outside','C:\\other.png','https://example.com/a.png'):
            spec=copy.deepcopy(self.spec)
            spec['provenance']['reference_paths']=[value]
            with self.assertRaises(SceneError):
                self.jobs.reference_hashes(spec)

    @unittest.skipIf(sys.platform=='win32','Symlink creation may need a Windows privilege; run on POSIX fixture.')
    def test_jobs_directory_symlink_escape_rejected(self):
        with tempfile.TemporaryDirectory() as other:
            second=self.project/'second'
            (second/'.khosan/local3d').mkdir(parents=True)
            (second/'.khosan/local3d/jobs').symlink_to(other,target_is_directory=True)
            with patch('core.discover_blender',return_value=(Path(sys.executable),'TEST')), self.assertRaises(SceneError):
                Jobs(second)

    def test_lock_no_overlap_and_release(self):
        path=self.jobs.store/'locktest'
        first=BuildLock(path)
        try:
            with self.assertRaises(OSError):
                BuildLock(path)
        finally:
            first.close()
        second=BuildLock(path)
        second.close()

    def test_cancel_never_touches_unknown_process(self):
        self.assertFalse(self.jobs.cancel(self.job_id)['cancelled'])


class ProtocolTests(unittest.IsolatedAsyncioTestCase):
    async def test_official_sdk_real_stdio_roundtrip(self):
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
        with tempfile.TemporaryDirectory() as folder:
            params=StdioServerParameters(command=sys.executable,args=[str(ROOT/'server.py'),'--stdio','--project-root',folder])
            async with stdio_client(params) as (read,write):
                async with ClientSession(read,write) as client:
                    initialized=await client.initialize()
                    self.assertTrue(initialized.protocolVersion)
                    await client.send_ping()
                    listed=await client.list_tools()
                    self.assertEqual(len(listed.tools),11)
                    result=await client.call_tool('validate_weave_script',{'weave_code':WEAVE})
                    payload=result.structuredContent or json.loads(result.content[0].text)
                    self.assertTrue(payload['valid'])
                    invalid=await client.call_tool('compile_weave_to_ir',{'weave_code':'scene X {character H {}}'})
                    self.assertTrue(invalid.isError)
                    alive=await client.call_tool('local3d_doctor',{})
                    self.assertFalse(alive.isError)


if __name__=='__main__':
    unittest.main(verbosity=2)
