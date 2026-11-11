# KHOSAN 3D production gateway — Six Hard Locks (bounded, executable)

**State: Integrated source and local security tests, NOT a production-secure deployment.** In particular the real renderer, isolated multimodal Critic, authenticated human issuer, Windows OS accounts/ACLs and required GitHub branch protection must be configured and independently verified before claiming complete enforcement. No Oriverse dependency.

## 1. Enforced operations and signatures

Unlike prompt-only rules or a tool mask, `tools/harness-3d/trusted-gateway.mjs` verifies an **Ed25519-signed action envelope** against a role-specific trusted public key **before** executing any state mutation. The signed request includes the project/task IDs, actor ID/role, expected task state version, nonce, issue and expiry times (max five-minute life), exact tool name and tool payload. There is no `finish_task` operation. Any unexpected fields, wrong role, stale state, untrusted signature, extra tool, or task-root mismatch is `BLOCKED`.

The trusted workflow is:

| Stage (signed persisted state) | Authorized writer and tool | Source-of-truth check |
|---|---|---|
| `specified` | Controller `lock_reference` | Real PNG inside registered game root and SHA-256 |
| `reference_locked` | Maker `create_geometry` | Measured supported UG-IR AABB structure, source saved immutable version |
| `geometry_built` | Checker `lint_geometry` | Deterministic server-side geometry diagnostics |
| `geometry_built` (repair scope exists) | Same Maker `patch_failing_layout_nodes` | Frozen nodes, failing axes, source SHA, no new/worse defects; then lint again |
| `geometry_verified` | Renderer `submit_render` | Signed actor, actual GLB/PNG file hashes, GLB vertex accessor, minimum 4×4 sheet pixel grid, bounded camera occlusion |
| `rendered` | Independent Reviewer `submit_review` | Distinct actor key, signed receipt binds exact reference/contact hashes and reviewer run |
| `independent_reviewed` | Human approval issuer `approve` | Separate Ed25519 receipt; existing `verify3DAcceptance` checks actual current asset files, metrics and both signatures |
| `human_accepted` | No writable tools | Explicitly locked; no automatic publish/merge |

`open_task` is a separate controller-only signed action and can be performed once. `status` is signed/read-only; Studio may expose a separate loopback-only verified status view. Every successful mutation increments a compare-and-swap version and writes a server-signed state snapshot. Task-local `wx` lock prevents concurrent writes; after a crash, a stale lock must be repaired by a trusted operator, never silently removed by a maker.

## 2. Six Hard Locks mapping

1. **Strict schema:** `repair-protocol.mjs` and `authorizeCommand` independently validate exact keys, object types, finite numbers, authorized actions and data semantics. JSON Schema and provider constrained decoding remain upstream hints; they are not the authorization boundary.
2. **Dynamic tool masking:** `allowedTools(stage,role)` returns the minimal per-stage actions; `enforceTool` rejects off-stage signed calls even if a client fabricates a tool invocation. No `finish_task` API.
3. **Coordinate prevention:** only `place_bounds_box` with +Z up, centimeters, positive finite extents and bounded magnitude. Unsupported anchors, non-AABB meshes and CSG are blocked; they require separately validated adapters.
4. **Differential patch:** failing nodes/axes computed from authoritative current geometry, frozen hash verified, source revision bound, no edits outside approved fields, no introduction/worsening of measured defects, and mandatory re-lint. All intermediate sources are versioned; never overwrite the previous source.
5. **Cryptographic evidence:** role-specific Ed25519 action signatures, server Ed25519 state signatures, SHA-256 source/reference/GLB/contact receipts, verified external reviewer/human receipts. No fallback HMAC secret. Trust configuration/private issuer keys must be OS-protected and outside the project. The public trust registry also pins allowed project roots.
6. **Stateless critic separation:** maker cannot submit review/approval via the gateway. A fresh Review Service *must* perform actual vision evaluation before signing. The gateway verifies its signed claim and artifact hash, **but it does not itself run a VLM or prove a reviewer used a clean prompt**. Never label a boolean `isolated_session: true` as independently verified without the service's authenticated execution receipt.

## 3. Important trust boundary — OS enforcement is mandatory

> **Running the CLI as the same unrestricted Windows user as DevSpace is NOT a security boundary.** An agent with arbitrary write rights to `.khosan/harness3d`, the reference files, or issuer private keys can bypass the gateway. File signatures catch many tampering attempts but do not replace OS isolation and anti-rollback storage.

Provision a **dedicated local service identity** to own the gateway process, its private server signing key, the protected per-project `.khosan/harness3d` directories and approved evidence. Grant the DevSpace maker account *no direct write access* to those protected paths. Prefer a distinct review issuer, a distinct human-approval issuer and an authenticated service-to-service channel with separate private keys inaccessible to Maker. Only the gateway may advance protected phases. Staged model/scene creation can remain in `.khosan/staging`; the gateway validates and imports that work into immutable versioned source files. Regular Studio REST routes must never expose the signing key or generic shell/JSON-file mutators.

