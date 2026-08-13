const SPREADSHEET_ID = '1LVh0yj1yvTv4RtR_L1H6rgAatZNEzpgr3MO-9xIUImw';

function doGet(e) {
  return json_({ ok: true, service: 'Saint Theresa Energy Mind API', timestamp: new Date().toISOString() });
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (body.action === 'addRecord') return json_(addRecord_(body.payload || {}));
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function addRecord_(p) {
  const category = String(p.category || '').toLowerCase();
  const map = { waste: 'Waste_Records', electricity: 'Electricity_Records', fuel: 'Fuel_Records', water: 'Water_Records' };
  const sheetName = map[category];
  if (!sheetName) throw new Error('Invalid category');

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet not found: ' + sheetName);

  const now = new Date();
  const year = Number(p.academicYear);
  const month = Number(p.month);
  const monthLabels = ['พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน'];
  const calBE = month <= 8 ? year : year + 1;
  const idPrefix = { waste:'WS', electricity:'EL', fuel:'FL', water:'WT' }[category];
  const recordId = `${idPrefix}-${year}-${String(month).padStart(2,'0')}-${Utilities.formatDate(now,'Asia/Bangkok','HHmmss')}`;

  if (category === 'waste') {
    const g=Number(p.generalKg||0), r=Number(p.recycleKg||0), o=Number(p.organicKg||0), h=Number(p.hazardousKg||0);
    sh.appendRow([recordId,year,month,monthLabels[month-1],calBE,g,r,o,h,g+r+o+h,p.recorder||'',p.evidenceUrl||'',p.note||'',now]);
  } else if (category === 'electricity') {
    sh.appendRow([recordId,year,month,monthLabels[month-1],calBE,Number(p.electricityKWh||0),`POP-${year}-ELECTRICITY`,'EF-ELECTRICITY-001',Number(p.cost||0),p.recorder||'',p.evidenceUrl||'',p.note||'',now]);
  } else if (category === 'fuel') {
    sh.appendRow([recordId,year,month,monthLabels[month-1],calBE,p.fuelType||'Diesel',Number(p.quantityLitre||0),`POP-${year}-FUEL`,'EF-DIESEL-001',Number(p.cost||0),p.vehicle||'',p.recorder||'',p.evidenceUrl||'',p.note||'',now]);
  } else if (category === 'water') {
    sh.appendRow([recordId,year,month,monthLabels[month-1],calBE,Number(p.waterM3||0),`POP-${year}-WATER`,'EF-WATER-001',p.meterId||'',Number(p.cost||0),p.billingDate||'',p.recorder||'',p.evidenceUrl||'',p.note||'',now]);
  }

  return { ok:true, recordId, sheet:sheetName };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
