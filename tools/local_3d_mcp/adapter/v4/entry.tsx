import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, Composition, cancelRender, registerRoot, staticFile, useCurrentFrame, useDelayRender, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {parseLocal3dGlb} from '../local3d-provider.mjs';
import type {Local3dManifest, Local3dWorldProvider} from '../local3d-provider.mjs';
import {createElephantStudio} from './lighting-ltc.mjs';

type ProofProps = {showAsset: boolean; ltcEnabled: boolean; groundShadowsEnabled: boolean};
type Presentation = {lighting: {preset: 'storybook' | 'elephant_studio'};
  camera?: {position: [number, number, number]; target: [number, number, number]; lens_mm: number}};

function readPresentation(raw: unknown): Presentation {
  if (raw === undefined) return {lighting: {preset: 'storybook'}};
  const value = raw as Presentation;
  if (!value || !['storybook', 'elephant_studio'].includes(value.lighting?.preset)) throw new Error('Unsupported review lighting preset');
  if (value.lighting.preset === 'elephant_studio') {
    const cam = value.camera;
    const vector = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n));
    if (!cam || !vector(cam.position) || !vector(cam.target) || !Number.isFinite(cam.lens_mm) || cam.lens_mm < 18 || cam.lens_mm > 120) {
      throw new Error('Elephant studio requires the finite, explicit fixture camera');
    }
    if (new THREE.Vector3(...cam.position).distanceTo(new THREE.Vector3(...cam.target)) < 0.1) throw new Error('Fixture camera is too close to its target');
  }
  return value;
}

function Contents({world, presentation, showAsset, ltcEnabled, groundShadowsEnabled, onReady}: {
  world: Local3dWorldProvider; presentation: Presentation; showAsset: boolean;
  ltcEnabled: boolean; groundShadowsEnabled: boolean; onReady: () => void}) {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const {camera, gl, scene} = useThree();
  const bounds = useMemo(() => new THREE.Box3().setFromObject(world.group), [world]);
  const studio = useMemo(() => presentation.lighting.preset === 'elephant_studio'
    ? createElephantStudio(bounds, presentation.camera!.position) : null, [bounds, presentation]);
  useEffect(() => () => studio?.dispose(), [studio]);
  useLayoutEffect(() => {
    world.update(frame / fps);
    if (bounds.isEmpty()) throw new Error('Loaded local GLB has empty bounds');
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
    if (!(radius > 0) || !Number.isFinite(radius)) throw new Error('Invalid local GLB bounds');
    // Camera changes are deterministic source-frame evaluation, not asset animation.
    const c = camera as THREE.PerspectiveCamera;
    c.aspect = width / height;
    let distance: number;
    let target = center;
    if (studio) {
      const fixture = presentation.camera!;
      target = new THREE.Vector3(...fixture.target);
      const offset = new THREE.Vector3(...fixture.position).sub(target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad((frame / fps) * (8 / 3)));
      c.position.copy(target).add(offset);
      distance = offset.length();
      // Blender's default 36 mm sensor width with horizontal fit at 16:9.
      c.fov = THREE.MathUtils.radToDeg(2 * Math.atan(36 / (2 * fixture.lens_mm * c.aspect)));
      studio.setLtcEnabled(ltcEnabled);
      studio.setGroundShadowsEnabled(groundShadowsEnabled);
    } else {
      const azimuth = THREE.MathUtils.degToRad(43 + (frame / fps) * 8);
      const elevation = THREE.MathUtils.degToRad(28);
      const outward = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), outward).normalize();
      const upward = new THREE.Vector3().crossVectors(outward, right).normalize();
      c.fov = 39;
      const tangentV = Math.tan(THREE.MathUtils.degToRad(c.fov / 2));
      const tangentH = tangentV * c.aspect;
      distance = 0;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const p = new THREE.Vector3(x, y, z).sub(center);
        distance = Math.max(distance, Math.abs(p.dot(right)) / tangentH + p.dot(outward), Math.abs(p.dot(upward)) / tangentV + p.dot(outward));
      }
      distance *= 1.12;
      c.position.copy(center).addScaledVector(outward, distance);
    }
    c.near = Math.max(0.01, distance - radius * 1.5); c.far = distance + radius * 5;
    c.lookAt(target); c.updateProjectionMatrix(); c.updateMatrixWorld();
    scene.background = new THREE.Color(studio ? '#282a28' : '#e8e0cf');
    gl.shadowMap.enabled = true; gl.shadowMap.type = studio ? THREE.VSMShadowMap : THREE.PCFShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = studio ? 1.10 : 1.05;
    scene.updateMatrixWorld(true);
    // Commit this exact source frame before releasing the async loading hold.
    // ThreeCanvas also performs its own frame-bound render; there is no RAF loop here.
    gl.render(scene, c);
    let attachedAssetMeshes = 0, physicalMaterialSlots = 0;
    if (world.group.parent) world.group.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      attachedAssetMeshes++;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) physicalMaterialSlots++;
      }
    });
    console.log('KHOSAN_LOCAL3D_V4_METRICS ' + JSON.stringify({
      frame, sourceTime: frame / fps, showAsset, ltcEnabled, groundShadowsEnabled,
      scene_id: world.evidence.scene_id, artifact_sha256: world.evidence.artifact_sha256,
      semantic_objects: world.evidence.semantic_objects,
      editable_parts: world.evidence.editable_parts, render_meshes: world.evidence.render_meshes,
      attached_asset_meshes: attachedAssetMeshes, physical_asset_material_slots: physicalMaterialSlots,
      drawCalls: gl.info.render.calls, renderedTriangles: gl.info.render.triangles,
      cameraPosition: c.position.toArray(), bounds: {min: bounds.min.toArray(), max: bounds.max.toArray()},
      cameraTarget: target.toArray(), cameraFov: c.fov,
      lighting: studio ? studio.evidence(gl) : {preset: 'storybook'},
      animation: false, rigging: false, physics: false,
    }));
    onReady();
  }, [world, presentation, studio, bounds, showAsset, ltcEnabled, groundShadowsEnabled, onReady, frame, fps, width, height, camera, gl, scene]);
  return <>
    {studio ? <primitive object={studio.group} dispose={null}/> : <>
    <ambientLight intensity={0.6}/>
    <directionalLight position={[-4, 7, 5]} color="#ffe4c0" intensity={2.8} castShadow
      shadow-mapSize-width={2048} shadow-mapSize-height={2048}
      shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6}
      shadow-camera-near={0.1} shadow-camera-far={25} shadow-normalBias={0.015}/>
    <directionalLight position={[5, 3, 2]} color="#d2e5ef" intensity={1.0}/>
    <directionalLight position={[-3, 3, -5]} color="#ffe9d1" intensity={0.7}/>
    </>}
    {showAsset ? <primitive object={world.group} dispose={null}/> : null}
  </>;
}

