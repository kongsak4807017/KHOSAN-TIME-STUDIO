// KHOSAN Human Engine v0.1
// Native WebGPU compute kernel for canonical-mesh morphing + 4-influence LBS.
//
// Buffer contract:
//   binding 0: canonical vertices
//   binding 1: dense morph deltas, morph-major [morph * vertexCount + vertex]
//   binding 2: morph weights
//   binding 3: joint skin matrices (worldJoint * inverseBind)
//   binding 4: output deformed vertices
//   binding 5: dispatch parameters
//
// Corrective morphs can be appended to the same morph bank by the host after
// evaluating semantic/pose constraints. The GPU path remains deterministic.

struct VertexIn {
  position: vec4f,
  normal: vec4f,
  joints: vec4u,
  weights: vec4f,
};

struct MorphDelta {
  position: vec4f,
  normal: vec4f,
};

struct VertexOut {
  position: vec4f,
  normal: vec4f,
};

struct Params {
  vertexCount: u32,
  morphCount: u32,
  jointCount: u32,
  _pad0: u32,
};

@group(0) @binding(0) var<storage, read> vertices: array<VertexIn>;
@group(0) @binding(1) var<storage, read> morphDeltas: array<MorphDelta>;
@group(0) @binding(2) var<storage, read> morphWeights: array<f32>;
@group(0) @binding(3) var<storage, read> jointMatrices: array<mat4x4f>;
@group(0) @binding(4) var<storage, read_write> outputVertices: array<VertexOut>;
@group(0) @binding(5) var<uniform> params: Params;

fn jointMatrix(index: u32) -> mat4x4f {
  if (index < params.jointCount) {
    return jointMatrices[index];
  }
  return mat4x4f(
    vec4f(1.0, 0.0, 0.0, 0.0),
    vec4f(0.0, 1.0, 0.0, 0.0),
    vec4f(0.0, 0.0, 1.0, 0.0),
    vec4f(0.0, 0.0, 0.0, 1.0)
  );
}

@compute @workgroup_size(128)
fn morphAndSkin(@builtin(global_invocation_id) gid: vec3u) {
  let vertexIndex = gid.x;
  if (vertexIndex >= params.vertexCount) {
    return;
  }

  let src = vertices[vertexIndex];
  var p = src.position.xyz;
  var n = src.normal.xyz;

  // Dense morph evaluation. v0.1 favors correctness and a stable contract;
  // later backends can introduce active-morph compaction without changing DNA.
  for (var morphIndex: u32 = 0u; morphIndex < params.morphCount; morphIndex = morphIndex + 1u) {
    let w = morphWeights[morphIndex];
    if (abs(w) > 0.000001) {
      let deltaIndex = morphIndex * params.vertexCount + vertexIndex;
      let delta = morphDeltas[deltaIndex];
      p = p + delta.position.xyz * w;
      n = n + delta.normal.xyz * w;
    }
  }

  n = normalize(n);

  let rawWeightSum = src.weights.x + src.weights.y + src.weights.z + src.weights.w;
  var weights = src.weights;
  if (rawWeightSum > 0.000001) {
    weights = weights / rawWeightSum;
  } else {
    weights = vec4f(1.0, 0.0, 0.0, 0.0);
  }

  let m0 = jointMatrix(src.joints.x);
  let m1 = jointMatrix(src.joints.y);
  let m2 = jointMatrix(src.joints.z);
  let m3 = jointMatrix(src.joints.w);

  let hp = vec4f(p, 1.0);
  let hn = vec4f(n, 0.0);

  let skinnedPosition =
      (m0 * hp) * weights.x +
      (m1 * hp) * weights.y +
      (m2 * hp) * weights.z +
      (m3 * hp) * weights.w;

  let skinnedNormal =
      (m0 * hn).xyz * weights.x +
      (m1 * hn).xyz * weights.y +
      (m2 * hn).xyz * weights.z +
      (m3 * hn).xyz * weights.w;

  outputVertices[vertexIndex].position = vec4f(skinnedPosition.xyz, 1.0);
  outputVertices[vertexIndex].normal = vec4f(normalize(skinnedNormal), 0.0);
}
