# KHOSAN Local 3D MCP — รุ่น 0.2

**ติดตั้งบนเครื่องใหม่:** เริ่มที่ [คู่มือ portable ไทย / English](../../docs/27-LOCAL3D-PORTABLE-INSTALL.md) ซึ่งใช้ `scripts/local3d.py` สร้าง environment และ MCP config ของเครื่องนี้ พร้อม renderer LTC แบบ standalone ที่ติดตั้งเพิ่มได้ คำสั่งใช้งานด้านล่างเป็นของ portable release ส่วนตารางผล r6 เก็บเป็นหลักฐานของงานเดิม ไม่ใช้ PASS เก่ารับรอง build จาก source ที่เปลี่ยนแล้ว

ตัวสร้างโมเดลและฉากแบบ procedural บนเครื่อง โดยใช้ Blender แบบ background และ MCP SDK ทางการ สร้างไฟล์จริง ไม่เรียก Oriverse, CDN, บริการสร้างโมเดล หรือ API ที่มีค่าใช้จ่ายระหว่าง build

## ขอบเขตที่ทำงานได้

- รับ JSON `khosan.scene/1.0` หรือภาษา KHOSAN Weave v1 ชุดย่อยที่ระบุด้านล่าง
- สร้างไหปากกลวงและหูจับ โต๊ะไม้แยกชิ้น เสาหินเซาะร่อง ก้อนหิน และฐานภูมิประเทศ
- เพิ่มสูตรช้าง static ที่ปั้นรูปทรงและรายละเอียดด้วย Blender ตามภาพอ้างอิงที่เจ้าของให้ โดยเก็บ geometry และชิ้นส่วนที่แก้ไขต่อได้
- สร้าง `.blend` ที่แก้ไขชิ้นส่วนได้, `.glb` ที่รวมวัสดุ และภาพ front/side/back/hero
- วัด triangles/mesh parts/bounds จาก geometry จริงหลัง modifiers และนำ GLB กลับมาเปิดใน Blender scene ใหม่
- เปิดเป็น MCP stdio; job สร้างทำงานเบื้องหลัง มีสถานะ ยกเลิก timeout และ lock ไม่ให้ worker ปกติซ้อนกันใน root เดียว
- แคชเฉพาะเมื่อสเปก โค้ด Blender version และ reference hash ตรง และไฟล์ผลลัพธ์ทุกชิ้นยังตรง SHA-256
- คืนภาพให้ agent ตรวจได้โดยตรง บันทึก critic ที่ผูกกับภาพชุดนั้น แล้วแก้เฉพาะ object ที่มีข้อผิดพลาดได้สูงสุด 3 รอบ
- มีตัวอ่าน GLB แยกต่างหากที่ใช้รูปแบบ world provider ของ Harness V4: `group`, `objects`, `update(absoluteSeconds)`, `dispose()`

รุ่นนี้รองรับช้าง static ตามสูตรที่เขียนขึ้นเฉพาะ ยังไม่ใช่ระบบสร้าง 3D จากภาพใดก็ได้ ไม่มี Trellis2 หรือโมเดล AI มองภาพภายใน และยังไม่มี rig, skeletal skinning, animation, mocap, cloth หรือ physics ความคล้ายภาพต้องตัดสินจากภาพ render จริงแยกจากการตรวจไฟล์และจำนวน polygons

ฉากไห/โต๊ะเดิมเป็นงาน procedural ที่ออกแบบขึ้นใหม่ ส่วนช้างรุ่น 0.2 ใช้ `ep02_elephant_ref_r7.png` เป็น visual reference โดยตรง รายละเอียดด้านที่ภาพไม่แสดงและขนาดจริงเป็นการตีความของผู้สร้าง ไม่ใช่ข้อมูลที่วัดคืนจากภาพ

## ติดตั้งและตรวจบน Windows

จาก root ของ checkout ที่อยู่บนเครื่องนี้ ติดตั้ง Blender ไว้ก่อนและแทน `<path-to-installed-blender-executable>` ด้วย executable จริง:

```powershell
python scripts/local3d.py setup --blender "<path-to-installed-blender-executable>"
python scripts/local3d.py doctor
python scripts/local3d.py proof --fixture props
```

