// Validate the integrity and structural coverage of the archived user-consolidated audit.
// Does NOT establish first-party Oriverse authenticity or recover original chat transcripts.
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const dir=path.join(root,"knowledge","oriverse-research");
const manifest=JSON.parse(await readFile(path.join(dir,"CONSOLIDATED-AUDIT-MANIFEST.json"),"utf8"));
const expect=(condition,message)=>{if(!condition)throw new Error("[archive] "+message)};
expect(manifest.parts===21&&manifest.questions_covered===200,"manifest expected 21 parts / 200 questions");
expect(manifest.files.length===21,"manifest file count");
let content="",questions=0;
for(let i=0;i<manifest.files.length;i++){
 const meta=manifest.files[i],file=path.resolve(dir,meta.path);
 expect(file.startsWith(dir+path.sep),"unsafe path "+meta.path);
 const text=await readFile(file,"utf8");
 expect(text.length===meta.characters,meta.path+" character-length mismatch");
 content+=text;
 if(i===0){expect(meta.question_ids.length===0,"background question list must be empty");continue}
 expect(meta.question_ids.length===10,meta.path+" should contain 10 question IDs");
 const match=[...text.matchAll(/^(\d{3})\s*(?:[.।]|[—–-])\s+/gm)].map(m=>m[1]);
 for(const id of meta.question_ids){
  expect(match.includes(id),meta.path+" is missing question "+id);
  questions++;
 }
}
expect(questions===200,"question coverage "+questions);
expect(content.length===manifest.characters_total,"total text length mismatch");
console.log("[Oriverse/Weave consolidated audit] PASS");
console.log(" - 21 parts, "+content.length+" characters");
console.log(" - 200/200 question headings across 20 TRRs");
console.log(" - This validates archive structure only; original transcript recovery remains incomplete");
