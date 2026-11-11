import type {Group} from 'three';
import type {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export type Local3dCoordinates = Readonly<{
  handedness: 'right'; up_axis: '+Y'; asset_forward: '+Z'; unit: 'meter';
  conversion_already_applied: true;
}>;
export type StaticCapabilities = Readonly<{animation: false; rigging: false; physics: false}>;
export interface Local3dManifest {
  schema: 'khosan.harness-asset/1.0';
  scene_id: string;
  spec_sha256: string;
  implementation_sha256: string;
  artifacts: {'scene.glb': {sha256: string; bytes: number}};
  coordinates: Local3dCoordinates;
  capabilities: StaticCapabilities;
  technical_build: 'PASS';
  export_reimport: 'PASS';
  visual_review: 'NOT_REVIEWED' | 'PASS' | 'REWORK';
  human_acceptance: 'NOT_REVIEWED' | 'APPROVED' | 'REJECTED';
}
export interface Local3dOptions {
  requirements?: Partial<StaticCapabilities>;
  maxBytes?: number;
  /** Testing seam; production uses a fresh peer GLTFLoader for each call. */
  loaderFactory?: () => GLTFLoader | Promise<GLTFLoader>;
}
export interface Local3dEvidence {
  readonly scope: 'STATIC_GLB_PROVIDER';
  readonly scene_id: string;
  readonly artifact_sha256: string;
  readonly declared_spec_sha256: string;
  readonly declared_implementation_sha256: string;
  readonly artifact_verified: true;
  readonly semantic_objects: number;
  readonly editable_parts: number;
  readonly render_meshes: number;
  readonly declared_reviews: Readonly<Pick<Local3dManifest, 'visual_review' | 'human_acceptance'>>;
  readonly coordinates: Local3dCoordinates;
  readonly capabilities: StaticCapabilities;
  readonly v4_render_integration: 'NOT_TESTED';
  readonly production_ready: false;
}
export interface Local3dWorldProvider {
  group: Group;
  objects: ReadonlyArray<Readonly<{id: string; role: string; depth: string}>>;
  /** Absolute finite, nonnegative seconds. Static assets intentionally do not move. */
  update(sourceTimeSeconds: number): void;
  /** Idempotent, releases resources owned by this load only. */
  dispose(): void;
  evidence: Local3dEvidence;
}
export class Local3dContractError extends Error {
  code: string;
  constructor(code: string, message: string);
}
export function validateLocal3dManifest(manifest: unknown, requirements?: Partial<StaticCapabilities>): Local3dManifest;
export function verifyLocal3dAsset(bytes: ArrayBuffer | ArrayBufferView, manifest: Local3dManifest, options?: Local3dOptions): Promise<Readonly<{
  scene_id: string; sha256: string; bytes: number; meshNodes: number;
  partCount: number;
  semanticIds: ReadonlyArray<string>; coordinates: Local3dCoordinates;
  scope: 'STATIC_SELF_CONTAINED_GLB_BYTES'; v4_render_integration: 'NOT_TESTED'; production_ready: false;
}>>;
export function parseLocal3dGlb(bytes: ArrayBuffer | ArrayBufferView, manifest: Local3dManifest, options?: Local3dOptions): Promise<Local3dWorldProvider>;