ขั้น setup สร้าง `.venv-local3d` แยกต่างหากและติดตั้งแพ็กเกจตาม `requirements-lock.txt` รวม `mcp==1.29.0` การติดตั้งครั้งแรกต้องใช้อินเทอร์เน็ต หลังติดตั้งแล้ว build ทำในเครื่อง ใช้ Blender ที่เลือกและบันทึกไว้ โดยส่ง path ผ่าน `--blender` ให้ subprocess อย่างชัดเจน หากติดตั้งในตำแหน่งมาตรฐานหรืออยู่บน PATH สามารถลอง `python scripts/local3d.py setup` ให้ค้นหาได้ โดยยืนยัน executable ที่เลือกจากผล doctor

ผลตรวจจริงอยู่ `.khosan/local3d/proof.json` ซึ่งระบุ job และโฟลเดอร์ไฟล์ของรอบนั้น แต่ละ job อยู่ `.khosan/local3d/jobs/job-.../` ผลเดิมเก็บไว้ ไม่เขียนทับ masters

### สร้างและเปิดช้างรุ่น 0.2

หลัง setup แล้ว ใช้ fixture ช้างแยกจากฉากไห/โต๊ะเดิม:

```powershell
python scripts/local3d.py proof --fixture elephant
.\OPEN_LOCAL3D_ELEPHANT.bat
```

คำสั่งแรกเรียก MCP จริงด้วย `tools/local_3d_mcp/fixtures/elephant_scene.json` และบันทึก pointer ของผลรอบนั้นที่ `.khosan/local3d/elephant-proof.json` ส่วน launcher เปิด **โฟลเดอร์ของ proof ช้างล่าสุดที่ทำเสร็จ** ภายในมี `scene.blend`, `scene.glb`, `preview_front.png`, `preview_side.png`, `preview_back.png`, `preview_hero.png` และไฟล์วัดผล เลือกเปิด BLEND ใน Blender เพื่อแก้ mesh หรือเปิด GLB ในโปรแกรมที่รองรับ

Launcher ไม่ได้เปลี่ยนสถานะการอนุมัติ และ proof pointer เป็นบันทึกตอนรัน ให้ดู `manifest.json` และ review ของ job นั้นเพื่อทราบสถานะล่าสุด ภาพช้างทั้งสี่มุมใน fixture ใช้ 1280×720, 64 samples และ budget ไม่เกิน 1,000,000 triangles / 150 mesh parts วัดจาก geometry จริง

การตรวจ renderer ทำแยกจาก proof Blender โดยติดตั้ง runtime standalone และอ่าน job จาก proof ของ checkout นี้:

```powershell
node scripts/setup-local3d-v4.mjs
$Local3DElephantProof = Get-Content -Raw -Encoding UTF8 ".khosan/local3d/elephant-proof.json" | ConvertFrom-Json
node tools/local_3d_mcp/adapter/v4/verify.mjs --job $Local3DElephantProof.artifact_directory
```

ผลอยู่ใต้ `qa-v4/<run>/` ของ job นั้น เป็นภาพ native 960×540 และรายงาน static GLB ค่าเริ่มต้นใช้ `standalone_locked` ซึ่งไม่ต้องมีโฟลเดอร์ Harness V4 ส่วนตัว หากต้องการตรวจกับ V4 เดิมให้เลือก `--v4-root "<existing-v4-root>"` อย่างชัดเจน ดูรายละเอียดการติดตั้ง browser และขอบเขตแต่ละโหมดใน [คู่มือ renderer](adapter/v4/README.md) ไม่มีการสร้างหนังหรือเพิ่มช้างเข้า episode อัตโนมัติ

คำสั่งทดสอบ:

```powershell
.\.venv-local3d\Scripts\python.exe -m unittest discover -s tools\local_3d_mcp\tests -v
python scripts/local3d.py doctor
```

ผลทดสอบแต่ละ environment ต้องรายงานแยกกัน การผ่านใน Linux ไม่แทนผลบน Windows และการ import GLB ไม่เท่ากับผ่านการ render ใน Remotion

## เรียกผ่าน MCP

สร้าง configuration ของเครื่องนี้จาก driver:

```powershell
python scripts/local3d.py config
```

