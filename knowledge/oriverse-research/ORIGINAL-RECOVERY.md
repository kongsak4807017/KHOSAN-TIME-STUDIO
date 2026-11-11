# Original-full-text recovery procedure

**Original message recovery status: STILL INCOMPLETE.** The user's consolidated 452,573-character Google Doc audit for TRR-01–TRR-20 (questions 001–200) **is now preserved in GitHub**, see [consolidated audit](consolidated-audit/) and [manifest](CONSOLIDATED-AUDIT-MANIFEST.json). But a consolidated report is not the exact original ChatGPT conversation/tool transcript with message IDs. Recover those separately as specified below; never mislabel the audit as verbatim message history.

## Accepted input
- Original ChatGPT data export (`conversations.json`) containing the complete Oriverse/Weave research conversation, **or** a verbatim Markdown/plain-text export of the entire original conversation.
- Never commit the full account export: it can include unrelated private chats and sensitive information.
- Process locally; only commit the extracted Oriverse research answers after review.

## Safe workflow
1. Obtain ChatGPT's own data export from Settings → Data Controls → Export Data, or save the exact original research conversation as a complete text file.
2. Use `python scripts/extract_chatgpt_oriverse_research.py path/to/conversations.json --output /tmp/oriverse-candidates` on a trusted local computer.
3. Inspect extracted messages and manually identify the 20 original TRR records; preserve original text without paraphrase, compression, corrections, or reformatting.
4. Commit reviewed original text under `knowledge/oriverse-research/original/TRR-01.md` ... `TRR-20.md`. Record the source conversation ID (internal only), message IDs, SHA-256 checksums, extraction date, and original export hash in a provenance manifest (exclude secrets).
5. Independently verify all 200 questions and all ten answer sections, plus category TRR summaries, source references and test evidence. Mark missing portions MISSING; never fill with guesses.
6. Only then change status from INCOMPLETE to COMPLETE.

## Verification
- 20 original TRR files present.
- Question identifiers 001–200 accounted for exactly once, in the correct categories.
- Every question contains Direct Answer, Architecture, Source Evidence, API Contract, Working Example, Execution Trace, Limits & Failure Modes, Verification, Disclosure Status, Research Gaps.
- Original text checksum and original export/message provenance recorded.
- Manual comparison with the original chat performed.
- Any reconstructed or editorial material stored separately from `original/` and labeled NON-VERBATIM.

**No Evidence → No Done.**
