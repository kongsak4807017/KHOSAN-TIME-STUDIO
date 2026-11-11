# Part 7 technical review — six hard locks, Python gatekeeper and differential patch

**Source reviewed:** user Google Doc `AI 3D harness` (`1Cm8CkZoRbtwB5U71IJY5B9R2_sI9zfR7dr77wv9SG5I`), modified 11 November 2026 at 08:36 UTC. The previously archived document had 100,175 extracted characters; the current document has **114,348 characters**, including **Part 7** beginning at character 100,177. The full revised text is preserved at `knowledge/oriverse-research/harness-blueprint/AI-3D-HARNESS-SOURCE.txt`.

**Verdict:** Strong architecture proposal, but **NOT "100% AI protocol enforcement" as implemented in the supplied Python samples**. The supplied code lacks a trusted tool dispatcher, authoritative linter provenance, cryptographically separate reviewer identity, protected secret storage, a real installed Git/CI gate, and a real isolated vision review. Never auto-promote a sample run to `DONE`.

## Exact review of the six locks

| Lock | What Part 7 proposes | What its samples actually enforce | Blocking gap |
| --- | --- | --- | --- |
| 1 — Constrained Decoding & Strict Schema | LLM can emit only 15 DSL commands and valid UG-IR | A generated `patch_failing_layout_nodes` function schema | Schema does not authorize execution; server must validate semantics, phases and artifact boundaries. The sample has fields not all in `required`; strict schema support must be checked against the actual provider API. |
| 2 — Dynamic Tool Masking | Only current-phase tools visible to maker | Python method returns a repair tool definition | Merely hiding tools from a prompt does not prevent direct calls to available tools, arbitrary file writes or privileged Git operations. Add trusted dispatcher-level authorization. |
| 3 — Coordinate Prevention | `place_bounds_box` or named-anchor placements only | Schema allows both modes and optional coordinate/anchor fields | Does not enforce correct parameters for each mode; a box can still have unsupported/floating bounds. Revalidate geometry independently. |
| 4 — Differential Patch Lock | Freeze passing nodes; repair only failing nodes | Python `lock_passing_nodes`, `get_allowed_tool_schema_for_repair`, `apply_verified_patch` | The supplied `apply_verified_patch` checks only whether a target is frozen; **unknown target IDs are silently ignored**. It does not reject arbitrary patch fields, validate input bounds, bind a source revision, protect already-approved axes or recompute regression tests after a patch. |
| 5 — Cryptographic Evidence & Git Pre-Commit Gatekeeper | SHA-256 + HMAC evidence; reject unauthorized commit | Python `stamp_verified_evidence`, `verify_evidence_before_commit_or_done` | Both functions default to a **publicly known HMAC secret** (`khosan-local-dev-secret-key`). If the maker shares the signing environment, it can mint any receipt. `stamp_verified_evidence` can sign unchecked metrics or a claimed reviewer result; there is no verified installed pre-commit hook. A local Git hook can be skipped, so CI/protected-branch checks must also enforce acceptance. |
| 6 — Stateless Critic Isolation | Fresh separate vision session sees reference and contact sheet | No actual implementation of isolated reviewer in Part 7 | A flag `isolated_session: true` and `passed: true` can be written by the maker; earlier Part 3 `IsolatedVisualCritic` includes a `TODO` and returns `passed: True`. Real image review + signed attestation by a trusted independent issuer are required. |

## Further exploitable behavior in the Python HMAC verifier

1. `KHOSAN_HARNESS_SECRET` has a hardcoded fallback. Any user/process knowing it can recompute the HMAC of a forged evidence object; HMAC authenticates possession of the key, not whether a real visual critique happened.
2. `maker_agent_id != checker_agent_id` compares two **self-declared strings**, not authenticated identities or isolated sessions.
3. `json.loads` accepts non-standard `NaN` in Python by default. Conditions such as `m.get("max_seam_gap_cm", 999.0) > 0.1` evaluate **false for NaN**, potentially allowing an invalid metric. Booleans can compare equal to zero; require type-checked, finite, nonnegative numbers.
4. Evidence artifact paths are accepted without a mandatory registered project root or symlink/realpath checks; the verifier can read arbitrary disk paths if invoked with hostile evidence. Paths for missing artifacts can point to a directory, raising an unhandled error.
5. The signed evidence lacks an explicit current source-revision, immutable task/project identity and authenticated reviewer/human countersignatures. A signed payload can be replayed against the wrong target or relied upon after a task-state transition unless a trusted dispatcher binds these claims.
6. The sample prints `verified 100% with cryptographic proof` without a real independent VLM/actual human acceptance; that is not a supportable release statement.

