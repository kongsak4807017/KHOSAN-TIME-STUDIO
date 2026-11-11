"""Real SDK client -> MCP server -> Blender -> artifacts -> verified warm-cache proof."""
import argparse
import asyncio
import json
from pathlib import Path
import sys
import time

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def payload(result):
    if result.isError:
        raise RuntimeError('MCP tool failed: '+str(result.content))
    return result.structuredContent or json.loads(result.content[0].text)


async def run(args):
    root=Path(args.project_root).resolve()
    source=Path(args.source).read_text(encoding='utf-8')
    params=StdioServerParameters(command=sys.executable,args=[str(Path(__file__).with_name('server.py')),'--stdio','--project-root',str(root)]+(['--blender',args.blender] if args.blender else []))
    start=time.monotonic()
    async with stdio_client(params) as (read,write):
        async with ClientSession(read,write) as client:
            init=await client.initialize()
            tools=await client.list_tools()
            doctor=payload(await client.call_tool('local3d_doctor',{}))
            request={'source':source,'source_format':args.source_format,'timeout_seconds':args.timeout}
            submitted=payload(await client.call_tool('local3d_build_scene',request))
            if submitted['status']=='BUSY':
                raise RuntimeError('Worker busy; no parallel proof started.')
            job_id=submitted['job_id']
            print(json.dumps({'phase':'submitted','job_id':job_id,'cache_hit':submitted['cache_hit']}),flush=True)
            while True:
                state=payload(await client.call_tool('local3d_job_status',{'job_id':job_id}))
                if state['status'] not in ('QUEUED','BUILDING'):
                    break
                if time.monotonic()-start>args.timeout+30:
                    await client.call_tool('local3d_cancel_job',{'job_id':job_id})
                    raise TimeoutError('Client proof deadline reached; cancellation requested.')
                await asyncio.sleep(1)
            if state.get('integrity')!='PASS':
                raise RuntimeError(json.dumps(state,ensure_ascii=False))
            bundle=payload(await client.call_tool('local3d_review_bundle',{'job_id':job_id}))
            manifest=payload(await client.call_tool('local3d_harness_manifest',{'job_id':job_id}))
            image_result=await client.call_tool('local3d_preview',{'job_id':job_id,'view':'hero'})
            if image_result.isError or not any(c.type=='image' for c in image_result.content):
                raise RuntimeError('Actual MCP image delivery failed.')
            warm=payload(await client.call_tool('local3d_build_scene',request))
            if not warm.get('cache_hit') or warm['job_id']!=job_id:
                raise RuntimeError('Unchanged source failed verified cache reuse.')
            directory=Path(state['artifact_directory'])
            (directory/'harness-asset.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
            evidence={'schema':'khosan.local3d.smoke/1.0','status':'PASS_SCOPED','environment':doctor,'protocol_version':init.protocolVersion,'tools':len(tools.tools),'job_id':job_id,'artifact_directory':str(directory),'artifact_digest':bundle['artifact_digest'],'cold_build_seconds':state.get('build_seconds'),'warm_request_seconds':warm['request_seconds'],'warm_cache_hit':warm['cache_hit'],'actual_mcp_image_delivery':True,'technical_build':state['technical_build'],'export_reimport':state['export_reimport'],'visual_review':state['visual_review'],'human_acceptance':'NOT_REVIEWED','production_ready':False,'v4_render_integration':'NOT_TESTED','total_seconds':round(time.monotonic()-start,3)}
            output=root/'.khosan/local3d'/args.evidence_name
            output.write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
            print(json.dumps(evidence,indent=2),flush=True)
            return evidence


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-root',required=True)
    parser.add_argument('--source',default=str(Path(__file__).with_name('fixtures')/'proof_scene.json'))
    parser.add_argument('--source-format',default='json',choices=['json','weave'])
    parser.add_argument('--timeout',type=int,default=240)
    parser.add_argument('--blender')
    parser.add_argument('--evidence-name',default='proof.json',choices=['proof.json','elephant-proof.json'])
    asyncio.run(run(parser.parse_args()))
