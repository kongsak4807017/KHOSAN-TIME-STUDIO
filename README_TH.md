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

## Multi-Project Workspace

ติดตั้ง KHOSAN Studio ครั้งเดียว แต่สร้างเกมได้หลาย Project โดยแต่ละเกมมี Project ID, root, state, assets และ task ของตัวเอง ไม่ปะปนกัน ส่วน Tool/AI model ขนาดใหญ่สามารถติดตั้งร่วมกันได้

Studio มี Project Library และ Active Project ชัดเจน ก่อนทำ production Agent/DevSpace ต้อง resolve project root ของเกมนั้นก่อน

รายละเอียดดู `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md`

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

### Local headless 3D MCP — source ที่รันในเครื่องได้

เพิ่มสายงาน Blender/MCP สำหรับ asset static ที่เขียนสูตรขึ้นเอง ได้แก่ ไห โต๊ะ เสา ก้อนหิน ภูมิประเทศ และช้างที่ปั้นโดยใช้ภาพอ้างอิง สร้าง BLEND ที่แก้ไขได้, GLB ที่รวม geometry/วัสดุ, ภาพจริงสี่มุม และหลักฐานวัด geometry พร้อม hash งานสร้างโมเดลไม่ต้องใช้ Oriverse หรือ Trellis2

[![ช้าง r6 เดิมที่ผ่านผู้ตรวจอิสระ — ภาพ hero จาก Blender](docs/examples/local3d/elephant-r6/preview_hero.png)](docs/examples/local3d/elephant-r6/README.md)

ตัวอย่าง r6 เดิมมี [ภาพ Blender สี่มุมและหลักฐาน existing V4](docs/examples/local3d/elephant-r6/README.md) ให้ตรวจ ภาพนี้เป็นประวัติของงานเดิม ส่วน build จาก release ใหม่สร้างไฟล์และบันทึก review ของตัวเอง

ติดตั้ง Python 3.12 และ Blender แล้วเรียกจาก checkout โดยแทน path ตัวอย่างด้วย Blender ของเครื่องนี้:

```powershell
python scripts/local3d.py setup --blender "<path-to-installed-blender-executable>"
python scripts/local3d.py doctor
python scripts/local3d.py proof --fixture elephant --quality draft
python scripts/local3d.py config
```

Windows มี `SETUP_LOCAL3D.bat` เรียกตัวติดตั้งเดียวกัน ส่วน Linux/macOS ใช้คำสั่ง Python ตามคู่มือ ไฟล์ `.khosan/local3d-mcp.json` ที่สร้างจะใช้ path จริงของ checkout และ Blender บนเครื่องนี้ ไม่ต้องคัดลอก path ของเครื่องเจ้าของ การสร้างโมเดลแบบ standalone ไม่ต้องเปิด Studio Web/API หรือมี source ส่วนตัวของ Harness V4

Quick start เลือก **draft** สำหรับลองบนเครื่องที่ใช้ CPU/software rendering: ภาพ 640×360 ที่ 8 samples แต่ geometry ของโมเดลเหมือนเดิม เมื่อตรวจรูปลักษณ์ขั้นสุดท้ายให้รัน `python scripts/local3d.py proof --fixture elephant --quality standard` เพื่อใช้ภาพ 1280×720 ที่ 64 samples ค่า standard ยังเป็นค่าเริ่มต้นหากไม่ระบุ `--quality` งาน draft และ standard มีตัวตนและหลักฐานแยกกัน การหยุด render standard กลางทางไม่ถือว่าทำ proof เสร็จ

หากต้องการตรวจภาพผ่าน Remotion/Three มี runtime แบบล็อก dependency ให้ติดตั้งเพิ่ม ใช้ area lights แบบ LTC จริงและตรวจเงาพื้นจาก proxy แยกต่างหาก ยังไม่มี rig/animation หรือการอนุมัติภาพอัตโนมัติ ภาพและผลช้าง r6 เดิมเป็นตัวอย่างทางประวัติศาสตร์ งานที่สร้างใหม่มี digest และสถานะ review ของตัวเอง

- **[คู่มือติดตั้งบนเครื่องใหม่และสร้างซ้ำ — ไทย / English](docs/27-LOCAL3D-PORTABLE-INSTALL.md)**
- [สถาปัตยกรรม Local 3D และผลทดลองฉากแรก](docs/25-LOCAL-3D-MCP.md)
- [วิธีปั้นช้าง พารามิเตอร์ และหลักฐาน r6 เดิม](docs/26-LOCAL-3D-ELEPHANT.md)
- [คู่มือเครื่องมือภาษาไทย](tools/local_3d_mcp/README_TH.md)