driver เขียน `.khosan/local3d-mcp.json` แบบ UTF-8 โดยใช้ absolute paths ของ checkout, virtual environment และ Blender ที่เลือก นำ entry `khosan-local3d` ไปเพิ่มใน client ที่รับ `mcpServers` โดยรักษา server เดิมไว้ ไม่ต้องคัดลอก path จากเครื่องอื่นหรือเขียนทับ DevSpace ส่วน `config/local3d-mcp.example.json` ใช้ประกอบการอ่านโครงสร้างเท่านั้น

stdio ให้ MCP client เปิด process ตามต้องการ ไม่เปิด TCP port ไม่ใช้พอร์ต 7676/7678 และไม่ต้องมี tunnel ตัวใหม่ การเพิ่ม server นี้ไม่ได้ทำให้เครื่องมือปรากฏใน ChatGPT Web ทุกแชทโดยอัตโนมัติ; ในการเชื่อมต่อเดิมใช้ DevSpace เรียกชุดงานหรือ SDK client ได้

| Tool | งาน |
|---|---|
| `local3d_doctor` | ตรวจ Blender เวอร์ชัน root และความสามารถจริง |
| `validate_weave_script` | ตรวจภาษาชุดย่อย; `SPEC_VALID_ONLY` ไม่ใช่ตรวจคุณภาพโมเดล |
| `compile_weave_to_ir` | สร้าง IR ที่ผ่าน schema; ยังไม่สร้าง geometry |
| `local3d_build_scene` | เริ่ม build แล้วคืน job ID ทันที |
| `local3d_job_status` | อ่านสถานะพร้อมตรวจ hash และหลักฐาน |
| `local3d_cancel_job` | ยกเลิกเฉพาะ process ที่ server นี้เป็นเจ้าของ |
| `local3d_review_bundle` | แสดงภาพและ digest ที่ critic ต้องตรวจ |
| `local3d_preview` | ส่งภาพจริงผ่าน MCP image content |
| `local3d_record_review` | บันทึก PASS/REWORK พร้อม object/dimension/instruction |
| `local3d_repair_scene` | เปลี่ยนเฉพาะ object ที่มี error สูงสุด 3 revisions |
| `local3d_harness_manifest` | ส่ง contract สำหรับโหลดเข้า preview |

## ภาษาและพิกัด

ดูตัวอย่างพร้อมใช้ `fixtures/amphora.weave` และ `fixtures/proof_scene.json` ชื่อ `.weave` ที่นี่เป็นชุดย่อยของ KHOSAN ไม่ได้อ้างว่าอ่านคำสั่ง Oriverse ทั้งหมดได้

รองรับหนึ่ง `scene` ภายในประกาศ `material`, `object`, `camera`, `render`, `budget`, `provenance`, `lighting` และ `parameters` ของ object เท่านั้น `lighting` รับ preset `storybook` หรือ `elephant_studio` คำสั่งหรือ field ที่ไม่รองรับจะถูกปฏิเสธ ไม่มีการเปลี่ยนตัวละครเป็นกล่องโดยเงียบ ๆ ไม่มี `eval` หรือคำสั่งรัน Python ที่ผู้เรียกส่งมา

พิกัดต้นทางกำหนดชัดว่า right-handed, Y-up, หน่วยเมตร Blender แปลงเป็น `(x, -z, y)` เพียงครั้งเดียว แล้ว exporter กลับเป็น glTF Y-up ดังนั้น loader ไม่หมุนหรือย่อซ้ำ Rotation เป็น Euler XYZ หน่วยองศา

| Recipe | พารามิเตอร์ที่รองรับ |
|---|---|
| amphora | height 0.2–5 m; radius 0.06–2 m |
| table | width 0.3–8 m; depth 0.3–5 m; height 0.2–3 m |
| column | height 0.3–8 m; radius 0.08–2 m |
| rock | radius 0.05–2 m |
| terrain | width/depth 1–40 m; relief 0–2 m |
| elephant | height, body_length, ear_size, tusk_length, skin_detail ตามตารางด้านล่าง |

วัตถุยังมี position, rotation, scale และ material ID ความละเอียดภาพทดลองสูงสุด 2,073,600 pixels และ 64 samples; จำนวนชิ้นส่วน/triangles ต้องไม่เกิน budget ที่ส่งมา การตรวจ budget เป็น geometry หลังสร้าง ไม่ได้เชื่อเพียงตัวเลขที่ผู้เขียนประกาศ

