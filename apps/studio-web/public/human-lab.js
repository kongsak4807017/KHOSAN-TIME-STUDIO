import {
  DEFAULT_HUMAN_DNA,
  cloneDNA,
  normalizeDNA,
  deriveHumanMetrics,
  setDNAPath
} from "./human-dna.js";
import { HumanWebGPU } from "./human-webgpu.js";

let mounted = false;
let renderer = null;
let dna = cloneDNA(DEFAULT_HUMAN_DNA);

const STORAGE_KEY = "khosan-human-dna-v1";

const bindings = [
  ["humanHeight", "body.height"],
  ["humanShoulders", "body.shoulders"],
  ["humanChest", "body.chest"],
  ["humanWaist", "body.waist"],
  ["humanHips", "body.hips"],
  ["humanMuscle", "body.muscle"],
  ["humanLegRatio", "body.legRatio"],
  ["humanArmRatio", "body.armRatio"],
  ["humanFaceWidth", "face.width"],
  ["humanJaw", "face.jaw"],
  ["humanNose", "face.nose"],
  ["humanLips", "face.lips"],
  ["humanEyeSize", "face.eyeSize"],
  ["humanEyeSpacing", "face.eyeSpacing"],
  ["humanBrowHeight", "face.browHeight"],
  ["humanChin", "face.chin"],
  ["humanHairStyle", "appearance.hairStyle"],
  ["humanBrowThickness", "appearance.browThickness"],
  ["humanMole", "appearance.mole"],
  ["humanTattoo", "appearance.tattoo"],
  ["humanKeyLight", "lighting.key"],
  ["humanRimLight", "lighting.rim"],
  ["humanZoom", "lighting.zoom"]
];

const colorBindings = [
  ["humanSkin", "skin"],
  ["humanEyes", "eyes"],
  ["humanHair", "hair"]
];

function byId(id) {
  return document.getElementById(id);
}

function saveDNA() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dna));
}

function loadDNA() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored) dna = normalizeDNA(stored);
  } catch {
    dna = cloneDNA(DEFAULT_HUMAN_DNA);
  }
}

function setStatus(message, kind = "") {
  const el = byId("humanStatus");
  if (!el) return;
  el.textContent = message;
  el.dataset.kind = kind;
}

function updateMetrics() {
  const metrics = deriveHumanMetrics(dna);
  const el = byId("humanMetrics");
  if (!el) return;
  el.innerHTML = [
    ["Height", metrics.heightCm + " cm"],
    ["Shoulder", metrics.shoulderCm + " cm"],
    ["Chest", metrics.chestCm + " cm"],
    ["Waist", metrics.waistCm + " cm"],
    ["Hip", metrics.hipCm + " cm"]
  ].map(([k, v]) => `<span><b>${k}</b>${v}</span>`).join("");
}

function updateOutput() {
  const out = byId("humanDNAOut");
  if (out) out.textContent = JSON.stringify(dna, null, 2);
  updateMetrics();
  renderer?.setDNA(dna);
  saveDNA();
}

function syncControls() {
  for (const [id, path] of bindings) {
    const el = byId(id);
    if (!el) continue;
    const [group, key] = path.split(".");
    el.value = dna[group][key];
    const label = document.querySelector(`[data-value-for="${id}"]`);
    if (label) label.textContent = Number(el.value).toFixed(2);
  }
  for (const [id, key] of colorBindings) {
    const el = byId(id);
    if (el) el.value = dna.appearance[key];
  }
  updateOutput();
}

function bindControls() {
  for (const [id, path] of bindings) {
    const el = byId(id);
    if (!el) continue;
    el.addEventListener("input", () => {
      dna = setDNAPath(dna, path, Number(el.value));
      const label = document.querySelector(`[data-value-for="${id}"]`);
      if (label) label.textContent = Number(el.value).toFixed(2);
      updateOutput();
    });
  }

  for (const [id, key] of colorBindings) {
    const el = byId(id);
    if (!el) continue;
    el.addEventListener("input", () => {
      dna.appearance[key] = el.value;
      dna = normalizeDNA(dna);
      updateOutput();
    });
  }

  byId("humanReset")?.addEventListener("click", () => {
    dna = cloneDNA(DEFAULT_HUMAN_DNA);
    syncControls();
    setStatus("Character DNA reset to canonical defaults.", "ok");
  });

  byId("humanRandomize")?.addEventListener("click", () => {
    const rnd = (center = 0.5, spread = 0.55) =>
      Math.min(0.92, Math.max(0.08, center + (Math.random() - 0.5) * spread));
    dna.body.height = rnd(0.52, 0.45);
    dna.body.shoulders = rnd();
    dna.body.chest = rnd();
    dna.body.waist = rnd();
    dna.body.hips = rnd();
    dna.body.muscle = rnd(0.38, 0.65);
    dna.body.legRatio = rnd(0.54, 0.35);
    dna.body.armRatio = rnd(0.50, 0.30);
    for (const key of Object.keys(dna.face)) dna.face[key] = rnd(0.5, 0.62);
    dna.appearance.hairStyle = rnd();
    dna.appearance.browThickness = rnd();
    dna.appearance.mole = Math.random() > 0.65 ? rnd(0.7, 0.35) : 0;
    dna.appearance.tattoo = Math.random() > 0.60 ? rnd(0.65, 0.50) : 0;
    dna = normalizeDNA(dna);
    syncControls();
    setStatus("Generated a constrained semantic variation.", "ok");
  });

  byId("humanExport")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(dna, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khosan-human-dna-v1.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Character DNA exported.", "ok");
  });

  const canvas = byId("humanCanvas");
  if (canvas) {
    let dragging = false;
    let startX = 0;
    let startYaw = dna.lighting.yaw;
    canvas.addEventListener("pointerdown", e => {
      dragging = true;
      startX = e.clientX;
      startYaw = dna.lighting.yaw;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
      if (!dragging) return;
      dna.lighting.yaw = Math.min(1, Math.max(0, startYaw + (e.clientX - startX) / 520));
      updateOutput();
    });
    canvas.addEventListener("pointerup", e => {
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    });
    canvas.addEventListener("pointercancel", () => { dragging = false; });
  }
}

export async function mountHumanLab() {
  if (mounted) return;
  mounted = true;
  loadDNA();
  bindControls();
  syncControls();

  const canvas = byId("humanCanvas");
  if (!canvas) return;

  try {
    renderer = new HumanWebGPU(canvas, setStatus);
    await renderer.init();
    renderer.setDNA(dna);
    renderer.start();
  } catch (error) {
    console.error(error);
    setStatus(String(error.message || error), "error");
    const fallback = byId("humanFallback");
    if (fallback) fallback.classList.remove("hidden");
  }
}
