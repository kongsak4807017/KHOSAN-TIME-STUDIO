import { encodeHumanUniforms } from "./human-dna.js";

const WGSL = /* wgsl */`
struct HumanUniforms {
  body0: vec4f,
  body1: vec4f,
  face0: vec4f,
  face1: vec4f,
  skin: vec4f,
  eyes: vec4f,
  hair: vec4f,
  detail0: vec4f,
  lighting0: vec4f,
  lighting1: vec4f,
};

@group(0) @binding(0) var<uniform> u: HumanUniforms;

struct VSOut {
  @builtin(position) position: vec4f,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VSOut {
  var tri = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
  );
  var out: VSOut;
  out.position = vec4f(tri[vi], 0.0, 1.0);
  return out;
}

fn sdSphere(p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}

fn sdEllipsoid(p: vec3f, r: vec3f) -> f32 {
  let rr = max(r, vec3f(0.001));
  let k0 = length(p / rr);
  let k1 = max(length(p / (rr * rr)), 0.0001);
  return k0 * (k0 - 1.0) / k1;
}

fn sdCapsule(p: vec3f, a: vec3f, b: vec3f, r: f32) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

fn unionMat(a: vec2f, b: vec2f) -> vec2f {
  return select(a, b, b.x < a.x);
}

fn humanShape(p: vec3f) -> vec2f {
  let heightScale = mix(0.90, 1.12, u.body0.x);
  let shoulder = mix(0.48, 0.76, u.body0.y);
  let waist = mix(0.36, 0.55, u.body0.z);
  let hips = mix(0.42, 0.64, u.body0.w);
  let chest = mix(0.38, 0.58, u.body1.x);
  let muscle = mix(0.0, 0.09, u.body1.y);
  let legRatio = mix(0.92, 1.12, u.body1.z);
  let armRatio = mix(0.92, 1.10, u.body1.w);

  let headWidth = mix(0.30, 0.39, u.face0.x);
  let jaw = mix(0.25, 0.37, u.face0.y);
  let nose = mix(0.035, 0.095, u.face0.z);
  let lip = mix(0.015, 0.045, u.face0.w);
  let eyeSize = mix(0.052, 0.085, u.face1.x);
  let eyeSpacing = mix(0.105, 0.175, u.face1.y);
  let browY = mix(2.16, 2.23, u.face1.z) * heightScale;
  let chin = mix(-0.05, 0.08, u.face1.w);

  var r = vec2f(1e5, -1.0);

  // Torso is assembled from overlapping anatomical volumes. This deliberately
  // stays semantic: body sliders control proportions rather than raw XYZ scale.
  r = unionMat(r, vec2f(sdEllipsoid(
    p - vec3f(0.0, 0.70 * heightScale, 0.0),
    vec3f(shoulder + muscle, 0.72 * heightScale, chest + muscle)
  ), 1.0));
  r = unionMat(r, vec2f(sdEllipsoid(
    p - vec3f(0.0, 0.06 * heightScale, 0.0),
    vec3f(waist, 0.62 * heightScale, mix(0.28, 0.42, u.body0.z))
  ), 1.0));
  r = unionMat(r, vec2f(sdEllipsoid(
    p - vec3f(0.0, -0.48 * heightScale, 0.0),
    vec3f(hips, 0.42 * heightScale, mix(0.34, 0.48, u.body0.w))
  ), 1.0));

  let shoulderY = 1.05 * heightScale;
  let elbowY = 0.22 * heightScale;
  let handY = -0.56 * armRatio * heightScale;
  let upperArmR = 0.115 + muscle * 0.55;
  let foreArmR = 0.095 + muscle * 0.35;

  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(-shoulder, shoulderY, 0.0),
    vec3f(-shoulder * 1.12, elbowY, 0.02), upperArmR), 1.0));
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(-shoulder * 1.12, elbowY, 0.02),
    vec3f(-shoulder * 1.05, handY, 0.04), foreArmR), 1.0));
  r = unionMat(r, vec2f(sdSphere(p - vec3f(-shoulder * 1.05, handY - 0.10, 0.06), 0.13), 1.0));

  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(shoulder, shoulderY, 0.0),
    vec3f(shoulder * 1.12, elbowY, 0.02), upperArmR), 1.0));
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(shoulder * 1.12, elbowY, 0.02),
    vec3f(shoulder * 1.05, handY, 0.04), foreArmR), 1.0));
  r = unionMat(r, vec2f(sdSphere(p - vec3f(shoulder * 1.05, handY - 0.10, 0.06), 0.13), 1.0));

  let hipX = hips * 0.50;
  let kneeY = -1.26 * legRatio * heightScale;
  let ankleY = -2.02 * legRatio * heightScale;
  let thighR = mix(0.15, 0.24, u.body0.w) + muscle * 0.45;
  let calfR = mix(0.11, 0.17, u.body1.y);

  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(-hipX, -0.57 * heightScale, 0.0),
    vec3f(-hipX * 0.92, kneeY, 0.02), thighR), 1.0));
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(-hipX * 0.92, kneeY, 0.02),
    vec3f(-hipX * 0.82, ankleY, 0.02), calfR), 1.0));
  r = unionMat(r, vec2f(sdEllipsoid(
    p - vec3f(-hipX * 0.82, ankleY - 0.10, 0.12),
    vec3f(0.16, 0.11, 0.30)
  ), 1.0));

  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(hipX, -0.57 * heightScale, 0.0),
    vec3f(hipX * 0.92, kneeY, 0.02), thighR), 1.0));
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(hipX * 0.92, kneeY, 0.02),
    vec3f(hipX * 0.82, ankleY, 0.02), calfR), 1.0));
  r = unionMat(r, vec2f(sdEllipsoid(
    p - vec3f(hipX * 0.82, ankleY - 0.10, 0.12),
    vec3f(0.16, 0.11, 0.30)
  ), 1.0));

  // Neck + head.
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(0.0, 1.26 * heightScale, 0.0),
    vec3f(0.0, 1.62 * heightScale, 0.0), 0.16 + muscle * 0.18), 1.0));

  let headCenter = vec3f(0.0, 1.94 * heightScale + chin * 0.08, 0.0);
  let headR = vec3f(headWidth, 0.45 * heightScale, mix(0.30, 0.36, u.face0.y));
  r = unionMat(r, vec2f(sdEllipsoid(p - headCenter, headR), 1.0));

  // Jaw volume keeps lower-face width semantically independent of the cranium.
  r = unionMat(r, vec2f(sdEllipsoid(
    p - vec3f(0.0, 1.80 * heightScale + chin * 0.10, 0.05),
    vec3f(jaw, 0.27 * heightScale, 0.30)
  ), 1.0));

  // Nose and lips are separate skin volumes so they remain stable under face edits.
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(0.0, 2.01 * heightScale, 0.30),
    vec3f(0.0, 1.94 * heightScale, 0.36 + nose), 0.040 + nose * 0.15), 1.0));
  r = unionMat(r, vec2f(sdEllipsoid(
    p - vec3f(0.0, 1.82 * heightScale, 0.335),
    vec3f(0.105 + lip, 0.032 + lip * 0.25, 0.035)
  ), 1.0));

  // Eyeballs.
  let eyeY = 2.095 * heightScale;
  let eyeZ = 0.305;
  r = unionMat(r, vec2f(sdSphere(p - vec3f(-eyeSpacing, eyeY, eyeZ), eyeSize), 3.0));
  r = unionMat(r, vec2f(sdSphere(p - vec3f( eyeSpacing, eyeY, eyeZ), eyeSize), 3.0));

  // Brows.
  let browRadius = mix(0.010, 0.026, u.detail0.y);
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f(-eyeSpacing - 0.085, browY, 0.345),
    vec3f(-eyeSpacing + 0.085, browY + 0.012, 0.350), browRadius), 4.0));
  r = unionMat(r, vec2f(sdCapsule(p,
    vec3f( eyeSpacing - 0.085, browY + 0.012, 0.350),
    vec3f( eyeSpacing + 0.085, browY, 0.345), browRadius), 4.0));

  // Hair is a slightly expanded head shell, clipped by a semantic hairline.
  let hairStyle = u.detail0.x;
  let hairLine = mix(2.00, 1.86, hairStyle) * heightScale;
  let hairOuter = sdEllipsoid(
    p - (headCenter + vec3f(0.0, 0.04, -0.015)),
    headR + vec3f(0.045 + hairStyle * 0.08, 0.065 + hairStyle * 0.12, 0.05 + hairStyle * 0.06)
  );
  let clippedHair = max(hairOuter, -(p.y - hairLine));
  r = unionMat(r, vec2f(clippedHair, 2.0));

  return r;
}

fn scene(p: vec3f) -> vec2f {
  var r = humanShape(p);
  let ground = p.y + 2.30;
  r = unionMat(r, vec2f(ground, 5.0));
  return r;
}

fn calcNormal(p: vec3f) -> vec3f {
  let e = 0.0016;
  let ex = vec3f(e, 0.0, 0.0);
  let ey = vec3f(0.0, e, 0.0);
  let ez = vec3f(0.0, 0.0, e);
  return normalize(vec3f(
    scene(p + ex).x - scene(p - ex).x,
    scene(p + ey).x - scene(p - ey).x,
    scene(p + ez).x - scene(p - ez).x
  ));
}

fn raymarch(ro: vec3f, rd: vec3f) -> vec2f {
  var t = 0.0;
  var id = -1.0;
  for (var i = 0; i < 112; i = i + 1) {
    let h = scene(ro + rd * t);
    if (h.x < 0.0012) {
      id = h.y;
      break;
    }
    t = t + h.x * 0.80;
    if (t > 16.0) { break; }
  }
  return vec2f(t, id);
}

fn softShadow(ro: vec3f, rd: vec3f, maxT: f32) -> f32 {
  var res = 1.0;
  var t = 0.025;
  for (var i = 0; i < 42; i = i + 1) {
    let h = scene(ro + rd * t).x;
    res = min(res, 14.0 * h / max(t, 0.001));
    t = t + clamp(h, 0.02, 0.22);
    if (h < 0.0008 || t > maxT) { break; }
  }
  return clamp(res, 0.0, 1.0);
}

fn ambientOcclusion(p: vec3f, n: vec3f) -> f32 {
  var occ = 0.0;
  var scale = 1.0;
  for (var i = 1; i <= 5; i = i + 1) {
    let h = 0.035 * f32(i);
    let d = scene(p + n * h).x;
    occ = occ + (h - d) * scale;
    scale = scale * 0.58;
  }
  return clamp(1.0 - occ * 2.0, 0.35, 1.0);
}

fn filmic(x: vec3f) -> vec3f {
  let y = max(vec3f(0.0), x - vec3f(0.004));
  return (y * (6.2 * y + 0.5)) / (y * (6.2 * y + 1.7) + 0.06);
}

fn baseMaterial(id: f32, p: vec3f) -> vec3f {
  if (id < 1.5) {
    var c = u.skin.rgb;
    // Mole: semantic face mark. Position remains stable as the face deforms.
    let moleCenter = vec2f(0.18, 1.92);
    let moleD = length(vec2f(p.x, p.y) - moleCenter);
    let moleMask = (1.0 - smoothstep(0.010, 0.030, moleD)) * u.detail0.z;
    c = mix(c, c * 0.20, moleMask);

    // Tattoo preview: procedural ink on the upper torso. Production assets use
    // UV/barycentric surface anchors; this preview proves the layered material path.
    let torsoMask = smoothstep(0.72, 0.30, abs(p.x)) *
                    smoothstep(1.30, 0.30, p.y) *
                    smoothstep(-0.05, 0.20, p.z);
    let ink = 0.5 + 0.5 * sin(p.x * 28.0 + sin(p.y * 16.0) * 2.2);
    let tattooMask = torsoMask * smoothstep(0.47, 0.62, ink) * u.detail0.w;
    c = mix(c, vec3f(0.035, 0.055, 0.065), tattooMask * 0.82);
    return c;
  }
  if (id < 2.5) { return u.hair.rgb; }
  if (id < 3.5) {
    let heightScale = mix(0.90, 1.12, u.body0.x);
    let eyeSpacing = mix(0.105, 0.175, u.face1.y);
    let eyeY = 2.095 * heightScale;
    let eyeZ = 0.305;
    let sx = select(-eyeSpacing, eyeSpacing, p.x > 0.0);
    let q = p - vec3f(sx, eyeY, eyeZ);
    let irisR = length(q.xy);
    let iris = 1.0 - smoothstep(0.028, 0.052, irisR);
    let pupil = 1.0 - smoothstep(0.010, 0.020, irisR);
    var c = vec3f(0.93, 0.95, 0.94);
    c = mix(c, u.eyes.rgb, iris);
    c = mix(c, vec3f(0.008, 0.010, 0.012), pupil);
    return c;
  }
  if (id < 4.5) { return u.hair.rgb * 0.72; }
  return vec3f(0.055, 0.073, 0.083);
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let resolution = max(u.lighting1.zw, vec2f(1.0));
  let uv = (frag.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  let yaw = (u.lighting0.x - 0.5) * 1.55;
  let pitch = (u.lighting0.y - 0.5) * 0.55;
  let distance = mix(7.6, 4.8, u.lighting0.z);
  let target = vec3f(0.0, 0.02, 0.0);
  let ro = vec3f(
    sin(yaw) * cos(pitch) * distance,
    sin(pitch) * distance + 0.05,
    cos(yaw) * cos(pitch) * distance
  );

  let fw = normalize(target - ro);
  let rt = normalize(cross(fw, vec3f(0.0, 1.0, 0.0)));
  let up = normalize(cross(rt, fw));
  let rd = normalize(fw + uv.x * rt * 0.52 - uv.y * up * 0.52);

  let hit = raymarch(ro, rd);
  if (hit.y < 0.0) {
    let v = 1.0 - clamp(length(uv) * 0.30, 0.0, 0.35);
    let sky = mix(vec3f(0.018, 0.030, 0.038), vec3f(0.060, 0.095, 0.110), max(0.0, rd.y) * 0.8);
    return vec4f(pow(sky * v, vec3f(1.0 / 2.2)), 1.0);
  }

  let p = ro + rd * hit.x;
  let n = calcNormal(p);
  let lightPos = vec3f(-3.2, 5.3, 4.6);
  let toLight = lightPos - p;
  let l = normalize(toLight);
  let v = normalize(ro - p);
  let h = normalize(l + v);

  let ndl = max(dot(n, l), 0.0);
  let ndv = max(dot(n, v), 0.0);
  let shadow = softShadow(p + n * 0.004, l, length(toLight));
  let ao = ambientOcclusion(p, n);
  let key = mix(0.35, 1.55, u.lighting1.x);
  let rimStrength = mix(0.0, 0.95, u.lighting1.y);

  let base = baseMaterial(hit.y, p);
  let roughness = select(0.52, 0.30, hit.y > 2.5 && hit.y < 3.5);
  let specPower = mix(22.0, 75.0, 1.0 - roughness);
  let spec = pow(max(dot(n, h), 0.0), specPower) * shadow;
  let fresnel = pow(1.0 - ndv, 4.0);
  let rim = pow(max(0.0, 1.0 - ndv), 2.4) * rimStrength;

  var color = base * (0.18 + ndl * shadow * key) * ao;
  color = color + vec3f(1.0, 0.88, 0.76) * spec * 0.42;
  color = color + vec3f(0.24, 0.55, 0.75) * rim * (0.32 + fresnel * 0.55);

  if (hit.y > 4.5) {
    color = base * (0.45 + ndl * shadow * 0.50);
  }

  color = filmic(color);
  color = pow(max(color, vec3f(0.0)), vec3f(1.0 / 2.2));
  return vec4f(color, 1.0);
}
`;

