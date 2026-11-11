# Local 3D on another computer / ติดตั้ง Local 3D บนเครื่องใหม่

This guide installs the local Blender/MCP pipeline from a fresh checkout, reproduces the authored examples, and optionally renders the same GLB with the portable Remotion/Three LTC proof. The local pipeline does not depend on Oriverse, Trellis2, the Studio Web/API, DevSpace, or the owner's private channel directories.

คู่มือนี้เริ่มจาก source ใน repository บนเครื่องใหม่ สร้างโมเดลด้วย Blender และ MCP ในเครื่อง แล้วเลือกทดสอบ GLB ด้วย Remotion/Three และแสง LTC ได้เพิ่มเติม ไม่ต้องมี Oriverse, Trellis2, Studio Web/API, DevSpace หรือโฟลเดอร์ช่องวิดีโอส่วนตัวของเจ้าของ

The supported work is **static procedural geometry**: amphora, table, column, rock, terrain and the reference-guided elephant. The elephant is an authored model guided by one image; it is not an arbitrary image-to-3D converter. Rigging, animation and physics are separate future capabilities.

สิ่งที่พร้อมใช้คือสูตรสร้าง geometry แบบ static ทั้งหกชนิด ช้างเป็นโมเดลที่เขียนสูตรและปรับรูปทรงโดยใช้ภาพอ้างอิงหนึ่งภาพเป็นแนวทาง ยังไม่ใช่ระบบแปลงภาพใดก็ได้เป็น 3D และไม่มี rig, animation หรือ physics

## 1. Choose the required components / เลือกส่วนที่ต้องใช้

| Workflow / งาน | Required / ต้องมี | Result / ผลลัพธ์ |
|---|---|---|
| Local model build / สร้างโมเดลในเครื่อง | Python, Blender, pinned MCP SDK installed by setup | BLEND, GLB, four PNG views and measured evidence |
| Agent calls / เรียกจาก agent | Above plus a client supporting MCP stdio | The same bounded build/review tools through the client |
| Portable LTC still proof / ทดสอบ LTC แบบ standalone | Above plus Node/npm and the optional locked runtime; setup obtains its matched browser or accepts an existing one | Native Remotion/Three stills, LTC/shadow controls and a report |
| Existing Harness V4 integration / ตรวจกับ Harness V4 เดิม | An actual existing V4 checkout with its expected files/dependencies | A separately scoped integration proof against that checkout |

Node, a browser and Harness V4 are not needed to generate the BLEND/GLB or Blender previews. DevSpace is an optional way for a remote agent to operate the machine; it is not the local3d server's transport or an installation prerequisite.

การสร้าง BLEND/GLB และภาพจาก Blender ไม่ต้องติดตั้ง Node หรือ browser ส่วน DevSpace เป็นทางเลือกสำหรับเชื่อม agent จากภายนอกเข้ามาทำงาน ไม่ใช่สิ่งที่ MCP ตัวนี้ต้องมีเพื่อเริ่มทำงาน

## 2. Prerequisites / เตรียมโปรแกรม

Use **Python 3.12** for the documented reproduction path. The driver requires Python 3.10 or newer and Blender 4.3 or newer. Install Blender separately and identify its executable. The original accepted elephant used Blender 5.2.2 LTS; other Blender builds must produce their own successful doctor, geometry, export and image checks. The optional renderer requires Node 20 or newer with npm; Node 24 was used in the original Windows proof. Its setup downloads the Remotion-matched Chrome Headless Shell unless an existing supported browser is selected.

แนะนำ Python 3.12 สำหรับทำซ้ำตามคู่มือนี้ ตัว driver กำหนดขั้นต่ำ Python 3.10 และ Blender 4.3 โดยต้องติดตั้ง Blender แยก งานช้างต้นฉบับใช้ Blender 5.2.2 LTS หากใช้รุ่นอื่นให้ตรวจผลจริงของรุ่นนั้น renderer เสริมต้องใช้ Node 20 ขึ้นไปพร้อม npm และ setup จะดาวน์โหลด Chrome Headless Shell รุ่นที่เข้ากับ Remotion ให้ หรือเลือก browser ที่ติดตั้งไว้แล้วได้

Official installation sources:

