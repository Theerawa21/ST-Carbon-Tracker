(() => {
  const D = window.ST_DATA || {};
  const CFG = window.APP_CONFIG || {};
  const YEARS = (D.years || [2567, 2568, 2569]).map(Number).sort((a,b)=>a-b);
  const COLORS = ['#9fcdb2', '#0b5d3b', '#d99316', '#2676b8'];
  const pages = [...document.querySelectorAll('.page')];
  const pageTitles = {
    overview:'ภาพรวมสิ่งแวดล้อม', waste:'การจัดการขยะ', electricity:'การใช้ไฟฟ้า',
    fuel:'การใช้น้ำมันเชื้อเพลิง', water:'การใช้น้ำ', carbon:'Carbon Dashboard',
    entry:'บันทึกข้อมูล', reports:'รายงาน'
  };
  const charts = {};
  const ENTRY_ACCESS_CODE = '1234';
  let entryUnlocked = false;

  const isNumber = v => v !== null && v !== '' && Number.isFinite(Number(v));
  const fmt = (n, d=2) => isNumber(n)
    ? Number(n).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d})
    : '—';
  const pct = (cur, base) => isNumber(cur) && isNumber(base) && Number(base) !== 0 ? ((Number(cur)-Number(base))/Number(base))*100 : null;
  const reductionPct = (cur, base) => isNumber(cur) && isNumber(base) && Number(base) !== 0 ? ((Number(base)-Number(cur))/Number(base))*100 : null;
  const seriesHasData = arr => Array.isArray(arr) && arr.some(isNumber);
  const seriesSum = arr => seriesHasData(arr) ? arr.reduce((a,b)=>a+(isNumber(b)?Number(b):0),0) : null;
  const safeDivide = (a,b) => isNumber(a) && isNumber(b) && Number(b) !== 0 ? Number(a)/Number(b) : null;
  const statusFor = y => (D.status && D.status[y]) || { complete: true, note: '' };
  const isPartial = y => statusFor(y).complete === false;
  const previousYear = y => YEARS.filter(v=>v<Number(y)).pop() || YEARS[0];
  const selectedYear = () => Number(document.getElementById('yearSelect').value);
  const throughLabel = y => {
    const m = statusFor(y).throughMonth;
    return m && D.months && D.months[m-1] ? D.months[m-1] : '';
  };
  const partialText = y => throughLabel(y) ? `ข้อมูลสะสมถึง ${throughLabel(y)}` : 'ข้อมูลยังไม่ครบปี';
  const signText = n => !isNumber(n) ? 'ยังเปรียบเทียบไม่ได้' : `${Number(n)<0?'ลดลง':Number(n)>0?'เพิ่มขึ้น':'คงที่'} ${fmt(Math.abs(Number(n)),2)}%`;
  const deltaClass = n => !isNumber(n) ? 'neutral' : Number(n)<0?'good':Number(n)>0?'bad':'neutral';

  const totals = { electricity:{}, fuel:{}, water:{} };
  const carbon = { electricity:{}, fuel:{}, water:{}, total:{} };
  YEARS.forEach(y => {
    totals.electricity[y] = seriesSum(D.electricity && D.electricity[y]);
    totals.fuel[y] = seriesSum(D.fuel && D.fuel[y]);
    totals.water[y] = seriesSum(D.water && D.water[y]);
    carbon.electricity[y] = isNumber(totals.electricity[y]) ? totals.electricity[y] * Number(D.factors.electricity) : null;
    carbon.fuel[y] = isNumber(totals.fuel[y]) ? totals.fuel[y] * Number(D.factors.diesel) : null;
    carbon.water[y] = isNumber(totals.water[y]) ? totals.water[y] * Number(D.factors.water) : null;
    const parts = [carbon.electricity[y], carbon.fuel[y], carbon.water[y]];
    carbon.total[y] = parts.every(isNumber) ? parts.reduce((a,b)=>a+Number(b),0) : null;
  });

  function showPage(id){
    pages.forEach(p=>p.classList.toggle('active',p.id===id));
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    document.getElementById('pageTitle').textContent = pageTitles[id] || '';
    document.getElementById('sidebar').classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
    if(id==='entry'&&!entryUnlocked) setTimeout(()=>document.getElementById('entryAccessCode')?.focus(),100);
  }

  document.querySelector('.nav')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-page]');
    if(b) showPage(b.dataset.page);
  });
  document.getElementById('menuBtn')?.addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('refreshBtn')?.addEventListener('click',()=>{renderAll();toast('รีเฟรชหน้าจอแล้ว')});
  document.getElementById('printBtn')?.addEventListener('click',()=>window.print());
  document.getElementById('yearSelect')?.addEventListener('change',renderAll);

  function toast(msg){
    const t=document.getElementById('toast');
    if(!t) return;
    t.textContent=msg;t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),2300);
  }

  function kpi(label,value,unit,icon,delta='',klass='neutral'){
    return `<article class="kpi-card"><div class="kpi-top"><div class="kpi-label">${label}</div><div class="kpi-icon">${icon}</div></div><div class="kpi-value">${value} <span class="kpi-unit">${unit}</span></div><div class="delta ${klass}">${delta}</div></article>`;
  }

  function chart(id,config){
    const canvas=document.getElementById(id);
    if(!canvas || typeof Chart==='undefined') return;
    if(charts[id]) charts[id].destroy();
    charts[id]=new Chart(canvas,config);
  }

  function lineOptions(){
    return {responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,grid:{color:'#edf1ee'}},x:{grid:{display:false}}}};
  }

  function comparisonDelta(cur,base,y){
    if(!isNumber(cur)) return {text:`ยังไม่มีข้อมูลปี ${y}`,klass:'neutral'};
    if(isPartial(y)) return {text:`${partialText(y)} • ยังไม่เทียบเต็มปี`,klass:'neutral'};
    const p=pct(cur,base);
    return {text:signText(p),klass:deltaClass(p)};
  }

  function dataValueOrDash(v,d=2){ return isNumber(v) ? fmt(v,d) : '—'; }

  function renderOverview(){
    const y=selectedYear(), b=previousYear(y);
    const waste=D.waste && D.waste[y];
    const wasteB=D.waste && D.waste[b];
    const wasteTotal=waste ? waste.total : null;
    const wasteBase=wasteB ? wasteB.total : null;
    const deltas={
      waste: comparisonDelta(wasteTotal,wasteBase,y),
      electricity: comparisonDelta(totals.electricity[y],totals.electricity[b],y),
      fuel: comparisonDelta(totals.fuel[y],totals.fuel[b],y),
      water: comparisonDelta(totals.water[y],totals.water[b],y)
    };

    document.getElementById('overviewKpis').innerHTML=[
      kpi('ขยะรวม',dataValueOrDash(wasteTotal,2),'กก.','♻️',deltas.waste.text,deltas.waste.klass),
      kpi('การใช้ไฟฟ้า',dataValueOrDash(totals.electricity[y],0),'kWh','⚡',deltas.electricity.text,deltas.electricity.klass),
      kpi('น้ำมันดีเซล',dataValueOrDash(totals.fuel[y],2),'ลิตร','⛽',deltas.fuel.text,deltas.fuel.klass),
      kpi('การใช้น้ำ',dataValueOrDash(totals.water[y],0),'ลบ.ม.','💧',deltas.water.text,deltas.water.klass)
    ].join('');

    const students=D.students && D.students[y];
    document.getElementById('heroStudents').textContent=isNumber(students)?fmt(students,0):'—';
    document.getElementById('overviewInsightTitle').textContent=`สรุปเชิงวิเคราะห์ ปีการศึกษา ${y}`;
    document.getElementById('overviewCompareText').textContent=`ปี ${YEARS[0]}–${YEARS[YEARS.length-1]}`;

    chart('overviewChart',{
      type:'bar',
      data:{
        labels:['ขยะ (ตัน)','ไฟฟ้า (หมื่น kWh)','น้ำมัน (ร้อยลิตร)','น้ำ (พัน ลบ.ม.)'],
        datasets:YEARS.map((yr,i)=>({
          label:String(yr),
          data:[
            D.waste && D.waste[yr] ? D.waste[yr].total/1000 : null,
            isNumber(totals.electricity[yr])?totals.electricity[yr]/10000:null,
            isNumber(totals.fuel[yr])?totals.fuel[yr]/100:null,
            isNumber(totals.water[yr])?totals.water[yr]/1000:null
          ],
          backgroundColor:COLORS[i%COLORS.length]
        }))
      },
      options:lineOptions()
    });

    const cparts=[carbon.electricity[y],carbon.fuel[y],carbon.water[y]];
    const hasCarbon=cparts.some(isNumber);
    chart('carbonDonut',{
      type:'doughnut',
      data:{labels:['ไฟฟ้า','เชื้อเพลิง','น้ำ'],datasets:[{data:hasCarbon?cparts.map(v=>isNumber(v)?v:0):[0,0,0],backgroundColor:['#d99316','#c94b4b','#2676b8'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'bottom'}}}
    });
    document.getElementById('carbonStatusNote').textContent = hasCarbon
      ? 'Emission Factor ในระบบอยู่ระหว่างยืนยันแหล่งอ้างอิงสำหรับรายงานทางการ'
      : `ยังไม่มีข้อมูลไฟฟ้า เชื้อเพลิง และน้ำของปี ${y} สำหรับคำนวณ Carbon Footprint`;

    const wastePc=safeDivide(wasteTotal,D.wasteStudents && D.wasteStudents[y]);
    const elecPc=safeDivide(totals.electricity[y],students);
    const waterPc=safeDivide(totals.water[y],students);
    const insight=(title,text)=>`<div class="insight"><b>${title}</b><p>${text}</p></div>`;
    const wasteText=isNumber(wasteTotal)
      ? (isNumber(wastePc)?`${fmt(wastePc,2)} กก./คน/ปี ${isPartial(y)?'('+partialText(y)+')':''}`:`บันทึกขยะสะสม ${fmt(wasteTotal,2)} กก. ${isPartial(y)?'('+partialText(y)+')':''} • รอข้อมูลจำนวนนักเรียนสำหรับคำนวณต่อหัว`)
      : `ยังไม่มีข้อมูลขยะปี ${y}`;
    const elecText=isNumber(totals.electricity[y]) ? `${fmt(totals.electricity[y],0)} kWh${isNumber(elecPc)?` หรือ ${fmt(elecPc,2)} kWh/คน`:''}` : `ยังไม่มีข้อมูลไฟฟ้าปี ${y}`;
    const fuelText=isNumber(totals.fuel[y]) ? `${fmt(totals.fuel[y],2)} ลิตร${isNumber(carbon.fuel[y])?` • ${fmt(carbon.fuel[y],2)} kgCO₂e`:''}` : `ยังไม่มีข้อมูลเชื้อเพลิงปี ${y}`;
    const waterText=isNumber(totals.water[y]) ? `${fmt(totals.water[y],0)} ลบ.ม.${isNumber(waterPc)?` หรือ ${fmt(waterPc,3)} ลบ.ม./คน`:''}` : `ยังไม่มีข้อมูลน้ำปี ${y}`;
    document.getElementById('overviewInsights').innerHTML=[
      insight('♻️ ขยะ',wasteText), insight('⚡ ไฟฟ้า',elecText), insight('⛽ เชื้อเพลิง',fuelText), insight('💧 น้ำ',waterText)
    ].join('');
  }

  function renderWaste(){
    const y=selectedYear(), b=previousYear(y);
    const cur=D.waste && D.waste[y], base=D.waste && D.waste[b];
    const curTotal=cur?cur.total:null, baseTotal=base?base.total:null;
    const curPc=safeDivide(curTotal,D.wasteStudents && D.wasteStudents[y]);
    const basePc=safeDivide(baseTotal,D.wasteStudents && D.wasteStudents[b]);
    const change=reductionPct(curTotal,baseTotal);

    document.getElementById('wasteKpis').innerHTML=[
      kpi(`ขยะ${isPartial(y)?'สะสม':''}ปี ${y}`,dataValueOrDash(curTotal,2),'กก.','♻️',isPartial(y)?partialText(y):'ยอดรวมทั้งปี','neutral'),
      kpi(`ขยะรวมปี ${b}`,dataValueOrDash(baseTotal,2),'กก.','🌿',b===YEARS[0]?'ปีฐาน':'ปีเปรียบเทียบ','neutral'),
      kpi('การเปลี่ยนแปลง',isPartial(y)?'—':dataValueOrDash(change,2),'%','📉',isPartial(y)?'ยังไม่เปรียบเทียบข้อมูลบางปีกับข้อมูลเต็มปี':signText(pct(curTotal,baseTotal)),isPartial(y)?'neutral':deltaClass(pct(curTotal,baseTotal))),
      kpi('ขยะต่อหัว',dataValueOrDash(curPc,2),'กก./คน','👥',isNumber(curPc)?(isPartial(y)?partialText(y):`เทียบ ${fmt(basePc,2)} กก./คน`):'รอข้อมูลจำนวนนักเรียน','neutral')
    ].join('');

    chart('wasteChart',{
      type:'bar',
      data:{labels:['ขยะทั่วไป','ขยะรีไซเคิล','ขยะอินทรีย์','ขยะอันตราย'],datasets:YEARS.map((yr,i)=>{
        const w=D.waste && D.waste[yr];
        return {label:String(yr),data:w?[w.general,w.recycle,w.organic,w.hazardous]:[null,null,null,null],backgroundColor:COLORS[i%COLORS.length]};
      })},
      options:lineOptions()
    });

    if(isNumber(curPc) && isNumber(basePc)){
      const label=isPartial(y)?partialText(y):signText(pct(curPc,basePc));
      document.getElementById('wastePerCapita').innerHTML=`<div class="compare-box"><small>ปี ${b}</small><strong>${fmt(basePc,2)}</strong><span>กก./คน/ปี</span></div><div class="compare-arrow">${label}</div><div class="compare-box"><small>ปี ${y}</small><strong>${fmt(curPc,2)}</strong><span>กก./คน/ปี</span></div>`;
    } else {
      document.getElementById('wastePerCapita').innerHTML=`<div class="compare-box"><small>ปี ${y}</small><strong>—</strong><span>รอข้อมูลจำนวนนักเรียน</span></div>`;
    }

    document.getElementById('wasteBaseYearHead').textContent=String(b);
    document.getElementById('wasteSelectedYearHead').textContent=String(y);
    const rows=[['ขยะทั่วไป','general'],['ขยะรีไซเคิล','recycle'],['ขยะอินทรีย์','organic'],['ขยะอันตราย','hazardous']];
    document.getElementById('wasteTable').innerHTML=rows.map(([label,key])=>{
      const bv=base?base[key]:null, cv=cur?cur[key]:null;
      let text='ยังไม่มีข้อมูล', klass='neutral';
      if(isNumber(cv) && isNumber(bv)){
        if(isPartial(y)) text='ข้อมูลสะสม • ยังไม่เทียบเต็มปี';
        else {
          const diff=Number(cv)-Number(bv);
          text=`${diff<0?'ลดลง':diff>0?'เพิ่มขึ้น':'คงที่'} ${fmt(Math.abs(diff),2)}`;
          klass=deltaClass(diff);
        }
      }
      return `<tr><td>${label}</td><td>${fmt(bv,2)}</td><td>${fmt(cv,2)}</td><td class="delta ${klass}">${text}</td></tr>`;
    }).join('');
  }

  function renderSeriesSection({type,kpiId,chartId,unit,icon,factor,factorLabel,decimals=0,perCapitaDecimals=2}){
    const y=selectedYear(), b=previousYear(y);
    const cur=totals[type][y], base=totals[type][b];
    const students=D.students && D.students[y], baseStudents=D.students && D.students[b];
    const pc=safeDivide(cur,students), basePc=safeDivide(base,baseStudents);
    const c=carbon[type][y];
    const change=pct(cur,base);
    const partial=isPartial(y);

    document.getElementById(kpiId).innerHTML=[
      kpi(`${type==='electricity'?'ใช้ไฟฟ้า':type==='fuel'?'ดีเซล':'ใช้น้ำ'}ปี ${b}`,dataValueOrDash(base,decimals),unit,icon,'ปีเปรียบเทียบ','neutral'),
      kpi(`${type==='electricity'?'ใช้ไฟฟ้า':type==='fuel'?'ดีเซล':'ใช้น้ำ'}ปี ${y}`,dataValueOrDash(cur,decimals),unit,icon,isNumber(cur)?(partial?partialText(y):signText(change)):`ยังไม่มีข้อมูลปี ${y}`,isNumber(cur)&&!partial?deltaClass(change):'neutral'),
      kpi(`ต่อหัวปี ${y}`,dataValueOrDash(pc,perCapitaDecimals),`${unit}/คน`,'👥',isNumber(pc)?(partial?partialText(y):signText(pct(pc,basePc))):'รอข้อมูลที่จำเป็น','neutral'),
      kpi(`Carbon ปี ${y}`,dataValueOrDash(c,2),'kgCO₂e','🌍',isNumber(c)?`Factor ${factor} ${factorLabel}`:`ยังไม่มีข้อมูลสำหรับคำนวณ`,'neutral')
    ].join('');

    const source=D[type] || {};
    chart(chartId,{
      type:'line',
      data:{labels:D.months,datasets:YEARS.map((yr,i)=>({label:String(yr),data:source[yr]||Array(12).fill(null),borderColor:COLORS[i%COLORS.length],backgroundColor:COLORS[i%COLORS.length],tension:.28,spanGaps:false}))},
      options:lineOptions()
    });
  }

  function renderElectricity(){
    renderSeriesSection({type:'electricity',kpiId:'electricityKpis',chartId:'electricityChart',unit:'kWh',icon:'⚡',factor:D.factors.electricity,factorLabel:'kgCO₂e/kWh',decimals:0,perCapitaDecimals:2});
  }
  function renderFuel(){
    renderSeriesSection({type:'fuel',kpiId:'fuelKpis',chartId:'fuelChart',unit:'ลิตร',icon:'⛽',factor:D.factors.diesel,factorLabel:'kgCO₂e/L',decimals:2,perCapitaDecimals:3});
  }
  function renderWater(){
    renderSeriesSection({type:'water',kpiId:'waterKpis',chartId:'waterChart',unit:'ลบ.ม.',icon:'💧',factor:D.factors.water,factorLabel:'kgCO₂e/m³',decimals:0,perCapitaDecimals:3});
  }

  function renderCarbon(){
    const y=selectedYear(), b=previousYear(y);
    const cur=carbon.total[y], base=carbon.total[b];
    const students=D.students && D.students[y], baseStudents=D.students && D.students[b];
    const pc=safeDivide(cur,students), basePc=safeDivide(base,baseStudents);
    const partial=isPartial(y);
    const completeComponents=[carbon.electricity[y],carbon.fuel[y],carbon.water[y]].every(isNumber);
    document.getElementById('carbonKpis').innerHTML=[
      kpi(`Carbon รวมปี ${b}`,dataValueOrDash(base,2),'kgCO₂e','🌍','ไฟฟ้า + เชื้อเพลิง + น้ำ','neutral'),
      kpi(`Carbon รวมปี ${y}`,dataValueOrDash(cur,2),'kgCO₂e','🌱',completeComponents?(partial?partialText(y):signText(pct(cur,base))):'ยังไม่มีข้อมูลครบ 3 ด้าน','neutral'),
      kpi('การเปลี่ยนแปลง',(!partial&&isNumber(cur)&&isNumber(base))?fmt(reductionPct(cur,base),2):'—','%','📉',partial?'ยังไม่เปรียบเทียบข้อมูลบางปีกับข้อมูลเต็มปี':(!isNumber(cur)?'ยังคำนวณไม่ได้':'เทียบปีก่อนหน้า'),'neutral'),
      kpi(`Carbon ต่อหัวปี ${y}`,dataValueOrDash(pc,2),'kgCO₂e/คน','👥',isNumber(pc)?(partial?partialText(y):signText(pct(pc,basePc))):'รอข้อมูลที่จำเป็น','neutral')
    ].join('');

    chart('carbonCompareChart',{
      type:'bar',
      data:{labels:['ไฟฟ้า','เชื้อเพลิง','น้ำ'],datasets:YEARS.map((yr,i)=>({label:String(yr),data:[carbon.electricity[yr],carbon.fuel[yr],carbon.water[yr]],backgroundColor:COLORS[i%COLORS.length]}))},
      options:lineOptions()
    });
    const parts=[carbon.electricity[y],carbon.fuel[y],carbon.water[y]];
    const hasAny=parts.some(isNumber);
    chart('carbonDetailDonut',{
      type:'doughnut',
      data:{labels:['ไฟฟ้า','เชื้อเพลิง','น้ำ'],datasets:[{data:hasAny?parts.map(v=>isNumber(v)?v:0):[0,0,0],backgroundColor:['#d99316','#c94b4b','#2676b8'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'}}}
    });
    document.getElementById('carbonShareTitle').textContent=`สัดส่วนปี ${y}`;
  }

  function displayChange(cur,base,y){
    if(!isNumber(cur)) return 'ยังไม่มีข้อมูล';
    if(!isNumber(base)) return 'ไม่มีข้อมูลปีเปรียบเทียบ';
    if(isPartial(y)) return 'ข้อมูลสะสม • ยังไม่เทียบเต็มปี';
    return signText(pct(cur,base));
  }

  function renderReports(){
    const y=selectedYear(), b=previousYear(y);
    const wasteCur=D.waste && D.waste[y] ? D.waste[y].total : null;
    const wasteBase=D.waste && D.waste[b] ? D.waste[b].total : null;
    document.getElementById('reportCoverText').textContent=`เปรียบเทียบปีการศึกษา ${b} และ ${y}${isPartial(y)?' (ปี '+y+' อยู่ระหว่างบันทึกข้อมูล)':''}`;
    document.getElementById('reportBaseYearHead').textContent=`ปี ${b}`;
    document.getElementById('reportSelectedYearHead').textContent=`ปี ${y}`;

    const statusLabel=isPartial(y)?partialText(y):'ข้อมูลครบปี';
    document.getElementById('reportSummary').innerHTML=[
      `<div class="report-stat">สถานะปี ${y}<strong>${statusLabel}</strong></div>`,
      `<div class="report-stat">ขยะ<strong>${isNumber(wasteCur)?fmt(wasteCur,2)+' กก.':'—'}</strong></div>`,
      `<div class="report-stat">ไฟฟ้า<strong>${isNumber(totals.electricity[y])?fmt(totals.electricity[y],0)+' kWh':'—'}</strong></div>`,
      `<div class="report-stat">Carbon รวม<strong>${isNumber(carbon.total[y])?fmt(carbon.total[y],2)+' kgCO₂e':'—'}</strong></div>`
    ].join('');

    const wastePcBase=safeDivide(wasteBase,D.wasteStudents && D.wasteStudents[b]);
    const wastePcCur=safeDivide(wasteCur,D.wasteStudents && D.wasteStudents[y]);
    const rows=[
      ['ขยะรวม',isNumber(wasteBase)?fmt(wasteBase,2)+' กก.':'—',isNumber(wasteCur)?fmt(wasteCur,2)+' กก.':'—',displayChange(wasteCur,wasteBase,y)],
      ['ขยะต่อหัว',isNumber(wastePcBase)?fmt(wastePcBase,2)+' กก./คน':'—',isNumber(wastePcCur)?fmt(wastePcCur,2)+' กก./คน':'—',isNumber(wastePcCur)?displayChange(wastePcCur,wastePcBase,y):'รอข้อมูลจำนวนนักเรียน'],
      ['ไฟฟ้า',isNumber(totals.electricity[b])?fmt(totals.electricity[b],0)+' kWh':'—',isNumber(totals.electricity[y])?fmt(totals.electricity[y],0)+' kWh':'—',displayChange(totals.electricity[y],totals.electricity[b],y)],
      ['น้ำมันดีเซล',isNumber(totals.fuel[b])?fmt(totals.fuel[b],2)+' ลิตร':'—',isNumber(totals.fuel[y])?fmt(totals.fuel[y],2)+' ลิตร':'—',displayChange(totals.fuel[y],totals.fuel[b],y)],
      ['น้ำ',isNumber(totals.water[b])?fmt(totals.water[b],0)+' ลบ.ม.':'—',isNumber(totals.water[y])?fmt(totals.water[y],0)+' ลบ.ม.':'—',displayChange(totals.water[y],totals.water[b],y)],
      ['Carbon รวม',isNumber(carbon.total[b])?fmt(carbon.total[b],2)+' kgCO₂e':'—',isNumber(carbon.total[y])?fmt(carbon.total[y],2)+' kgCO₂e':'—',displayChange(carbon.total[y],carbon.total[b],y)]
    ];
    document.getElementById('reportTable').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');
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
      document.querySelector('#entryProtected input[name="recorder"]')?.focus();
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

  D.months.forEach((m,i)=>document.getElementById('entryMonth')?.insertAdjacentHTML('beforeend',`<option value="${i+1}">${m}</option>`));
  function setEntryCategory(cat){
    const category=document.getElementById('entryCategory');
    const dynamic=document.getElementById('dynamicFields');
    if(!category || !dynamic) return;
    category.value=cat;
    dynamic.innerHTML=entryFields[cat];
    document.querySelectorAll('[data-entry]').forEach(b=>b.classList.toggle('active',b.dataset.entry===cat));
  }
  document.getElementById('entryTabs')?.addEventListener('click',e=>{const b=e.target.closest('[data-entry]');if(b)setEntryCategory(b.dataset.entry)});
  setEntryCategory('waste');

  function setEntryStatus(type,title,detail=''){
    const box=document.getElementById('entryStatus');
    if(!box) return;
    box.className=`entry-status ${type}`;
    box.replaceChildren();
    const heading=document.createElement('strong');heading.textContent=title;box.appendChild(heading);
    if(detail){const description=document.createElement('span');description.textContent=detail;box.appendChild(description);}
    box.hidden=false;
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function clearEntryStatus(){
    const box=document.getElementById('entryStatus');
    if(!box) return;
    box.hidden=true;box.replaceChildren();
  }

  const syncNote=document.getElementById('syncNote');
  if(syncNote) syncNote.innerHTML=CFG.apiUrl
    ? `เชื่อมต่อ API แล้ว: ข้อมูลใหม่จะส่งไปยัง Google Sheets <b>ปี 2569 รองรับการบันทึกแล้ว</b>`
    : `โหมดปัจจุบัน: <b>หน้าเว็บพร้อมใช้งาน แต่ยังไม่ได้ระบุ Google Apps Script Web App URL</b> ข้อมูลที่กดบันทึกจะเก็บในเบราว์เซอร์ชั่วคราวก่อน`;

  document.getElementById('entryForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.currentTarget;
    const submitButton=form.querySelector('button[type="submit"]');
    const category=document.getElementById('entryCategory').value;
    const payload=Object.fromEntries(new FormData(form).entries());
    payload.category=category;
    payload.timestamp=new Date().toISOString();
    clearEntryStatus();
    submitButton.disabled=true;submitButton.textContent='กำลังบันทึก...';
    try{
      let savedRecordId='';
      if(CFG.apiUrl){
        const res=await fetch(CFG.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'addRecord',payload})});
        if(!res.ok) throw new Error(`API HTTP ${res.status}`);
        const result=await res.json();
        if(!result.ok) throw new Error(result.error||'API rejected the record');
        savedRecordId=result.recordId||'';
      } else {
        const local=JSON.parse(localStorage.getItem('st_energy_mind_records')||'[]');
        local.unshift(payload);
        localStorage.setItem('st_energy_mind_records',JSON.stringify(local));
      }
      form.reset();
      setEntryCategory(category);
      setEntryStatus('success','✅ บันทึกข้อมูลเรียบร้อยแล้ว',savedRecordId?`รหัสรายการ: ${savedRecordId} • ข้อมูลสรุปหน้า Dashboard จะอัปเดตเมื่อซิงก์ชุดข้อมูล`:'ข้อมูลถูกบันทึกแล้ว');
      toast('บันทึกข้อมูลเรียบร้อยแล้ว');
    }catch(err){
      console.error(err);
      setEntryStatus('error','❌ บันทึกข้อมูลไม่สำเร็จ','กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
      toast('บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ API');
    }finally{
      submitButton.disabled=false;submitButton.textContent='บันทึกข้อมูล';
    }
  });

  function renderAll(){
    renderOverview();
    renderWaste();
    renderElectricity();
    renderFuel();
    renderWater();
    renderCarbon();
    renderReports();
  }

  renderAll();
})();