### Reference Reconstruction Workflow
Workflow มาตรฐานสำหรับฉาก, generic asset และ UI ที่อ้างอิงภาพ:
- Reference Package / Conditioning
- Art-Direction Lock
- Decomposition / Blockout
- Reference Compare
- Diagnose mismatch
- Targeted Repair เฉพาะส่วนที่ผิด
- Material / Lighting / Detail
- Technical QA + Independent Review
- Human Approval / Freeze
- บันทึกส่วนที่ AI อนุมานและความไม่แน่นอน ไม่อ้างว่า single-view ตรง 100%

รายละเอียดดู `docs/21-REFERENCE-RECONSTRUCTION-WORKFLOW.md`

## สิ่งที่ต้องหา/ต่อเพิ่มเป็น P0

Physics, Navigation, glTF optimization, mesh optimization, KTX2 compression, PBR material authoring, ComfyUI, 3D auto rigging, animation retargeting, visual graph editor, dialogue/quest runtime, audio runtime/generation, Playwright QA และ Git LFS

รายละเอียดดู `docs/03-TOOL-REGISTRY.md`

## เริ่มใช้กับ ChatGPT + DevSpace

Clone repository แล้วเปิด local workspace จากนั้นสั่ง:

> Open this local workspace. Operate as KHOSAN Studio Orchestrator. Read AGENTS.md first. Create or select exactly one bounded work item from my request. Do not implement until acceptance criteria, allowed paths and verification commands are defined.

ถ้าจะเปิด Specialist:

> Operate as KHOSAN agent 08-rendering-engineer for TASK-XXXX only. Read AGENTS.md, the task and your role contract. Return typed handoff and verification evidence. Do not expand scope.

## สถานะปัจจุบัน

ตอนนี้เป็น **Deployable Studio Baseline v0.2.0** แล้ว: Harness, architecture, Creative Intelligence contracts และ local Studio Web/API มี source code ที่รันได้จริง

มีแล้ว:
- Studio Home
- Idea / Concept Lab ขั้นต้น
- Project Library รองรับหลายเกมใน Studio เดียว
- Active Project switcher: หนึ่ง interactive session ทำงานกับเกมเดียวอย่างชัดเจน
- สร้าง project แบบ isolated บน disk พร้อม `khosan-project.json` และ `.khosan/`
- Project workspace boundary / project-aware routing
- Blueprint + Creative Constitution persistence
- Agent Workboard ภาพรวม 21 roles
- Tool Registry/provenance
- local health/status API
- routing helper
- SkinTokens/UniRig adapter boundary
- Docker/self-host สำหรับ trusted local machine
- DevSpace Connectivity Pack สำหรับ ChatGPT → local DevSpace ผ่าน ngrok/Cloudflare แบบ optional

ถ้าใช้ ChatGPT + DevSpace จากภายนอกเครื่อง:
```text
ChatGPT → HTTPS tunnel → DevSpace MCP 127.0.0.1:7676
```

ส่วน Studio Web/API ยังคง `127.0.0.1:8080` และไม่ควรถูก tunnel ออก public โดยปริยาย

ตรวจ connectivity:
```powershell
python tools\devspace-connectivity\doctor.py --require-public
```

ยังไม่ production-complete:
- ChatGPT LLM ไม่ได้ฝังอยู่ใน local web server; ChatGPT ยังเป็น agent reasoning layer และ DevSpace เป็น execution layer
- Prototype Arena UI
- Asset Registry
- UG-IR runtime/live WebGPU preview
- tool worker GPU service แบบเต็ม
- remote/team authentication และ security hardening

รันบน Windows:
```powershell
.\scripts\bootstrap.ps1
.\scripts\run-studio.ps1
```

แล้วเปิด `http://127.0.0.1:8080`

หรือ Docker:
```bash
docker compose up --build
```

ดูรายละเอียดที่ `docs/22-MULTI-PROJECT-WORKSPACE-ARCHITECTURE.md` และ `docs/23-DEPLOYABLE-STUDIO-V0.2.md`.

หลักสำคัญคือ Repository นี้ต้องบอกความจริงว่าอะไรสร้างแล้ว อะไรเป็น specification และอะไรเป็น backlog ไม่ทำให้เอกสารดูเหมือนระบบรันได้แล้วทั้งที่ยังไม่ได้ implement
