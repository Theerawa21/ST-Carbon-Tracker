# Saint Theresa Energy Mind Dashboard

เว็บแสดงผลและบันทึกข้อมูลสิ่งแวดล้อมของโรงเรียนเซนต์เทเรซา ครอบคลุมการจัดการขยะ การใช้ไฟฟ้า การใช้น้ำมันเชื้อเพลิง การใช้น้ำ และ Carbon Footprint

## ฐานข้อมูล
Google Sheets ID: `1LVh0yj1yvTv4RtR_L1H6rgAatZNEzpgr3MO-9xIUImw`

## การเชื่อม Google Sheets สำหรับบันทึกข้อมูล
1. เปิด Google Apps Script และวางโค้ดจาก `apps-script/Code.gs`
2. Deploy > New deployment > Web app
3. Execute as: Me
4. กำหนดสิทธิ์การเข้าถึงตามนโยบายของโรงเรียน
5. นำ Web app URL ไปใส่ใน `config.js` ที่ `apiUrl`

หากยังไม่ใส่ `apiUrl` หน้าเว็บจะทำงานในโหมด Embedded/Local และข้อมูลที่กรอกใหม่จะเก็บใน `localStorage` ของเบราว์เซอร์ชั่วคราว

## หมายเหตุ Carbon
Emission Factor ใน `data.js` เป็นค่าที่สอดคล้องกับชุดตัวเลขรายงานปัจจุบัน และควรยืนยันแหล่งอ้างอิงก่อนใช้ในรายงานทางการ
