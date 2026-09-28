# KHOSAN TIME STUDIO — คู่มือภาพรวมภาษาไทย

Repository นี้คือ **Master Project** ของ KHOSAN TIME STUDIO ทั้งหมด

เป้าหมายคือให้ผู้ใช้สร้างเกมโดยไม่ต้องคุยกับ Agent ทีละตัว และไม่ต้องเรียก CLI ของเครื่องมือเอง

```text
ผู้ใช้
  ↓
Create New Game
  ↓
อธิบายเกมด้วยภาษาคน
  ↓
Studio Orchestrator
  ↓
Game Blueprint
  ↓
ผู้ใช้อนุมัติ Concept
  ↓
AI Agents + Production Tools
  ↓
UG-IR / Asset IR / Project Graph
  ↓
Playable Preview
  ↓
ผู้ใช้บอกสิ่งที่ต้องการแก้
  ↓
QA / Review
  ↓
Build / Export / Deploy
```

## สิ่งที่เก็บไว้ใน Repository นี้

- แนวคิดและ architecture ของ Studio
- Harness สำหรับ AI Agent
- Agent 13 บทบาท
- Workflow และ Graph การส่งงาน
- Tool Registry
- Asset Pipeline 2D/3D
- UG-IR
- Human approval gates
- QA/verification rules
- แผนหาและ integrate เครื่องมือเพิ่ม
- วิธีทำงานกับ ChatGPT + DevSpace local workspace
- วิธี bootstrap/deploy บนคอมพิวเตอร์
- Roadmap

## เครื่องมือ Core ที่มีแล้ว

### sprite-gen
Core 2D Production Engine:
- ภาพนิ่ง → animation states
- transparent sprite atlas
- frame manifest
- curation
- recolor/layers
- motion QA
- scene tools

### img2threejs
Core 3D Production Tool:
- reference image → structured/procedural 3D
- KHOSAN จะนำ semantic structure ไปลง Asset IR
- Three.js เป็น adapter/backend หนึ่ง ไม่ใช่หัวใจของ Studio

## สิ่งที่ต้องหา/ต่อเพิ่มเป็น P0

Physics, Navigation, glTF optimization, mesh optimization, KTX2 compression, PBR material authoring, ComfyUI, 3D auto rigging, animation retargeting, visual graph editor, dialogue/quest runtime, audio runtime/generation, Playwright QA และ Git LFS

รายละเอียดดู `docs/03-TOOL-REGISTRY.md`

## เริ่มใช้กับ ChatGPT + DevSpace

Clone repository แล้วเปิด local workspace จากนั้นสั่ง:

> Open this local workspace. Operate as KHOSAN Studio Orchestrator. Read AGENTS.md first. Create or select exactly one bounded work item from my request. Do not implement until acceptance criteria, allowed paths and verification commands are defined.

ถ้าจะเปิด Specialist:

> Operate as KHOSAN agent 08-rendering-engineer for TASK-XXXX only. Read AGENTS.md, the task and your role contract. Return typed handoff and verification evidence. Do not expand scope.

## สถานะปัจจุบัน

ตอนนี้เป็น **Foundation / Master Repository**: Harness, architecture, contracts และ deployment plan ใช้งานได้ แต่ตัว Visual Studio Shell/World Editor ยังต้องสร้างเป็น software product ต่อไป

หลักสำคัญคือ Repository นี้ต้องบอกความจริงว่าอะไรสร้างแล้ว อะไรเป็น specification และอะไรเป็น backlog ไม่ทำให้เอกสารดูเหมือนระบบรันได้แล้วทั้งที่ยังไม่ได้ implement
