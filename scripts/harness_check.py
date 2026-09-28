from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]

required = [
    "README.md",
    "AGENTS.md",
    "feature_list.json",
    "progress.md",
    "session-handoff.md",
    "studio/graph.md",
    "studio/human-gates.md",
    "studio/context-index.md",
    "studio/tool-registry.yaml",
    "studio/studio_state.json",
    "studio/contracts/work-item.schema.json",
    "studio/contracts/handoff.schema.json",
    "studio/contracts/evidence.schema.json",
    "studio/creative-intelligence/creative-constitution.schema.json",
    "studio/creative-intelligence/concept-hypothesis.schema.json",
    "studio/creative-intelligence/prototype-experiment.schema.json",
    "studio/creative-intelligence/community-insight.schema.json",
    "studio/creative-intelligence/telemetry-finding.schema.json",
    "docs/12-CREATIVE-INTELLIGENCE.md",
    "docs/13-CREATIVE-CONSTITUTION.md",
    "docs/14-PROTOTYPE-ARENA.md",
    "docs/15-COMMUNITY-INTELLIGENCE.md",
    "docs/06-LOCAL-DEPLOYMENT.md",
    "deploy/README.md",
]

errors = []

for rel in required:
    if not (ROOT / rel).exists():
        errors.append(f"missing: {rel}")

json_files = [
    "feature_list.json",
    "studio/studio_state.json",
    "studio/contracts/work-item.schema.json",
    "studio/contracts/handoff.schema.json",
    "studio/contracts/evidence.schema.json",
    "studio/templates/work-item.json",
    "studio/templates/handoff.json",
    "studio/templates/evidence.json",
    "studio/creative-intelligence/creative-constitution.schema.json",
    "studio/creative-intelligence/concept-hypothesis.schema.json",
    "studio/creative-intelligence/prototype-experiment.schema.json",
    "studio/creative-intelligence/community-insight.schema.json",
    "studio/creative-intelligence/telemetry-finding.schema.json",
    "studio/creative-intelligence/templates/creative-constitution.json",
    "studio/creative-intelligence/templates/concept-hypothesis.json",
    "studio/creative-intelligence/templates/prototype-experiment.json",
]

for rel in json_files:
    try:
        json.loads((ROOT / rel).read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"invalid json {rel}: {exc}")

agent_dir = ROOT / "studio" / "agents"
agents = sorted(agent_dir.glob("*.md")) if agent_dir.exists() else []
if len(agents) != 21:
    errors.append(f"expected 21 agent role files, found {len(agents)}")

if errors:
    print("[KHOSAN HARNESS] FAIL")
    for err in errors:
        print(" -", err)
    sys.exit(1)

print("[KHOSAN HARNESS] PASS")
print(f" - agent roles: {len(agents)}")
print(" - required master files present")
print(" - JSON contracts/templates parse")
