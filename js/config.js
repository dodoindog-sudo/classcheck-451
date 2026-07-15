// ====== ตั้งค่าระบบเช็คชื่อ วิชาสรีรวิทยาการผลิตพืชไร่ 01003451 ======
// แก้ไขค่าต่าง ๆ ในไฟล์นี้ได้ตามต้องการ ไม่ต้องแตะไฟล์อื่น

const CONFIG = {
  // URL ของ Google Apps Script Web App (ได้จากขั้นตอน Deploy > New deployment)
  // ตัวอย่าง: "https://script.google.com/macros/s/AKfycb.../exec"
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyO3oBTIP5wxN1FLOCRDQhRUx4k6QT4pejfk1KRA_Il3XNXtd1lnzafkAz_1l_LGdoTiw/exec",

  // โทเคนลับสั้น ๆ ที่ฝั่ง Apps Script ต้องตรงกัน (กันบอท/การยิง request ตรง ๆ แบบสุ่ม)
  // เปลี่ยนค่านี้ได้ตามใจ แต่ต้องตั้งให้ตรงกับ API_TOKEN ใน Code.gs
  API_TOKEN: "kaset-crop451-2569",

  // ข้อมูลรายวิชา
  COURSE: {
    code: "01003451",
    nameTh: "สรีรวิทยาการผลิตพืชไร่",
    nameEn: "Physiology of Field Crop Production",
    room: "ห้อง 206 ชั้น 2 อาคารวชิรานุสรณ์",
    place: "คณะเกษตร มหาวิทยาลัยเกษตรศาสตร์ บางเขน",
    classStart: "08:00",
    classEnd: "11:00",
  },

  // พื้นที่อนุญาตให้เช็คชื่อ (ต้องอยู่ในรัศมีนี้จากจุดศูนย์กลาง)
  // จุดศูนย์กลางตั้งเป็นพิกัดคณะเกษตร มก. บางเขน (ตรวจสอบ/ปรับได้จาก Google Maps)
  GEOFENCE: {
    lat: 13.8498543,
    lng: 100.5710172,
    radiusMeters: 450,
  },

  // ช่วงเวลาที่อนุญาตให้เช็คชื่อได้ในแต่ละวันเรียน (นาที นับจากเวลาเริ่มเรียน classStart)
  // ค่าเริ่มต้น: เปิดก่อนเรียน 30 นาที และปิดหลังเลิกเรียน 30 นาที (08:00 -> เปิด 07:30 ปิด 11:30)
  CHECKIN_WINDOW: {
    openBeforeMin: 30,
    closeAfterClassEndMin: 30,
  },

  // ตารางวันเรียน (เฉพาะวันบรรยายจริงตาม course syllabus ภาคต้น ปีการศึกษา 2569)
  // สัปดาห์ที่งดเรียน (สัปดาห์ 6, 9 สอบกลางภาค, 16 พิธีพระราชทานปริญญาบัตร, 18 สอบปลายภาค) ไม่รวมไว้
  SESSIONS: [
    { date: "2026-06-23", week: 1, topic: "Course introduction, introduction to physiology of field crop production", instructor: "ผศ. ดร.อภิเดช รักเป็นไทย" },
    { date: "2026-06-30", week: 2, topic: "Plant cell and crop growth", instructor: "ผศ. ดร.อภิเดช รักเป็นไทย" },
    { date: "2026-07-07", week: 3, topic: "Crop growth analysis", instructor: "ผศ. ดร.อภิเดช รักเป็นไทย" },
    { date: "2026-07-14", week: 4, topic: "Light utilization within plant canopy and community", instructor: "รศ. ดร.ปิติพงษ์ โตบันลือภพ" },
    { date: "2026-07-21", week: 5, topic: "Relation of water and crop growth and yield production", instructor: "รศ. ดร.ปิติพงษ์ โตบันลือภพ" },
    { date: "2026-08-04", week: 7, topic: "Plant hormone and crop growth", instructor: "ผศ. ดร.อภิเดช รักเป็นไทย" },
    { date: "2026-08-11", week: 8, topic: "Mineral nutrition", instructor: "ผศ. ดร.อรุณี วงษ์แก้ว" },
    { date: "2026-08-25", week: 10, topic: "Photosynthesis and respiration", instructor: "รศ. ดร.สุตเขตต์ นาคะเสถียร" },
    { date: "2026-09-01", week: 11, topic: "Dry matter translocation, partitioning and accumulation", instructor: "รศ. ดร.สุตเขตต์ นาคะเสถียร" },
    { date: "2026-09-08", week: 12, topic: "Temperature and crop growth", instructor: "ผศ. ดร.อภิเดช รักเป็นไทย" },
    { date: "2026-09-15", week: 13, topic: "Plant canopy and plant population and community", instructor: "ผศ. ดร.วรรณสิริ วรรณรัตน์" },
    { date: "2026-09-22", week: 14, topic: "Physiology of flowering", instructor: "ผศ. ดร.อภิเดช รักเป็นไทย" },
    { date: "2026-09-29", week: 15, topic: "Yield component and application of crop physiology for yield improvement", instructor: "รศ. ดร.ปิติพงษ์ โตบันลือภพ" },
    // สัปดาห์ 17 (14-16 ต.ค. 69) นำเสนอ Term paper — วันที่แน่นอนแจ้งภายหลัง ปรับวันที่นี้เมื่อทราบวันจริง
    { date: "2026-10-14", week: 17, topic: "Term paper presentation (วันที่แน่นอนตามที่อาจารย์ประกาศ)", instructor: "คณะผู้สอน" },
  ],
};
