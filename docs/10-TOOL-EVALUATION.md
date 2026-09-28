# Tool Evaluation Protocol

Every proposed KHOSAN production tool is classified as ADOPT, EVALUATE, TO-FIND, OPTIONAL, BUILD-KHOSAN or REJECT/DUPLICATE.

## Evaluation record

For each candidate record:
1. capability gap it fills,
2. overlap with existing tools,
3. local/headless automation support,
4. input/output formats,
5. deterministic validation path,
6. license and redistribution terms,
7. platform/GPU requirements,
8. security/trust implications,
9. maintenance/activity risk,
10. adapter boundary,
11. fallback/replacement path,
12. representative benchmark.

## Acceptance gate

A P0 tool is not “adopted” because a demo works.

Adoption requires:
- pinned version/commit,
- minimal integration fixture,
- failure behavior,
- reproducible command,
- license note,
- performance/resource note,
- Tool Registry entry,
- ADR if it affects architecture.

## Avoid tool sprawl

Reject a candidate when it merely duplicates sprite-gen/img2threejs or another adopted capability without a measured benefit.

The Studio should accumulate **capabilities**, not repositories.