## สูตรช้างและความหมายของขนาด

ไฟล์ต้นฉบับอ้างอิงอยู่ `references/ep02_elephant_ref_r7.png` ภายในโฟลเดอร์เครื่องมือ ขนาดภาพ 1024×576 และ SHA-256 คือ `d71d369974ceb275f3baffad6ca88bd88b1ac10d4c76c1b4db403779897f8bac` ใน fixture ใช้ path จาก Studio root คือ `tools/local_3d_mcp/references/ep02_elephant_ref_r7.png` เพื่อให้ build ตรวจ fingerprint ของภาพเดียวกันได้ ดูข้อตกลงรูปลักษณ์ใน `references/elephant-reference-contract.md`

| พารามิเตอร์ | ค่าเริ่มต้น | ช่วงที่รับ | ความหมาย |
|---|---:|---:|---|
| `height` | 3.0 | 1.5–4.5 m | ความสูงรวมของโมเดลจากจุดต่ำสุดถึงจุดสูงสุด รวมใบหู ก่อน object transform; ไม่ใช่ความสูงหัวไหล่ |
| `body_length` | 3.9 | 2.8–5.5 m | ควบคุมช่วงตามยาวของมวลลำตัว–หัวที่ผู้สร้างกำหนด ก่อนรวม mesh ไม่รวมงวง งา หรือหาง; ปรับแยกจาก height |
| `ear_size` | 1.0 | 0.75–1.3 | ตัวคูณขนาดใบหู |
| `tusk_length` | 0.72 | 0.25–1.3 | ควบคุมรูปทรง/ระยะงาในสเกลเมตร ไม่ใช่ค่ารับรองความยาวตามเส้นโค้งของงาที่วัดหลังสร้าง |
| `skin_detail` | 1.0 | 0–1 | ความเข้มของรายละเอียดผิวที่ปั้นลงบน vertices |

ค่า `body_length` ไม่ใช่ความยาว bounding box ของช้างทั้งตัว การรวมผิว การเกลี่ย และส่วนที่ยื่นออกมาทำให้ขนาดสุดท้ายต่างจากช่วงมวลต้นแบบได้ อ่านขนาดใช้งานจริงจาก `measured.json` เสมอ ค่า height 3 m เป็นสเกลที่เลือกในการทำงาน ไม่ได้อนุมานเป็นมาตราส่วนจริงจากภาพหนึ่งใบ และถ้าเพิ่ม scale หรือ rotation ของ object ขนาดในโลกจะเปลี่ยนตามนั้น

ลำตัว หัว คอ ขาทั้งสี่และงวงเป็นผิว sculpt ที่เชื่อมต่อกัน ส่วนหู งา ตา เปลือกตา เล็บ หางและพู่หางมี mesh parts แยกให้แก้ต่อได้ การเปลี่ยนพารามิเตอร์ให้แก้ fixture แล้ว build job ใหม่; ไฟล์ BLEND เก็บผิว mesh สำหรับแก้ด้วยเครื่องมือ Blender ไม่ใช่ rig สำหรับขยับท่าทาง

รอยย่นและรอยพับเป็น relief บน geometry จริง พร้อมวัสดุ PBR สี/roughness ที่ GLB ส่งออกได้ ไม่มีรายละเอียดสำคัญที่อาศัย procedural shader เฉพาะ Blender และไม่มี texture ภายนอกที่ต้องดาวน์โหลด หน้าโมเดลหัน canonical +Z, Y เป็นแกนตั้ง พื้น studio เป็นอุปกรณ์สำหรับ render แยกจากช้างและไม่รวมใน GLB, bounds หรือบัญชีชิ้นส่วนของ asset

## แสง Blender และ LTC ใน Harness V4

Preset `elephant_studio` ใช้แสงหลักนุ่มด้านบนซ้ายของกล้อง พร้อม fill และ rim โดยแต่ละ renderer ใช้วิธีของตน:

