export const HUMAN_DNA_VERSION = 1;

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, Number(v)));

export const DEFAULT_HUMAN_DNA = Object.freeze({
  schema: "khosan.human-dna",
  version: HUMAN_DNA_VERSION,
  body: {
    height: 0.52,
    shoulders: 0.52,
    chest: 0.48,
    waist: 0.45,
    hips: 0.50,
    muscle: 0.35,
    legRatio: 0.54,
    armRatio: 0.50
  },
  face: {
    width: 0.50,
    jaw: 0.46,
    nose: 0.50,
    lips: 0.48,
    eyeSize: 0.52,
    eyeSpacing: 0.50,
    browHeight: 0.50,
    chin: 0.48
  },
  appearance: {
    skin: "#b97959",
    eyes: "#5e7459",
    hair: "#241b19",
    hairStyle: 0.38,
    browThickness: 0.52,
    mole: 0.0,
    tattoo: 0.0
  },
  lighting: {
    yaw: 0.18,
    pitch: 0.02,
    zoom: 0.50,
    key: 0.82,
    rim: 0.45
  }
});

export function cloneDNA(dna = DEFAULT_HUMAN_DNA) {
  return JSON.parse(JSON.stringify(dna));
}

export function normalizeDNA(input = {}) {
  const d = cloneDNA(DEFAULT_HUMAN_DNA);
  for (const group of ["body", "face", "appearance", "lighting"]) {
    if (input[group] && typeof input[group] === "object") Object.assign(d[group], input[group]);
  }

  for (const key of Object.keys(d.body)) d.body[key] = clamp(d.body[key]);
  for (const key of Object.keys(d.face)) d.face[key] = clamp(d.face[key]);
  for (const key of ["hairStyle", "browThickness", "mole", "tattoo"]) {
    d.appearance[key] = clamp(d.appearance[key]);
  }
  for (const key of ["yaw", "pitch", "zoom", "key", "rim"]) {
    d.lighting[key] = clamp(d.lighting[key]);
  }
  for (const key of ["skin", "eyes", "hair"]) {
    if (!/^#[0-9a-f]{6}$/i.test(String(d.appearance[key]))) {
      d.appearance[key] = DEFAULT_HUMAN_DNA.appearance[key];
    }
  }
  return d;
}

export function hexToLinearRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255);
  return srgb.map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
}

export function deriveHumanMetrics(dna) {
  const d = normalizeDNA(dna);
  const heightCm = 150 + d.body.height * 50;
  const shoulderCm = 35 + d.body.shoulders * 18;
  const waistCm = 58 + d.body.waist * 52;
  const hipCm = 72 + d.body.hips * 42;
  const chestCm = 72 + d.body.chest * 48;
  return {
    heightCm: Math.round(heightCm * 10) / 10,
    shoulderCm: Math.round(shoulderCm * 10) / 10,
    chestCm: Math.round(chestCm * 10) / 10,
    waistCm: Math.round(waistCm * 10) / 10,
    hipCm: Math.round(hipCm * 10) / 10
  };
}

/**
 * Encodes the semantic DNA into a std140-like vec4 layout consumed by the
 * WebGPU shader. Keeping this stable lets future mesh/compute backends share
 * the same creator UI and persisted DNA.
 */
export function encodeHumanUniforms(dna, timeSeconds = 0) {
  const d = normalizeDNA(dna);
  const skin = hexToLinearRgb(d.appearance.skin);
  const eyes = hexToLinearRgb(d.appearance.eyes);
  const hair = hexToLinearRgb(d.appearance.hair);

  return new Float32Array([
    d.body.height, d.body.shoulders, d.body.waist, d.body.hips,
    d.body.chest, d.body.muscle, d.body.legRatio, d.body.armRatio,
    d.face.width, d.face.jaw, d.face.nose, d.face.lips,
    d.face.eyeSize, d.face.eyeSpacing, d.face.browHeight, d.face.chin,
    skin[0], skin[1], skin[2], 0.48,
    eyes[0], eyes[1], eyes[2], 1.0,
    hair[0], hair[1], hair[2], 1.0,
    d.appearance.hairStyle, d.appearance.browThickness, d.appearance.mole, d.appearance.tattoo,
    d.lighting.yaw, d.lighting.pitch, d.lighting.zoom, timeSeconds,
    d.lighting.key, d.lighting.rim, 0.0, 0.0
  ]);
}

export function setDNAPath(dna, path, value) {
  const [group, key] = path.split(".");
  if (!dna[group] || !(key in dna[group])) throw new Error("Unknown Human DNA path: " + path);
  dna[group][key] = value;
  return normalizeDNA(dna);
}
