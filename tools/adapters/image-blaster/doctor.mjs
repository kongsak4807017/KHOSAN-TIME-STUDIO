#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PINNED = "4acb43ba126a12358f71838d1b1a05e856b10eaf";

function commandOk(command, args = ["--version"]) {
  const result = spawnSync(command, args, { stdio: "ignore", shell: false });
  return result.status === 0;
}

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

function gitHead(dir) {
  const result = spawnSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8", shell: false });
  return result.status === 0 ? result.stdout.trim() : null;
}

const externalRoot = process.env.KHOSAN_EXTERNAL_DIR || path.join(ROOT, "external");
const toolDir = path.resolve(process.env.KHOSAN_IMAGE_BLASTER_DIR || path.join(externalRoot, "image-blaster"));
const required = [
  "README.md",
  "LICENSE.md",
  ".claude/scripts/project/project-state.mjs",
  ".claude/scripts/world/generate-world.mjs",
  ".claude/scripts/asset-pipeline/generate-single-asset.mjs",
  ".claude/scripts/sfx/fal-elevenlabs-sfx.mjs"
];

const checks = {};
for (const rel of required) checks[rel] = await exists(path.join(toolDir, rel));

let nodeMajor = Number(process.versions.node.split(".")[0]);
let license = null;
if (checks["LICENSE.md"]) {
  license = (await readFile(path.join(toolDir, "LICENSE.md"), "utf8")).split(/\r?\n/)[0].trim();
}

const head = gitHead(toolDir);
const result = {
  tool: "image-blaster",
  source_dir: toolDir,
  node: { version: process.versions.node, pass: nodeMajor >= 20 },
  git: {
    available: commandOk("git"),
    head,
    pinned_commit: PINNED,
    pinned_match: head === PINNED
  },
  source_files: checks,
  license,
  providers: {
    world_labs: { configured: Boolean(process.env.WORLD_LABS_API_KEY) },
    fal: { configured: Boolean(process.env.FAL_KEY) }
  },
  optional_runtime: {
    ffmpeg: commandOk("ffmpeg"),
    ffprobe: commandOk("ffprobe"),
    bun: commandOk("bun")
  }
};

result.source_ready =
  result.node.pass &&
  result.git.available &&
  result.git.pinned_match &&
  Object.values(checks).every(Boolean);

result.generation_ready = {
  world: result.source_ready && result.providers.world_labs.configured,
  object_3d: result.source_ready && result.providers.fal.configured,
  sfx: result.source_ready && result.providers.fal.configured && result.optional_runtime.ffmpeg && result.optional_runtime.ffprobe
};

const json = JSON.stringify(result, null, 2);
console.log(json);
if (!result.source_ready) process.exitCode = 2;