| งาน | วิธีที่ใช้จริง | ขอบเขต |
|---|---|---|
| ภาพ Blender สี่มุม | native rectangular `AREA` lights และเงาของ Blender | ไม่ได้รัน JavaScript LTC ของ Three |
| ภาพทดสอบ V4 | Three.js `RectAreaLight` 3 ดวง พร้อม `RectAreaLightUniformsLib` และ LTC lookup textures | ตรวจ GPU uniforms และผลเมื่อปิดแสง LTC จริง |
| เงาพื้นใน V4 | directional shadow proxy ที่ intensity เป็น 0 ส่ง VSM shadow ไปยัง `ShadowMaterial` แยกต่างหาก | เป็นเงาพื้นโดยประมาณ ไม่ใช่เงาที่คำนวณจาก LTC และไม่ใช่ full self-shadowing |

V4 ใช้ LTC implementation ที่มีอยู่ใน Three.js ตามงาน [Heitz และคณะ, SIGGRAPH 2016](https://eheitzresearch.wordpress.com/415-2/) โดยตรวจข้อมูลจาก renderer จริง ไม่ใช่เพียงตั้งชื่อไฟว่า LTC ดูข้อจำกัดของ [RectAreaLight](https://threejs.org/docs/pages/RectAreaLight.html) และรายละเอียดการตรวจใน `adapter/v4/README.md` ภาพ Blender และ V4 ไม่ได้อ้างว่าสี/เงาตรงกันทุก pixel

renderer ตรวจภาพ frame 0/45, frame 45 ซ้ำ, ซ่อน asset, ปิดเฉพาะ LTC และปิดเฉพาะตัวรับเงาพื้น เพื่อแยกผลแต่ละส่วน โหมด standalone คืน `PASS_STANDALONE_STATIC_GLB_LTC_STILLS` และยังไม่ตรวจ private V4 ส่วนโหมด existing V4 ใช้ `PASS_SCOPED_STATIC_GLB_LTC_STILLS` ทั้งสองเป็นผลตรวจ static GLB และแสงตามขอบเขต ไม่ใช่การผ่านเกณฑ์ความเหมือน reference หรือการอนุมัติงานศิลป์

### หลักฐานทางประวัติศาสตร์ของช้าง r6 เดิม

ผลด้านล่างมาจาก Windows job ช้างรอบ r6 และรายงาน V4 ของ job เดียวกัน ผลตรวจไฟล์และผลวิจารณ์ภาพมีขอบเขตแยกกัน:

| รายการ | ค่าจากหลักฐานรุ่นสุดท้าย |
|---|---|
| Job ID | `job-bd3b994f2785413c` |
| Implementation SHA-256 | `7d54ae6d604e7d35869ebdfe816c30fb13f9830b84ff1a58809a55593cb68d82` |
| Artifact-set digest | `006ee0ffea11cfb760333701469f8c67abeb27fbf13882642f1b3524c8468700` |
| Windows build / verified cache | 26.328 s / 0.047 s; render Blender สี่ภาพ 16.476 s |
| Triangles / mesh parts / materials | 428,900 / 41 / 14 authored material instances; GLB ใช้จริง 11 วัสดุ |
| GLB roundtrip | PASS; จำนวน triangles/parts/semantic IDs ตรง; bounds ต่าง 0.0 m; ไม่มีชิ้นส่วนขาดวัสดุ |
| Native V4 report / technical scope | `qa-v4/2026-11-11T17-40-32.826Z-85e645/verification.json` ภายใน job / `PASS_SCOPED_STATIC_GLB_LTC_STILLS` |
| Independent visual review | PASS สำหรับช้าง static procedural ที่ใช้ reference นี้เป็นแนวทาง; MCP record: `review-7f2be586e1a6.json` |
| Human acceptance | `NOT_REVIEWED` จนกว่าเจ้าของจะยืนยันอย่างชัดเจน |

ผู้ตรวจอิสระตรวจภาพ Blender ทั้งสี่มุมและยอมรับภายในขอบเขตช้าง static procedural นี้ รายละเอียดรอยย่น ใบหน้าและใบหูยังลดทอนจากภาพต้นแบบ จึงไม่อ้างว่าเป็น exact reconstruction หรือ photographic likeness ส่วน V4 ผ่านการตรวจเชิงเทคนิค แต่ภาพยังเข้ม/น้ำตาลกว่า Blender เงาหนักกว่าและมีขอบ shadow proxy จาง ๆ จึงยังไม่ใช่ final beauty approval

รายงาน V4 ยืนยัน RectAreaLight จริง 3 ดวง, ผลต่างเมื่อปิด LTC และเงาพื้นแยกกัน, frame 45 ซ้ำได้ PNG hash เดียวกัน, ไฟล์ที่ fingerprint ไว้ 41 รายการไม่เปลี่ยน และ browser errors 0 ขนาด asset จริงประมาณ X 3.0064 × Y 3.0000 × Z 4.4056 m ดูรายละเอียดและขอบเขตผลตรวจใน `docs/26-LOCAL-3D-ELEPHANT.md` จาก Studio root

## วงจรวิจารณ์และแก้ไข

1. Agent ผู้สร้างส่งสเปกไป build
2. รอ `REVIEW_REQUIRED` แล้วเรียกภาพทั้งสี่มุม
3. Agent ผู้ตรวจที่แยกจากผู้สร้างตรวจ silhouette, proportions, connections, materials, lighting และ composition
4. ส่ง `artifact_digest`, reviewer, verdict, summary และ findings ที่มี `object_id`, `dimension`, `severity`, `instruction`
5. ถ้า REWORK ให้ส่ง patches เช่น `{object_id:"hero_vessel", field:"parameters.height", value:1.0}`
6. ระบบล็อกวัตถุที่ไม่ได้ผิด เก็บ parent/revision ไม่ใช้การวนแคชเพื่อเลี่ยงเพดาน 3 รอบ และให้ตรวจภาพรุ่นใหม่อีกครั้ง

รุ่นนี้ซ่อมได้เฉพาะพารามิเตอร์/transform/material reference ของ object ปัญหาระดับฉาก เช่น กล้องหรือแสง ต้องแก้สเปกอย่างชัดเจนแล้วสร้างงานใหม่ ไม่รายงานว่าซ่อมทุกประเภทอัตโนมัติได้

ไม่มี critic สำเร็จรูปที่คืน PASS เอง ถ้าไม่มีผลตรวจจริงจะเป็น `NOT_REVIEWED` ถ้าหลักฐานหายหรือเปลี่ยนจะเป็น `STALE` ผล review เป็นบันทึกในระบบ local ที่เชื่อถือ agent identity จาก client ไม่ใช่ลายเซ็นยืนยันตัวตนผู้ตรวจ

`human_acceptance` คงเป็น `NOT_REVIEWED` และ `production_ready` คงเป็น false ในรุ่นนี้ การบันทึก critic PASS ไม่ใช่การอนุมัติภาพหรือหนังแทนเจ้าของ

## ข้อจำกัดและการต่อยอด

- Worker เป็นสูตร procedural ที่ตรวจได้ ไม่ใช่โมเดล generative ที่สร้างทุกอย่างได้ ควรเพิ่มสูตรผ่าน source code + fixture + ตรวจจริงก่อนเปิด tool capability
- สี/roughness เป็น PBR ส่งออกได้ ช้างใช้รอยย่นจาก geometry จริง ยังไม่มีการสร้าง UV/PBR texture map จากภาพ AI
- Model/scene เป็น static; ไม่มีระบบเคลื่อนตัวละครหรือ simulation และไม่มีการเพิ่มฉากเหล่านี้เข้า EP2 อัตโนมัติ
- ระบบแคชช่วยงานเดิม ไม่ได้พิสูจน์ว่าการสร้างงานใหม่เร็วกว่า Oriverse หรือว่าคุณภาพสวยกว่าทุกประเภท
- การยกเลิก/timeout ปกติหยุด process ที่เป็นเจ้าของได้ ส่วนการฆ่า process แม่แบบรุนแรงหรือไฟดับยังไม่ใช่ระบบ resume งาน Blender; ตรวจ process ที่ค้างก่อนเริ่มใหม่
- ภาพ reference ใหม่ต้องเลือก workflow ให้ตรงงานและตรวจ geometry/ภาพจริงของงานนั้น สูตรช้างนี้ไม่ได้ทำให้ arbitrary image-to-3D พร้อมใช้ และ backend Blender ไม่ได้อ้างว่าเป็น `img2threejs`

ดูรายละเอียด provider และข้อจำกัดการทดสอบใน `adapter/README.md` หลักฐานของงานใหม่ต้องเป็นผลของงานใหม่เสมอ ไม่ใช้ PASS เก่าของ EP43 แทน

