import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';

export const LTC_ATTRIBUTION = Object.freeze({
  title: 'Real-Time Polygonal-Light Shading with Linearly Transformed Cosines',
  authors: 'Eric Heitz, Jonathan Dupuy, Stephen Hill and David Neubelt',
  publication: 'ACM SIGGRAPH 2016',
  paper: 'https://eheitzresearch.wordpress.com/415-2/',
  implementation: 'Installed Three.js RectAreaLight / RectAreaLightUniformsLib / LTC lookup textures',
  documentation: 'https://threejs.org/docs/pages/RectAreaLight.html',
  shadow_note: 'RectAreaLight has no shadow support. The floor shadow is a separate VSM directional proxy, not an LTC shadow.',
});

let ltcInitialized = false;

/** Three's version-matched LTC implementation is reused, not reimplemented. */
export function initializeLtc() {
  if (!ltcInitialized) {
    RectAreaLightUniformsLib.init();
    ltcInitialized = true;
  }
  for (const name of ['LTC_FLOAT_1', 'LTC_FLOAT_2', 'LTC_HALF_1', 'LTC_HALF_2']) {
    const texture = THREE.UniformsLib[name];
    if (!texture?.isDataTexture || texture.image?.width !== 64 || texture.image?.height !== 64) {
      throw new Error(`Missing or invalid Three.js LTC lookup texture: ${name}`);
    }
  }
}

/** Count linked GPU programs with active LTC samplers and area-light uniforms. */
export function inspectLtcPrograms(renderer) {
  const context = renderer.getContext();
  let activePrograms = 0;
  for (const program of renderer.info.programs || []) {
    const names = [];
    const count = context.getProgramParameter(program.program, context.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) names.push(context.getActiveUniform(program.program, i)?.name || '');
    if (names.includes('ltc_1') && names.includes('ltc_2') && names.some(name => name.startsWith('rectAreaLights['))) {
      activePrograms++;
    }
  }
  return {active_ltc_programs: activePrograms, lookup_dimensions: [64, 64],
    three_revision: THREE.REVISION, attribution: LTC_ATTRIBUTION};
}

/**
 * Render-only studio. Asset geometry/materials are not modified, and the floor
 * does not enter world-provider bounds or the exported semantic object ledger.
 */
