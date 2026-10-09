import {readFile} from "node:fs/promises";
import path from "node:path";
import {inventoryProject} from "./project-inventory.mjs";
const CODE=new Set([".js",".mjs",".cjs",".ts",".tsx",".jsx",".cs",".py",".gd",".lua",".wgsl",".glsl",".hlsl",".shader",".cpp",".hpp",".h",".c",".rs",".go",".java"]);
const SECRET=/(^|\/)(\.env|secrets?|credentials?|private[-_]?key|id_rsa|\.npmrc|\.pypirc)(\.|\/|$)/i;
const MAX_SOURCE_BYTES=128*1024,MAX_SOURCE_FILES=250;
function analyze(content,ext){
 const lines=content.split(/\r?\n/),imports=[],symbols=[];
 const importRe=/(?:^\s*import\s+.*?from\s*|^\s*(?:import|require)\s*\(|^\s*using\s+|^\s*#include\s*)["'<]?([\w@./-]+)/;
 const symbolRe=/\b(?:export\s+)?(?:async\s+)?(?:class|function|interface|struct|enum|def|func|fn)\s+([A-Za-z_$][\w$]*)|\b(?:public|private|protected)\s+(?:static\s+)?(?:async\s+)?[\w<>?\[\]]+\s+([A-Za-z_$][\w$]*)\s*\(/;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(line.length>2000)continue;
  if(imports.length<80){const m=line.match(importRe);if(m)imports.push({module:m[1],line:i+1})}
  if(symbols.length<150){const m=line.match(symbolRe);if(m)symbols.push({name:m[1]||m[2],line:i+1})}
 }
 return {language:ext.slice(1),lines:lines.length,imports,symbols};
}
export async function indexProjectSource(root){
 const inventory=await inventoryProject(root),sources=[];let skipped_large=0,skipped_sensitive=0;
 for(const file of inventory.files){
  const ext=path.extname(file.path).toLowerCase();
  if(!CODE.has(ext))continue;
  if(SECRET.test(file.path)){skipped_sensitive++;continue}
  if(file.bytes>MAX_SOURCE_BYTES){skipped_large++;continue}
  if(sources.length>=MAX_SOURCE_FILES)break;
  const full=path.resolve(root,...file.path.split("/"));
  if(!full.startsWith(path.resolve(root)+path.sep))continue;
  try{const content=await readFile(full,"utf8");if(content.includes("\0"))continue;
   sources.push({path:file.path,bytes:file.bytes,...analyze(content,ext)});
  }catch{}
 }
 return {schema:"khosan.project.source-index.v1",root,source_files:sources.length,total_files:inventory.file_count,inventory_truncated:inventory.truncated,source_truncated:sources.length>=MAX_SOURCE_FILES,skipped_large,skipped_sensitive,sources};
}