- [Python downloads](https://www.python.org/downloads/)
- [Blender downloads](https://www.blender.org/download/)
- [Node.js downloads](https://nodejs.org/en/download) — optional for the renderer
- [Official MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) — installed through the repository's pinned requirements

Setup creates a project-local `.venv-local3d` and installs `requirements-lock.txt`, including `mcp==1.29.0` and pinned transitive dependencies. Its platform marker installs `pywin32` only on Windows. Blender uses its own bundled Python for modeling; do not install the MCP SDK into Blender. Dependency installation needs network access on first setup. The modeling job itself needs no model API, CDN or network download after its local prerequisites are installed.

Setup สร้าง `.venv-local3d` ภายใน checkout และติดตั้ง dependency ตาม `requirements-lock.txt` รวม `mcp==1.29.0` โดย `pywin32` ติดตั้งเฉพาะ Windows ทั้งหมดแยกจาก Python ของ Blender การติดตั้งครั้งแรกใช้อินเทอร์เน็ต หลังเตรียมโปรแกรมและไฟล์แล้ว งานสร้างโมเดลทำในเครื่องโดยไม่เรียก model API หรือ CDN

## 3. Clone and install / Clone และติดตั้ง

Choose a writable checkout directory. The portable driver resolves the repository root from its own file location; it does not require the owner's drive layout or the current terminal to stay in one special directory. Commands below are shown from the repository root.

เลือกโฟลเดอร์ที่เขียนไฟล์ได้ ตัว driver หา root จากตำแหน่งไฟล์ของตัวเอง ไม่บังคับชื่อไดรฟ์หรือโครงสร้างโฟลเดอร์เหมือนเครื่องเจ้าของ ตัวอย่างคำสั่งด้านล่างเรียกจาก root ของ repository

```bash
git clone https://github.com/kongsak4807017/KHOSAN-TIME-STUDIO.git
cd KHOSAN-TIME-STUDIO
```

Downloading and extracting the repository ZIP also provides the source. Keep the directory structure and supplied reference file intact. A copied Python virtual environment or `node_modules` directory is not the portable installation; recreate them on the destination machine.

ดาวน์โหลด ZIP แล้วแตกไฟล์ได้เช่นกัน โดยเก็บโครงสร้างโฟลเดอร์และภาพอ้างอิงไว้ครบ ไม่ต้องย้าย virtual environment หรือ `node_modules` จากเครื่องเก่า ให้ setup สร้างใหม่บนเครื่องปลายทาง

### Windows PowerShell

Replace the sample Blender path with the executable actually installed on this machine. `python` should select the intended Python 3.12 interpreter; `py -3.12` can be used instead if the Windows Python launcher is installed.

แทน path ตัวอย่างด้วย Blender ที่ติดตั้งจริง คำสั่ง `python` ควรเป็น Python 3.12 ที่เลือกใช้ หากมี Windows Python launcher สามารถเปลี่ยนเป็น `py -3.12` ได้

```powershell
python scripts/local3d.py setup --blender "<path-to-installed-blender-executable>"
python scripts/local3d.py doctor
python scripts/local3d.py proof --fixture elephant --quality draft
python scripts/local3d.py config
```

`SETUP_LOCAL3D.bat` and the PowerShell wrappers call the same driver. The direct command is useful when selecting a particular Blender executable or diagnosing setup.

ไฟล์ `SETUP_LOCAL3D.bat` และ PowerShell wrappers เรียก driver เดียวกัน ส่วนคำสั่งโดยตรงเหมาะกับการเลือก Blender ที่ต้องการหรือดูสาเหตุเมื่อ setup ไม่ผ่าน

The initial proof above explicitly chooses draft image quality. Use `--quality standard` for final visual review; [the quality table below](#4-reproduce-and-inspect-the-examples--สร้างและตรวจตัวอย่าง) explains the difference.

คำสั่งทดลองแรกเลือกภาพ draft อย่างชัดเจน หากตรวจรูปลักษณ์ขั้นสุดท้ายให้ใช้ `--quality standard` ตามตารางรายละเอียดด้านล่าง

### Linux and macOS shell / shell บน Linux และ macOS

Select the platform's actual Blender executable. For an application bundle, select its executable rather than the outer application directory. The commands are portable entry points; tested OS/runtime combinations are recorded separately in the release evidence.

เลือก executable ของ Blender ให้ตรงระบบ หากเป็น application bundle ให้ชี้ไฟล์โปรแกรมภายใน ไม่ใช่โฟลเดอร์ตัวแอป คำสั่งเหล่านี้เป็นทางเข้าที่ออกแบบให้ใช้ข้ามระบบได้ ส่วนระบบที่รันทดสอบจริงให้ดูหลักฐานของ release

```bash
python3 scripts/local3d.py setup --blender "/absolute/path/to/blender"
python3 scripts/local3d.py doctor
python3 scripts/local3d.py proof --fixture elephant --quality draft
python3 scripts/local3d.py config
```

After setup, the driver uses the project-local environment and the saved Blender selection. The original Blender environment variable is not assumed to survive a client's stdio subprocess environment: the chosen executable is forwarded explicitly as `--blender`.

หลัง setup ตัว driver ใช้ environment ของ checkout และ Blender ที่บันทึกไว้ โดยส่ง executable ผ่าน `--blender` อย่างชัดเจน ไม่สมมติว่า environment variable ของ terminal จะถูก MCP client ส่งต่อให้ subprocess เสมอ

### What setup stores / ไฟล์ตั้งค่าเฉพาะเครื่อง

| Path | Purpose / หน้าที่ |
|---|---|
| `.venv-local3d/` | Isolated Python dependencies / แพ็กเกจ Python ของ checkout |
| `.khosan/local3d-machine.json` | Local machine and Blender selection / ค่าเครื่องและ Blender ที่เลือก |
| `.khosan/local3d-mcp.json` | Generated MCP configuration with this checkout's absolute paths / config MCP ที่ใช้ path จริงของเครื่องนี้ |
| `.khosan/local3d/jobs/` | New job directories and outputs / ผลสร้างแต่ละงาน |

These are local installation/output paths, not portable source files to copy into a public commit. If the checkout or Blender installation moves, rerun setup with the new Blender path and regenerate the client configuration. The driver writes UTF-8 JSON directly; do not redirect a PowerShell-formatted JSON display into the configuration file.

ไฟล์เหล่านี้เป็นค่าเฉพาะเครื่องและผลการทำงาน ไม่ใช่ source ที่ต้องคัดลอกขึ้น public commit หากย้าย checkout หรือ Blender ให้ setup และสร้าง client config ใหม่ ตัว driver เขียน JSON แบบ UTF-8 ให้โดยตรง ไม่ต้อง redirect ข้อความที่ PowerShell แสดงกลับลงไฟล์ config

## 4. Reproduce and inspect the examples / สร้างและตรวจตัวอย่าง

Start with draft images when using CPU/software rendering:

```bash
python scripts/local3d.py proof --fixture props --quality draft
python scripts/local3d.py proof --fixture elephant --quality draft
```

For final visual review, request the original fixture quality:

```bash
python scripts/local3d.py proof --fixture elephant --quality standard
```

| Quality | Elephant Blender images | Geometry and use / geometry และการใช้ |
|---|---|---|
| `draft` | 640 × 360, 8 samples | Same authored model; initial installation, geometry and composition inspection / ทดลองติดตั้งและตรวจรูปทรงเบื้องต้น |
| `standard` — default | 1280 × 720, 64 samples | Original fixture render settings for final visual review / ภาพตาม fixture เดิมสำหรับวิจารณ์ขั้นสุดท้าย |

Draft changes only the requested Blender render resolution/samples and adds `_draft` to the scene ID. It keeps the seed, object parameters, geometry and reference unchanged. The derived request is written to `.khosan/local3d/inputs/elephant-draft.json` (or `props-draft.json`), while the committed fixture remains intact. Its source and artifact digests are distinct. The optional Three renderer still uses its separately documented native 960 × 540 proof settings.

Draft ลดเฉพาะความละเอียดภาพและ samples ของ Blender พร้อมเติม `_draft` ใน scene ID โดยคง seed, object parameters, geometry และ reference เดิม สเปกที่ปรับเขียนไว้ใน `.khosan/local3d/inputs/elephant-draft.json` หรือ `props-draft.json` ไม่แก้ fixture ที่อยู่ใน source งานและ digest แยกจาก standard ส่วน renderer Three ใช้ค่า proof 960×540 ของตัวเอง

The PowerShell wrappers expose the same choice, for example `.\scripts\proof-local3d-elephant.ps1 -Quality draft`. Omitting the quality option preserves standard behavior. On CPU/software graphics, standard rendering may take minutes per view; finish the standard job on a suitable machine before using it as final image evidence. Draft technical success does not substitute for a standard-quality art review.

PowerShell wrappers ใช้ตัวเลือกเดียวกัน เช่น `.\scripts\proof-local3d-elephant.ps1 -Quality draft` หากไม่ระบุจะเป็น standard ตามเดิม บน CPU/software graphics การ render standard อาจใช้เวลาหลายนาทีต่อภาพ ให้รัน standard จนเสร็จก่อนใช้เป็นหลักฐานภาพขั้นสุดท้าย ผล technical PASS ของ draft ไม่ใช้แทนการวิจารณ์ภาพ standard

The default proof timeout is 600 seconds. An explicit bounded timeout can be selected with `--timeout 300`; accepted values are 15–600 seconds.

ค่า timeout เริ่มต้นคือ 600 วินาที หากต้องการกำหนดเองใช้ เช่น `--timeout 300` โดยรับช่วง 15–600 วินาที

Use `python3` on a shell where that is the selected interpreter. Each proof calls the official MCP client/server, performs a real Blender build, exports GLB, reimports it into a fresh scene, receives actual MCP image content and checks verified cache reuse. Read its returned job path; do not substitute a historical job ID from this guide.

หากระบบใช้ชื่อ `python3` ให้เปลี่ยนตามนั้น แต่ละ proof เรียก MCP จริง สร้างด้วย Blender ส่งออกและเปิด GLB กลับใน scene ใหม่ รับภาพจริงผ่าน MCP และตรวจแคช อ่าน job path ที่คืนมาจากการรันของเครื่องนี้ ไม่ใช้ ID ของงานเก่ามาแทน

The latest execution pointers are `.khosan/local3d/proof.json` for props and `.khosan/local3d/elephant-proof.json` for the elephant. They identify unique folders under `.khosan/local3d/jobs/`. On Windows, `OPEN_LOCAL3D_PROOF.bat` or `OPEN_LOCAL3D_ELEPHANT.bat` opens the corresponding latest completed proof folder. An opener chooses a completed proof, not the last artistically accepted version.

ไฟล์ pointer บอกว่างานรอบนั้นอยู่โฟลเดอร์ใด launcher บน Windows เปิดโฟลเดอร์ proof ที่ทำเสร็จล่าสุด ไม่ได้คัดเลือกเวอร์ชันที่ผ่านการอนุมัติภาพ ให้ดู manifest และ review ของงานนั้นประกอบ

| Output | What to inspect / สิ่งที่ตรวจ |
|---|---|
| `scene.blend` | Editable native mesh parts and Blender presentation / แก้ชิ้นส่วนและผิวใน Blender |
| `scene.glb` | Embedded geometry/materials for interchange / โมเดลและวัสดุสำหรับโปรแกรมอื่น |
| `preview_front.png` | Front silhouette, ears, trunk and leg separation |
| `preview_side.png` | Body proportions, leg contact, hip/shoulder transitions |
| `preview_back.png` | Rear anatomy, hidden-side continuity and tail |
| `preview_hero.png` | Reference-guided presentation, materials and composition |
| `measured.json` | Evaluated triangles/parts, bounds, materials and GLB roundtrip |
| `manifest.json` | Current job identity, digests, integrity and review state |
| `harness-asset.json` | Verified-byte import contract and presentation settings |

The standard elephant fixture requests 1280 × 720 Blender images, 64 samples and a maximum of 1,000,000 triangles/150 mesh parts. Draft retains that geometry budget. Its `height=3.0` is **overall modeled height including ears before object transforms**, not shoulder height. `body_length=3.9` controls the authored rump-to-head source span, excluding trunk/tusks/tail; final world bounds are measured separately. Canonical coordinates are meters, Y-up and +Z forward. See [the elephant method and parameter contract](26-LOCAL-3D-ELEPHANT.md).

fixture ช้างแบบ standard กำหนดภาพ 1280×720, 64 samples และ budget 1,000,000 triangles / 150 mesh parts โดย draft คง budget geometry เดิม ค่า height 3 m คือความสูงรวมถึงใบหูก่อน transform ของ object ไม่ใช่ความสูงหัวไหล่ ส่วน body_length เป็นช่วงมวลต้นแบบลำตัวถึงหัว ไม่ใช่ความยาว bounding box ทั้งตัว อ่านขนาดสุดท้ายจาก `measured.json`

The source reference is [the exact supplied PNG](../tools/local_3d_mcp/references/ep02_elephant_ref_r7.png), SHA-256 `d71d369974ceb275f3baffad6ca88bd88b1ac10d4c76c1b4db403779897f8bac`. It is visual guidance and hashed provenance, not input to an image-inference service. Hidden anatomy and metric scale are authored decisions.

ภาพต้นแบบใช้ประกอบการปั้นและบันทึก provenance ไม่ถูกส่งเข้า image-inference service ส่วนที่ภาพไม่แสดงและสเกลเมตรเป็นการตีความของผู้สร้าง การมี hash ตรงเพียงอย่างเดียวไม่พิสูจน์ความเหมือนของโมเดล

Inspect the [historical r6 gallery and its evidence](examples/local3d/elephant-r6/README.md): [hero](examples/local3d/elephant-r6/preview_hero.png), [front](examples/local3d/elephant-r6/preview_front.png), [side](examples/local3d/elephant-r6/preview_side.png), [back](examples/local3d/elephant-r6/preview_back.png) and [original existing-V4 still](examples/local3d/elephant-r6/frame-045.png). These are preserved images from the original reviewed job, not new renders of the portable release.

ดูภาพจริงของ r6 เดิมได้จาก gallery พร้อมหลักฐาน ภาพเหล่านี้เก็บจากงานที่ตรวจไว้แล้วและระบุเป็นประวัติ ไม่ได้ใช้แทนภาพของ release หรือเครื่องใหม่

## 5. Connect an MCP client / เชื่อม MCP client

```bash
python scripts/local3d.py config
```

Use the generated `.khosan/local3d-mcp.json` with a client that accepts an `mcpServers` configuration. It contains absolute paths for this checkout, the local environment and the chosen Blender executable. Merge the `khosan-local3d` entry into the client's configuration without replacing unrelated servers. Keep the generated machine-specific file local.

นำ entry `khosan-local3d` จากไฟล์ที่สร้างไปเพิ่มใน client ที่รองรับ `mcpServers` โดยรักษา server อื่นไว้ config นี้ผูกกับ path จริงของเครื่อง จึงไม่ควรนำไปใช้ตรง ๆ บนอีกเครื่องหรือ commit เป็น source กลาง

For clients that launch a command directly, the driver also exposes:

```bash
python scripts/local3d.py serve
```

`doctor`, `config` and `serve` also accept `--project-root "/existing/project"` for a separate authorized project. The fixture proofs intentionally use this checkout as their root. Reference paths in a custom scene are resolved beneath the selected project root; supply those local files there rather than pointing outside the boundary.

คำสั่ง doctor, config และ serve รับ `--project-root` สำหรับโครงการแยกที่มีอยู่และได้รับอนุญาต ส่วน fixture proof ใช้ checkout นี้เป็น root โดยตั้งใจ path ของ reference ในฉาก custom ต้องอยู่ใต้ project root ที่เลือก

`serve` runs MCP stdio and waits for an MCP client; it is not a web page. No new TCP listener or tunnel is required. Registering a local stdio server does not automatically expose it to every ChatGPT Web conversation. The client's available local/remote connection mechanism determines how an agent reaches it.

`serve` เป็น process ที่สื่อสารแบบ MCP stdio จึงไม่ได้เปิดหน้าเว็บหรือ TCP port ใหม่ การลงทะเบียน server บนเครื่องไม่ได้ทำให้ทุกแชทใน ChatGPT Web เห็นเครื่องมือนี้โดยอัตโนมัติ ต้องเชื่อมผ่านช่องทางที่ client นั้นรองรับ

The tool set includes doctor, strict Weave validation/compilation, asynchronous build/status/cancel, four-view delivery, digest-bound review, targeted repair and a static-asset manifest. A schema-only `SPEC_VALID_ONLY` or `COMPILED_ONLY` result is not generated geometry or an art review.

เครื่องมือครอบคลุมการตรวจสเปก เริ่มงาน ติดตาม/ยกเลิก ส่งภาพ วิจารณ์ ซ่อมเฉพาะ object และส่ง manifest สำหรับ loader ผล `SPEC_VALID_ONLY` หรือ `COMPILED_ONLY` แปลว่าตรวจหรือแปลงข้อมูลแล้ว ยังไม่ใช่ผลสร้างโมเดลหรืออนุมัติภาพ

## 6. Independent critique and targeted repair / วิจารณ์และซ่อมอย่างมีหลักฐาน

1. Build the source and poll `local3d_job_status` until artifacts are ready.
2. Read `local3d_review_bundle` and retrieve **all four actual images** with `local3d_preview`.
3. A separate reviewer compares silhouette, proportions, connections, materials, lighting and composition against the locked reference/intent.
4. Call `local3d_record_review` with the exact `artifact_digest`, reviewer identity, `PASS` or `REWORK`, summary and object-specific findings.
5. For a current `REWORK`, call `local3d_repair_scene` only for object IDs carrying error findings. Inspect the new job again.

ลำดับนี้ให้ผู้สร้างและผู้ตรวจแยกบทบาทกัน ต้องดูภาพจริงทุกมุมและผูกผลวิจารณ์กับ digest ของไฟล์ชุดนั้น เมื่อมี REWORK จึงซ่อมเฉพาะ object ที่พบ error แล้วตรวจภาพชุดใหม่อีกครั้ง ไม่มี critic ภายในที่มองภาพเองหรือคืน PASS โดยอัตโนมัติ

A repair `changes` entry has the following shape; the value below is only a syntax example, not a diagnosis of the included elephant:

```json
{
  "object_id": "reference_elephant",
  "field": "parameters.ear_size",
  "value": 0.95
}
```

The supported repair fields are `parameters.<name>`, `position`, `rotation`, `scale` and `material`. Passing objects stay locked in the specification. The automatic repair lineage is limited to three revisions. Camera, light or scene-composition changes require an explicit new scene specification; recipe-code changes require a new implementation and proof. They are not hidden object-parameter patches.

ช่องที่ซ่อมได้คือพารามิเตอร์ transform และ material reference ของ object โดยล็อก object ที่ผ่านแล้วในสเปกและจำกัด automatic repair ไว้สาม revision ปัญหากล้อง แสงหรือองค์ประกอบระดับฉากต้องแก้ scene specification อย่างชัดเจน ส่วนการแก้สูตร Python เป็น implementation ใหม่ที่ต้องสร้างหลักฐานใหม่

Review identity is trusted local attribution, not cryptographic authentication. Missing review stays `NOT_REVIEWED`; changed or missing evidence becomes `STALE`. Technical PASS, independent visual PASS and owner acceptance remain separate. A new machine's output does not inherit the historical elephant's artistic approval.

ชื่อผู้ตรวจเป็น attribution จาก local client ไม่ใช่การยืนยันตัวตนแบบลายเซ็นดิจิทัล หากยังไม่มี review จะเป็น NOT_REVIEWED หากไฟล์เปลี่ยนหรือหายจะเป็น STALE ผลจากเครื่องใหม่ต้องผ่านการตรวจของตัวเอง ไม่รับช่วง artistic PASS ของไฟล์เก่า

### Why the elephant changed / เหตุผลของการปรับช้าง

| Iteration evidence / หลักฐานระหว่างพัฒนา | Diagnosis / สิ่งที่พบ | Targeted change / สิ่งที่แก้ |
|---|---|---|
| Early blockout | Pinwheel-like ear gathers, protruding marble-like eyes, abrupt hip transitions | Reshaped ear attachment, recessed eyes/lids and smoothed large anatomical transitions |
| r4 detail | Regular corrugated skin bands and overly pale body values | Reworked the relief field and adjusted skin/lighting values |
| r5 detail | Uniform pebbling and an exposed ear-center artifact | Reduced micrograin and replaced polar ear sampling with a distributed patch |
| r6 original Windows result | Coherent broad anatomy and more localized irregular folds | Independent PASS within the static procedural trial; fine face/ear/wrinkle detail remained simplified |

These are modeling and review decisions, not a claim that triangle count alone improved likeness. Actual vertex relief preserves the modeled detail in GLB. The original accepted r6 source and image evidence remain historical; portability changes receive a new implementation digest.

การแก้แต่ละรอบอิงข้อผิดพลาดที่เห็นในภาพ ไม่ใช้จำนวน polygons เป็นคะแนนความเหมือน รอยย่นอยู่บน vertices จริงจึงติดไปกับ GLB ส่วนหลักฐาน r6 เดิมเก็บเป็นประวัติ และการเปลี่ยนระบบเพื่อให้ portable ต้องมี digest ใหม่

## 7. Optional portable LTC renderer / renderer LTC แบบ standalone

Install the locked optional runtime once:

```bash
node scripts/setup-local3d-v4.mjs
```

Then use the **actual job directory returned on this machine**:

```bash
node tools/local_3d_mcp/adapter/v4/verify.mjs --job "/absolute/path/to/.khosan/local3d/jobs/job-..."
```

Setup installs the exact locked packages under `tools/local_3d_mcp/adapter/v4/portable-runtime/node_modules` and bootstraps the Remotion-matched Chrome Headless Shell there. To use an already installed browser and avoid that browser download, run:

```bash
node scripts/setup-local3d-v4.mjs --browser "/absolute/path/to/chrome-or-edge"
```

The browser selection can also be passed to verification with `--browser` or `KHOSAN_LOCAL3D_BROWSER`. Verification uses an already prepared local browser and refuses a missing browser instead of downloading one during the proof. Package/browser setup is the network installation step. No private channel/episode sources are needed in standalone mode.

Setup ติดตั้งแพ็กเกจแบบล็อกเวอร์ชันและเตรียม Chrome Headless Shell ภายใน runtime แยกจาก Python หากต้องการใช้ browser เดิมและไม่ดาวน์โหลดเพิ่ม ให้ส่ง `--browser` ตอน setup หรือระบุให้ verifier ผ่าน flag/`KHOSAN_LOCAL3D_BROWSER` ช่วง verify ใช้ browser ที่เตรียมไว้แล้วและไม่ดาวน์โหลดระหว่างพิสูจน์งาน โหมด standalone ไม่ต้องอ่าน source ส่วนตัวของช่องหรือ episode

On Linux, the browser also needs the platform's shared libraries; use [Remotion's Linux dependency instructions](https://www.remotion.dev/docs/miscellaneous/linux-dependencies) for the installed distribution. This project setup does not modify operating-system packages.

บน Linux ต้องมี shared libraries ที่ browser ใช้ด้วย ให้เลือกคำแนะนำตาม distribution จากเอกสาร Remotion ที่ลิงก์ไว้ ตัว setup ของโครงการไม่ได้แก้แพ็กเกจระดับระบบปฏิบัติการ

The report and images are preserved in a new `qa-v4/<run>/` under the selected job. The renderer uses the same static provider shape as Harness V4: `group`, semantic `objects`, `update(absoluteSeconds)` and `dispose()`. With no `--v4-root` or `KHOSAN_V4_ROOT`, its mode is `standalone_locked`, using a software WebGL backend (`swangle`) by default. Use `--gl angle` when deliberately testing a different graphics path and retain that runtime choice in the evidence.

ผลถูกเก็บใน `qa-v4/<run>/` ของ job โดยใช้ provider contract เดียวกับ Harness V4 หากไม่ตั้ง `--v4-root` หรือ `KHOSAN_V4_ROOT` จะเป็น `standalone_locked` ใช้ software WebGL (`swangle`) เป็นค่าเริ่มต้น เลือก `--gl angle` ได้เมื่อต้องการตรวจอีก graphics path โดยเก็บค่า renderer ที่ใช้ไว้ในหลักฐาน

An actual existing Harness V4 checkout is an explicit alternative:

```bash
node tools/local_3d_mcp/adapter/v4/verify.mjs --job "/actual/job-directory" --v4-root "/existing/studio_harness_v4" --browser "/existing/browser"
```

This selects `existing_v4` and checks the expected existing source/dependency boundary. It is not needed for a fresh standalone installation, and the standalone report does not claim to verify private Stage/REGISTRY files. See [the verifier's current options and scopes](../tools/local_3d_mcp/adapter/v4/README.md).

คำสั่งนี้เลือก `existing_v4` และตรวจ source/dependency ของ checkout เดิมตามขอบเขตนั้น การติดตั้งใหม่แบบ standalone ไม่ต้องมีส่วนนี้ และรายงาน standalone ไม่อ้างว่าตรวจไฟล์ Stage/REGISTRY ส่วนตัวแล้ว

Successful elephant reports distinguish these modes explicitly:

| Mode | Success label | Private Harness V4 result |
|---|---|---|
| `standalone_locked` | `PASS_STANDALONE_STATIC_GLB_LTC_STILLS` | `NOT_TESTED_PRIVATE_V4`; private-source verification is not applicable |
| `existing_v4` | `PASS_SCOPED_STATIC_GLB_LTC_STILLS` | Scoped verification of the selected actual V4 source/dependency boundary |

Both are limited static rendering results. The report's `renderer_integration` can be `PASS_SCOPED_STATIC_ASSET` without granting visual or human approval. These labels describe what a completed verifier may emit; the release evidence records which runs actually completed.

ทั้งสองโหมดเป็นผลตรวจ static rendering ที่จำกัดขอบเขต `renderer_integration` ผ่านได้โดยยังไม่มีการอนุมัติภาพหรือ human acceptance ชื่อตารางคือผลที่ verifier สามารถคืนเมื่อผ่าน ส่วนงานที่รันผ่านจริงให้ดู evidence ของ release

### What LTC and the shadows mean / ความหมายของ LTC และเงา

| Component | Implementation / วิธีที่ใช้ |
|---|---|
| Blender's four views | Native rectangular Blender `AREA` lights and Blender shadows |
| Portable Three lighting | Three real `RectAreaLight` objects, the installed `RectAreaLightUniformsLib`, LTC lookup textures and active GPU uniforms |
| Three ground shadow | Separate zero-illumination directional VSM proxy and transparent `ShadowMaterial` receiver |

The Three lighting reuses [Heitz et al., “Real-Time Polygonal-Light Shading with Linearly Transformed Cosines,” SIGGRAPH 2016](https://eheitzresearch.wordpress.com/415-2/) through Three's implementation. [RectAreaLight](https://threejs.org/docs/pages/RectAreaLight.html) does not provide its own shadows; the projected floor shadow is a separate approximation, not LTC occlusion, full self-shadowing or global illumination. Blender does not run this JavaScript LTC implementation.

ฝั่ง Three ใช้ implementation LTC ที่มีอยู่จริงพร้อมตรวจ lookup textures และ GPU uniforms ไม่ได้เพียงตั้งชื่อไฟว่า LTC แต่ RectAreaLight ไม่ได้สร้างเงาเอง จึงมี shadow proxy แยกสำหรับพื้น ส่วน Blender ใช้ระบบ area light ของ Blender ไม่ใช่โค้ด LTC ของ JavaScript

The proof renders native 960 × 540 stills at frames 0 and 45, repeats frame 45, hides the asset, disables only the LTC lights and hides only the separate shadow receiver. Those controls measure whether geometry, light and shadow contribute as intended. They do not prove complete playback, rigging, an episode, exact Blender/Three color parity or final beauty approval.

ภาพทดสอบมี frame 0/45, frame 45 ซ้ำ และภาพควบคุมที่ซ่อน asset ปิดเฉพาะ LTC หรือปิดเฉพาะตัวรับเงา เพื่อวัดแต่ละส่วนจริง การผ่านยังไม่หมายถึงผ่าน animation หรือ episode และไม่รับรองว่าสี/เงาของสอง renderer ตรงกันทุก pixel

## 8. Evidence and reproducibility / หลักฐานและการทำซ้ำ

The original accepted example is documented in [the elephant report](26-LOCAL-3D-ELEPHANT.md). It used job `job-bd3b994f2785413c`, Windows Python 3.12.10, Blender 5.2.2 LTS and MCP SDK 1.29.0. The authored model measured 428,900 triangles and 41 editable mesh parts, with 3.0 m overall height. That PC's cold build took 26.328 s; a 0.047 s cache request reused existing verified artifacts.

ตัวอย่างเก่าเป็นผลจริงจากเครื่องและรุ่นโปรแกรมที่ระบุ ไม่ใช่ benchmark ที่รับรองทุกเครื่อง และเวลา cache ไม่ใช่เวลาปั้นโมเดลใหม่ ไฟล์ภาพ r6 ในตัวอย่างเป็นภาพจาก job เดิม ไม่ใช่ภาพที่สร้างใหม่ด้วย source หลังปรับ portability

Its existing-V4 test used Remotion 4.0.542, Three 0.187.0, React 19.2.0 and React Three Fiber 9.8.2. It passed the static LTC controls while retaining appearance limitations: simpler fine wrinkles/face/ears, a darker/browner V4 presentation, heavier projected shadow and a faint proxy edge. These limitations remain attached to the historical result.

Keep the following evidence distinctions:

| Evidence | Meaning / ความหมาย |
|---|---|
| Original r6 report/gallery | Historical accepted static trial on its recorded source and machine |
| Portable-release validation | Actual installer/build/renderer tests for this release; see `studio/evidence/TASK-LOCAL3D-PORTABLE-001.json` |
| Your new job | Its own source/reference/output hashes, measurements and reviews |
| Same-frame repeat | A particular renderer/browser still check, not cross-machine binary reproducibility |

### Recorded platform results / ผลจริงแยกตามระบบ

| Environment | Setup and Blender/MCP / ติดตั้งและสร้างโมเดล | Optional renderer / renderer เสริม |
|---|---|---|
| Original Windows r6 — Python 3.12.10 / Blender 5.2.2 LTS | Historical standard-quality build, GLB readback and independent image review passed on the original implementation. | Original existing-V4 proof passed; see the preserved r6 report. |
| Fresh portable Windows — Python 3.12.10 / Blender 5.2.2 LTS / MCP SDK 1.29.0 | New virtual environment and locked dependencies installed in a checkout containing spaces/Thai characters. Full standard-quality official-SDK proof passed: cold build 30.094 s, verified cache request 0.047 s, 428,900 triangles and 41 mesh parts. | Fresh `npm ci` and managed Chrome Headless Shell setup reached READY. Actual standalone LTC proof passed, including six native 960 × 540 captures/control checks. |
| Linux — Python 3.12.14 / Blender 4.3.2 | Full MCP draft proof passed on CPU, recorded at 108.1264 s. The earlier standard CPU render was interrupted and is not a completed standard proof. | Isolated runtime installation and contained bundling passed. The test environment denied the browser's local socket operation; no Linux V4 stills were produced. |
| macOS | Command entry points provided; no macOS build/render acceptance claimed. | Not tested. |

The fresh Windows renderer returned `PASS_STANDALONE_STATIC_GLB_LTC_STILLS`: 39 fingerprinted source/runtime/input files stayed unchanged, browser errors were zero, and the repeated frame-45 PNG had an identical SHA-256. This is a standalone runtime result, not verification of private Harness V4 sources. The cold/warm times above belong to that specific machine and run.

renderer บน Windows checkout ใหม่คืน `PASS_STANDALONE_STATIC_GLB_LTC_STILLS` โดย hash ของ source/runtime/input 39 รายการไม่เปลี่ยน browser errors เป็นศูนย์ และ frame 45 ที่ render ซ้ำได้ PNG SHA-256 เดียวกัน ผลนี้เป็นของ standalone runtime ไม่ใช่การตรวจ source ส่วนตัวของ Harness V4 ส่วนเวลาสร้างและแคชเป็นค่าของเครื่องและรอบที่บันทึกเท่านั้น

These are technical installation, build and rendering results. Fresh visual acceptance is not asserted by this matrix; independent image review and owner acceptance retain their own records. Consult `studio/evidence/TASK-LOCAL3D-PORTABLE-001.json` for the exact job/source hashes and review status. Minimum version guards are compatibility boundaries, not proof that every OS, GPU or later dependency combination has been tested.

ตารางนี้รายงานผลทางเทคนิคของการติดตั้ง สร้าง และ render เท่านั้น ไม่ใช้รับรอง artistic acceptance ของไฟล์ใหม่ การตรวจภาพอิสระและการยอมรับของเจ้าของมีบันทึกแยก ดู job/source hashes และสถานะ review ใน evidence ของ task การกำหนดเวอร์ชันขั้นต่ำไม่ได้แปลว่าทดสอบทุก OS หรือ GPU แล้ว

### Manual GitHub contract checks / ตรวจ contract บน GitHub แบบสั่งเอง

The repository includes [Manual local 3D contract verification](../.github/workflows/local3d-verify.yml), triggered only by `workflow_dispatch`. It defines Ubuntu and Windows jobs with Python 3.12 and Node 24, installs the locked MCP dependencies, and runs contract/launcher tests plus source/schema checks. It does not perform a Blender geometry render or a browser/LTC render on the hosted runners.

The workflow was added as source and **has not yet been run on GitHub** in this release evidence. When needed, launch it from the repository's Actions page and record its actual run URL/result; its presence is not a CI PASS.

มี workflow ตรวจ contract แบบ manual สำหรับ Ubuntu และ Windows ใช้ Python 3.12/Node 24 แต่ไม่ render Blender หรือ browser/LTC บน hosted runners ขณะบันทึกหลักฐาน release นี้เพิ่มไฟล์ workflow แล้วแต่ **ยังไม่ได้รันบน GitHub** หากสั่งผ่านหน้า Actions ให้บันทึก run URL และผลจริง การมีไฟล์ workflow ไม่เท่ากับ CI ผ่าน

The seed, normalized specification, implementation, Blender version and reference hashes enter the job/cache identity. Output artifacts are checked by SHA-256. Different Blender versions, GPUs or platforms can change outputs, so do not expect identical binary hashes across machines or copy old review records into a new job. Run doctor, build, export/readback and image review on the destination.

seed, สเปก, โค้ด, Blender version และ reference hashes เป็นส่วนของตัวตนงานและแคช ส่วนผลลัพธ์ตรวจด้วย SHA-256 แต่ต่างระบบหรือ GPU อาจได้ไฟล์ต่างกัน จึงต้องตรวจงานบนเครื่องปลายทาง ไม่คัดลอก review ของงานเก่ามาให้ PASS กับไฟล์ใหม่

## 9. Troubleshooting / แก้ปัญหา

| Symptom / อาการ | Action / วิธีตรวจแก้ |
|---|---|
| Blender not found | Rerun `setup --blender` with the actual executable, then `doctor`. An application folder is not an executable. |
| Wrong Python or missing SDK | Run setup with the intended Python interpreter. The driver uses `.venv-local3d`; installing packages into unrelated Python does not repair that environment. |
| Checkout or Blender moved | Rerun setup and config, then update the MCP client's generated paths. |
| Missing reference | Restore the supplied project-relative PNG and compare its expected hash; changing the reference creates different provenance. |
| Build exceeds the timeout | Read the job's `worker.log` and current status. Use the supported timeout control or a smaller explicit render specification; do not call a timed-out job complete. |
| Another build owns the project lock | Poll or cancel the active job through its owning server. Do not start a second setup/build to work around the lock. |
| `STALE` | Read the reported integrity problems. A changed source, reference or artifact needs a new build/review, not an edited PASS field. |
| V4 runtime/package mismatch | Run the locked optional setup and read its report. Keep the Remotion package family aligned; adapter-only tests do not install the full renderer. |
| Browser not found | Run the optional setup to prepare its matched browser, or supply `--browser` pointing to an installed executable. The verifier itself does not silently download a browser. |
| Technical PASS but poor image | Record concrete visual findings and repair the diagnosed dimensions. Technical evidence does not override the reviewer. |

Normal timeout/cancel terminates only the worker owned by that server and retains evidence. A power loss or forcibly killed parent process is not a supported Blender resume workflow. Inspect the recorded job/process state before restarting that job.

การ timeout/cancel ตามปกติหยุดเฉพาะ worker ที่ server เป็นเจ้าของและเก็บหลักฐานไว้ แต่ไฟดับหรือการฆ่า process แม่แบบรุนแรงไม่ใช่ระบบ resume ของ Blender ให้ดูสถานะและ log ก่อนเริ่มใหม่

## 10. Source map and next changes / แผนที่ source และการต่อยอด

| Source | Responsibility / หน้าที่ |
|---|---|
| `scripts/local3d.py` | Portable setup, doctor, proof, serve and generated machine configuration |
| `tools/local_3d_mcp/schema.py` | Strict scene contract, supported recipes and Weave subset |
| `tools/local_3d_mcp/core.py` | Jobs, process ownership, hashes, cache, review and repair lineage |
| `tools/local_3d_mcp/server.py` | Official MCP SDK stdio tools |
| `tools/local_3d_mcp/worker.py` | Blender build, views, measured geometry, export and reimport |
| `tools/local_3d_mcp/elephant_recipe.py` | Authored continuous anatomy, separate parts and vertex skin relief |
| `tools/local_3d_mcp/lighting.py` | Native Blender studio lighting and render-only floor |
| `tools/local_3d_mcp/fixtures/` | Reproducible scene inputs |
| `tools/local_3d_mcp/adapter/` | Static GLB contract and provider |
| `tools/local_3d_mcp/adapter/v4/` | Remotion/Three fixture, LTC lighting and actual image controls |

For a new asset category, add a bounded recipe and schema, create a fixture, build actual files and obtain an independent image review. For the next elephant art pass, use the known face/ear/wrinkle and V4 presentation findings. Neither adding arbitrary Python evaluation to the MCP interface nor silently substituting primitive boxes extends the supported modeling contract.

หากเพิ่ม asset ชนิดใหม่ ให้เพิ่มสูตรและ schema ที่มีขอบเขต สร้าง fixture รันจริงและตรวจภาพอิสระ สำหรับช้างรอบต่อไปใช้ข้อจำกัดใบหน้า ใบหู รอยย่นและแสง V4 ที่บันทึกไว้เป็นโจทย์ ไม่เปลี่ยน MCP ให้รับโค้ด Python ใดก็ได้หรือใช้กล่องแทนสิ่งที่ยังทำไม่ได้

Further reading / อ่านต่อ:

- [Local 3D architecture and original prop evidence](25-LOCAL-3D-MCP.md)
- [Elephant modeling, parameters and original r6 evidence](26-LOCAL-3D-ELEPHANT.md)
- [Thai tool runbook and tool list](../tools/local_3d_mcp/README_TH.md)
- [GLB provider contract](../tools/local_3d_mcp/adapter/README.md)
- [Optional renderer modes and verification scope](../tools/local_3d_mcp/adapter/v4/README.md)
- [Reference reconstruction workflow](21-REFERENCE-RECONSTRUCTION-WORKFLOW.md)

Dependencies retain their upstream licenses; the repository's current [license statement](../README.md#license) applies to the project source. The release installs external runtimes rather than treating their binaries, models or licenses as part of KHOSAN's own code.

## Source-bound portable proof / หลักฐานของรุ่น portable

See the [fresh Windows image gallery](examples/local3d/portable-windows/README.md), [machine-readable portable proof](examples/local3d/portable-proof.json), and [separate independent visual review](examples/local3d/portable-windows/independent-review.json). The final Python suite passed 39/39 on Linux; Windows passed 38/39 with one expected symlink-privilege skip. These records refer to the new portable implementation, separately from historical r6.
