import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {verifyLocal3dAsset} from '../local3d-provider.mjs';
import {compareVisibleAsset, decodePng} from './png.mjs';

const DEFAULT_V4 = 'C:/KHOSAN/KHOSAN TIME ch/KHOSAN_CREATIVE_OS/CHANNELS/studio_harness_v4';
const ownRoot = path.dirname(fileURLToPath(import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = file => digest(fs.readFileSync(file));
const {values} = parseArgs({options: {
  job: {type: 'string'}, 'v4-root': {type: 'string', default: DEFAULT_V4},
  browser: {type: 'string'}, help: {type: 'boolean', default: false},
}});
if (values.help || !values.job) {
  console.log('Usage: node adapter/v4/verify.mjs --job <local3d-job-dir> [--v4-root <existing-V4-dir>] [--browser <Chrome-or-Edge-exe>]');
  console.log('Renders native 960x540 stills and visibility evidence using existing V4 dependencies. Elephant studio also verifies LTC-light and separate shadow contributions. No video, original V4 edit, or publication.');
  if (!values.help) process.exitCode = 2;
} else {
  await verify();
}

async function verify() {
  const job = fs.realpathSync(values.job), v4Root = fs.realpathSync(values['v4-root']);
  const externalRequire = createRequire(path.join(v4Root, 'package.json'));
  function packageInfo(name) {
    const entry = externalRequire.resolve(name);
    let directory = path.dirname(entry);
    while (directory !== path.dirname(directory)) {
      const candidate = path.join(directory, 'package.json');
      if (fs.existsSync(candidate)) {
        const meta = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (meta.name === name) return {name, version: meta.version, root: directory, entry, packageFile: candidate};
      }
      directory = path.dirname(directory);
    }
    throw Error(`Cannot locate installed package metadata for ${name}`);
  }
  const packages = Object.fromEntries(['remotion', '@remotion/three', '@remotion/bundler', '@remotion/renderer', '@react-three/fiber', 'react', 'react-dom', 'three'].map(name => [name, packageInfo(name)]));
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
  const originalV4Files = ['package.json', 'package-lock.json', 'REGISTRY.json', 'src/Stage.tsx', 'src/core.mjs', 'scripts/status.mjs', 'scripts/qa.mjs', 'scripts/loopback.cjs'].map(name => path.join(v4Root, name));
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
  const candidates = values.browser ? [values.browser] : [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ];
  const browserExecutable = candidates.find(file => fs.existsSync(file));
  if (!browserExecutable) throw Error('Existing Chrome/Edge executable not found; supply --browser. No browser download was attempted.');
  const id = new Date().toISOString().replaceAll(':', '-') + '-' + randomBytes(3).toString('hex');
  const out = path.join(job, 'qa-v4', id), publicDir = path.join(out, 'public');
  fs.mkdirSync(publicDir, {recursive: true});
  fs.writeFileSync(path.join(publicDir, 'scene.glb'), bytes);
  fs.writeFileSync(path.join(publicDir, 'harness-asset.json'), manifestBytes);
  const errors = [], warnings = new Set(), logs = [], images = [];
  const report = {
    schema: 'khosan.local3d-v4-proof/1', id, status: 'RUNNING',
    scope: isLtcStudio ? 'SEPARATE_REMOTION_THREE_STATIC_GLB_LTC_960x540' : 'SEPARATE_REMOTION_THREE_STATIC_GLB_960x540',
    scene_id: manifest.scene_id, artifact_sha256: asset.sha256, artifact_bytes: asset.bytes,
    sourceBefore: before, runtimeVersions: Object.fromEntries(Object.entries(packages).map(([name, info]) => [name, info.version])),
    browserExecutable, sourceV4Root: v4Root,
    semanticObjects: asset.semanticIds.length, editableParts: asset.partCount,
    v4_render_integration: 'RUNNING', originalEpisodesModified: false,
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
    console.log('Building isolated static-GLB composition with installed V4 dependencies');
    // Reuse the inspected V4 process-local bind/Host guard, without editing it.
    externalRequire(path.join(v4Root, 'scripts', 'loopback.cjs'));
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
    const serveUrl = await bundle({
      entryPoint: path.join(ownRoot, 'entry.tsx'), outDir: path.join(out, 'bundle'),
      rootDir: v4Root, publicDir, enableCaching: false,
      webpackOverride: config => ({...config, resolve: {...config.resolve,
        modules: [path.join(v4Root, 'node_modules'), ...(config.resolve?.modules || ['node_modules'])],
        alias: {...config.resolve?.alias, ...aliases},
      }}),
    });
    browser = await openBrowser('chrome', {browserExecutable, chromiumOptions: {gl: 'angle'}});
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
    Object.assign(report, {sourceAfter: after, originalV4SourceUnchanged: true,
      status: isLtcStudio ? 'PASS_SCOPED_STATIC_GLB_LTC_STILLS' : 'PASS_SCOPED_STATIC_GLB_STILLS', v4_render_integration: 'PASS_SCOPED_STATIC_ASSET',
      limitation: 'Separate static GLB composition on the installed V4 Remotion/Three stack; no episode migration, animation, physics, art acceptance or video parity is implied'});
    save();
  } catch (error) {
    report.status = 'FAIL'; report.v4_render_integration = 'FAIL'; report.error = error.stack || String(error);
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