## Native KHOSAN response, scoped honestly

**Existing verified primitive:** `tools/harness-3d/gate.mjs` already validates actual artifact digests and requires **two distinct Ed25519 signatures** from independently provisioned review and human approval public-key trust anchors. This is better than one HMAC secret shared across agent roles. However, the trusted issuer services and actual VLM/approval workflows are not yet integrated; configuring keys in a maker-controlled environment is not a secure production trust boundary.

**New Part 7 repair primitive:** `tools/ugir-geometry-linter/hard_lock_enforcer.py`, with tests in `scripts/test_part7_hard_locks.py`, supplies a **bounded, pure policy layer**:
- Supports `place_bounds_box` AABBs with canonical **Z-up, centimeters**, and optional `+Y` forward; other geometry modes explicitly BLOCK.
- Recomputes floating, solid overlap and expected-seam findings from the actual input state. Unknown names/invalid bounds/duplicate nodes are BLOCKED. A self-reported lint report must match the recomputed source hash and findings.
- Issues a repair window bound to a SHA-256 of the immutable source snapshot, lists failing node IDs and **specific coordinate axes**, records frozen node hashes.
- Exposes a minimal strict tool schema with *required fields*, separately enforces a phase tool allowlist, and **does not expose `finish_task`**.
- Accepts only atomic authorized `min_xyz_cm` / `max_xyz_cm` component edits; rejects frozen/unknown IDs, duplicate edits, extra keys, nonfinite values, no-ops, stale hashes, bad extents, new geometry defects or worsening existing defects.
- Every successful patch invalidates the previous repair window. Returns a **new proposed state**, not a write to the authoritative file or a fake `PASSED` verdict.
- Uses Python standard library and runs 20 deterministic local unittest cases (including negative/bypass attempts).

**Trust limitation:** This Python component is **not** a sandbox, a signature service or a protected orchestrator by itself. A maker granted direct filesystem write access can bypass it. Its caller must be a trusted tool gateway controlling file-system permissions, source-revision optimistic locks and admissible tool names. The code does not yet support `attach_to_anchor`, CSG, skinned meshes or arbitrary collision shapes.

## Required production architecture (not implemented by the sample)

```text
ChatGPT Maker (restricted tools; writes only into staging)
        │ strict tool schema is a UX/format gate, NOT permission
        ▼
Trusted Studio Tool Gateway / FSM
        │ authenticates roles; checks stage, project scope, revision
        ├─ Native DifferentialPatchLock (bounded AABB v1)
        ├─ Deterministic Blender / Game Runtime Tests
        ├─ Signed machine evidence (isolated service keys)
        ▼
Fresh independent Visual Critic (reference + real render only)
        │ authenticated signed reviewer receipt, current artifact hashes
        ▼
Trusted Human-Approval Service (real user identity + signed receipt)
        ▼
CI / branch protection / server-side merge gate (no bypass via --no-verify)
        ▼
Human-accepted asset (not automatic publish)
```

### Acceptance conditions for fully implemented Part 7

- [x] Full current source text archived and compared with Google Doc.
- [x] Identified concrete vulnerabilities rather than adopting sample Python at face value.
- [x] Bounded Python differential patch lock and 20 local unit tests.
- [x] Existing native artifact digest / Ed25519 verification gate available as a separate module.
- [ ] Central tool dispatcher intercepts **every** production/patch/write/complete call; DevSpace tool permissions exclude direct writes to approved artifact and evidence directories.
- [ ] Source revision and frozen-state locks survive process restart and concurrent agent sessions; atomic staging writes and project isolation enforce the same contract.
- [ ] Actual geometry and camera/raycast/runtime checks, plus a 16-view Blender contact sheet, are run and their receipts signed by the designated independent service.
- [ ] Real independent Visual Critic invoked with fresh context; reviewer controls its own protected signing key and outputs attributable defect evidence.
- [ ] A human account approves the exact asset revision through a trusted interface; signed human receipt verified by the native gate.
- [ ] Required CI/status check and branch protection prevent merge if checks are skipped; Git pre-commit may provide convenience but is not authoritative.
- [ ] Real target-PC integration tests and independent security review pass.

**No Evidence → No Done.** Source content and test fixtures are separate from claims of Oriverse's proprietary architecture; this review does not connect to Oriverse.