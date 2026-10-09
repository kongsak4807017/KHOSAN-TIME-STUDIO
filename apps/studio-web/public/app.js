const $=(s)=>document.querySelector(s);const $$=(s)=>[...document.querySelectorAll(s)];
let library={active_project_id:null,projects:[],projects_root:""};
async function api(path,options={}){const res=await fetch(path,{headers:{"content-type":"application/json"},...options});const data=await res.json();if(!res.ok)throw new Error(data.error||"request failed");return data}
function view(name){$$(".view").forEach(v=>v.classList.remove("active"));$("#view-"+name)?.classList.add("active");$$("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$("#title").textContent=({home:"Studio Home",idea:"Idea / Concept Lab",projects:"Projects",agents:"Agent Workboard",tools:"Tool Registry"})[name]||"KHOSAN";if(name==="projects")loadProjects();if(name==="agents")loadTasks();if(name==="tools")loadTooling()}
$$("nav button").forEach(b=>b.addEventListener("click",()=>view(b.dataset.view)));

async function health(){try{const h=await api("/api/health");$("#healthDot").classList.add("ok");$("#healthText").textContent="Local Studio ready · "+h.version;await refreshLibrary()}catch{$("#healthText").textContent="Studio API unavailable"}}

async function refreshLibrary(){
  const r=await api("/api/project-library");
  library=r;
  const select=$("#projectSwitcher");
  const current=r.active_project_id||"";
  select.innerHTML="<option value=''>No active project</option>";
  for(const p of r.projects){
    const o=document.createElement("option");
    o.value=p.id;o.textContent=p.name+" · "+p.id;
    if(p.id===current)o.selected=true;
    select.appendChild(o);
  }
  const root=$("#projectsRoot");if(root)root.textContent="Project root: "+r.projects_root;
  renderActiveProject();
  return r;
}

async function showProjectInventory(id){
  const box=$("#projectInventory");if(!box)return;
  box.textContent="Scanning actual game folders…";
  try{
    const inventory=await api("/api/projects/"+encodeURIComponent(id)+"/inventory");
    box.textContent=JSON.stringify({project_id:inventory.project_id,root:inventory.root,file_count:inventory.file_count,groups:inventory.groups,files:inventory.files,documents:inventory.documents,truncated:inventory.truncated},null,2);
  }catch(error){box.textContent="Inventory error: "+error.message}
}
$("#scanExistingBtn")?.addEventListener("click",async()=>{
  try{const r=await api("/api/projects/import-candidates"),select=$("#existingFolder");
    select.replaceChildren();for(const p of r.candidates){const o=document.createElement("option");o.value=p.folder;o.textContent=p.folder;select.appendChild(o)}
    $("#importResult").textContent=r.candidates.length+" unregistered folders found under "+r.projects_root;
  }catch(e){$("#importResult").textContent=e.message}
});
$("#registerExistingBtn")?.addEventListener("click",async()=>{
  const folder=$("#existingFolder").value;if(!folder)return;
  if(!confirm("Register existing game folder '"+folder+"' without replacing game files?"))return;
  try{await api("/api/projects/register-existing",{method:"POST",body:JSON.stringify({folder,confirm:true,activate:true})});
    $("#importResult").textContent="Registered "+folder;await loadProjects();
  }catch(e){$("#importResult").textContent=e.message}
});
function renderActiveProject(){
  const p=library.projects.find(x=>x.id===library.active_project_id);
  const box=$("#activeProjectBanner");
  if(!box)return;
  if(!p){
    box.innerHTML="<span class='eyebrow'>PROJECT CONTEXT</span><h3>No active project</h3><p class='muted'>Create or activate a game project before production work. Idea exploration can still begin without one.</p>";
    return;
  }
  box.innerHTML="<span class='eyebrow'>ACTIVE PROJECT</span><h3>"+esc(p.name)+"</h3><p class='muted'>"+esc(p.id)+" · "+esc(p.target||"") +" · project-scoped writes only</p>";
}

$("#projectSwitcher").addEventListener("change",async(e)=>{
  const id=e.target.value;
  if(!id){e.target.value=library.active_project_id||"";return}
  try{await activateProject(id,false);if($("#view-projects").classList.contains("active"))await loadProjects()}catch(err){alert(err.message);await refreshLibrary()}
});

$("#routeBtn").addEventListener("click",async()=>{
  const text=$("#intent").value.trim();if(!text)return;
  try{
    const out=await api("/api/orchestrate",{method:"POST",body:JSON.stringify({text,project_id:library.active_project_id||null})});
    $("#routeOut").classList.remove("hidden");$("#routeOut").textContent=JSON.stringify(out,null,2)
  }catch(e){$("#routeOut").classList.remove("hidden");$("#routeOut").textContent=e.message}
});
$("#exploreBtn").addEventListener("click",()=>{$("#projectBrief").value=$("#intent").value;view("idea")});

$("#createProjectBtn").addEventListener("click",async()=>{
  const payload={name:$("#projectName").value,brief:$("#projectBrief").value,target:$("#projectTarget").value,activate:$("#activateOnCreate").checked};
  try{
    const r=await api("/api/projects",{method:"POST",body:JSON.stringify(payload)});
    $("#createResult").textContent="Created "+r.project.id+" · isolated project workspace initialized.";
    await refreshLibrary();
    setTimeout(()=>view("projects"),400)
  }catch(e){$("#createResult").textContent=e.message}
});

async function activateProject(id,open=true){
  await api("/api/projects/"+encodeURIComponent(id)+"/activate",{method:"POST",body:"{}"});
  await refreshLibrary();
  if(open)await openProject(id);
}

async function loadProjects(){
  const box=$("#projectList");box.innerHTML="<p class='muted'>Loading…</p>";
  try{
    const r=await refreshLibrary();
    if(!r.projects.length){box.innerHTML="<p class='muted'>No projects yet. Open Idea / Concept Lab to create one.</p>";return}
    box.innerHTML="";
    for(const p of r.projects){
      const card=document.createElement("article");
      card.className="projectcard "+(p.id===r.active_project_id?"activeProject":"");
      card.innerHTML="<div><span class='eyebrow'>"+(p.id===r.active_project_id?"ACTIVE PROJECT":"PROJECT")+"</span><h3>"+esc(p.name)+"</h3><p>"+esc(p.phase||"")+"</p><small>"+esc(p.target||"")+" · "+esc(p.id)+"</small></div><div class='cardActions'><button class='openProjectBtn'>Open</button>"+(p.id===r.active_project_id?"<span class='activeTag'>ACTIVE</span>":"<button class='activateProjectBtn'>Activate</button>")+"</div>";
      card.querySelector(".openProjectBtn").onclick=()=>openProject(p.id);
      card.querySelector(".activateProjectBtn")?.addEventListener("click",()=>activateProject(p.id,true));
      box.appendChild(card)
    }
  }catch(e){box.textContent=e.message}
}
$("#refreshProjects").addEventListener("click",loadProjects);

async function openProject(id){
  const [r,w]=await Promise.all([api("/api/projects/"+encodeURIComponent(id)),api("/api/projects/"+encodeURIComponent(id)+"/workspace")]);
  const d=$("#projectDetail");d.classList.remove("hidden");
  d.innerHTML="<div class='detailHead'><div><span class='eyebrow'>"+(r.project.is_active?"ACTIVE PROJECT":"PROJECT")+"</span><h2>"+esc(r.project.name)+"</h2></div>"+(r.project.is_active?"<span class='activeTag'>ACTIVE</span>":"<button id='activateDetail'>Activate Project</button>")+"</div><p>"+esc(r.project.brief||"No brief")+"</p><div class='meta'><b>Project ID</b> "+esc(r.project.id)+" · <b>Phase</b> "+esc(r.project.phase)+" · <b>Target</b> "+esc(r.project.target)+"</div><h3>Workspace boundary</h3><pre class='console'>"+esc(JSON.stringify(w,null,2))+"</pre><h3>Project manifest</h3><pre class='console'>"+esc(JSON.stringify(r.manifest,null,2))+"</pre><h3>Creative Constitution</h3><p class='muted'>Status: "+esc(r.creative_constitution.status||"draft")+" · human approved: "+String(!!r.creative_constitution.approved_by_human)+"</p>";
  d.insertAdjacentHTML("beforeend","<h3>Actual Game Folder Inventory</h3><p class='muted'>Files from assets / world / gameplay / ui / narrative / shaders / tests / builds</p><pre id='projectInventory' class='console'>Loading…</pre>");
  await showProjectInventory(id);
  d.insertAdjacentHTML("beforeend","<h3>Source Code Index</h3><p class='muted'>Read-only symbols/imports; excludes large files and sensitive filenames.</p><pre class='console' id='sourceIndex'>Loading…</pre>");
  try{const index=await api("/api/projects/"+encodeURIComponent(id)+"/source-index");
    $("#sourceIndex").textContent=JSON.stringify(index,null,2);
  }catch(e){$("#sourceIndex").textContent=e.message}
  $("#activateDetail")?.addEventListener("click",()=>activateProject(id,true));
}

async function loadTasks(){
  const box=$("#taskList");if(!box)return;box.innerHTML="<p class='muted'>Loading…</p>";
  try{
    const r=await api("/api/tasks");
    if(!r.tasks.length){box.innerHTML="<p class='muted'>No JSON work items found.</p>";return}
    box.innerHTML="";
    for(const t of r.tasks){
      const el=document.createElement("article");el.className="glass";
      el.innerHTML="<span class='eyebrow'>"+esc(t.status||"unknown")+"</span><h3>"+esc(t.task_id||"TASK")+"</h3><p>"+esc(t.title||t.objective||"")+"</p><small class='muted'>Owner: "+esc(t.owner_role||"unassigned")+"</small>";
      box.appendChild(el)
    }
  }catch(e){box.textContent=e.message}
}
$("#refreshTasks")?.addEventListener("click",loadTasks);

async function loadTooling(){
  try{
    const r=await api("/api/studio");
    $("#toolStatus").textContent=JSON.stringify({external_tools:r.external_tools,shared_roots:r.shared_roots,project_library:r.project_library},null,2)
  }catch(e){$("#toolStatus").textContent=e.message}
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
health();
