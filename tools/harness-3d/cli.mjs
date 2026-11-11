#!/usr/bin/env node
// Local-only CLI: never exposes an arbitrary project-folder reader over HTTP.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {verify3DAcceptance} from './gate.mjs';
const [, , command, projectDir, evidenceFile] = process.argv;
if(command!=='verify' || !projectDir || !evidenceFile) {
  console.error('Usage: node tools/harness-3d/cli.mjs verify <absolute-project-directory> <evidence-json-file>');
  process.exit(2);
}
try {
  const project=path.resolve(projectDir);
  const evidence=JSON.parse(await readFile(path.resolve(evidenceFile),'utf8'));
  // Trust public keys are provisioned by Studio backend; never commit issuer private keys.
  const {KHOSAN_3D_RENDERER_PUBLIC_KEY_FILE:renderFile,KHOSAN_3D_REVIEWER_PUBLIC_KEY_FILE:reviewFile,KHOSAN_3D_HUMAN_PUBLIC_KEY_FILE:humanFile}=process.env;
  const trust={renderer_public_key_pem:renderFile?await readFile(path.resolve(renderFile),'utf8'):null,reviewer_public_key_pem:reviewFile?await readFile(path.resolve(reviewFile),'utf8'):null,human_public_key_pem:humanFile?await readFile(path.resolve(humanFile),'utf8'):null};
  const result=await verify3DAcceptance(project,evidence,trust);
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.ok?0:1;
}catch(error){console.error(JSON.stringify({verdict:'BLOCKED',error:String(error.message||error)}));process.exitCode=2}