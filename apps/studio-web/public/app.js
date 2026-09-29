import { mountHumanLab } from "./human-lab.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "content-type": "application/json" }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "request failed");
  return data;
}

function view(name) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $("#view-" + name)?.classList.add("active");
  $$("nav button").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  $("#title").textContent = ({
    home: "Studio Home",
    idea: "Idea / Concept Lab",
    projects: "Projects",
    human: "Human Lab",
    agents: "Agent Workboard",
    tools: "Tool Registry"
  })[name] || "KHOSAN";

  if (name === "projects") loadProjects();
  if (name === "human") mountHumanLab();
  if (name === "agents") loadTasks();
  if (name === "tools") loadTooling();
}

$$("nav button").forEach(b => b.addEventListener("click", () => view(b.dataset.view)));

async function health() {
  try {
    const h = await api("/api/health");
    $("#healthDot").classList.add("ok");
    $("#healthText").textContent = "Local Studio ready · " + h.version;
  } catch {
    $("#healthText").textContent = "Studio API unavailable";
  }
}

$("#routeBtn").addEventListener("click", async () => {
  const text = $("#intent").value.trim();
  if (!text) return;
  const out = await api("/api/orchestrate", { method: "POST", body: JSON.stringify({ text }) });
  $("#routeOut").classList.remove("hidden");
  $("#routeOut").textContent = JSON.stringify(out, null, 2);
});

$("#exploreBtn").addEventListener("click", () => {
  $("#projectBrief").value = $("#intent").value;
  view("idea");
});

$("#createProjectBtn").addEventListener("click", async () => {
  const payload = {
    name: $("#projectName").value,
    brief: $("#projectBrief").value,
    target: $("#projectTarget").value
  };
  try {
    const r = await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    $("#createResult").textContent = "Created " + r.project.id + " · durable project files initialized.";
    setTimeout(() => view("projects"), 500);
  } catch (e) {
    $("#createResult").textContent = e.message;
  }
});

async function loadProjects() {
  const box = $("#projectList");
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    const r = await api("/api/projects");
    if (!r.projects.length) {
      box.innerHTML = "<p class='muted'>No projects yet. Open Idea / Concept Lab to create one.</p>";
      return;
    }
    box.innerHTML = "";
    for (const p of r.projects) {
      const el = document.createElement("button");
      el.className = "projectcard";
      el.innerHTML =
        "<b>" + esc(p.name) + "</b><span>" + esc(p.phase) + "</span><small>" +
        esc(p.target) + " · " + esc(p.id) + "</small>";
      el.onclick = () => openProject(p.id);
      box.appendChild(el);
    }
  } catch (e) {
    box.textContent = e.message;
  }
}

$("#refreshProjects").addEventListener("click", loadProjects);

async function loadTasks() {
  const box = $("#taskList");
  if (!box) return;
  box.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    const r = await api("/api/tasks");
    if (!r.tasks.length) {
      box.innerHTML = "<p class='muted'>No JSON work items found.</p>";
      return;
    }
    box.innerHTML = "";
    for (const t of r.tasks) {
      const el = document.createElement("article");
      el.className = "glass";
      el.innerHTML =
        "<span class='eyebrow'>" + esc(t.status || "unknown") + "</span><h3>" +
        esc(t.task_id || "TASK") + "</h3><p>" + esc(t.title || t.objective || "") +
        "</p><small class='muted'>Owner: " + esc(t.owner_role || "unassigned") + "</small>";
      box.appendChild(el);
    }
  } catch (e) {
    box.textContent = e.message;
  }
}

$("#refreshTasks")?.addEventListener("click", loadTasks);

async function openProject(id) {
  const r = await api("/api/projects/" + encodeURIComponent(id));
  const d = $("#projectDetail");
  d.classList.remove("hidden");
  d.innerHTML =
    "<span class='eyebrow'>PROJECT</span><h2>" + esc(r.project.name) + "</h2><p>" +
    esc(r.project.brief || "No brief") + "</p><div class='meta'><b>Phase</b> " +
    esc(r.project.phase) + " · <b>Target</b> " + esc(r.project.target) +
    "</div><h3>Creative Constitution</h3><p class='muted'>Status: " +
    esc(r.creative_constitution.status || "draft") + " · human approved: " +
    String(!!r.creative_constitution.approved_by_human) +
    "</p><h3>Blueprint</h3><pre class='console'>" +
    esc(JSON.stringify(r.blueprint, null, 2)) + "</pre>";
}

async function loadTooling() {
  try {
    const r = await api("/api/studio");
    $("#toolStatus").textContent = JSON.stringify(r.external_tools, null, 2);
  } catch (e) {
    $("#toolStatus").textContent = e.message;
  }
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

health();
