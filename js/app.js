// ====== ระบบเช็คชื่อเข้าเรียน 01003451 สรีรวิทยาการผลิตพืชไร่ ======

const els = {
  courseHeader: document.getElementById("courseHeader"),
  sessionInfo: document.getElementById("sessionInfo"),
  noSession: document.getElementById("noSession"),
  gpsSection: document.getElementById("gpsSection"),
  gpsBtn: document.getElementById("gpsBtn"),
  gpsStatus: document.getElementById("gpsStatus"),
  formSection: document.getElementById("formSection"),
  studentId: document.getElementById("studentId"),
  submitBtn: document.getElementById("submitBtn"),
  resultBox: document.getElementById("resultBox"),
  clock: document.getElementById("clock"),
};

let currentPosition = null; // {lat, lng, accuracy}
let inRange = false;
let todaySession = null;

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function findTodaySession() {
  const t = todayStr();
  return CONFIG.SESSIONS.find((s) => s.date === t) || null;
}

function isWithinCheckinWindow() {
  const [ch, cm] = CONFIG.COURSE.classStart.split(":").map(Number);
  const [eh, em] = CONFIG.COURSE.classEnd.split(":").map(Number);
  const now = new Date();
  const classStart = new Date(now);
  classStart.setHours(ch, cm, 0, 0);
  const classEnd = new Date(now);
  classEnd.setHours(eh, em, 0, 0);

  const openTime = new Date(classStart.getTime() - CONFIG.CHECKIN_WINDOW.openBeforeMin * 60000);
  const closeTime = new Date(classEnd.getTime() + CONFIG.CHECKIN_WINDOW.closeAfterClassEndMin * 60000);

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

function getDeviceId() {
  let id = localStorage.getItem("crop451_device_id");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : "dev-" + Date.now() + "-" + Math.random().toString(16).slice(2));
    localStorage.setItem("crop451_device_id", id);
  }
  return id;
}

function alreadySubmittedLocally(dateStr) {
  return localStorage.getItem("crop451_submitted_" + dateStr) === "1";
}

function markSubmittedLocally(dateStr) {
  localStorage.setItem("crop451_submitted_" + dateStr, "1");
}

function renderHeader() {
  els.courseHeader.innerHTML = `
    <h1>เช็คชื่อเข้าเรียน</h1>
    <p class="course-name">${CONFIG.COURSE.code} ${CONFIG.COURSE.nameTh}</p>
    <p class="course-name-en">${CONFIG.COURSE.nameEn}</p>
    <p class="course-place">${CONFIG.COURSE.room}<br>${CONFIG.COURSE.place}</p>
  `;
}

function renderClock() {
  const now = new Date();
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  els.clock.textContent = `วัน${days[now.getDay()]}ที่ ${now.toLocaleDateString("th-TH")} เวลา ${now.toLocaleTimeString("th-TH")}`;
}

function init() {
  renderHeader();
  renderClock();
  setInterval(renderClock, 1000);

  todaySession = findTodaySession();

  if (!todaySession) {
    els.noSession.hidden = false;
    els.gpsSection.hidden = true;
    els.formSection.hidden = true;
    return;
  }

  if (alreadySubmittedLocally(todaySession.date)) {
    els.sessionInfo.hidden = false;
    els.sessionInfo.innerHTML = renderSessionInfo(todaySession);
    els.gpsSection.hidden = true;
    els.formSection.hidden = true;
    showResult("success", "อุปกรณ์นี้เช็คชื่อสำหรับวันนี้ไปแล้ว ✅");
    return;
  }

  if (!isWithinCheckinWindow()) {
    els.sessionInfo.hidden = false;
    els.sessionInfo.innerHTML = renderSessionInfo(todaySession);
    els.noSession.hidden = false;
    els.noSession.textContent = `วันนี้มีเรียน แต่ขณะนี้อยู่นอกช่วงเวลาเช็คชื่อ (เปิดเช็คชื่อ ${CONFIG.CHECKIN_WINDOW.openBeforeMin} นาทีก่อนเรียน ถึง ${CONFIG.CHECKIN_WINDOW.closeAfterClassEndMin} นาทีหลังเลิกเรียน)`;
    els.gpsSection.hidden = true;
    els.formSection.hidden = true;
    return;
  }

  els.sessionInfo.hidden = false;
  els.sessionInfo.innerHTML = renderSessionInfo(todaySession);
  els.gpsSection.hidden = false;
}

