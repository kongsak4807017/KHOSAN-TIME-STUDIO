/** Client of the local signed IPC gateway. It never signs a command itself. */
import net from 'node:net';
import {readFile} from 'node:fs/promises';
export async function callGateway(socketPath,command){
 if(typeof socketPath!=='string'||!socketPath)throw Error('socket path required');
 const input=JSON.stringify(command)+'\n';if(Buffer.byteLength(input)>1024*1024)throw Error('command exceeds budget');
 return new Promise((resolve,reject)=>{
  const s=net.createConnection(socketPath);let text='',done=false;
  const fail=e=>{if(done)return;done=true;s.destroy();reject(e)};
  s.setTimeout(30000,()=>fail(Error('gateway timeout')));
  s.on('connect',()=>s.write(input));
  s.on('error',fail);
  s.on('data',chunk=>{text+=chunk.toString('utf8');if(text.length>1024*1024)fail(Error('gateway output oversized'))});
  s.on('end',()=>{if(done)return;done=true;try{resolve(JSON.parse(text.trim()))}catch(e){reject(Error('invalid response: '+e.message))}});
 });
}
if(process.argv[1]&&new URL(import.meta.url).pathname.replaceAll('\\','/').endsWith('/'+process.argv[1].replaceAll('\\','/').split('/').pop())){
 const [, ,socketPath,file]=process.argv;
 if(!socketPath||!file){console.error('Usage: node gateway-client.mjs <local-pipe-path> <signed-command.json>');process.exitCode=2}
 else{
  try{const req=JSON.parse(await readFile(file,'utf8'));const resp=await callGateway(socketPath,req);console.log(JSON.stringify(resp,null,2));process.exitCode=resp.ok?0:1}
  catch(e){console.error(JSON.stringify({ok:false,verdict:'BLOCKED',error:e.message}));process.exitCode=2}
 }
}