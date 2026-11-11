import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {parseArgs} from 'node:util';
import {
  PORTABLE_ROOT, STATE_FILE, PINNED_DEPENDENCIES, createRuntime,
  hashFile, readRuntimeState, requireSupportedNode, resolveBrowser,
} from '../tools/local_3d_mcp/adapter/v4/portable-runtime/runtime.mjs';

const {values} = parseArgs({options: {
  browser: {type: 'string'}, 'skip-browser': {type: 'boolean', default: false},
  'force-install': {type: 'boolean', default: false}, help: {type: 'boolean', default: false},
}});
if (values.help) {
  console.log('Usage: node scripts/setup-local3d-v4.mjs [--browser <existing executable>] [--skip-browser] [--force-install]');
  console.log('Installs the locked optional rendering runtime into this checkout. Default browser setup downloads the Remotion-matched Chrome Headless Shell.');
} else {
  try {await setup();} catch (error) {console.error(`[LOCAL3D V4 SETUP] ${error.message}`); process.exitCode = 1;}
}

function locateNpmCli() {
  const nodeDir = path.dirname(process.execPath);
  const candidates = [process.env.npm_execpath,
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(nodeDir, '..', 'share', 'nodejs', 'npm', 'bin', 'npm-cli.js')];
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    for (const name of ['npm', 'npm.cmd']) {
      const candidate = path.join(directory, name);
      try {
        const real = fs.realpathSync(candidate);
        if (real.endsWith('npm-cli.js')) candidates.push(real);
      } catch {}
    }
    candidates.push(path.join(directory, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  }
  const match = candidates.find(file => file && fs.existsSync(file) && path.basename(file) === 'npm-cli.js');
  if (!match) throw Error('Cannot locate npm-cli.js beside Node or on PATH. Install Node.js 20+ with npm, then rerun setup.');
  return fs.realpathSync(match);
}

async function setup() {
  requireSupportedNode();
  const lockSha256 = hashFile(path.join(PORTABLE_ROOT, 'package-lock.json'));
  const prior = readRuntimeState();
  let runtime = null;
  if (!values['force-install'] && prior?.lock_sha256 === lockSha256
    && prior.platform === process.platform && prior.arch === process.arch) {
    try {runtime = createRuntime();} catch {}
  }
  if (!runtime) {
    console.log(`[LOCAL3D V4 SETUP] Installing locked runtime: ${PORTABLE_ROOT}`);
    const npmCli = locateNpmCli();
    await new Promise((resolve, reject) => {
      // Use Node + npm's CLI entry point directly, including on Windows. There
      // is no shell interpolation and checkout paths may contain spaces/Thai.
      const child = spawn(process.execPath, [npmCli, 'ci', '--no-audit', '--no-fund'], {
        cwd: PORTABLE_ROOT, stdio: 'inherit', shell: false, windowsHide: true,
      });
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve() : reject(Error(`npm ci exited with ${code}`)));
    });
    runtime = createRuntime();
  } else console.log('[LOCAL3D V4 SETUP] Matching locked dependencies already installed.');
  const state = {schema: 'khosan.local3d-runtime-install/1', runtime_mode: 'standalone_locked',
    platform: process.platform, arch: process.arch, node_version: process.version,
    lock_sha256: lockSha256, dependencies: PINNED_DEPENDENCIES,
    browser: prior?.platform === process.platform && prior?.arch === process.arch ? prior.browser : null,
    setup_status: 'DEPENDENCIES_READY_BROWSER_PENDING', updated_utc: new Date().toISOString()};
  // Preserve successful dependency installation even if a network/browser step
  // fails. Rerunning with --browser can then use the installed locked packages.
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  const browser = values['skip-browser'] ? null : await resolveBrowser(runtime, {browser: values.browser, allowDownload: true});
  state.browser = browser || state.browser;
  state.setup_status = browser ? 'READY' : 'DEPENDENCIES_READY_BROWSER_PENDING';
  state.updated_utc = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  console.log(JSON.stringify({status: browser ? 'READY' : 'DEPENDENCIES_READY_BROWSER_PENDING',
    runtime_mode: state.runtime_mode, runtime_root: runtime.root,
    browser: browser?.path || null, lock_sha256: lockSha256,
    next: 'node tools/local_3d_mcp/adapter/v4/verify.mjs --job <actual-job-directory>'}));
}
