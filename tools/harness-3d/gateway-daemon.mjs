/** Local named-pipe/Unix-socket IPC gateway: JSON Lines, one signed command per
 * connection. No HTTP or arbitrary filesystem/exec APIs. Must run under a
 * dedicated protected OS principal; Node cannot enforce account separation.
 */
import net from 'node:net';
import {readFile} from 'node:fs/promises';
import {executeTrustedCommand,validateTrust,signGatewayResponse,verifyGatewayResponse} from './trusted-gateway.mjs';

export function startGatewayDaemon({trust,serverPrivateKey,socketPath,maxConnections=16,maxFrameBytes=1024*1024}){
 validateTrust(trust);
 if(typeof serverPrivateKey!=='string'||!serverPrivateKey.includes('PRIVATE KEY'))throw Error('protected signing key missing');
 const probe=signGatewayResponse({probe:'khosan-gateway'},serverPrivateKey);if(!verifyGatewayResponse(probe,trust.server.public_key_pem))throw Error('server private key does not match pinned trust public key');
 if(typeof socketPath!=='string'||!socketPath||socketPath.length>255)throw Error('invalid socket path');
 if(!Number.isInteger(maxConnections)||maxConnections<1||maxConnections>100||!Number.isInteger(maxFrameBytes)||maxFrameBytes<128||maxFrameBytes>1048576)throw Error('invalid IPC budgets');
 let active=0;
 const server=net.createServer(connection=>{
  if(active>=maxConnections){connection.destroy();return}
  active++;
  connection.setTimeout(30000,()=>connection.destroy());
  let finished=false,received=Buffer.alloc(0);
  function respond(obj){
   if(finished)return;finished=true;
   try{connection.end(JSON.stringify(obj)+'\n')}catch{connection.destroy()}
  }
  connection.once('close',()=>{active=Math.max(0,active-1)});
  connection.on('error',()=>{ /* response already failed closed */ });
  connection.on('data',async chunk=>{
   if(finished)return;
   if(received.length+chunk.length>maxFrameBytes){respond({ok:false,verdict:'BLOCKED',error:'frame size limit exceeded'});return}
   received=Buffer.concat([received,chunk]);
   const newline=received.indexOf(10);if(newline<0)return;
   if(received.subarray(newline+1).toString('utf8').trim()){respond({ok:false,verdict:'BLOCKED',error:'exactly one JSON frame is allowed'});return}
   finished=true;
   try{
    const request=JSON.parse(received.subarray(0,newline).toString('utf8'));
    const projectRoot=trust.projects?.[request?.project_id];
    if(typeof projectRoot!=='string')throw Error('project not pinned in trust registry');
    const result=await executeTrustedCommand({projectRoot,trust,serverPrivateKey,request});
    connection.end(JSON.stringify(result)+'\n');
   }catch(e){connection.end(JSON.stringify({ok:false,verdict:'BLOCKED',error:String(e.message||e).slice(0,250)})+'\n')}
  });
 });
 server.listen(socketPath);
 return server;
}

// Run `node gateway-daemon.mjs serve <public-trust-file> <protected-private-key-file> <pipe-path>`.
// The process must be started by a trusted Windows service / OS supervisor,
// not by the untrusted maker, and must NEVER be exposed on a network port.
if(process.argv[1]&&new URL(import.meta.url).pathname.replaceAll('\\','/').endsWith('/'+process.argv[1].replaceAll('\\','/').split('/').pop())){
 const [, ,mode,trustFile,keyFile,socketPath]=process.argv;
 if(mode!=='serve'||!trustFile||!keyFile||!socketPath){console.error('Usage: node gateway-daemon.mjs serve <trust.json> <server-private.pem> <local-pipe-path>');process.exitCode=2}
 else {
  try{
   const trust=JSON.parse(await readFile(trustFile,'utf8'));
   const key=await readFile(keyFile,'utf8');
   const server=startGatewayDaemon({trust,serverPrivateKey:key,socketPath});
   server.on('listening',()=>console.log('[KHOSAN TRUSTED GATEWAY] local IPC ready; NEVER run as maker OS account'));
   server.on('error',e=>{console.error('[BLOCKED] IPC error: '+e.message);process.exitCode=1});
  }catch(e){console.error('[BLOCKED] '+e.message);process.exitCode=1}
 }
}