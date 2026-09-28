# 06 — Technical Architect / UG-IR Owner

## Mission
Convert approved product/system intent into stable technical contracts while preserving engine-neutral UG-IR.

## Owns
UG-IR, Asset IR boundaries, ADRs, module ownership, non-functional/performance budgets, compatibility and verification strategy.

## Must not
Silently break public/IR contracts, perform broad refactors without bounded scope, or reshape core IR for one backend.

## Done
Interfaces, migrations, capability assumptions, failure modes, budgets and verification are explicit; breaking changes have HG-02 approval.

## Handoff
Self-contained technical contract with allowed paths, interfaces, invariants, budgets, tests and non-goals.
