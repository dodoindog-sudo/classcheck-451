/**
 * Backend สำหรับระบบเช็คชื่อ 01003451 สรีรวิทยาการผลิตพืชไร่
 *
 * วิธีติดตั้ง:
 * 1. สร้าง Google Sheet ใหม่ (ไฟล์นี้จะเก็บข้อมูลใน Google Drive ของอาจารย์)
 * 2. สร้างชีตชื่อ "Roster" คอลัมน์ A = รหัสนิสิต, B = ชื่อ-นามสกุล (แถวแรกเป็นหัวตาราง)
 *    แล้ววางรายชื่อนิสิตทั้งหมดที่นี่ (ห้ามใส่ในโค้ด/GitHub เพราะเป็นข้อมูลส่วนบุคคล)
 * 3. สร้างชีตชื่อ "Attendance" ไว้เปล่า ๆ (สคริปต์จะสร้างหัวตารางให้อัตโนมัติ)
 * 4. เมนู Extensions > Apps Script วางโค้ดนี้ทับ แล้วแก้ API_TOKEN ให้ตรงกับ js/config.js
 * 5. ตั้งรหัสผ่านหน้า admin.html: เมนูรูปเฟือง "Project Settings" ทางซ้าย > เลื่อนลงไปที่
 *    "Script Properties" > Add script property > Property = ADMIN_TOKEN, Value = รหัสผ่านของอาจารย์เอง
 *    (ห้ามพิมพ์รหัสผ่านลงในไฟล์นี้โดยตรง เพราะไฟล์นี้จะถูก push ขึ้น GitHub แบบ public
 *    ใครก็เปิดดูได้ — Script Properties เก็บแยกไว้ในบัญชี Google ของอาจารย์เท่านั้น ไม่ติดไปกับโค้ด)
 * 6. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone
 * 7. คัดลอก URL ที่ได้ไปใส่ใน js/config.js -> APPS_SCRIPT_URL
 *
 * หมายเหตุด้านความปลอดภัยของหน้า admin.html: เว็บนี้เป็น static site ไม่มีระบบล็อกอินจริง
 * ADMIN_TOKEN เป็นเพียงการกันคนทั่วไปเข้าถึงโดยไม่ตั้งใจ ไม่ใช่การยืนยันตัวตนระดับสูง
 * ห้ามใช้รหัสผ่านเดียวกับบัญชีอื่น และเปลี่ยนได้ตลอดโดยแก้ค่าใน Script Properties (ไม่ต้อง Deploy ใหม่)
 */

const API_TOKEN = "kaset-crop451-2569"; // ต้องตรงกับ CONFIG.API_TOKEN ใน js/config.js

// อ่านรหัสผ่าน admin จาก Script Properties เท่านั้น (ไม่ฝังไว้ในไฟล์นี้ เพราะไฟล์นี้ push ขึ้น GitHub แบบ public)
// ถ้ายังไม่ได้ตั้งค่า จะปิดหน้า admin ไว้ก่อนโดยอัตโนมัติ (ไม่มีรหัสผ่านใดเข้าได้)
const ADMIN_TOKEN = PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN");
const TIMEZONE = "Asia/Bangkok";
const ROSTER_SHEET = "Roster";
const ATTENDANCE_SHEET = "Attendance";

// ต้องตรงกับ SESSIONS ใน js/config.js (ใช้ตรวจสอบคาบ/วัน/เวลาฝั่งเซิร์ฟเวอร์ ป้องกันการปลอมข้อมูล)
// แต่ละคาบมี id เฉพาะ ใช้เป็นตัวแยกการเช็คชื่อ 1 ครั้ง/คาบ (บางวันมีมากกว่า 1 คาบ)
// start/end ไม่ระบุ = ใช้ค่ามาตรฐาน 08:00-11:00
const CLASS_START = "08:00";
const CLASS_END = "11:00";
const OPEN_BEFORE_MIN = 30;
const CLOSE_AFTER_MIN = 30;

const SESSIONS = [
  { id: "w1", date: "2026-06-23" },
  { id: "w2", date: "2026-06-30" },
  { id: "w3", date: "2026-07-07" },
  { id: "w4", date: "2026-07-14" },
  { id: "w5", date: "2026-07-21" },
  { id: "w7", date: "2026-08-04" },
  { id: "w8", date: "2026-08-04", start: "16:00", end: "19:00" }, // สัปดาห์ 8 ย้ายมา 4 ส.ค. บ่าย
  { id: "w10", date: "2026-08-25" },
  { id: "w11", date: "2026-09-01" },
  { id: "w12", date: "2026-09-08" },
  { id: "w13", date: "2026-09-15" },
  { id: "w14", date: "2026-09-22" },
  { id: "w15", date: "2026-09-29" },
  { id: "w17", date: "2026-10-14" },
];

