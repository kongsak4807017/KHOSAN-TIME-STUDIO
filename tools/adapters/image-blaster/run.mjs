#!/usr/bin/env node
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function parse(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) { positional.push(token); continue; }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { flags[key] = next; i++; }
    else flags[key] = true;
  }
  return { flags, positional };
}

function requireValue(flags, name) {
  const value = flags[name];
  if (!value || value === true) throw new Error(`--${name} is required`);
  return String(value);
}

function boolFlag(value) {
  if (value === undefined) return false;
  if (value === true) return true;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function runNode(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: false
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const { flags, positional } = parse(process.argv.slice(2));
const action = positional[0] || flags.action;
if (!action || !["project", "world", "object", "sfx"].includes(action)) {
  throw new Error("Usage: npm run image-blaster -- <project|world|object|sfx> --project-root <path> --world <slug> [options]");
}

const projectRoot = path.resolve(requireValue(flags, "project-root"));
const world = requireValue(flags, "world");
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(world)) {
  throw new Error("--world must be a lowercase slug using a-z, 0-9 and hyphen");
}

const externalRoot = process.env.KHOSAN_EXTERNAL_DIR || path.join(ROOT, "external");
const toolDir = path.resolve(process.env.KHOSAN_IMAGE_BLASTER_DIR || path.join(externalRoot, "image-blaster"));
const workRoot = path.join(projectRoot, "assets", "generated", "image-blaster");
await mkdir(workRoot, { recursive: true });

if (action !== "project" && !boolFlag(flags["allow-paid"])) {
  throw new Error("Generation may incur provider charges. Re-run with --allow-paid after confirming the external API cost.");
}

if (action === "project") {
  const script = path.join(toolDir, ".claude", "scripts", "project", "project-state.mjs");
  const args = ["--world", world];
  if (boolFlag(flags["stage-input"])) args.push("--stage-input");
  runNode(script, args, workRoot);
  process.exit(0);
}

if (action === "world") {
  const script = path.join(toolDir, ".claude", "scripts", "world", "generate-world.mjs");
  const args = ["--world", world];
  if (flags.image) args.push("--image", path.resolve(projectRoot, String(flags.image)));
  if (flags.prompt) args.push("--prompt", String(flags.prompt));
  if (boolFlag(flags.regenerate)) args.push("--regenerate");
  runNode(script, args, workRoot);
  process.exit(0);
}

if (action === "object") {
  const script = path.join(toolDir, ".claude", "scripts", "asset-pipeline", "generate-single-asset.mjs");
  const args = ["--world", world];
  if (flags["object-id"]) args.push("--object-id", String(flags["object-id"]));
  if (flags.image) args.push("--image", path.resolve(projectRoot, String(flags.image)));
  if (flags["object-name"]) args.push("--object-name", String(flags["object-name"]));
  if (flags.description) args.push("--description", String(flags.description));
  if (flags["image-edit-prompt"]) args.push("--image-edit-prompt", String(flags["image-edit-prompt"]));
  if (flags.provider) args.push("--provider", String(flags.provider));
  if (flags["face-count"]) args.push("--face-count", String(flags["face-count"]));
  if (flags["target-polycount"]) args.push("--target-polycount", String(flags["target-polycount"]));
  if (flags["generate-type"]) args.push("--generate-type", String(flags["generate-type"]));
  if (flags["polygon-type"]) args.push("--polygon-type", String(flags["polygon-type"]));
  if (flags["enable-pbr"]) args.push("--enable-pbr", String(flags["enable-pbr"]));
  if (boolFlag(flags.regenerate)) args.push("--regenerate");
  if (boolFlag(flags["regenerate-reference"])) args.push("--regenerate-reference");
  runNode(script, args, workRoot);
  process.exit(0);
}

if (action === "sfx") {
  const script = path.join(toolDir, ".claude", "scripts", "sfx", "fal-elevenlabs-sfx.mjs");
  const prompt = requireValue(flags, "prompt");
  const kind = String(flags.kind || "arbitrary");
  const outputDir = path.join(workRoot, "worlds", world, "output", "sfx");
  await mkdir(outputDir, { recursive: true });
  const args = [
    "--prompt", prompt,
    "--output-dir", outputDir,
    "--prefix", String(flags.prefix || "khosan-sfx"),
    "--count", String(flags.count || "1"),
    "--kind", kind,
    "--duration-seconds", String(flags["duration-seconds"] || "2"),
    "--postprocess", "true"
  ];
  if (boolFlag(flags.loop)) args.push("--loop");
  runNode(script, args, workRoot);
}
