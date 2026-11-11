/** Client of the local signed IPC gateway. It never signs a command itself. */
import net from 'node:net';
import {readFile} from 'node:fs/promises';
import {verifyGatewayResponse} from './trusted-gateway.mjs';
export async function callGateway(socketPath,command,serverPublicKeyPem){
 if(typeof socketPath!=='string'||!socketPath)throw Error('socket path required');
 const input=JSON.stringify(command)+'\n';if(Buffer.byteLength(input)>1024*1024)throw Error('command exceeds budget');
 return new Promise((resolve,reject)=>{
  const s=net.createConnection(socketPath);let text='',done=false;
  const fail=e=>{if(done)return;done=true;s.destroy();reject(e)};
  s.setTimeout(30000,()=>fail(Error('gateway timeout')));
  s.on('connect',()=>s.write(input));
  s.on('error',fail);
  s.on('data',chunk=>{text+=chunk.toString('utf8');if(text.length>1024*1024)fail(Error('gateway output oversized'))});
  s.on('end',()=>{if(done)return;done=true;try{const response=JSON.parse(text.trim());if(!verifyGatewayResponse(response,serverPublicKeyPem))throw Error('gateway response signature invalid or untrusted');resolve(response)}catch(e){reject(Error('invalid response: '+e.message))}});
 });
}
if(process.argv[1]&&new URL(import.meta.url).pathname.replaceAll('\\','/').endsWith('/'+process.argv[1].replaceAll('\\','/').split('/').pop())){
 const [, ,socketPath,trustFile,file]=process.argv;
 if(!socketPath||!trustFile||!file){console.error('Usage: node gateway-client.mjs <local-pipe-path> <trust.json> <signed-command.json>');process.exitCode=2}
 else{
  try{const trust=JSON.parse(await readFile(trustFile,'utf8'));const req=JSON.parse(await readFile(file,'utf8'));const resp=await callGateway(socketPath,req,trust.server?.public_key_pem);console.log(JSON.stringify(resp,null,2));process.exitCode=resp.ok?0:1}
  catch(e){console.error(JSON.stringify({ok:false,verdict:'BLOCKED',error:e.message}));process.exitCode=2}
 }
}