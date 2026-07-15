// ====== หน้าสรุปผลการเช็คชื่อ (admin) — 01003451 ======

const aEls = {
  loginCard: document.getElementById("loginCard"),
  pwd: document.getElementById("pwd"),
  loginBtn: document.getElementById("loginBtn"),
  loginMsg: document.getElementById("loginMsg"),
  dashboard: document.getElementById("dashboard"),
  summaryCard: document.getElementById("summaryCard"),
  attTable: document.getElementById("attTable"),
  exportBtn: document.getElementById("exportBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
};

let roster = [];
let attendance = [];

function showLoginMsg(msg) {
  aEls.loginMsg.hidden = false;
  aEls.loginMsg.textContent = msg;
  aEls.loginMsg.className = "result-box error";
}

async function login() {
  const token = aEls.pwd.value.trim();
  if (!token) return;
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    showLoginMsg("ระบบยังไม่ได้ตั้งค่า APPS_SCRIPT_URL ใน js/config.js");
    return;
  }

  aEls.loginBtn.disabled = true;
  aEls.loginBtn.textContent = "กำลังตรวจสอบ...";

  try {
    const url = `${CONFIG.APPS_SCRIPT_URL}?action=admin&token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "ok") {
      showLoginMsg(data.message || "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    roster = data.roster || [];
    attendance = data.attendance || [];
    aEls.pwd.value = "";
    aEls.loginCard.hidden = true;
    aEls.dashboard.hidden = false;
    render();
  } catch (e) {
    showLoginMsg("ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ต");
  } finally {
    aEls.loginBtn.disabled = false;
    aEls.loginBtn.textContent = "เข้าสู่ระบบ";
  }
}

function shortDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function render() {
  const sessions = CONFIG.SESSIONS;

  const presentSet = new Set(attendance.map((a) => `${a.date}|${a.studentId}`));

  // summary
  const totalCheckins = attendance.length;
  const uniqueStudentsPresent = new Set(attendance.map((a) => a.studentId)).size;
  aEls.summaryCard.innerHTML = `
    <div class="summary-grid">
      <div class="summary-stat"><div class="num">${roster.length}</div><div class="lbl">นิสิตทั้งหมด</div></div>
      <div class="summary-stat"><div class="num">${sessions.length}</div><div class="lbl">วันเรียนในระบบ</div></div>
      <div class="summary-stat"><div class="num">${totalCheckins}</div><div class="lbl">การเช็คชื่อทั้งหมด</div></div>
      <div class="summary-stat"><div class="num">${uniqueStudentsPresent}</div><div class="lbl">นิสิตที่เคยเช็คชื่อ</div></div>
    </div>
  `;

  // table
  let thead = `<tr><th class="name-cell">รหัส / ชื่อ-นามสกุล</th>`;
  sessions.forEach((s) => (thead += `<th title="${s.topic}">สัปดาห์ ${s.week}<br>${shortDate(s.date)}</th>`));
  thead += `<th>มา</th><th>%</th></tr>`;

  const sortedRoster = [...roster].sort((a, b) => a.id.localeCompare(b.id));

  let rows = "";
  sortedRoster.forEach((stu) => {
    let presentCount = 0;
    let cells = "";
    sessions.forEach((s) => {
      const present = presentSet.has(`${s.date}|${stu.id}`);
      if (present) presentCount++;
      cells += `<td class="${present ? "present" : "absent"}">${present ? "✓" : "-"}</td>`;
    });
    const pct = sessions.length ? Math.round((presentCount / sessions.length) * 100) : 0;
    const pctClass = pct < 80 ? "pct-low" : "";
    rows += `<tr><td class="name-cell">${stu.id}<br>${stu.name}</td>${cells}<td>${presentCount}/${sessions.length}</td><td class="${pctClass}">${pct}%</td></tr>`;
  });

  aEls.attTable.innerHTML = `<thead>${thead}</thead><tbody>${rows}</tbody>`;
}

function exportCsv() {
  const header = "Timestamp,Date,StudentId,Name,DeviceId,DistanceM\n";
  const rows = attendance
    .map((a) => [a.timestamp, a.date, a.studentId, `"${a.name}"`, a.deviceId, a.distance].join(","))
    .join("\n");
  const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_01003451_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

aEls.loginBtn.addEventListener("click", login);
aEls.pwd.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
aEls.exportBtn.addEventListener("click", exportCsv);
aEls.logoutBtn.addEventListener("click", () => location.reload());
