import {readdir,stat,readFile} from "node:fs/promises";
import path from "node:path";
const GROUPS={assets:["assets"],world:["world"],gameplay:["gameplay"],ui:["ui"],narrative:["narrative"],shaders:["shaders"],tests:["tests"],builds:["builds"]};
const MAX_FILES=2000,MAX_DEPTH=7;
function ignored(name){return name.startsWith(".")||["node_modules","dist","build",".git","cache"].includes(name)}
export async function inventoryProject(root){
 const groups={},files=[];let truncated=false;
 for(const [group,prefixes] of Object.entries(GROUPS)){
  let count=0;const seen=new Set();
  async function scan(dir,rel,depth){
   if(depth>MAX_DEPTH||files.length>=MAX_FILES){truncated=true;return}
   let entries;try{entries=await readdir(dir,{withFileTypes:true})}catch{return}
   entries.sort((a,b)=>a.name.localeCompare(b.name));
   for(const entry of entries){
    if(ignored(entry.name)||entry.isSymbolicLink())continue;
    if(files.length>=MAX_FILES){truncated=true;break}
    const relative=path.posix.join(rel,entry.name),full=path.join(dir,entry.name);
    if(entry.isDirectory()){await scan(full,relative,depth+1);continue}
    if(!entry.isFile())continue;
    const fs=await stat(full).catch(()=>null);if(!fs||!fs.isFile())continue;
    count++;seen.add(path.extname(entry.name).toLowerCase()||"(none)");
    files.push({path:relative,group,bytes:fs.size,modified_at:fs.mtime.toISOString()})
   }
  }
  for(const prefix of prefixes)await scan(path.join(root,prefix),prefix,0);
  groups[group]={files:count,extensions:[...seen].sort()};
 }
 return {schema:"khosan.project.inventory.v1",root,groups,file_count:files.length,truncated,files};
}
export async function inspectProjectContent(root){
 const inventory=await inventoryProject(root),preview={};
 const candidates=["project.json","khosan-project.json","blueprint.json","creative-constitution.json","world/scene.json","gameplay/systems.json"];
 for(const relative of candidates){try{const p=path.join(root,...relative.split("/"));const data=await readFile(p,"utf8");if(data.length<=256*1024)preview[relative]=JSON.parse(data)}catch{}}
 return {...inventory,documents:preview}
}
