window.APP_CONFIG = {
  spreadsheetId: '1LVh0yj1yvTv4RtR_L1H6rgAatZNEzpgr3MO-9xIUImw',
  apiUrl: 'https://script.google.com/macros/s/AKfycbwa-jdzAJ6C7fW4x3ngWTMLz3FvZkakzYWobrTIBPF4mDeycNKlZli8bmCS1FXNevKA/exec',
  schoolName: 'โรงเรียนเซนต์เทเรซา',
  dataMode: 'api'
};

(() => {
  const SHEETS_ACCESS_CODE = '1234';
  const sheetsLink = document.querySelector('.sidebar-note a[href*="docs.google.com/spreadsheets"]');
  if (!sheetsLink) return;

  const sheetsUrl = sheetsLink.href;
  sheetsLink.textContent = 'Google Sheets 🔒 ↗';
  sheetsLink.title = 'กรอกรหัสเพื่อเข้าสู่ฐานข้อมูล';

  sheetsLink.addEventListener('click', event => {
    event.preventDefault();
    const code = window.prompt('กรุณากรอกรหัสเพื่อเข้าสู่ฐานข้อมูล Google Sheets');

    if (code === SHEETS_ACCESS_CODE) {
      window.open(sheetsUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (code !== null) {
      window.alert('รหัสไม่ถูกต้อง กรุณาลองใหม่');
    }
  });
})();
