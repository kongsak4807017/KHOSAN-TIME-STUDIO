import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {verifyLocal3dAsset} from '../local3d-provider.mjs';
import {compareVisibleAsset, decodePng} from './png.mjs';
import {PORTABLE_ROOT, createRuntime, resolveBrowser, RuntimeContainmentPlugin} from './portable-runtime/runtime.mjs';

const ownRoot = path.dirname(fileURLToPath(import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = file => digest(fs.readFileSync(file));
const {values} = parseArgs({options: {
  job: {type: 'string'}, 'v4-root': {type: 'string'},
  browser: {type: 'string'}, gl: {type: 'string'}, help: {type: 'boolean', default: false},
}});
if (values.help || !values.job) {
  console.log('Usage: node tools/local_3d_mcp/adapter/v4/verify.mjs --job <job-dir> [--browser <executable>] [--gl swangle|angle] [--v4-root <existing-V4-dir>]');
  console.log('Default: the isolated locked runtime installed by node scripts/setup-local3d-v4.mjs. Existing V4 mode requires --v4-root or KHOSAN_V4_ROOT.');
  console.log('Renders native 960x540 static-GLB evidence, with LTC and separate shadow controls for elephant studio. No full episode or video is verified.');
  if (!values.help) process.exitCode = 2;
} else {
  await verify();
}

async function verify() {
  const job = fs.realpathSync(values.job);
  const selectedV4 = values['v4-root'] || process.env.KHOSAN_V4_ROOT;
  const runtime = createRuntime({v4Root: selectedV4});
  const runtimeRoot = runtime.root, externalRequire = runtime.require, packages = runtime.packages;
  const standalone = runtime.mode === 'standalone_locked';
  const glBackend = values.gl || (standalone ? 'swangle' : 'angle');
  assert.ok(['swangle', 'angle', 'egl', 'swiftshader', 'vulkan', 'angle-egl'].includes(glBackend), 'Unsupported --gl backend');
  for (const name of ['@remotion/three', '@remotion/bundler', '@remotion/renderer']) assert.equal(packages[name].version, packages.remotion.version, `Mixed Remotion runtime versions: ${name}`);
  const {bundle} = externalRequire('@remotion/bundler');
  const {openBrowser, selectComposition, renderStill} = externalRequire('@remotion/renderer');
  const threeModule = path.join(packages.three.root, 'build', 'three.module.js');
  const gltfLoader = path.join(packages.three.root, 'examples', 'jsm', 'loaders', 'GLTFLoader.js');
  const lightingRuntimeFiles = [
    'build/three.core.js', 'examples/jsm/lights/RectAreaLightUniformsLib.js',
    'examples/jsm/lights/RectAreaLightTexturesLib.js', 'src/lights/RectAreaLight.js',
    'src/renderers/shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js',
    'src/renderers/shaders/ShaderChunk/shadowmask_pars_fragment.glsl.js',
    'src/renderers/webgl/WebGLLights.js',
  ].map(file => path.join(packages.three.root, file));
  const runtimeFiles = [...new Set(Object.values(packages).flatMap(p => [p.packageFile, p.entry]).concat(lightingRuntimeFiles, [threeModule, gltfLoader,
    path.join(packages['@remotion/three'].root, 'dist', 'cjs', 'ThreeCanvas.js')]))];
  const ownFiles = ['entry.tsx', 'verify.mjs', 'png.mjs', 'lighting-ltc.mjs'].map(name => path.join(ownRoot, name));
  ownFiles.push(path.resolve(ownRoot, '..', 'local3d-provider.mjs'));
  ownFiles.push(...['runtime.mjs', 'loopback.cjs', 'package.json', 'package-lock.json', 'tsconfig.json'].map(name => path.join(PORTABLE_ROOT, name)));
  ownFiles.push(path.resolve(ownRoot, '..', '..', '..', '..', 'scripts', 'setup-local3d-v4.mjs'));
  const originalV4Files = standalone ? [] : ['package.json', 'package-lock.json', 'REGISTRY.json', 'src/Stage.tsx', 'src/core.mjs', 'scripts/status.mjs', 'scripts/qa.mjs', 'scripts/loopback.cjs'].map(name => path.join(runtimeRoot, name));
  const artifactFiles = ['scene.glb', 'harness-asset.json'].map(name => path.join(job, name));
  const sources = [...new Set([...ownFiles, ...runtimeFiles, ...originalV4Files, ...artifactFiles])];
  const before = Object.fromEntries(sources.map(file => [file, hashFile(file)]));
  const bytes = fs.readFileSync(artifactFiles[0]), manifestBytes = fs.readFileSync(artifactFiles[1]);
  assert.equal(digest(bytes), before[artifactFiles[0]]); assert.equal(digest(manifestBytes), before[artifactFiles[1]]);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const asset = await verifyLocal3dAsset(bytes, manifest);
  const lightingPreset = manifest.presentation?.lighting?.preset ?? 'storybook';
  assert.ok(['storybook', 'elephant_studio'].includes(lightingPreset), 'Unsupported review lighting preset');
  const isLtcStudio = lightingPreset === 'elephant_studio';
  const browserInfo = await resolveBrowser(runtime, {browser: values.browser});
  const browserExecutable = browserInfo.path;
  const id = new Date().toISOString().replaceAll(':', '-') + '-' + randomBytes(3).toString('hex');
  const out = path.join(job, 'qa-v4', id), publicDir = path.join(out, 'public');
  fs.mkdirSync(publicDir, {recursive: true});
  fs.writeFileSync(path.join(publicDir, 'scene.glb'), bytes);
  fs.writeFileSync(path.join(publicDir, 'harness-asset.json'), manifestBytes);
  const errors = [], warnings = new Set(), logs = [], images = [];
  const report = {
    schema: 'khosan.local3d-v4-proof/2', id, status: 'RUNNING',
    scope: `${standalone ? 'STANDALONE_LOCKED' : 'EXISTING_V4'}_REMOTION_THREE_STATIC_GLB${isLtcStudio ? '_LTC' : ''}_960x540`,
    scene_id: manifest.scene_id, artifact_sha256: asset.sha256, artifact_bytes: asset.bytes,
    sourceBefore: before, runtimeVersions: Object.fromEntries(Object.entries(packages).map(([name, info]) => [name, info.version])),
    runtime_mode: runtime.mode, runtime_root: runtimeRoot,
    runtime_lock_sha256: runtime.lockSha256,
    runtime_environment: {node: process.version, platform: process.platform, architecture: process.arch},
    dependency_roots: Object.fromEntries(Object.entries(packages).map(([name, info]) => [name, info.root])),
    dependency_containment: 'REQUIRED_WITHIN_SELECTED_RUNTIME',
    browserExecutable, browser_selection: browserInfo.selection, browser_type: browserInfo.type,
    chromium_gl: glBackend, sourceV4Root: standalone ? null : runtimeRoot,
    original_v4_source_verification: standalone ? 'NOT_APPLICABLE_STANDALONE_RUNTIME' : 'PENDING_BEFORE_AFTER_HASH_COMPARISON',
    originalV4SourceUnchanged: null,
    semanticObjects: asset.semanticIds.length, editableParts: asset.partCount,
    renderer_integration: 'RUNNING', v4_render_integration: standalone ? 'NOT_TESTED_PRIVATE_V4' : 'RUNNING', originalEpisodesModified: false,
    videoCreated: false, fullEpisode: false, production_ready: false,
    humanArt: 'NOT_REVIEWED', humanAcceptance: 'NOT_REVIEWED',
    animation: false, rigging: false, physics: false,
    headlessSourceVerification: 'SEPARATE_PIPELINE_STATUS_REQUIRED',
    presentation: manifest.presentation ?? {lighting: {preset: 'storybook'}},
  };
  const reportFile = path.join(out, 'verification.json');
  const save = () => fs.writeFileSync(reportFile, JSON.stringify({...report, images, errors, warnings: [...warnings], logs}, null, 2) + '\n');
  let browser;
  save();
  try {
    console.log(`Building isolated static-GLB composition with ${runtime.mode} dependencies`);
    // This process owns its guard; a private channel checkout is never needed.
    externalRequire(path.join(PORTABLE_ROOT, 'loopback.cjs'));
    const aliases = {
      'three$': threeModule,
      'three/addons': path.join(packages.three.root, 'examples', 'jsm'),
      'react$': externalRequire.resolve('react'),
      'react/jsx-runtime$': externalRequire.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime$': externalRequire.resolve('react/jsx-dev-runtime'),
      'react-dom$': externalRequire.resolve('react-dom'),
      'react-dom/client$': externalRequire.resolve('react-dom/client'),
      'remotion$': externalRequire.resolve('remotion'),
      '@remotion/three$': externalRequire.resolve('@remotion/three'),
      '@react-three/fiber$': externalRequire.resolve('@react-three/fiber'),
    };
    const containment = new RuntimeContainmentPlugin(runtime);
    const serveUrl = await bundle({
      entryPoint: path.join(ownRoot, 'entry.tsx'), outDir: path.join(out, 'bundle'),
      rootDir: runtimeRoot, publicDir, enableCaching: false,
      webpackOverride: config => ({...config, plugins: [...(config.plugins || []), containment], resolve: {...config.resolve,
        modules: [runtime.nodeModules, ...(config.resolve?.modules || ['node_modules'])],
        alias: {...config.resolve?.alias, ...aliases},
      }}),
    });
    report.bundled_dependency_modules_checked = containment.checked.size;
    browser = await openBrowser('chrome', {browserExecutable, chromeMode: browserInfo.chromeMode, chromiumOptions: {gl: glBackend}});
    // Browser.getVersion is the standard Chrome DevTools command exposed by
    // this pinned Remotion browser's connection; record the actual browser.
    report.browser_version = await browser.connection.send('Browser.getVersion');
    const base = {showAsset: true, ltcEnabled: true, groundShadowsEnabled: true};
    const composition = await selectComposition({serveUrl, id: 'KHOSAN-Local3D-Static-Integration', inputProps: base, puppeteerInstance: browser, logLevel: 'error'});
    assert.equal(composition.width, 960); assert.equal(composition.height, 540); assert.equal(composition.fps, 30); assert.equal(composition.durationInFrames, 60);
    report.composition = {id: composition.id, width: 960, height: 540, fps: 30, durationInFrames: 60}; save();
    async function capture(name, frame, showAsset, saveImage, controls = {}) {
      const props = {showAsset, ltcEnabled: controls.ltcEnabled ?? true,
        groundShadowsEnabled: controls.groundShadowsEnabled ?? true}, metrics = [];
      const result = await renderStill({serveUrl, composition: {...composition, props}, inputProps: props,
        output: null, frame, imageFormat: 'png', scale: 1, puppeteerInstance: browser,
        timeoutInMilliseconds: 120000, logLevel: 'error',
        onBrowserLog: log => {
          if (log.type === 'error') errors.push(log.text);
          if (log.type === 'warn' || log.type === 'warning') warnings.add(log.text);
          const prefix = 'KHOSAN_LOCAL3D_V4_METRICS ';
          if (log.text?.startsWith(prefix)) {
            try {const metric = JSON.parse(log.text.slice(prefix.length)); metrics.push(metric); logs.push({capture: name, ...metric});}
            catch {errors.push('Malformed browser metrics: ' + log.text);}
          }
        },
      });
      assert.ok(Buffer.isBuffer(result.buffer), 'renderStill returned no PNG buffer');
      const png = decodePng(result.buffer);
      assert.equal(png.width, 960); assert.equal(png.height, 540);
      const metric = metrics.filter(m => m.frame === frame && m.showAsset === showAsset
        && m.ltcEnabled === props.ltcEnabled && m.groundShadowsEnabled === props.groundShadowsEnabled).at(-1);
      assert.ok(metric, `No ready-scene browser evidence for frame ${frame}`);
      assert.equal(metric.artifact_sha256, asset.sha256);
      assert.equal(metric.semantic_objects, asset.semanticIds.length); assert.equal(metric.editable_parts, asset.partCount);
      assert.equal(metric.attached_asset_meshes, showAsset ? metric.render_meshes : 0, 'Imported asset mounting does not match requested visibility');
      if (showAsset) {assert.ok(metric.drawCalls > 0, 'Scene issued no draw calls'); assert.ok(metric.renderedTriangles > 0, 'Scene rendered no triangles');}
      if (isLtcStudio) {
        assert.equal(metric.lighting.preset, 'elephant_studio');
        assert.equal(metric.lighting.three_revision, packages.three.version.split('.')[1]);
        assert.equal(metric.lighting.rect_area_light_count, 3);
        assert.equal(metric.lighting.active_rect_area_light_count, props.ltcEnabled ? 3 : 0);
        // The hidden control contains only the deliberately unlit backdrop and
        // ShadowMaterial receiver, so it need not compile a PBR/LTC program.
        // Both visible LTC-on and LTC-off captures must still use the real PBR
        // program; zero light intensities are uniforms, not a material swap.
        if (showAsset) assert.ok(metric.lighting.active_ltc_programs > 0,
          'No linked GPU program has active LTC lookup samplers and area-light uniforms');
        assert.deepEqual(metric.lighting.lookup_dimensions, [64, 64]);
        assert.equal(metric.lighting.ground_shadows_enabled, props.groundShadowsEnabled);
        assert.equal(metric.lighting.shadow_proxy_illumination, 0, 'Ground-shadow proxy must not illuminate the asset');
        assert.equal(metric.lighting.shadow_map_allocated, true, 'Ground-shadow proxy has no actual shadow map');
        if (showAsset) assert.ok(metric.physical_asset_material_slots > 0, 'LTC proof requires loaded PBR asset materials');
      }
      const record = {name, frame, ...props, sha256: digest(result.buffer), width: png.width, height: png.height, bytes: result.buffer.length, metrics: metric};
      if (saveImage) {record.path = name + '.png'; fs.writeFileSync(path.join(out, record.path), result.buffer); images.push(record);}
      save(); console.log(JSON.stringify({capture: name, frame, bytes: record.bytes, sha256: record.sha256}));
      return {buffer: result.buffer, record};
    }
    const first = await capture('frame-000', 0, true, true);
    const second = await capture('frame-045', 45, true, true);
    const repeated = await capture('frame-045-repeat', 45, true, false);
    assert.equal(repeated.record.sha256, second.record.sha256, 'Repeated same-frame PNG differs');
    assert.notEqual(first.record.sha256, second.record.sha256, 'Deterministic camera change had no visible effect');
    const hidden = await capture('frame-045-hidden-control', 45, false, false);
    const comparison = compareVisibleAsset(second.buffer, hidden.buffer);
    const comparisonFile = path.join(out, 'visibility-comparison.png');
    fs.writeFileSync(comparisonFile, comparison.comparison);
    report.visibleAssetComparison = {changedPixels: comparison.changedPixels, totalPixels: comparison.totalPixels,
      changedFraction: comparison.changedFraction, meanAbsoluteChannelDifference: comparison.meanAbsoluteChannelDifference,
      maxChannelDifference: comparison.maxChannelDifference, threshold: comparison.threshold,
      path: 'visibility-comparison.png', sha256: digest(comparison.comparison),
      explanation: 'Left: rendered asset. Right: amplified difference from the same camera with asset hidden.'};
    report.repeatRender = {status: 'PNG_SHA256_IDENTICAL', frame: 45, sha256: repeated.record.sha256,
      scope: 'Repeated renderStill calls in the same browser instance; not a continuous-playback or same-page seek proof'};
    report.hiddenControl = hidden.record;
    save();
    assert.ok(comparison.changedFraction > 0.02, 'Visible asset occupies <=2% of pixels relative to hidden control');
    assert.ok(comparison.meanAbsoluteChannelDifference > 0.5, 'Asset contribution is too weak to verify');
    if (isLtcStudio) {
      const ltcOff = await capture('frame-045-ltc-off', 45, true, true, {ltcEnabled: false});
      const ltcDifference = compareVisibleAsset(second.buffer, ltcOff.buffer);
      const masked = contributionInAssetRegion(second.buffer, ltcOff.buffer, hidden.buffer);
      assert.ok(masked.maskPixels > 500, 'Insufficient visible asset region for LTC comparison');
      assert.ok(masked.changedFraction > 0.10 && masked.meanAbsoluteChannelDifference > 2,
        'Disabling rectangular LTC lights has insufficient effect inside the asset visibility region');
      assert.ok(masked.meanOnMinusOff > 1, 'LTC lights do not increase the asset-region mean brightness');
      const ltcPath = 'ltc-contribution-comparison.png';
      fs.writeFileSync(path.join(out, ltcPath), ltcDifference.comparison);
      report.ltcContribution = {status: 'PASS_MEASURED_LTC_LIGHT_CONTRIBUTION', frame: 45,
        enabledImage: second.record.sha256, disabledImage: ltcOff.record.sha256,
        changedPixels: ltcDifference.changedPixels, changedFraction: ltcDifference.changedFraction,
        meanAbsoluteChannelDifference: ltcDifference.meanAbsoluteChannelDifference,
        assetVisibilityRegion: masked, path: ltcPath, sha256: digest(ltcDifference.comparison),
        gpuEvidence: second.record.metrics.lighting,
        explanation: 'Only the three RectAreaLight intensities change to zero. Camera, geometry, fill ambience and separate ground-shadow proxy remain fixed. Left: LTC on; right: amplified on/off difference.'};
      const shadowsOff = await capture('frame-045-ground-shadows-off', 45, true, false, {groundShadowsEnabled: false});
      const shadowDifference = compareVisibleAsset(second.buffer, shadowsOff.buffer, 2);
      assert.ok(shadowDifference.changedPixels >= 32 && shadowDifference.meanAbsoluteChannelDifference > 0.002,
        'Separate ground-shadow receiver has no measurable image contribution');
      const shadowPath = 'ground-shadow-comparison.png';
      fs.writeFileSync(path.join(out, shadowPath), shadowDifference.comparison);
      report.groundShadowContribution = {status: 'PASS_SEPARATE_GROUND_SHADOW_CONTRIBUTION', frame: 45,
        enabledImage: second.record.sha256, disabledImage: shadowsOff.record.sha256,
        changedPixels: shadowDifference.changedPixels, changedFraction: shadowDifference.changedFraction,
        meanAbsoluteChannelDifference: shadowDifference.meanAbsoluteChannelDifference,
        path: shadowPath, sha256: digest(shadowDifference.comparison),
        mechanism: 'Zero-illumination directional VSM shadow map plus render-only ShadowMaterial floor',
        limitation: 'A separately projected, blurred ground-shadow approximation; not LTC occlusion, full self-shadowing or global illumination.'};
      report.groundShadowsOffControl = shadowsOff.record;
      save();
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    const after = Object.fromEntries(sources.map(file => [file, hashFile(file)]));
    assert.deepEqual(after, before, 'Source/runtime/artifact changed during verification');
    Object.assign(report, {sourceAfter: after, originalV4SourceUnchanged: standalone ? null : true,
      original_v4_source_verification: standalone ? 'NOT_APPLICABLE_STANDALONE_RUNTIME' : 'UNCHANGED_SELECTED_PRIVATE_SOURCE_HASHES',
      status: `PASS_${standalone ? 'STANDALONE' : 'SCOPED'}_STATIC_GLB${isLtcStudio ? '_LTC' : ''}_STILLS`,
      renderer_integration: 'PASS_SCOPED_STATIC_ASSET',
      v4_render_integration: standalone ? 'NOT_TESTED_PRIVATE_V4' : 'PASS_SCOPED_STATIC_ASSET',
      limitation: standalone
        ? 'Standalone static GLB composition on pinned Remotion/Three packages. Private V4 Stage/REGISTRY/episodes were not loaded or verified. No episode migration, animation, physics, art acceptance or video parity is implied.'
        : 'Separate static GLB composition on the explicitly selected V4 Remotion/Three stack; no episode migration, animation, physics, art acceptance or video parity is implied'});
    save();
  } catch (error) {
    report.status = 'FAIL'; report.renderer_integration = 'FAIL';
    if (!standalone) report.v4_render_integration = 'FAIL';
    report.error = error.stack || String(error);
    save(); console.error(error); process.exitCode = 1;
  } finally {
    if (browser) await browser.close({silent: true});
    console.log(JSON.stringify({status: report.status, report: reportFile, images: images.map(i => path.join(out, i.path)), videoCreated: false}));
  }
}

function contributionInAssetRegion(onBytes, offBytes, hiddenBytes) {
  const on = decodePng(onBytes), off = decodePng(offBytes), hidden = decodePng(hiddenBytes);
  assert.equal(on.width, off.width); assert.equal(on.height, off.height);
  assert.equal(on.width, hidden.width); assert.equal(on.height, hidden.height);
  let maskPixels = 0, changedPixels = 0, absolute = 0, signed = 0;
  for (let p = 0; p < on.pixels.length; p += 4) {
    if (Math.max(...[0, 1, 2].map(c => Math.abs(on.pixels[p + c] - hidden.pixels[p + c]))) <= 8) continue;
    maskPixels++;
    let maximum = 0;
    for (let c = 0; c < 3; c++) {
      const difference = on.pixels[p + c] - off.pixels[p + c];
      maximum = Math.max(maximum, Math.abs(difference)); absolute += Math.abs(difference); signed += difference;
    }
    if (maximum > 8) changedPixels++;
  }
  return {maskPixels, changedPixels, changedFraction: maskPixels ? changedPixels / maskPixels : 0,
    meanAbsoluteChannelDifference: maskPixels ? absolute / (maskPixels * 3) : 0,
    meanOnMinusOff: maskPixels ? signed / (maskPixels * 3) : 0,
    maskMeaning: 'Pixels changed by showing the asset versus hiding it; includes its ground-shadow region.'};
}
