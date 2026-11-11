import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const PORTABLE_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const STATE_FILE = path.join(PORTABLE_ROOT, 'node_modules', '.khosan-local3d-runtime.json');
export const hashFile = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const PINNED_DEPENDENCIES = Object.freeze(readJson(path.join(PORTABLE_ROOT, 'package.json')).dependencies);

export function requireSupportedNode() {
  if (Number(process.versions.node.split('.')[0]) < 20) throw Error('Local 3D rendering requires Node.js 20 or later.');
}

export function inside(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

export function readRuntimeState() {
  try {return readJson(STATE_FILE);} catch (error) {if (error.code === 'ENOENT') return null; throw error;}
}

export function createRuntime({v4Root} = {}) {
  requireSupportedNode();
  const root = fs.realpathSync(v4Root || PORTABLE_ROOT);
  const mode = v4Root ? 'existing_v4' : 'standalone_locked';
  const metadata = path.join(root, 'package.json');
  if (!fs.existsSync(metadata)) throw Error(`Runtime package.json missing: ${metadata}`);
  const localRequire = createRequire(metadata);
  const nodeModules = path.join(root, 'node_modules');
  if (!fs.existsSync(nodeModules)) throw Error('Rendering dependencies are not installed. Run: node scripts/setup-local3d-v4.mjs');
  const realModules = fs.realpathSync(nodeModules);
  if (!inside(root, realModules)) throw Error('The selected runtime node_modules resolves outside its own root. Install the locked standalone package with npm ci.');
  const packages = {};
  for (const [name, expected] of Object.entries(PINNED_DEPENDENCIES)) {
    let entry;
    try {entry = fs.realpathSync(localRequire.resolve(name));}
    catch {throw Error(`Missing ${name}@${expected}. Run: node scripts/setup-local3d-v4.mjs`);}
    if (!inside(realModules, entry)) throw Error(`Dependency ${name} resolved outside selected runtime; refusing ancestor/global fallback: ${entry}`);
    let directory = path.dirname(entry), found = null;
    while (inside(realModules, directory)) {
      const candidate = path.join(directory, 'package.json');
      if (fs.existsSync(candidate)) {
        const meta = readJson(candidate);
        if (meta.name === name) {found = {name, version: meta.version, root: directory, entry, packageFile: candidate}; break;}
      }
      if (directory === path.dirname(directory)) break;
      directory = path.dirname(directory);
    }
    if (!found) throw Error(`Cannot locate package metadata for ${name}`);
    if (found.version !== expected) throw Error(`Expected ${name}@${expected}; selected runtime contains ${found.version}. Use the locked standalone setup instead of changing another project's dependencies.`);
    packages[name] = found;
  }
  const lockFile = path.join(root, 'package-lock.json');
  if (!fs.existsSync(lockFile)) throw Error(`Selected runtime has no package-lock.json: ${root}`);
  return {root, mode, nodeModules: realModules, packages, require: localRequire,
    lockFile, lockSha256: hashFile(lockFile)};
}

export async function resolveBrowser(runtime, {browser, allowDownload = false} = {}) {
  let executable = browser || process.env.KHOSAN_LOCAL3D_BROWSER;
  let selection = executable ? 'explicit_path' : 'managed_cache';
  if (!executable && runtime.mode === 'standalone_locked') {
    const saved = readRuntimeState();
    if (saved?.browser?.selection === 'explicit_path' && saved.platform === process.platform && saved.arch === process.arch) {
      executable = saved.browser.path;
      selection = 'explicit_path';
    }
  }
  if (executable) {
    executable = fs.realpathSync(path.resolve(executable));
    if (!fs.statSync(executable).isFile()) throw Error(`Browser is not a file: ${executable}`);
  }
  const {ensureBrowser} = runtime.require('@remotion/renderer');
  const initialCwd = process.cwd();
  try {
    // Remotion 4.0.542 places its versioned browser cache under the nearest
    // cwd package.json. Bind it to this explicitly selected isolated runtime.
    process.chdir(runtime.root);
    const status = await ensureBrowser({
      browserExecutable: executable || null,
      chromeMode: 'headless-shell', logLevel: 'info',
      ...(allowDownload ? {} : {onBrowserDownload: () => {
        throw Error('A matching local browser is not installed. Run node scripts/setup-local3d-v4.mjs, or pass --browser <existing Chromium/Chrome/Edge executable>.');
      }}),
    });
    if (!status.path || !fs.existsSync(status.path)) throw Error('Browser setup did not return an existing executable');
    return {path: fs.realpathSync(status.path), selection, type: status.type, chromeMode: 'headless-shell'};
  } finally {process.chdir(initialCwd);}
}

/** Reject Webpack modules that escape the selected runtime's dependency tree. */
export class RuntimeContainmentPlugin {
  constructor(runtime) {this.root = runtime.nodeModules; this.checked = new Set();}
  apply(compiler) {
    compiler.hooks.normalModuleFactory.tap('KhosanRuntimeContainment', factory => {
      factory.hooks.afterResolve.tap('KhosanRuntimeContainment', result => {
        const resource = result?.createData?.resource?.split('?')[0];
        if (!resource || !resource.split(/[\\/]/).includes('node_modules') || this.checked.has(resource)) return;
        const actual = fs.realpathSync(resource);
        if (!inside(this.root, actual)) throw Error(`Bundled dependency escaped selected runtime: ${actual}`);
        this.checked.add(resource);
      });
    });
  }
}