function Local3dProof({showAsset, ltcEnabled, groundShadowsEnabled}: ProofProps) {
  const {width, height} = useVideoConfig();
  const {delayRender, continueRender} = useDelayRender();
  const hold = useRef<number | null>(null);
  const [world, setWorld] = useState<Local3dWorldProvider | null>(null);
  const [presentation, setPresentation] = useState<Presentation>({lighting: {preset: 'storybook'}});
  const onReady = useCallback(() => {
    if (hold.current !== null) {continueRender(hold.current); hold.current = null;}
  }, [continueRender]);
  useLayoutEffect(() => {
    hold.current = delayRender('Verify and load local 3D GLB', {timeoutInMilliseconds: 120000});
    return () => {if (hold.current !== null) {continueRender(hold.current); hold.current = null;}};
  }, [delayRender, continueRender]);
  useEffect(() => {
    let active = true;
    let owned: Local3dWorldProvider | null = null;
    const controller = new AbortController();
    const checkedFetch = async (filename: string) => {
      const response = await fetch(staticFile(filename), {signal: controller.signal});
      if (!response.ok) throw new Error(`Local artifact ${filename}: HTTP ${response.status}`);
      return response;
    };
    Promise.all([checkedFetch('scene.glb').then(r => r.arrayBuffer()), checkedFetch('harness-asset.json').then(r => r.json())])
      .then(async ([bytes, manifest]) => {
        const settings = readPresentation((manifest as {presentation?: unknown}).presentation);
        const loaded = await parseLocal3dGlb(bytes as ArrayBuffer, manifest as Local3dManifest);
        if (!active) {loaded.dispose(); return;}
        owned = loaded; setPresentation(settings); setWorld(loaded);
      })
      .catch(error => {if (active) cancelRender(error);});
    return () => {active = false; controller.abort(); owned?.dispose();};
  }, []);
  return <AbsoluteFill style={{backgroundColor: presentation.lighting.preset === 'elephant_studio' ? '#282a28' : '#e8e0cf'}}>
    {world ? <ThreeCanvas width={width} height={height} shadows
      camera={{fov: 39, near: 0.01, far: 100}}
      gl={{antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'}}>
      <Contents world={world} presentation={presentation} showAsset={showAsset}
        ltcEnabled={ltcEnabled} groundShadowsEnabled={groundShadowsEnabled} onReady={onReady}/>
    </ThreeCanvas> : null}
  </AbsoluteFill>;
}

function Root() {
  return <Composition id="KHOSAN-Local3D-Static-Integration" component={Local3dProof}
    width={960} height={540} fps={30} durationInFrames={60}
    defaultProps={{showAsset: true, ltcEnabled: true, groundShadowsEnabled: true}}/>;
}
registerRoot(Root);