export function createElephantStudio(bounds, heroPosition) {
  initializeLtc();
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const height = size.y;
  if (!(height > 0) || !Number.isFinite(height)) throw new Error('Studio requires finite, positive asset bounds');
  const target = new THREE.Vector3(center.x, bounds.min.y + height * 0.55, center.z);
  const outward = new THREE.Vector3(heroPosition[0] - center.x, 0, heroPosition[2] - center.z);
  if (outward.length() < 0.01) throw new Error('Studio camera requires a horizontal viewing direction');
  outward.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, outward).normalize();
  const group = new THREE.Group();
  group.name = 'RENDER_ONLY_ElephantStudio';
  group.userData.render_only = true;
  const definitions = [
    ['Upper camera-left rectangular key', -0.75, 1.65, 1.55, 5.0, 1.65, 1.40, '#fff1dc'],
    ['Quiet cool rectangular fill', 1.20, 0.40, 0.60, 0.8, 1.40, 1.20, '#d7e3f0'],
    ['Soft rectangular rim', -0.45, -1.00, 1.05, 2.5, 0.85, 1.40, '#fff5e6'],
  ];
  const lights = definitions.map(([name, x, z, y, intensity, width, lightHeight, color]) => {
    const light = new THREE.RectAreaLight(color, intensity, width * height, lightHeight * height);
    light.name = name;
    light.position.copy(target).addScaledVector(right, x * height).addScaledVector(outward, z * height).addScaledVector(up, y * height);
    light.lookAt(target);
    light.userData.render_only = true;
    light.userData.nominal_intensity = intensity;
    group.add(light);
    return light;
  });
  const hemisphere = new THREE.HemisphereLight('#d9dfdf', '#3d3b35', 0.30);
  group.add(hemisphere);

  const floorSize = Math.max(size.x, size.z, height) * 24;
  const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
  floorGeometry.rotateX(-Math.PI / 2);
  // A presentation backdrop, kept the exact background colour independently of
  // area-light distance. Thus LTC on/off evidence measures the asset, not a
  // large lit floor. The separate receiver below provides grounded contact.
  const floorMaterial = new THREE.MeshBasicMaterial({color: '#282a28', toneMapped: false});
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.name = 'RENDER_ONLY_StudioFloor';
  floor.position.set(center.x, bounds.min.y - height * 0.001, center.z);
  floor.userData.render_only = true;
  group.add(floor);

  // A zero-intensity directional light contributes no surface illumination.
  // Three's independent shadow uniforms still populate ShadowMaterial's mask.
  // This is a soft ground-contact approximation, not an area-light visibility integral.
  const shadowProxy = new THREE.DirectionalLight('#ffffff', 0);
  shadowProxy.name = 'RENDER_ONLY_GroundShadowProxy_NoIllumination';
  shadowProxy.position.copy(lights[0].position);
  shadowProxy.target.position.copy(target);
  shadowProxy.castShadow = true;
  const extent = Math.max(size.x, size.z, height) * 1.35;
  Object.assign(shadowProxy.shadow.camera, {left: -extent, right: extent, top: extent, bottom: -extent,
    near: 0.1, far: height * 9});
  shadowProxy.shadow.camera.updateProjectionMatrix();
  shadowProxy.shadow.mapSize.set(2048, 2048);
  shadowProxy.shadow.radius = 12;
  shadowProxy.shadow.blurSamples = 16;
  shadowProxy.shadow.bias = -0.00005;
  shadowProxy.shadow.normalBias = height * 0.001;
  group.add(shadowProxy, shadowProxy.target);
  const shadowMaterial = new THREE.ShadowMaterial({color: '#080907', opacity: 0.52, depthWrite: false});
  const shadowFloor = new THREE.Mesh(floorGeometry, shadowMaterial);
  shadowFloor.name = 'RENDER_ONLY_GroundShadowReceiver';
  shadowFloor.position.copy(floor.position);
  shadowFloor.position.y += height * 0.0002;
  shadowFloor.receiveShadow = true;
  shadowFloor.userData.render_only = true;
  group.add(shadowFloor);
  let disposed = false;
  let groundShadowsEnabled = true;
  return {
    group,
    setLtcEnabled(enabled) {
      for (const light of lights) light.intensity = enabled ? light.userData.nominal_intensity : 0;
    },
    setGroundShadowsEnabled(enabled) {groundShadowsEnabled = Boolean(enabled); shadowFloor.visible = groundShadowsEnabled;},
    evidence(renderer) {
      return {...inspectLtcPrograms(renderer), preset: 'elephant_studio',
        rect_area_light_count: lights.length, active_rect_area_light_count: lights.filter(light => light.intensity > 0).length,
        lights: lights.map(light => ({name: light.name, type: light.type, intensity_nits: light.intensity,
          width_m: light.width, height_m: light.height, position: light.position.toArray()})),
        ground_shadow_method: 'Separate zero-illumination directional VSM proxy on ShadowMaterial',
        ground_shadows_enabled: groundShadowsEnabled,
        shadow_proxy_illumination: shadowProxy.intensity,
        shadow_map_allocated: Boolean(shadowProxy.shadow.map),
        render_only_floor: true, backdrop_material: 'Unlit neutral studio backdrop; separate ShadowMaterial receiver',
        asset_materials_unchanged: true};
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      shadowProxy.shadow.dispose();
      floorGeometry.dispose(); floorMaterial.dispose(); shadowMaterial.dispose();
      group.clear();
      // LTC lookup textures belong to the installed library's shared renderer
      // uniform table. An individual studio instance must not dispose them.
    },
  };
}