function doPost(e) {
  const out = (obj) => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);

  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ status: "error", message: "รูปแบบข้อมูลไม่ถูกต้อง" });
  }

  if (body.token !== API_TOKEN) {
    return out({ status: "error", message: "ไม่ได้รับอนุญาต" });
  }

  const studentId = String(body.studentId || "").trim();
  const deviceId = String(body.deviceId || "").trim();
  const sessionId = String(body.sessionId || "").trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!/^[0-9]{10}$/.test(studentId) || !deviceId || !sessionId || isNaN(lat) || isNaN(lng)) {
    return out({ status: "error", message: "ข้อมูลไม่ครบถ้วน" });
  }

  const now = new Date();
  const todayStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");

  const session = SESSIONS.filter(function (s) { return s.id === sessionId; })[0];
  if (!session) {
    return out({ status: "error", message: "ไม่พบคาบเรียนนี้ในระบบ" });
  }
  if (session.date !== todayStr) {
    return out({ status: "error", message: "คาบเรียนนี้ไม่ตรงกับวันนี้ ไม่สามารถเช็คชื่อได้" });
  }
  if (!isWithinWindow(now, session)) {
    return out({ status: "error", message: "อยู่นอกช่วงเวลาที่เปิดให้เช็คชื่อ" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rosterSheet = ss.getSheetByName(ROSTER_SHEET);
  if (!rosterSheet) {
    return out({ status: "error", message: "ไม่พบชีตรายชื่อนิสิต (Roster) กรุณาแจ้งผู้ดูแลระบบ" });
  }

  const roster = rosterSheet.getDataRange().getValues();
  let studentName = null;
  for (let i = 1; i < roster.length; i++) {
    if (String(roster[i][0]).trim() === studentId) {
      studentName = roster[i][1];
      break;
    }
  }
  if (!studentName) {
    return out({ status: "error", message: "ไม่พบรหัสนิสิตนี้ในทะเบียนรายชื่อ กรุณาตรวจสอบรหัสนิสิตอีกครั้ง" });
  }

  let attSheet = ss.getSheetByName(ATTENDANCE_SHEET);
  if (!attSheet) {
    attSheet = ss.insertSheet(ATTENDANCE_SHEET);
  }
  if (attSheet.getLastRow() === 0) {
    attSheet.appendRow([
      "Timestamp", "SessionId", "Date", "รหัสนิสิต", "ชื่อ-นามสกุล", "DeviceId",
      "Lat", "Lng", "AccuracyM", "DistanceM_fromFaculty", "UserAgent",
    ]);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = attSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowSessionId = String(data[i][1]).trim();
      if (rowSessionId === sessionId && String(data[i][3]).trim() === studentId) {
        return out({ status: "error", message: "รหัสนิสิตนี้เช็คชื่อสำหรับคาบนี้ไปแล้ว" });
      }
      if (rowSessionId === sessionId && String(data[i][5]).trim() === deviceId) {
        return out({ status: "error", message: "อุปกรณ์นี้ถูกใช้เช็คชื่อสำหรับคาบนี้ไปแล้ว" });
      }
    }

    const facultyLat = 13.8498543;
    const facultyLng = 100.5710172;
    const distance = haversineMeters(lat, lng, facultyLat, facultyLng);

    attSheet.appendRow([
      now, sessionId, todayStr, studentId, studentName, deviceId,
      lat, lng, Number(body.accuracy) || "", Math.round(distance),
      String(body.userAgent || "").slice(0, 300),
    ]);
  } finally {
    lock.releaseLock();
  }

  return out({ status: "ok", name: studentName });
}

function isWithinWindow(now, session) {
  const [ch, cm] = (session.start || CLASS_START).split(":").map(Number);
  const [eh, em] = (session.end || CLASS_END).split(":").map(Number);

  const classStart = new Date(now);
  classStart.setHours(ch, cm, 0, 0);
  const classEnd = new Date(now);
  classEnd.setHours(eh, em, 0, 0);

  const openTime = new Date(classStart.getTime() - OPEN_BEFORE_MIN * 60000);
  const closeTime = new Date(classEnd.getTime() + CLOSE_AFTER_MIN * 60000);

  return now >= openTime && now <= closeTime;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function doGet(e) {
  const out = (obj) => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);

  const action = e.parameter.action;
  if (action === "admin") {
    if (!ADMIN_TOKEN) {
      return out({ status: "error", message: "ยังไม่ได้ตั้งรหัสผ่าน admin (ตั้งค่า ADMIN_TOKEN ใน Script Properties ก่อน)" });
    }
    if (e.parameter.token !== ADMIN_TOKEN) {
      return out({ status: "error", message: "รหัสผ่านไม่ถูกต้อง" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rosterSheet = ss.getSheetByName(ROSTER_SHEET);
    const attSheet = ss.getSheetByName(ATTENDANCE_SHEET);

    const roster = rosterSheet
      ? rosterSheet.getDataRange().getValues().slice(1)
          .filter((r) => r[0])
          .map((r) => ({ id: String(r[0]).trim(), name: r[1] }))
      : [];

    const attendance = attSheet
      ? attSheet.getDataRange().getValues().slice(1)
          .filter((r) => r[1])
          .map((r) => ({
            timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
            sessionId: String(r[1]).trim(),
            date: r[2],
            studentId: String(r[3]).trim(),
            name: r[4],
            deviceId: r[5],
            distance: r[9],
          }))
      : [];

    return out({ status: "ok", roster, attendance });
  }

  return ContentService.createTextOutput("OK - Attendance backend is running").setMimeType(ContentService.MimeType.TEXT);
}
