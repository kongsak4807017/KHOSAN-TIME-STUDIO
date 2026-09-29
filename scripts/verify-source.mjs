import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "AGENTS.md",
  "feature_list.json",
  "studio/studio_state.json",
  "studio/graph.md",
  "apps/studio-server/server.mjs",
  "apps/studio-web/public/index.html",
  "apps/studio-web/public/app.js",
  "apps/studio-web/public/human-dna.js",
  "apps/studio-web/public/human-lab.js",
  "apps/studio-web/public/human-webgpu.js",
  "apps/studio-web/public/human-morph-skin.wgsl",
  "config/external-tools.lock.json",
  "tools/adapters/rigging/doctor.py",
  "docs/18-DEVSPACE-CONNECTIVITY.md",
  "docs/19-CHATGPT-DEVSPACE-PERSISTENT-WORKSPACE.md",
  "docs/20-HUMAN-ENGINE-WEBGPU-V0.1.md",
  "config/devspace.example.json",
  "tools/devspace-connectivity/doctor.py",
  "studio/tasks/TASK-HUMAN-001.json"
];

const errors = [];

for (const rel of required) {
  try {
    await access(path.join(ROOT, rel));
  } catch {
    errors.push("missing: " + rel);
  }
}

for (const rel of [
  "feature_list.json",
  "studio/studio_state.json",
  "config/external-tools.lock.json",
  "studio/tasks/TASK-HUMAN-001.json"
]) {
  try {
    JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
  } catch (e) {
    errors.push("invalid json " + rel + ": " + e.message);
  }
}

if (errors.length) {
  console.error("[KHOSAN SOURCE] FAIL\n - " + errors.join("\n - "));
  process.exit(1);
}

console.log("[KHOSAN SOURCE] PASS");
console.log(" - deployable Studio shell source present");
console.log(" - Human Engine v0.1 source present");
console.log(" - core runtime JSON parses");
