#!/usr/bin/env python3
"""Extract candidate Oriverse research assistant messages from a ChatGPT export.

Only the original message text is written. This does not certify a complete archive.
Uses the Python standard library. Never upload the complete conversations.json.
"""
import argparse
import hashlib
import json
import pathlib
import re

KEYWORDS = re.compile(r"TRR[- ]?(?:0?[1-9]|1[0-9]|20)\b|Oriverse|Weave|Source Evidence|Disclosure Status", re.I)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("export_json", type=pathlib.Path)
    p.add_argument("--output", type=pathlib.Path, required=True)
    args = p.parse_args()
    data = args.export_json.read_bytes()
    chats = json.loads(data)
    if not isinstance(chats, list):
        raise SystemExit("Expected a ChatGPT conversations.json list")
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source_sha256": hashlib.sha256(data).hexdigest(),
        "candidate_count": 0,
        "warning": "Candidates only; human review required; not a verified full-text archive.",
        "messages": [],
    }
    for ci, chat in enumerate(chats):
        mapping = chat.get("mapping") or {}
        nodes = list(mapping.values())
        nodes.sort(key=lambda n: ((n.get("message") or {}).get("create_time") or 0))
        for node in nodes:
            msg = node.get("message") or {}
            if (msg.get("author") or {}).get("role") != "assistant":
                continue
            content = msg.get("content") or {}
            parts = content.get("parts") or []
            text = "\n".join(x for x in parts if isinstance(x, str))
            if not text or not KEYWORDS.search(text):
                continue
            # Exclude very short incidental references; retain candidate texts unchanged.
            if len(text) < 250:
                continue
            idx = len(manifest["messages"]) + 1
            filename = f"candidate-{idx:04d}.md"
            (args.output / filename).write_text(text, encoding="utf-8")
            manifest["messages"].append({
                "file": filename, "conversation_index": ci,
                "conversation_title": chat.get("title"),
                "message_id": msg.get("id"),
                "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
                "characters": len(text),
            })
    manifest["candidate_count"] = len(manifest["messages"])
    (args.output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Extracted {manifest['candidate_count']} candidate assistant messages.")
    print("Not certified complete. Review before committing any extracted text.")

if __name__ == "__main__":
    main()
