(() => {
  const D = window.ST_DATA;
  const CFG = window.APP_CONFIG || {};
  const fmt = (n, d=2) => Number(n).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d});
  const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
  const pct = (cur, base) => base ? ((cur-base)/base)*100 : 0;
  const reductionPct = (cur, base) => base ? ((base-cur)/base)*100 : 0;
  const signText = n => `${n < 0 ? 'ลดลง' : n > 0 ? 'เพิ่มขึ้น' : 'คงที่'} ${fmt(Math.abs(n),2)}%`;
  const deltaClass = n => n < 0 ? 'good' : n > 0 ? 'bad' : 'neutral';

  const totals = {
    electricity: {2567:sum(D.electricity[2567]),2568:sum(D.electricity[2568])},
    fuel: {2567:sum(D.fuel[2567]),2568:sum(D.fuel[2568])},
    water: {2567:sum(D.water[2567]),2568:sum(D.water[2568])}
  };
  const carbon = {
    electricity: {2567:totals.electricity[2567]*D.factors.electricity,2568:totals.electricity[2568]*D.factors.electricity},
    fuel: {2567:totals.fuel[2567]*D.factors.diesel,2568:totals.fuel[2568]*D.factors.diesel},
    water: {2567:totals.water[2567]*D.factors.water,2568:totals.water[2568]*D.factors.water}
  };
  carbon.total = {2567:carbon.electricity[2567]+carbon.fuel[2567]+carbon.water[2567],2568:carbon.electricity[2568]+carbon.fuel[2568]+carbon.water[2568]};

  const pages = [...document.querySelectorAll('.page')];
  const pageTitles = {overview:'ภาพรวมสิ่งแวดล้อม',waste:'การจัดการขยะ',electricity:'การใช้ไฟฟ้า',fuel:'การใช้น้ำมันเชื้อเพลิง',water:'การใช้น้ำ',carbon:'Carbon Dashboard',entry:'บันทึกข้อมูล',reports:'รายงาน'};
  const charts = {};
  const ENTRY_ACCESS_CODE = '1234';
  let entryUnlocked = false;

  function showPage(id){
    pages.forEach(p=>p.classList.toggle('active',p.id===id));
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    document.getElementById('pageTitle').textContent = pageTitles[id] || '';
    document.getElementById('sidebar').classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
    if(id==='entry'&&!entryUnlocked) setTimeout(()=>document.getElementById('entryAccessCode').focus(),100);
  }
  document.querySelector('.nav').addEventListener('click',e=>{const b=e.target.closest('[data-page]'); if(b) showPage(b.dataset.page)});
  document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('refreshBtn').addEventListener('click',()=>{renderAll();toast('รีเฟรชข้อมูลแล้ว')});
  document.getElementById('printBtn').addEventListener('click',()=>window.print());
  document.getElementById('yearSelect').addEventListener('change',renderAll);

  function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)}
  function kpi(label,value,unit,icon,delta='',klass='neutral'){
    return `<article class="kpi-card"><div class="kpi-top"><div class="kpi-label">${label}</div><div class="kpi-icon">${icon}</div></div><div class="kpi-value">${value} <span class="kpi-unit">${unit}</span></div><div class="delta ${klass}">${delta}</div></article>`
  }
  function selectedYear(){return Number(document.getElementById('yearSelect').value)}
  function chart(id,config){ if(charts[id]) charts[id].destroy(); charts[id]=new Chart(document.getElementById(id),config) }
  const lineOpts = {responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,grid:{color:'#edf1ee'}},x:{grid:{display:false}}}};

  function renderOverview(){
    const y=selectedYear(), b=y===2568?2567:2568;
    const waste=D.waste[y], wasteB=D.waste[b];
    const cards=[
      kpi('ขยะรวม',fmt(waste.total,2),'กก.','♻️',signText(pct(waste.total,wasteB.total)),deltaClass(pct(waste.total,wasteB.total))),
      kpi('การใช้ไฟฟ้า',fmt(totals.electricity[y],0),'kWh','⚡',signText(pct(totals.electricity[y],totals.electricity[b])),deltaClass(pct(totals.electricity[y],totals.electricity[b]))),
      kpi('น้ำมันดีเซล',fmt(totals.fuel[y],2),'ลิตร','⛽',signText(pct(totals.fuel[y],totals.fuel[b])),deltaClass(pct(totals.fuel[y],totals.fuel[b]))),
      kpi('การใช้น้ำ',fmt(totals.water[y],0),'ลบ.ม.','💧',signText(pct(totals.water[y],totals.water[b])),deltaClass(pct(totals.water[y],totals.water[b])))
    ];
    document.getElementById('overviewKpis').innerHTML=cards.join('');
    document.getElementById('heroStudents').textContent=fmt(D.students[y],0);
    chart('overviewChart',{type:'bar',data:{labels:['ขยะ (ตัน)','ไฟฟ้า (หมื่น kWh)','น้ำมัน (ร้อยลิตร)','น้ำ (พัน ลบ.ม.)'],datasets:[{label:'2567',data:[D.waste[2567].total/1000,totals.electricity[2567]/10000,totals.fuel[2567]/100,totals.water[2567]/1000],backgroundColor:'#9fcdb2'},{label:'2568',data:[D.waste[2568].total/1000,totals.electricity[2568]/10000,totals.fuel[2568]/100,totals.water[2568]/1000],backgroundColor:'#0b5d3b'}]},options:lineOpts});
    chart('carbonDonut',{type:'doughnut',data:{labels:['ไฟฟ้า','เชื้อเพลิง','น้ำ'],datasets:[{data:[carbon.electricity[y],carbon.fuel[y],carbon.water[y]],backgroundColor:['#d99316','#c94b4b','#2676b8'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'bottom'}}}});
    const wastePc=waste.total/D.wasteStudents[y], elecPc=totals.electricity[y]/D.students[y], waterPc=totals.water[y]/D.students[y];
    document.getElementById('overviewInsights').innerHTML=`<div class="insight"><b>♻️ ขยะต่อหัว</b><p>${fmt(wastePc,2)} กก./คน/ปี ${y===2568?'ลดลงจากปี 2567 ประมาณ '+fmt(reductionPct(wastePc,D.waste[2567].total/D.wasteStudents[2567]),2)+'%':'เป็นข้อมูลปีฐาน'}</p></div><div class="insight"><b>⚡ ไฟฟ้าต่อหัว</b><p>${fmt(elecPc,2)} kWh/คน/ปี ${y===2568?'ลดลงประมาณ '+fmt(reductionPct(elecPc,totals.electricity[2567]/D.students[2567]),2)+'%':'เป็นข้อมูลปีฐาน'}</p></div><div class="insight"><b>⛽ เชื้อเพลิง</b><p>${y===2568?'ลดการใช้น้ำมัน '+fmt(totals.fuel[2567]-totals.fuel[2568],2)+' ลิตร และ Carbon รวมลดลงประมาณ '+fmt(reductionPct(carbon.fuel[2568],carbon.fuel[2567]),2)+'%':'ปริมาณการใช้น้ำมันดีเซล '+fmt(totals.fuel[2567],2)+' ลิตร'}</p></div><div class="insight"><b>💧 น้ำต่อหัว</b><p>${fmt(waterPc,3)} ลบ.ม./คน/ปี แม้ปริมาณน้ำรวมปี 2568 เพิ่มขึ้น แต่การใช้ต่อหัวเปลี่ยนแปลงเพียงเล็กน้อย</p></div>`;
  }

  function renderWaste(){
    const a=D.waste[2567], b=D.waste[2568], pc67=a.total/D.wasteStudents[2567], pc68=b.total/D.wasteStudents[2568];
    document.getElementById('wasteKpis').innerHTML=[kpi('ขยะรวมปี 2567',fmt(a.total,2),'กก.','♻️','ปีฐาน'),kpi('ขยะรวมปี 2568',fmt(b.total,2),'กก.','🌿','ลดลง '+fmt(a.total-b.total,2)+' กก.','good'),kpi('ขยะรวมลดลง',fmt(reductionPct(b.total,a.total),2),'%','📉','คำนวณจากข้อมูลดิบ','good'),kpi('ขยะต่อหัวลดลง',fmt(reductionPct(pc68,pc67),2),'%','👥',fmt(pc67,2)+' → '+fmt(pc68,2)+' กก./คน','good')].join('');
    chart('wasteChart',{type:'bar',data:{labels:['ขยะทั่วไป','ขยะรีไซเคิล','ขยะอินทรีย์','ขยะอันตราย'],datasets:[{label:'2567',data:[a.general,a.recycle,a.organic,a.hazardous],backgroundColor:'#9fcdb2'},{label:'2568',data:[b.general,b.recycle,b.organic,b.hazardous],backgroundColor:'#0b5d3b'}]},options:lineOpts});
    document.getElementById('wastePerCapita').innerHTML=`<div class="compare-box"><small>ปี 2567</small><strong>${fmt(pc67,2)}</strong><span>กก./คน/ปี</span></div><div class="compare-arrow">↓ ลดลง ${fmt(reductionPct(pc68,pc67),2)}%</div><div class="compare-box"><small>ปี 2568</small><strong>${fmt(pc68,2)}</strong><span>กก./คน/ปี</span></div>`;
    const rows=[['ขยะทั่วไป',a.general,b.general],['ขยะรีไซเคิล',a.recycle,b.recycle],['ขยะอินทรีย์',a.organic,b.organic],['ขยะอันตราย',a.hazardous,b.hazardous]];
    document.getElementById('wasteTable').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${fmt(r[1],2)}</td><td>${fmt(r[2],2)}</td><td class="delta good">ลดลง ${fmt(r[1]-r[2],2)}</td></tr>`).join('');
  }

  function renderElectricity(){
    const pc67=totals.electricity[2567]/D.students[2567], pc68=totals.electricity[2568]/D.students[2568];
    document.getElementById('electricityKpis').innerHTML=[kpi('ใช้ไฟฟ้าปี 2567',fmt(totals.electricity[2567],0),'kWh','⚡','ปีฐาน'),kpi('ใช้ไฟฟ้าปี 2568',fmt(totals.electricity[2568],0),'kWh','⚡','ลดลง '+fmt(totals.electricity[2567]-totals.electricity[2568],0)+' kWh','good'),kpi('ไฟฟ้าต่อหัวปี 2568',fmt(pc68,2),'kWh/คน','👥','ลดลง '+fmt(reductionPct(pc68,pc67),2)+'%','good'),kpi('Carbon ต่อหัวปี 2568',fmt(carbon.electricity[2568]/D.students[2568],3),'kgCO₂e/คน','🌍','Factor '+D.factors.electricity+' kgCO₂e/kWh','neutral')].join('');
    chart('electricityChart',{type:'line',data:{labels:D.months,datasets:[{label:'2567',data:D.electricity[2567],borderColor:'#8ebda1',backgroundColor:'#8ebda1',tension:.28},{label:'2568',data:D.electricity[2568],borderColor:'#0b5d3b',backgroundColor:'#0b5d3b',tension:.28}]},options:lineOpts});
  }

  function renderFuel(){
    const pc67=carbon.fuel[2567]/D.students[2567], pc68=carbon.fuel[2568]/D.students[2568];
    document.getElementById('fuelKpis').innerHTML=[kpi('ดีเซลปี 2567',fmt(totals.fuel[2567],2),'ลิตร','⛽','ปีฐาน'),kpi('ดีเซลปี 2568',fmt(totals.fuel[2568],2),'ลิตร','⛽','ลดลง '+fmt(totals.fuel[2567]-totals.fuel[2568],2)+' ลิตร','good'),kpi('Carbon ปี 2568',fmt(carbon.fuel[2568],2),'kgCO₂e','🌍','ลดลง '+fmt(reductionPct(carbon.fuel[2568],carbon.fuel[2567]),2)+'%','good'),kpi('Carbon ต่อหัวลดลง',fmt(reductionPct(pc68,pc67),2),'%','👥',fmt(pc67,2)+' → '+fmt(pc68,2)+' kgCO₂e/คน','good')].join('');
    chart('fuelChart',{type:'line',data:{labels:D.months,datasets:[{label:'2567',data:D.fuel[2567],borderColor:'#d6a25c',backgroundColor:'#d6a25c',tension:.28},{label:'2568',data:D.fuel[2568],borderColor:'#c94b4b',backgroundColor:'#c94b4b',tension:.28}]},options:lineOpts});
  }

  function renderWater(){
    const pc67=totals.water[2567]/D.students[2567], pc68=totals.water[2568]/D.students[2568];
    document.getElementById('waterKpis').innerHTML=[kpi('ใช้น้ำปี 2567',fmt(totals.water[2567],0),'ลบ.ม.','💧','ปีฐาน'),kpi('ใช้น้ำปี 2568',fmt(totals.water[2568],0),'ลบ.ม.','💧','เพิ่มขึ้น '+fmt(totals.water[2568]-totals.water[2567],0)+' ลบ.ม.','bad'),kpi('น้ำต่อหัวปี 2568',fmt(pc68,3),'ลบ.ม./คน','👥',signText(pct(pc68,pc67)),deltaClass(pct(pc68,pc67))),kpi('Carbon ต่อหัวปี 2568',fmt(carbon.water[2568]/D.students[2568],3),'kgCO₂e/คน','🌍','Factor '+D.factors.water+' kgCO₂e/m³','neutral')].join('');
    chart('waterChart',{type:'line',data:{labels:D.months,datasets:[{label:'2567',data:D.water[2567],borderColor:'#8db8d8',backgroundColor:'#8db8d8',tension:.28},{label:'2568',data:D.water[2568],borderColor:'#2676b8',backgroundColor:'#2676b8',tension:.28}]},options:lineOpts});
  }

  function renderCarbon(){
    const pc67=carbon.total[2567]/D.students[2567], pc68=carbon.total[2568]/D.students[2568];
    document.getElementById('carbonKpis').innerHTML=[kpi('Carbon รวมปี 2567',fmt(carbon.total[2567],2),'kgCO₂e','🌍','ไฟฟ้า + เชื้อเพลิง + น้ำ'),kpi('Carbon รวมปี 2568',fmt(carbon.total[2568],2),'kgCO₂e','🌱','ลดลง '+fmt(carbon.total[2567]-carbon.total[2568],2)+' kgCO₂e','good'),kpi('Carbon รวมลดลง',fmt(reductionPct(carbon.total[2568],carbon.total[2567]),2),'%','📉','เทียบปี 2567','good'),kpi('Carbon ต่อหัวปี 2568',fmt(pc68,2),'kgCO₂e/คน','👥','ลดลง '+fmt(reductionPct(pc68,pc67),2)+'%','good')].join('');
    chart('carbonCompareChart',{type:'bar',data:{labels:['ไฟฟ้า','เชื้อเพลิง','น้ำ'],datasets:[{label:'2567',data:[carbon.electricity[2567],carbon.fuel[2567],carbon.water[2567]],backgroundColor:'#a9c7b5'},{label:'2568',data:[carbon.electricity[2568],carbon.fuel[2568],carbon.water[2568]],backgroundColor:'#0b5d3b'}]},options:lineOpts});
    chart('carbonDetailDonut',{type:'doughnut',data:{labels:['ไฟฟ้า','เชื้อเพลิง','น้ำ'],datasets:[{data:[carbon.electricity[2568],carbon.fuel[2568],carbon.water[2568]],backgroundColor:['#d99316','#c94b4b','#2676b8'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'}}}});
  }

  const entryAccessForm=document.getElementById('entryAccessForm');
  const entryAccessCode=document.getElementById('entryAccessCode');
  const entryAccessError=document.getElementById('entryAccessError');
  if(entryAccessForm) entryAccessForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(entryAccessCode.value===ENTRY_ACCESS_CODE){
      entryUnlocked=true;
      document.getElementById('entryAccessPanel').hidden=true;
      document.getElementById('entryProtected').hidden=false;
      entryAccessError.textContent='';
      entryAccessCode.value='';
      document.querySelector('#entryProtected input[name="recorder"]').focus();
      toast('เข้าสู่หน้าบันทึกข้อมูลแล้ว');
      return;
    }
    entryAccessError.textContent='รหัสไม่ถูกต้อง กรุณาลองใหม่';
    entryAccessCode.select();
  });

  const entryFields={
    waste:`<div class="form-grid"><label>ขยะทั่วไป (กก.)<input name="generalKg" type="number" step="0.01" min="0" required></label><label>ขยะรีไซเคิล (กก.)<input name="recycleKg" type="number" step="0.01" min="0" required></label><label>ขยะอินทรีย์ (กก.)<input name="organicKg" type="number" step="0.01" min="0" required></label><label>ขยะอันตราย (กก.)<input name="hazardousKg" type="number" step="0.01" min="0" required></label></div>`,
    electricity:`<div class="form-grid"><label>ปริมาณไฟฟ้า (kWh)<input name="electricityKWh" type="number" step="0.01" min="0" required></label><label>ค่าไฟฟ้า (บาท)<input name="cost" type="number" step="0.01" min="0"></label></div>`,
    fuel:`<div class="form-grid"><label>ประเภทเชื้อเพลิง<select name="fuelType"><option value="Diesel">Diesel</option><option>Gasoline</option><option>Gasohol 91</option><option>Gasohol 95</option><option>E20</option><option>E85</option><option>Biodiesel</option><option>LPG</option><option>NGV</option><option>Other</option></select></label><label>ปริมาณ (ลิตร)<input name="quantityLitre" type="number" step="0.01" min="0" required></label><label>ยานพาหนะ/หน่วยงาน<input name="vehicle" placeholder="เช่น รถส่วนกลาง"></label><label>ค่าใช้จ่าย (บาท)<input name="cost" type="number" step="0.01" min="0"></label></div>`,
    water:`<div class="form-grid"><label>ปริมาณน้ำ (ลบ.ม.)<input name="waterM3" type="number" step="0.01" min="0" required></label><label>ค่าน้ำ (บาท)<input name="cost" type="number" step="0.01" min="0"></label><label>มิเตอร์<input name="meterId" placeholder="เช่น MAIN-01"></label><label>วันที่บิล<input name="billingDate" type="date"></label></div>`
  };
  D.months.forEach((m,i)=>document.getElementById('entryMonth').insertAdjacentHTML('beforeend',`<option value="${i+1}">${m}</option>`));
  function setEntryCategory(cat){document.getElementById('entryCategory').value=cat;document.getElementById('dynamicFields').innerHTML=entryFields[cat];document.querySelectorAll('[data-entry]').forEach(b=>b.classList.toggle('active',b.dataset.entry===cat))}
  document.getElementById('entryTabs').addEventListener('click',e=>{const b=e.target.closest('[data-entry]');if(b)setEntryCategory(b.dataset.entry)});setEntryCategory('waste');
  document.getElementById('syncNote').innerHTML=CFG.apiUrl?`เชื่อมต่อ API แล้ว: ข้อมูลใหม่จะส่งไปยัง Google Sheets`:`โหมดปัจจุบัน: <b>หน้าเว็บพร้อมใช้งาน แต่ยังไม่ได้ระบุ Google Apps Script Web App URL</b> ข้อมูลที่กดบันทึกจะเก็บในเบราว์เซอร์ชั่วคราวก่อน`;
  document.getElementById('entryForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const category=document.getElementById('entryCategory').value;
    const payload=Object.fromEntries(new FormData(e.currentTarget).entries());payload.category=category;payload.timestamp=new Date().toISOString();
    try{
      if(CFG.apiUrl){
        const res=await fetch(CFG.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'addRecord',payload})});
        if(!res.ok)throw new Error(`API HTTP ${res.status}`);
        const result=await res.json();
        if(!result.ok)throw new Error(result.error||'API rejected the record');
      }
      else{const local=JSON.parse(localStorage.getItem('st_energy_mind_records')||'[]');local.unshift(payload);localStorage.setItem('st_energy_mind_records',JSON.stringify(local));}
      toast('บันทึกข้อมูลเรียบร้อยแล้ว');e.currentTarget.reset();setEntryCategory(category);
    }catch(err){console.error(err);toast('บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ API')}
  });

  function renderReports(){
    const wastePc67=D.waste[2567].total/D.wasteStudents[2567], wastePc68=D.waste[2568].total/D.wasteStudents[2568];
    document.getElementById('reportSummary').innerHTML=`<div class="report-stat">ขยะลดลง<strong>${fmt(D.waste[2567].total-D.waste[2568].total,2)} กก.</strong></div><div class="report-stat">ไฟฟ้าลดลง<strong>${fmt(totals.electricity[2567]-totals.electricity[2568],0)} kWh</strong></div><div class="report-stat">ดีเซลลดลง<strong>${fmt(totals.fuel[2567]-totals.fuel[2568],2)} ลิตร</strong></div><div class="report-stat">น้ำรวม<strong>+${fmt(totals.water[2568]-totals.water[2567],0)} ลบ.ม.</strong></div>`;
    const rows=[['ขยะรวม',fmt(D.waste[2567].total,2)+' กก.',fmt(D.waste[2568].total,2)+' กก.','ลดลง '+fmt(reductionPct(D.waste[2568].total,D.waste[2567].total),2)+'%'],['ขยะต่อหัว',fmt(wastePc67,2)+' กก./คน',fmt(wastePc68,2)+' กก./คน','ลดลง '+fmt(reductionPct(wastePc68,wastePc67),2)+'%'],['ไฟฟ้า',fmt(totals.electricity[2567],0)+' kWh',fmt(totals.electricity[2568],0)+' kWh','ลดลง '+fmt(reductionPct(totals.electricity[2568],totals.electricity[2567]),2)+'%'],['น้ำมันดีเซล',fmt(totals.fuel[2567],2)+' ลิตร',fmt(totals.fuel[2568],2)+' ลิตร','ลดลง '+fmt(reductionPct(totals.fuel[2568],totals.fuel[2567]),2)+'%'],['น้ำ',fmt(totals.water[2567],0)+' ลบ.ม.',fmt(totals.water[2568],0)+' ลบ.ม.','เพิ่มขึ้น '+fmt(pct(totals.water[2568],totals.water[2567]),2)+'%'],['Carbon รวม',fmt(carbon.total[2567],2)+' kgCO₂e',fmt(carbon.total[2568],2)+' kgCO₂e','ลดลง '+fmt(reductionPct(carbon.total[2568],carbon.total[2567]),2)+'%']];
    document.getElementById('reportTable').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');
  }

  function renderAll(){renderOverview();renderWaste();renderElectricity();renderFuel();renderWater();renderCarbon();renderReports()}
  renderAll();
})();