Do not enable the Studio API or its status endpoint on an external host without authentication; this implementation permits verified status reads only when the configured Studio host is loopback. No mutable gateway API is exported over Studio HTTP.

## 4. Trust registry and operating contract

Example trusted **public** JSON registry (store outside project, never commit real keys):

```json
{
  "schema": "khosan.3d.trust.v1",
  "server": {"public_key_pem": "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"},
  "projects": {"game001": "D:\\KHOSAN\\Projects\\game001"},
  "actors": {
    "controller": {"project-owner": "<Ed25519 public PEM>"},
    "maker": {"asset-builder": "<different Ed25519 public PEM>"},
    "checker": {"geometry-qa": "<different Ed25519 public PEM>"},
    "renderer": {"render-service": "<different Ed25519 public PEM>"},
    "reviewer": {"visual-critic": "<different Ed25519 public PEM>"},
    "human": {"executive-owner": "<different Ed25519 public PEM>"},
    "observer": {"read-only-agent": "<different Ed25519 public PEM>"}
  }
}
```

An external trusted issuer must sign canonical JSON bytes returned by `envelopeBody(request_without_signature)` using **Ed25519** and put the base64 signature in `signature_base64`. `expected_version` must equal the last signed state version; `open_task` uses `null`. Nonces must be unique and at least 16 characters; expiration must be within five minutes of issue. The same issuer also signs `reviewerReceiptPayload(evidence)` or `humanApprovalPayload(evidence)` for its independent receipt. Never provide signing private keys to ChatGPT, prompt context, DevSpace tool responses or the browser.

CLI (run **only** as a trusted service identity):

```powershell
node tools/harness-3d/gateway-cli.mjs execute "D:\KHOSAN\Projects\game001" "C:\KHOSAN\trust\public-registry.json" "C:\KHOSAN\trust\server-private.pem" "C:\KHOSAN\inbox\signed-command.json"
node tools/harness-3d/gateway-cli.mjs status "D:\KHOSAN\Projects\game001" "C:\KHOSAN\trust\public-registry.json" game001 TASK-HOUSE-001
```

Never run an untrusted command directly through a shell string. Pass only a signed JSON file and the pinned project root. The native verifier's UI status reports **only current verified state**; it has no `approve` button unless the separate trusted human authorization service is configured.

## 5. Verifications and non-goals

```bash
npm run verify:gateway
npm run verify:3d-harness
npm run verify:part7
node scripts/verify-oriverse-archive.mjs
```

GitHub Actions `harness-gates.yml` runs automatically for PRs to main and pushes to main. A green workflow does **not automatically enable required status checks / rulesets**; a repository administrator must configure rules and require the `trusted-gateway-and-evidence` check. Local Git hooks are optional UX, not a security boundary (`--no-verify` bypasses them).

Tests use synthetic reference PNGs and a minimal synthetic GLB; they prove protocol behavior, not artistic fidelity. Renderer `submit_render` is a *signed receipt ingestion*, not image synthesis. Real Blender/Three.js GPU rendering, 16 independent viewpoints, trustworthy raycast camera measurements, independent VLM evaluation, identity-backed human approvals, all-engine geometry and large-scale multi-user security must still be implemented and verified in the target Windows environment. **Do not claim six fully enforced hard locks until those deployment conditions pass.**

## 6. DevSpace to trusted local IPC (implementation; OS installation still required)

The source includes a local-only **Windows named-pipe / Unix-domain-socket daemon**. The Maker prepares a signed request and sends it to the gateway. The service checks project root, signature, role, phase, version, artifact digests and per-axis permissions before any protected write. There is no arbitrary shell or remote HTTP mutation surface.

Start **only under an OS-isolated trusted gateway service identity**, not under DevSpace's unrestricted Maker Windows account:

```powershell
node tools/harness-3d/gateway-daemon.mjs serve "C:\KHOSAN\trust\public-registry.json" "C:\KHOSAN\trust\server-private.pem" "\\.\pipe\khosan-harness3d"
```

Maker-side request creation, signing (Maker private key only), and IPC submission:

```powershell
node tools/harness-3d/gateway-sign.mjs sign "C:\KHOSAN\maker\maker-private.pem" "C:\KHOSAN\maker\unsigned-request.json" "C:\KHOSAN\maker\signed-request.json"
node tools/harness-3d/gateway-client.mjs "\\.\pipe\khosan-harness3d" "C:\KHOSAN\maker\signed-request.json"
```

The IPC accepts at most one signed JSON request per connection, a 1 MiB frame, 30-second timeout and limited concurrent connections. A Maker signature never authorizes Controller, Renderer, Independent Reviewer or Human actions; separate issuer keys, credentials and actual work are mandatory.

**Windows deployment prerequisite:** Create a dedicated gateway service account, enforce real NTFS ACLs so Maker cannot directly modify protected `.khosan/harness3d` task state/accepted evidence or read protected private keys, provision external independent reviewer and human approval issuers, and verify the running identities. `icacls` can be used to inspect and enforce rights by a local administrator; this repository does not blindly modify the user's file permissions or install a background service. Without these operating-system controls, the protocol module is *not* a complete sandbox.