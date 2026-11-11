#!/usr/bin/env node
/** Local privileged entrypoint. No shell subcommands, no HTTP write surface.
 * Run under a dedicated service account; NEVER from an unrestricted Maker shell.
 * Usage:
 *   node gateway-cli.mjs execute <project-root> <trust-file> <server-private-key-file> <signed-command.json>
 *   node gateway-cli.mjs status <project-root> <trust-file> <project-id> <task-id>
 */
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {executeTrustedCommand,readTrustedStatus} from './trusted-gateway.mjs';
const [, ,mode,projectRoot,trustPath,first,second]=process.argv;
const error=(message)=>{console.error(JSON.stringify({ok:false,verdict:'BLOCKED',error:message}));process.exitCode=1};
try{
 if(!['execute','status'].includes(mode)||!projectRoot||!trustPath)throw Error('usage: gateway-cli.mjs execute <project-root> <trust-file> <server-private-key-file> <signed-command.json> | status <project-root> <trust-file> <project-id> <task-id>');
 const root=await realpath(projectRoot),trustFile=await realpath(trustPath);
 const overlap=p=>{const r=path.relative(root,p);return !r||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r))};
 if(overlap(trustFile))throw Error('trust config must be stored outside the game project');
 const trust=JSON.parse(await readFile(trustFile,'utf8'));
 let result;
 if(mode==='execute'){
  if(!first||!second)throw Error('execute requires separate trusted server private-key file and request file');
  const keyFile=await realpath(first);if(overlap(keyFile))throw Error('server signing key must be stored outside the game project');
  const serverPrivateKey=await readFile(keyFile,'utf8');
  const request=JSON.parse(await readFile(second,'utf8'));
  result=await executeTrustedCommand({projectRoot:root,trust,serverPrivateKey,request});
 }else{
  if(!first||!second)throw Error('status requires project ID and task ID');
  result=await readTrustedStatus({projectRoot:root,trust,projectId:first,taskId:second});
 }
 console.log(JSON.stringify(result,null,2));
}catch(e){error(String(e.message||e))}