export class HumanWebGPU {
  constructor(canvas, onStatus = () => {}) {
    this.canvas = canvas;
    this.onStatus = onStatus;
    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.format = null;
    this.running = false;
    this.dna = null;
    this.startedAt = performance.now();
  }

  async init() {
    if (!navigator.gpu) throw new Error("WebGPU is not available in this browser/device.");
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) throw new Error("No compatible WebGPU adapter was found.");
    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext("webgpu");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: "opaque" });

    const module = this.device.createShaderModule({ label: "KHOSAN Human Preview", code: WGSL });
    if (module.getCompilationInfo) {
      const info = await module.getCompilationInfo();
      const errors = info.messages.filter(m => m.type === "error");
      if (errors.length) throw new Error(errors.map(e => e.message).join("\n"));
    }

    this.pipeline = this.device.createRenderPipeline({
      label: "KHOSAN Human SDF Pipeline",
      layout: "auto",
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format: this.format }] },
      primitive: { topology: "triangle-list" }
    });

    this.uniformBuffer = this.device.createBuffer({
      label: "KHOSAN Human DNA Uniforms",
      size: 160,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });

    this.device.lost.then(info => {
      this.running = false;
      this.onStatus("WebGPU device lost: " + info.message, "error");
    });

    this.running = true;
    this.onStatus("WebGPU ready · procedural Human Engine preview", "ok");
    return this;
  }

  setDNA(dna) {
    this.dna = dna;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  render() {
    if (!this.running || !this.dna) return;
    this.resize();
    const t = (performance.now() - this.startedAt) / 1000;
    const values = encodeHumanUniforms(this.dna, t);
    values[38] = this.canvas.width;
    values[39] = this.canvas.height;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, values);

    const encoder = this.device.createCommandEncoder({ label: "KHOSAN Human Frame" });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.018, g: 0.028, b: 0.035, a: 1 },
        loadOp: "clear",
        storeOp: "store"
      }]
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  start() {
    if (!this.running) return;
    const frame = () => {
      if (!this.running) return;
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
  }
}