function renderSessionInfo(s) {
  return `<div class="session-card">
    <div class="session-week">สัปดาห์ที่ ${s.week}</div>
    <div class="session-topic">${s.topic}</div>
    <div class="session-instructor">ผู้สอน: ${s.instructor}</div>
  </div>`;
}

function checkGPS() {
  if (!navigator.geolocation) {
    els.gpsStatus.textContent = "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง GPS";
    els.gpsStatus.className = "gps-status error";
    return;
  }
  els.gpsBtn.disabled = true;
  els.gpsStatus.textContent = "กำลังตรวจสอบตำแหน่ง...";
  els.gpsStatus.className = "gps-status pending";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      const dist = haversineMeters(
        currentPosition.lat,
        currentPosition.lng,
        CONFIG.GEOFENCE.lat,
        CONFIG.GEOFENCE.lng
      );
      inRange = dist <= CONFIG.GEOFENCE.radiusMeters;

      els.gpsBtn.disabled = false;
      if (inRange) {
        els.gpsStatus.textContent = `อยู่ในพื้นที่คณะเกษตร (ห่างจากจุดอ้างอิง ~${Math.round(dist)} ม., ความแม่นยำ ${Math.round(currentPosition.accuracy)} ม.)`;
        els.gpsStatus.className = "gps-status ok";
        els.formSection.hidden = false;
      } else {
        els.gpsStatus.textContent = `อยู่นอกพื้นที่ที่กำหนด (ห่างจากจุดอ้างอิง ~${Math.round(dist)} ม. ต้องอยู่ภายใน ${CONFIG.GEOFENCE.radiusMeters} ม.) กรุณาอยู่ภายในคณะเกษตร มก. แล้วลองใหม่`;
        els.gpsStatus.className = "gps-status error";
        els.formSection.hidden = true;
      }
    },
    (err) => {
      els.gpsBtn.disabled = false;
      let msg = "ไม่สามารถระบุตำแหน่งได้ กรุณาเปิดสิทธิ์การเข้าถึงตำแหน่ง (Location) แล้วลองใหม่";
      if (err.code === err.PERMISSION_DENIED) msg = "กรุณาอนุญาตให้เว็บไซต์เข้าถึงตำแหน่ง GPS ของอุปกรณ์ จึงจะเช็คชื่อได้";
      els.gpsStatus.textContent = msg;
      els.gpsStatus.className = "gps-status error";
      els.formSection.hidden = true;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function submitAttendance() {
  const studentId = els.studentId.value.trim();
  if (!/^[0-9]{10}$/.test(studentId)) {
    showResult("error", "กรุณากรอกรหัสนิสิตให้ถูกต้อง (ตัวเลข 10 หลัก)");
    return;
  }
  if (!currentPosition || !inRange) {
    showResult("error", "กรุณาตรวจสอบตำแหน่ง GPS และอยู่ในพื้นที่ที่กำหนดก่อนส่งข้อมูล");
    return;
  }
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    showResult("error", "ระบบยังไม่ได้ตั้งค่า APPS_SCRIPT_URL ใน js/config.js กรุณาแจ้งอาจารย์ผู้ดูแล");
    return;
  }

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "กำลังบันทึก...";

  const payload = {
    token: CONFIG.API_TOKEN,
    studentId,
    date: todaySession.date,
    deviceId: getDeviceId(),
    lat: currentPosition.lat,
    lng: currentPosition.lng,
    accuracy: currentPosition.accuracy,
    userAgent: navigator.userAgent,
    clientTime: new Date().toISOString(),
  };

  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === "ok") {
      markSubmittedLocally(todaySession.date);
      showResult("success", `บันทึกการเข้าเรียนสำเร็จ ✅ (${data.name || ""})`);
      els.formSection.hidden = true;
      els.gpsSection.hidden = true;
    } else {
      showResult("error", data.message || "เกิดข้อผิดพลาด ไม่สามารถบันทึกได้");
    }
  } catch (e) {
    showResult("error", "ไม่สามารถเชื่อมต่อระบบบันทึกข้อมูลได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = "เช็คชื่อเข้าเรียน";
  }
}

function showResult(type, message) {
  els.resultBox.hidden = false;
  els.resultBox.textContent = message;
  els.resultBox.className = "result-box " + type;
}

els.gpsBtn.addEventListener("click", checkGPS);
els.submitBtn.addEventListener("click", submitAttendance);

init();
