#!/usr/bin/env node
/** Role-scoped local request signer. Only give Maker its own Maker key;
 * Controller/Renderer/Reviewer/Human keys belong to different OS identities.
 * Signing does not authorize an operation: trusted gateway enforces role,
 * stage, project, nonce, expiry, source revision and tool semantics.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {sign} from 'node:crypto';
import {envelopeBody} from './trusted-gateway.mjs';
const [, ,mode,keyFile,requestFile,outputFile]=process.argv;
if(mode!=='sign'||!keyFile||!requestFile||!outputFile){console.error('Usage: node gateway-sign.mjs sign <role-private-key.pem> <unsigned.json> <signed-output.json>');process.exitCode=2}
else {
 try{
  const request=JSON.parse(await readFile(requestFile,'utf8'));
  if(Object.hasOwn(request,'signature_base64'))throw Error('unsigned input must not already have signature');
  const privateKey=await readFile(keyFile,'utf8');
  if(!privateKey.includes('PRIVATE KEY'))throw Error('private Ed25519 signing key missing');
  const signed={...request,signature_base64:sign(null,Buffer.from(envelopeBody(request)),privateKey).toString('base64')};
  await writeFile(outputFile,JSON.stringify(signed,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({ok:true,signed_file:outputFile,role:request.actor?.role,action:request.action}));
 }catch(e){console.error(JSON.stringify({ok:false,verdict:'BLOCKED',error:e.message}));process.exitCode=1}
}