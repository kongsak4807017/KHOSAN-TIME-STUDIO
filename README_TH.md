# KHOSAN TIME STUDIO — คู่มือภาพรวมภาษาไทย

Repository นี้คือ **Master Project** ของ KHOSAN TIME STUDIO ทั้งหมด

เป้าหมายไม่ใช่เพียง “สร้างเกมให้ได้” แต่ช่วยค้นหา **เกมที่สมควรถูกสร้าง** ด้วยระบบ Creative Intelligence ก่อนเข้าสายการผลิต และให้ผู้ใช้สร้าง/ทดลอง/เรียนรู้จากผู้เล่นโดยไม่ต้องคุยกับ Agent ทีละตัวหรือเรียก CLI ของเครื่องมือเอง

```text
ผู้ใช้
  ↓
Idea / Emotion / Culture / Player Fantasy
  ↓
Creative Intelligence Council
  ↓
Concept Portfolio
  ↓
Micro Prototype / Player Evidence
  ↓
Creative Constitution
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
- Agent 21 บทบาท: Production/Governance 13 บทบาท + Creative Intelligence Council 8 บทบาท
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

## Creative Intelligence Layer

เพิ่ม Council 8 บทบาท:
- Cultural & Trend Researcher
- Player Experience Researcher
- Concept Inventor
- Creative Critic
- Audience Researcher
- Community Intelligence
- Telemetry Analyst
- Live Game Designer

ระบบนี้ใช้เพื่อ:
- สำรวจ concept space หลายแนวแทนการรีบเลือกไอเดียเดียว
- วิเคราะห์ novelty / hook / fantasy / emotion / visual identity แบบไม่ยุบเป็นคะแนนเดียว
- ทำ micro-prototype เพื่อทดสอบสมมติฐาน
- ล็อก Creative Constitution โดยมนุษย์
- รับ community + telemetry หลังเกมมีผู้เล่น
- เปลี่ยน feedback เป็น experiment ไม่ใช่คำสั่งแก้เกมโดยตรง

รายละเอียดดู `docs/12-CREATIVE-INTELLIGENCE.md`

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
