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
  const result=await verify3DAcceptance(project,evidence);
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.ok?0:1;
}catch(error){console.error(JSON.stringify({verdict:'BLOCKED',error:String(error.message||error)}));process.exitCode=2}