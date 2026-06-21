/* ============================================================
   SMART ENERGY MONITOR — App Logic
   ============================================================ */

(function(){
"use strict";

/* ---------- Chart.js global defaults (industrial theme) ---------- */
Chart.defaults.color = '#8B98A9';
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.font.size = 11;
Chart.defaults.borderColor = 'rgba(140,160,190,0.08)';

const COLORS = { r:'#FF5470', y:'#FFB020', b:'#3D9BFF', ok:'#00D9A3', info:'#3D9BFF', crit:'#FF4757' };

function gridOpt(){
  return { grid:{ color:'rgba(140,160,190,0.07)', drawBorder:false }, ticks:{ color:'#5B6679' } };
}
function baseLineOpts(){
  return {
    responsive:true, maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    plugins:{ legend:{ labels:{ usePointStyle:true, boxWidth:8, padding:16, color:'#8B98A9' } }, tooltip:{ backgroundColor:'#0F1722', borderColor:'rgba(140,160,190,0.2)', borderWidth:1, padding:10, titleColor:'#E8EDF4', bodyColor:'#8B98A9' } },
    scales:{ x: gridOpt(), y: gridOpt() }
  };
}

/* ---------- Simulated live data engine ---------- */
const state = {
  r: { v:231.4, i:42.1, pf:0.94 },
  y: { v:228.9, i:39.8, pf:0.91 },
  b: { v:233.2, i:44.6, pf:0.96 },
  freq:50.02,
  neutralV:1.2,
  earthV:0.4,
};

function jitter(val, pct){
  const delta = val * pct * (Math.random()*2-1);
  return val + delta;
}

function tick(){
  state.r.v = jitter(231,0.012); state.r.i = jitter(42,0.04); state.r.pf = clamp(jitter(0.94,0.015),0.7,1);
  state.y.v = jitter(229,0.014); state.y.i = jitter(40,0.05); state.y.pf = clamp(jitter(0.91,0.02),0.7,1);
  state.b.v = jitter(233,0.011); state.b.i = jitter(45,0.04); state.b.pf = clamp(jitter(0.96,0.012),0.7,1);
  state.freq = clamp(jitter(50,0.003),49.7,50.3);
  state.neutralV = clamp(jitter(1.2,0.3),0.1,3);
  state.earthV = clamp(jitter(0.4,0.3),0.05,1.2);
}
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function totalPower(){
  return (state.r.v*state.r.i*state.r.pf + state.y.v*state.y.i*state.y.pf + state.b.v*state.b.i*state.b.pf)/1000;
}
function avgPF(){ return (state.r.pf+state.y.pf+state.b.pf)/3; }

/* Line-to-line voltages: ideal = phase voltage × √3, with small realistic jitter
   so RY/YB/RB don't look like a pure derived constant on the live display. */
const SQRT3 = Math.sqrt(3);
function lineVoltage(p1, p2){
  const ideal = ((p1.v + p2.v)/2) * SQRT3;
  return jitter(ideal, 0.006);
}
function lineVoltages(){
  return {
    ry: lineVoltage(state.r, state.y),
    yb: lineVoltage(state.y, state.b),
    rb: lineVoltage(state.r, state.b),
  };
}

const fmt = (n,d=1)=> Number(n).toFixed(d);

/* ---------- KPI Card Builder ---------- */
const kpiDefs = [
  { id:'kpi-rv', label:'R Voltage', unit:'V', accent:COLORS.r, get:()=>fmt(state.r.v) },
  { id:'kpi-yv', label:'Y Voltage', unit:'V', accent:COLORS.y, get:()=>fmt(state.y.v) },
  { id:'kpi-bv', label:'B Voltage', unit:'V', accent:COLORS.b, get:()=>fmt(state.b.v) },
  { id:'kpi-ryv', label:'RY Voltage', unit:'V', accent:'#FF8A65', get:()=>fmt(lineVoltages().ry) },
  { id:'kpi-ybv', label:'YB Voltage', unit:'V', accent:'#9CCC65', get:()=>fmt(lineVoltages().yb) },
  { id:'kpi-rbv', label:'RB Voltage', unit:'V', accent:'#7E9CFF', get:()=>fmt(lineVoltages().rb) },
  { id:'kpi-ri', label:'R Current', unit:'A', accent:COLORS.r, get:()=>fmt(state.r.i) },
  { id:'kpi-yi', label:'Y Current', unit:'A', accent:COLORS.y, get:()=>fmt(state.y.i) },
  { id:'kpi-bi', label:'B Current', unit:'A', accent:COLORS.b, get:()=>fmt(state.b.i) },
  { id:'kpi-tp', label:'Total Power', unit:'kW', accent:COLORS.ok, get:()=>fmt(totalPower()) },
  { id:'kpi-pf', label:'Power Factor', unit:'', accent:COLORS.ok, get:()=>fmt(avgPF(),2) },
  { id:'kpi-fr', label:'Frequency', unit:'Hz', accent:COLORS.info, get:()=>fmt(state.freq,2) },
  { id:'kpi-te', label:"Today's Energy", unit:'kWh', accent:COLORS.ok, get:()=>'412.6', static:true },
  { id:'kpi-me', label:'Monthly Energy', unit:'kWh', accent:COLORS.info, get:()=>'8,940', static:true },
  { id:'kpi-cb', label:'Current Bill', unit:'₹', accent:COLORS.y, get:()=>'68,420', static:true, prefix:true },
  { id:'kpi-pb', label:'Projected Bill', unit:'₹', accent:COLORS.y, get:()=>'1,84,950', static:true, prefix:true },
  { id:'kpi-ds', label:'Device Status', unit:'', accent:COLORS.ok, get:()=>'Online', static:true, text:true },
  { id:'kpi-cs', label:'Communication', unit:'', accent:COLORS.ok, get:()=>'Stable', static:true, text:true },
];

function iconSvg(){
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

function buildKpiGrid(){
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpiDefs.map(k => `
    <div class="kpi-card" style="--kpi-accent:${k.accent}" id="${k.id}">
      <div class="kpi-card-head">
        <span class="kpi-label">${k.label}</span>
        <span class="kpi-icon" style="color:${k.accent}">${iconSvg()}</span>
      </div>
      <div class="kpi-value">${k.text? '':( k.prefix?'₹':'')}<span class="val">${k.get()}</span>${k.unit && !k.text ? `<small>${k.unit}</small>`:''}</div>
      <div class="kpi-foot up">● Live</div>
    </div>
  `).join('');
}

function updateKpiGrid(){
  kpiDefs.forEach(k=>{
    if(k.static) return;
    const el = document.querySelector(`#${k.id} .val`);
    if(el) el.textContent = k.get();
  });
}

/* ---------- Live Monitoring Grid ---------- */
const liveDefs = [
  { label:'Voltage R', accent:COLORS.r, unit:'V', get:()=>fmt(state.r.v) },
  { label:'Voltage Y', accent:COLORS.y, unit:'V', get:()=>fmt(state.y.v) },
  { label:'Voltage B', accent:COLORS.b, unit:'V', get:()=>fmt(state.b.v) },
  { label:'Voltage RY', accent:'#FF8A65', unit:'V', get:()=>fmt(lineVoltages().ry) },
  { label:'Voltage YB', accent:'#9CCC65', unit:'V', get:()=>fmt(lineVoltages().yb) },
  { label:'Voltage RB', accent:'#7E9CFF', unit:'V', get:()=>fmt(lineVoltages().rb) },
  { label:'Current R', accent:COLORS.r, unit:'A', get:()=>fmt(state.r.i) },
  { label:'Current Y', accent:COLORS.y, unit:'A', get:()=>fmt(state.y.i) },
  { label:'Current B', accent:COLORS.b, unit:'A', get:()=>fmt(state.b.i) },
  { label:'Power', accent:COLORS.ok, unit:'kW', get:()=>fmt(totalPower()) },
  { label:'Energy', accent:COLORS.ok, unit:'kWh', get:()=>'412.6' },
  { label:'Frequency', accent:COLORS.info, unit:'Hz', get:()=>fmt(state.freq,2) },
  { label:'Power Factor', accent:COLORS.info, unit:'', get:()=>fmt(avgPF(),2) },
  { label:'Neutral Voltage', accent:'#8B98A9', unit:'V', get:()=>fmt(state.neutralV,2) },
  { label:'Earth Voltage', accent:'#8B98A9', unit:'V', get:()=>fmt(state.earthV,2) },
];

function buildLiveGrid(){
  const grid = document.getElementById('liveGrid');
  grid.innerHTML = liveDefs.map((l,i)=>`
    <div class="live-card" id="live-${i}">
      <div class="lc-label"><span class="lc-dot" style="background:${l.accent}"></span>${l.label}</div>
      <div class="lc-value" style="color:${l.accent}"><span class="val">${l.get()}</span><small> ${l.unit}</small></div>
    </div>
  `).join('');
}
function updateLiveGrid(){
  liveDefs.forEach((l,i)=>{
    const el = document.querySelector(`#live-${i} .val`);
    if(el) el.textContent = l.get();
  });
}

/* ---------- Busbar readouts ---------- */
function updateBusReadouts(){
  const g = document.getElementById('busReadouts');
  g.innerHTML = `
    <text x="870" y="34" text-anchor="end" class="bus-readout">${fmt(state.r.v)}V · ${fmt(state.r.i)}A</text>
    <text x="870" y="74" text-anchor="end" class="bus-readout">${fmt(state.y.v)}V · ${fmt(state.y.i)}A</text>
    <text x="870" y="114" text-anchor="end" class="bus-readout">${fmt(state.b.v)}V · ${fmt(state.b.i)}A</text>
  `;
  const lv = lineVoltages();
  const ry = document.getElementById('lvRY');
  const yb = document.getElementById('lvYB');
  const rb = document.getElementById('lvRB');
  if(ry) ry.textContent = fmt(lv.ry);
  if(yb) yb.textContent = fmt(lv.yb);
  if(rb) rb.textContent = fmt(lv.rb);
}

/* ---------- Phase Analysis Table ---------- */
function buildPhaseTable(){
  const tbody = document.querySelector('#phaseTable tbody');
  const rows = [
    { name:'R Phase', color:COLORS.r, d:state.r },
    { name:'Y Phase', color:COLORS.y, d:state.y },
    { name:'B Phase', color:COLORS.b, d:state.b },
  ];
  tbody.innerHTML = rows.map(r=>{
    const p = r.d.v*r.d.i*r.d.pf/1000;
    const status = r.d.pf < 0.85 ? '<span class="badge warning">PF Low</span>' : '<span class="badge ok">Normal</span>';
    return `<tr>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.color};margin-right:8px"></span>${r.name}</td>
      <td class="mono">${fmt(r.d.v)}</td>
      <td class="mono">${fmt(r.d.i)}</td>
      <td class="mono">${fmt(p,2)}</td>
      <td class="mono">${fmt(r.d.pf,2)}</td>
      <td class="mono">${fmt(2980+Math.random()*40)}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');

  const lv = lineVoltages();
  const ryEl = document.getElementById('phaseRY');
  const ybEl = document.getElementById('phaseYB');
  const rbEl = document.getElementById('phaseRB');
  if(ryEl) ryEl.textContent = fmt(lv.ry);
  if(ybEl) ybEl.textContent = fmt(lv.yb);
  if(rbEl) rbEl.textContent = fmt(lv.rb);
}

/* ---------- Alerts ---------- */
const alertDefs = [
  { type:'critical', title:'High Voltage on Y Phase', desc:'248.6V exceeded threshold of 245V', time:'2 min ago' },
  { type:'warning', title:'Power Factor Low', desc:'PF dropped to 0.81 on B Phase', time:'18 min ago' },
  { type:'warning', title:'Current Imbalance Rising', desc:'Imbalance reached 2.1%, monitor closely', time:'42 min ago' },
  { type:'info', title:'Monthly Report Ready', desc:'May 2026 energy report generated', time:'1 hr ago' },
  { type:'info', title:'Scheduled Maintenance Reminder', desc:'AMC service due in 14 days', time:'3 hr ago' },
  { type:'info', title:'Firmware Update Available', desc:'EMS-3P-001 v2.5.0 ready to install', time:'1 day ago' },
  { type:'info', title:'Device Reconnected', desc:'Communication restored after brief drop', time:'1 day ago' },
];
function alertIcon(type){
  if(type==='critical') return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" stroke="currentColor" stroke-width="1.8"/></svg>`;
  if(type==='warning') return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M12 3l9 16H3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 8h.01M12 12v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
function buildAlertList(){
  const list = document.getElementById('alertList');
  list.innerHTML = alertDefs.map(a=>`
    <div class="alert-row ${a.type}">
      <div class="alert-icon">${alertIcon(a.type)}</div>
      <div class="alert-body"><strong>${a.title}</strong><p>${a.desc}</p></div>
      <span class="alert-time">${a.time}</span>
    </div>
  `).join('');
}

/* ---------- Reports grid ---------- */
const reportDefs = [
  'Daily Report PDF','Weekly Report PDF','Monthly Report PDF','Yearly Report PDF',
  'Bill Report PDF','Energy Analysis Report','Power Quality Report','Machine Performance Report'
];
function buildReportGrid(){
  const grid = document.getElementById('reportGrid');
  grid.innerHTML = reportDefs.map(r=>`
    <div class="report-card">
      <div class="report-card-top">
        <h4>${r}</h4>
        <span class="badge info">PDF</span>
      </div>
      <p>Generated from latest available data for Machine 20.</p>
      <div class="report-card-actions">
        <button class="btn btn-ghost gen-report" data-name="${r}">Preview</button>
        <button class="btn btn-primary gen-report" data-name="${r}">Download</button>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.gen-report').forEach(btn=>{
    btn.addEventListener('click', ()=> toast(`${btn.dataset.name} generated`));
  });
}

/* ---------- Power Quality KPI grid ---------- */
const qualityDefs = [
  { label:'Voltage Unbalance', unit:'%', accent:COLORS.r, val:'1.4' },
  { label:'Current Unbalance', unit:'%', accent:COLORS.y, val:'2.1' },
  { label:'Neutral Voltage', unit:'V', accent:'#8B98A9', val:'1.2' },
  { label:'Earth Voltage', unit:'V', accent:'#8B98A9', val:'0.4' },
  { label:'THD Voltage', unit:'%', accent:COLORS.info, val:'2.8' },
  { label:'THD Current', unit:'%', accent:COLORS.info, val:'4.1' },
];
function buildQualityGrid(){
  const grid = document.getElementById('qualityGrid');
  grid.innerHTML = qualityDefs.map(q=>`
    <div class="kpi-card" style="--kpi-accent:${q.accent}">
      <div class="kpi-card-head"><span class="kpi-label">${q.label}</span></div>
      <div class="kpi-value">${q.val}<small>${q.unit}</small></div>
      <div class="kpi-foot">Within normal range</div>
    </div>
  `).join('');
}

/* ---------- Machine performance grid ---------- */
const perfDefs = [
  { label:'Machine Runtime', unit:'hrs', val:'21.4', accent:COLORS.ok },
  { label:'Machine Downtime', unit:'hrs', val:'2.6', accent:COLORS.crit },
  { label:'Efficiency', unit:'%', val:'91.2', accent:COLORS.info },
  { label:'Utilization', unit:'%', val:'89.0', accent:COLORS.info },
  { label:'Load', unit:'%', val:'76.5', accent:COLORS.y },
  { label:'Production Hours', unit:'hrs', val:'19.8', accent:COLORS.ok },
  { label:'Energy / Unit', unit:'kWh', val:'4.2', accent:COLORS.r },
  { label:'Health Score', unit:'/100', val:'92', accent:COLORS.ok },
];
function buildPerfGrid(){
  const grid = document.getElementById('perfGrid');
  grid.innerHTML = perfDefs.map(p=>`
    <div class="kpi-card" style="--kpi-accent:${p.accent}">
      <div class="kpi-card-head"><span class="kpi-label">${p.label}</span></div>
      <div class="kpi-value">${p.val}<small>${p.unit}</small></div>
    </div>
  `).join('');
}

/* ---------- Charts ---------- */
let charts = {};

function hrsLabels(n){
  return Array.from({length:n}, (_,i)=> `${String(i).padStart(2,'0')}:00`);
}
function days(n){
  const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const out=[]; const d=new Date();
  for(let i=n-1;i>=0;i--){ const dt=new Date(d); dt.setDate(d.getDate()-i); out.push(names[dt.getDay()]); }
  return out;
}
function randSeries(n, base, spread){
  return Array.from({length:n}, ()=> Math.round((base + (Math.random()*2-1)*spread)*10)/10);
}

function initCharts(){
  charts.powerTrend = new Chart(document.getElementById('chartPowerTrend'), {
    type:'line',
    data:{ labels: hrsLabels(24), datasets:[
      { label:'Power (kW)', data: randSeries(24,95,30), borderColor:COLORS.ok, backgroundColor:'rgba(0,217,163,0.08)', fill:true, tension:0.35, pointRadius:0, borderWidth:2 }
    ]},
    options: baseLineOpts()
  });

  charts.energyTrend = new Chart(document.getElementById('chartEnergyTrend'), {
    type:'bar',
    data:{ labels: days(7), datasets:[
      { label:'Energy (kWh)', data: randSeries(7,400,60), backgroundColor:COLORS.info, borderRadius:6, barThickness:24 }
    ]},
    options: baseLineOpts()
  });

  charts.lineVoltageTrend = new Chart(document.getElementById('chartLineVoltageTrend'), {
    type:'line',
    data:{ labels: hrsLabels(24), datasets:[
      { label:'RY', data: randSeries(24,400,8), borderColor:'#FF8A65', pointRadius:0, borderWidth:2, tension:0.35 },
      { label:'YB', data: randSeries(24,399,8), borderColor:'#9CCC65', pointRadius:0, borderWidth:2, tension:0.35 },
      { label:'RB', data: randSeries(24,402,8), borderColor:'#7E9CFF', pointRadius:0, borderWidth:2, tension:0.35 },
    ]},
    options: { ...baseLineOpts(), scales:{ x:gridOpt(), y:{...gridOpt(), suggestedMin:380, suggestedMax:420} } }
  });

  charts.dashPfTrend = new Chart(document.getElementById('chartDashPfTrend'), {
    type:'line',
    data:{ labels: hrsLabels(24), datasets:[
      { label:'Avg Power Factor', data: randSeries(24,0.93,0.05), borderColor:COLORS.ok, backgroundColor:'rgba(0,217,163,0.08)', fill:true, pointRadius:0, borderWidth:2, tension:0.35 }
    ]},
    options: { ...baseLineOpts(), scales:{ x:gridOpt(), y:{...gridOpt(), min:0.6, max:1} } }
  });

  charts.combinedVoltage = new Chart(document.getElementById('chartCombinedVoltage'), {
    type:'line',
    data:{
      labels: Array(30).fill(''),
      datasets:[
        { label:'R', data: Array(30).fill(231), borderColor:COLORS.r, backgroundColor:'rgba(255,84,112,0.10)', fill:false, pointRadius:0, borderWidth:2, tension:0.35 },
        { label:'Y', data: Array(30).fill(229), borderColor:COLORS.y, backgroundColor:'rgba(255,176,32,0.10)', fill:false, pointRadius:0, borderWidth:2, tension:0.35 },
        { label:'B', data: Array(30).fill(233), borderColor:COLORS.b, backgroundColor:'rgba(61,155,255,0.10)', fill:false, pointRadius:0, borderWidth:2, tension:0.35 },
        { label:'RY', data: Array(30).fill(400), borderColor:'#FF8A65', backgroundColor:'rgba(255,138,101,0.08)', fill:false, pointRadius:0, borderWidth:2, tension:0.35, yAxisID:'yLine' },
        { label:'YB', data: Array(30).fill(399), borderColor:'#9CCC65', backgroundColor:'rgba(156,204,101,0.08)', fill:false, pointRadius:0, borderWidth:2, tension:0.35, yAxisID:'yLine' },
        { label:'RB', data: Array(30).fill(402), borderColor:'#7E9CFF', backgroundColor:'rgba(126,156,255,0.08)', fill:false, pointRadius:0, borderWidth:2, tension:0.35, yAxisID:'yLine' },
        { label:'240V Phase Ref', data: Array(30).fill(240), borderColor:'rgba(232,237,244,0.35)', borderDash:[6,5], borderWidth:1.5, pointRadius:0, fill:false, tension:0 },
        { label:'410V Line Ref', data: Array(30).fill(410), borderColor:'rgba(232,237,244,0.35)', borderDash:[6,5], borderWidth:1.5, pointRadius:0, fill:false, tension:0, yAxisID:'yLine' },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false, animation:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{ legend:{ display:false }, tooltip:{ backgroundColor:'#0F1722', borderColor:'rgba(140,160,190,0.2)', borderWidth:1, padding:10, titleColor:'#E8EDF4', bodyColor:'#8B98A9' } },
      scales:{
        x:{ display:false },
        y:{ type:'linear', ...gridOpt(), position:'left', suggestedMin:215, suggestedMax:250, title:{ display:true, text:'Phase (V)', color:'#5B6679', font:{ size:10.5 } } },
        yLine:{ type:'linear', ...gridOpt(), position:'right', suggestedMin:385, suggestedMax:425, grid:{ drawOnChartArea:false }, title:{ display:true, text:'Line (V)', color:'#5B6679', font:{ size:10.5 } } },
      }
    }
  });

  charts.liveVoltage = new Chart(document.getElementById('chartLiveVoltage'), {
    type:'line',
    data:{ labels: Array(30).fill(''), datasets:[
      { label:'R', data: Array(30).fill(231), borderColor:COLORS.r, pointRadius:0, borderWidth:2, tension:0.3 },
      { label:'Y', data: Array(30).fill(229), borderColor:COLORS.y, pointRadius:0, borderWidth:2, tension:0.3 },
      { label:'B', data: Array(30).fill(233), borderColor:COLORS.b, pointRadius:0, borderWidth:2, tension:0.3 },
    ]},
    options: { ...baseLineOpts(), animation:false, scales:{ x:{display:false}, y:{...gridOpt(), suggestedMin:215, suggestedMax:250} } }
  });

  charts.liveCurrent = new Chart(document.getElementById('chartLiveCurrent'), {
    type:'line',
    data:{ labels: Array(30).fill(''), datasets:[
      { label:'R', data: Array(30).fill(42), borderColor:COLORS.r, pointRadius:0, borderWidth:2, tension:0.3 },
      { label:'Y', data: Array(30).fill(40), borderColor:COLORS.y, pointRadius:0, borderWidth:2, tension:0.3 },
      { label:'B', data: Array(30).fill(45), borderColor:COLORS.b, pointRadius:0, borderWidth:2, tension:0.3 },
    ]},
    options: { ...baseLineOpts(), animation:false, scales:{ x:{display:false}, y:{...gridOpt(), suggestedMin:25, suggestedMax:60} } }
  });

  charts.energyAnalysis = new Chart(document.getElementById('chartEnergyAnalysis'), {
    type:'bar',
    data:{ labels: days(7), datasets:[
      { label:'Energy (kWh)', data: randSeries(7,420,70), backgroundColor:COLORS.ok, borderRadius:6 }
    ]},
    options: baseLineOpts()
  });

  charts.phasePower = new Chart(document.getElementById('chartPhasePower'), {
    type:'bar',
    data:{ labels:['R Phase','Y Phase','B Phase'], datasets:[
      { label:'Power (kW)', data:[
          state.r.v*state.r.i*state.r.pf/1000,
          state.y.v*state.y.i*state.y.pf/1000,
          state.b.v*state.b.i*state.b.pf/1000
        ], backgroundColor:[COLORS.r, COLORS.y, COLORS.b], borderRadius:8, barThickness:48 }
    ]},
    options: { ...baseLineOpts(), plugins:{ ...baseLineOpts().plugins, legend:{display:false} } }
  });

  charts.imbalanceTrend = new Chart(document.getElementById('chartImbalanceTrend'), {
    type:'line',
    data:{ labels: hrsLabels(12).map((_,i)=>`${i*2}:00`), datasets:[
      { label:'Voltage Imbalance %', data: randSeries(12,1.4,0.6), borderColor:COLORS.y, pointRadius:0, borderWidth:2, tension:0.35 },
      { label:'Current Imbalance %', data: randSeries(12,2.1,0.8), borderColor:COLORS.b, pointRadius:0, borderWidth:2, tension:0.35 },
    ]},
    options: { ...baseLineOpts(), scales:{ x:gridOpt(), y:{...gridOpt(), suggestedMin:0, suggestedMax:5} } }
  });

  charts.billForecast = new Chart(document.getElementById('chartBillForecast'), {
    type:'line',
    data:{ labels:['Jan','Feb','Mar','Apr','May','Jun (proj)'], datasets:[
      { label:'Bill (₹)', data:[156000,162000,171000,168000,176000,184950], borderColor:COLORS.y, backgroundColor:'rgba(255,176,32,0.08)', fill:true, tension:0.3, pointRadius:3, pointBackgroundColor:COLORS.y, borderWidth:2 }
    ]},
    options: baseLineOpts()
  });

  charts.billCompare = new Chart(document.getElementById('chartBillCompare'), {
    type:'bar',
    data:{ labels:['Energy','Demand','Fixed','Fuel Adj.','GST'], datasets:[
      { label:'Last Month', data:[132000,17200,4500,5800,12480], backgroundColor:'rgba(140,160,190,0.35)', borderRadius:6 },
      { label:'This Month', data:[142300,18600,4500,6200,13350], backgroundColor:COLORS.ok, borderRadius:6 },
    ]},
    options: baseLineOpts()
  });

  charts.pfTrend = new Chart(document.getElementById('chartPfTrend'), {
    type:'line',
    data:{ labels: hrsLabels(12).map((_,i)=>`${i*2}:00`), datasets:[
      { label:'PF', data: randSeries(12,0.92,0.05), borderColor:COLORS.ok, pointRadius:0, borderWidth:2, tension:0.35, backgroundColor:'rgba(0,217,163,0.08)', fill:true }
    ]},
    options: { ...baseLineOpts(), scales:{ x:gridOpt(), y:{...gridOpt(), min:0.6, max:1} } }
  });

  charts.freqStability = new Chart(document.getElementById('chartFreqStability'), {
    type:'line',
    data:{ labels: hrsLabels(12).map((_,i)=>`${i*2}:00`), datasets:[
      { label:'Frequency', data: randSeries(12,50,0.15), borderColor:COLORS.b, pointRadius:0, borderWidth:2, tension:0.35 }
    ]},
    options: { ...baseLineOpts(), scales:{ x:gridOpt(), y:{...gridOpt(), min:49.5, max:50.5} } }
  });

  charts.runtime = new Chart(document.getElementById('chartRuntime'), {
    type:'bar',
    data:{ labels: days(7), datasets:[
      { label:'Runtime (hrs)', data: randSeries(7,21,2), backgroundColor:COLORS.ok, borderRadius:6, stack:'a' },
      { label:'Downtime (hrs)', data: randSeries(7,2.5,1), backgroundColor:COLORS.crit, borderRadius:6, stack:'a' },
    ]},
    options: baseLineOpts()
  });
}

function updateLiveCharts(){
  [charts.liveVoltage, charts.liveCurrent].forEach(c=>{
    if(!c) return;
  });
  const lv = charts.liveVoltage, lc = charts.liveCurrent;
  if(lv){
    lv.data.datasets[0].data.push(state.r.v); lv.data.datasets[0].data.shift();
    lv.data.datasets[1].data.push(state.y.v); lv.data.datasets[1].data.shift();
    lv.data.datasets[2].data.push(state.b.v); lv.data.datasets[2].data.shift();
    lv.update('none');
  }
  if(lc){
    lc.data.datasets[0].data.push(state.r.i); lc.data.datasets[0].data.shift();
    lc.data.datasets[1].data.push(state.y.i); lc.data.datasets[1].data.shift();
    lc.data.datasets[2].data.push(state.b.i); lc.data.datasets[2].data.shift();
    lc.update('none');
  }

  if(charts.phasePower){
    charts.phasePower.data.datasets[0].data = [
      state.r.v*state.r.i*state.r.pf/1000,
      state.y.v*state.y.i*state.y.pf/1000,
      state.b.v*state.b.i*state.b.pf/1000
    ];
    charts.phasePower.update('none');
  }

  if(charts.combinedVoltage){
    const cv = charts.combinedVoltage;
    const lv = lineVoltages();
    const push = (i, val)=>{ cv.data.datasets[i].data.push(val); cv.data.datasets[i].data.shift(); };
    push(0, state.r.v);
    push(1, state.y.v);
    push(2, state.b.v);
    push(3, lv.ry);
    push(4, lv.yb);
    push(5, lv.rb);
    // reference line datasets (6, 7) stay flat — no push needed, but keep array length in sync
    push(6, 240);
    push(7, 410);
    cv.update('none');
  }
}

/* ---------- Energy range select ---------- */
const energyRangeData = {
  hourly: { labels: hrsLabels(24), data: randSeries(24,18,6), tag:'Hourly · kWh' },
  daily: { labels: days(7), data: randSeries(7,420,70), tag:'Daily · kWh' },
  weekly: { labels:['W1','W2','W3','W4'], data: randSeries(4,2800,300), tag:'Weekly · kWh' },
  monthly: { labels:['Jan','Feb','Mar','Apr','May','Jun'], data: randSeries(6,12000,1500), tag:'Monthly · kWh' },
  yearly: { labels:['2021','2022','2023','2024','2025','2026'], data: randSeries(6,140000,15000), tag:'Yearly · kWh' },
};
function bindEnergyRange(){
  const sel = document.getElementById('energyRangeSelect');
  sel.addEventListener('change', ()=>{
    const d = energyRangeData[sel.value];
    charts.energyAnalysis.data.labels = d.labels;
    charts.energyAnalysis.data.datasets[0].data = d.data;
    charts.energyAnalysis.update();
    document.getElementById('energyRangeTag').textContent = d.tag;
  });
}

/* ---------- Navigation ---------- */
function navigate(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if(target) target.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if(navBtn) navBtn.classList.add('active');
  closeSidebarMobile();
  closeDropdowns();
  window.scrollTo({top:0, behavior:'smooth'});
}

function bindNav(){
  document.querySelectorAll('.nav-item[data-page]').forEach(btn=>{
    btn.addEventListener('click', ()=> navigate(btn.dataset.page));
  });
  document.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=> navigate(btn.dataset.nav));
  });
}

/* ---------- Sidebar mobile toggle ---------- */
function closeSidebarMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
function bindSidebarToggle(){
  const menuBtn = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  menuBtn.addEventListener('click', ()=>{
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay.addEventListener('click', closeSidebarMobile);
}

/* ---------- Dropdowns ---------- */
function closeDropdowns(){
  document.getElementById('notifPanel').classList.remove('open');
  document.getElementById('profilePanel').classList.remove('open');
}
function bindDropdowns(){
  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  const profileBtn = document.getElementById('profileBtn');
  const profilePanel = document.getElementById('profilePanel');

  notifBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    profilePanel.classList.remove('open');
    notifPanel.classList.toggle('open');
  });
  profileBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    notifPanel.classList.remove('open');
    profilePanel.classList.toggle('open');
  });
  document.addEventListener('click', closeDropdowns);
  notifPanel.addEventListener('click', e=>e.stopPropagation());
  profilePanel.addEventListener('click', e=>e.stopPropagation());

  document.getElementById('clearNotifs').addEventListener('click', ()=>{
    notifPanel.querySelectorAll('.notif-item').forEach(n=>n.remove());
    document.getElementById('notifBadge').style.display = 'none';
    toast('Notifications cleared');
  });
}

/* ---------- Date/time ---------- */
function updateDateTime(){
  const now = new Date();
  document.getElementById('liveDate').textContent = now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  document.getElementById('liveTime').textContent = now.toLocaleTimeString('en-IN', { hour12:false });
}

/* ---------- Toast ---------- */
function toast(msg){
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

/* ---------- Exports ---------- */
function buildExportRows(){
  const lv = lineVoltages();
  return [
    ['Parameter','R Phase','Y Phase','B Phase','Unit'],
    ['Voltage', fmt(state.r.v), fmt(state.y.v), fmt(state.b.v), 'V'],
    ['Current', fmt(state.r.i), fmt(state.y.i), fmt(state.b.i), 'A'],
    ['Power Factor', fmt(state.r.pf,2), fmt(state.y.pf,2), fmt(state.b.pf,2), ''],
    ['Line Voltage RY', fmt(lv.ry), '', '', 'V'],
    ['Line Voltage YB', fmt(lv.yb), '', '', 'V'],
    ['Line Voltage RB', fmt(lv.rb), '', '', 'V'],
    ['Total Power', fmt(totalPower()), '', '', 'kW'],
    ['Frequency', fmt(state.freq,2), '', '', 'Hz'],
    ["Today's Energy", '412.6', '', '', 'kWh'],
    ['Current Bill', '68420', '', '', 'INR'],
  ];
}

function exportPdf(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFillColor(10,14,20);
  doc.rect(0,0,210,297,'F');
  doc.setTextColor(0,217,163);
  doc.setFontSize(18);
  doc.text('Smart Energy Monitor', 14, 20);
  doc.setTextColor(140,160,190);
  doc.setFontSize(10);
  doc.text('Customer: Jay Jay Mill   |   Machine: Machine 20   |   Device: EMS-3P-001', 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 34);

  let y = 46;
  doc.setTextColor(232,237,244);
  doc.setFontSize(12);
  doc.text('Live Readings Snapshot', 14, y); y+=8;
  doc.setFontSize(9.5);
  buildExportRows().forEach(row=>{
    doc.text(row.join('   |   '), 14, y);
    y += 6;
  });

  y += 6;
  doc.setFontSize(12);
  doc.text('Bill Summary', 14, y); y+=8;
  doc.setFontSize(9.5);
  ['Current Bill: Rs 68,420','Projected Monthly: Rs 1,84,950','Projected Annual: Rs 22.2L'].forEach(line=>{
    doc.text(line, 14, y); y+=6;
  });

  doc.save('Smart_Energy_Monitor_Report.pdf');
  toast('PDF report downloaded');
}

function exportExcel(){
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(buildExportRows());
  XLSX.utils.book_append_sheet(wb, ws, 'Live Data');

  const billRows = [
    ['Item','Amount (INR)'],
    ['Energy Charges',142300],['Demand Charge',18600],['Fixed Charge',4500],
    ['Fuel Adjustment',6200],['GST',13350],['Total',184950]
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(billRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Bill Analysis');

  XLSX.writeFile(wb, 'Smart_Energy_Monitor_Data.xlsx');
  toast('Excel file downloaded');
}

function exportCsv(){
  const rows = buildExportRows();
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Smart_Energy_Monitor_Data.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('CSV file downloaded');
}

function bindExports(){
  document.getElementById('exportPdfTop').addEventListener('click', exportPdf);
  document.getElementById('exportBillPdf').addEventListener('click', exportPdf);
  document.getElementById('dlPdf').addEventListener('click', exportPdf);
  document.getElementById('dlExcel').addEventListener('click', exportExcel);
  document.getElementById('dlCsv').addEventListener('click', exportCsv);
  document.getElementById('emailReport').addEventListener('click', ()=> toast('Report emailed to registered address'));
  document.getElementById('waReport').addEventListener('click', ()=> toast('Report sent via WhatsApp'));
  document.getElementById('printDash').addEventListener('click', ()=> window.print());
  document.getElementById('raiseTicketBtn').addEventListener('click', ()=> toast('Support ticket #SE-4821 raised'));
  document.getElementById('refreshBtn').addEventListener('click', ()=>{
    tick(); updateKpiGrid(); updateLiveGrid(); buildPhaseTable(); updateBusReadouts();
    toast('Data refreshed');
  });
}

/* ---------- Init ---------- */
/* ---------- Live Chat Widget ---------- */
const chatAutoReplies = {
  'device offline': "Sorry to hear that. Can you confirm the power LED on EMS-3P-001 is lit? If yes, try toggling the device's network switch — that resolves most offline cases within a minute.",
  'billing question': "Happy to help with billing. Your current MTD bill is ₹68,420 with a projected month-end total of ₹1,84,950. Is there a specific charge you'd like me to break down?",
  'raise a ticket': "I've started a ticket for you — reference #SE-4821. Could you briefly describe the issue so I can route it to the right engineer?",
};
function genericReply(){
  const replies = [
    "Got it — let me check that for you, one moment.",
    "Thanks for the details. I'm looking into this now.",
    "I can help with that. Could you share a bit more detail?",
    "Noted. I'll flag this to our engineering team and follow up shortly.",
  ];
  return replies[Math.floor(Math.random()*replies.length)];
}
function nowTime(){
  return new Date().toLocaleTimeString('en-IN', { hour:'numeric', minute:'2-digit', hour12:true });
}
function appendChatMsg(role, text){
  const wrap = document.getElementById('chatMessages');
  const row = document.createElement('div');
  row.className = `chat-msg ${role}`;
  if(role === 'agent'){
    row.innerHTML = `<span class="chat-agent-avatar sm">SE</span><div class="chat-bubble">${text}<span class="chat-time">${nowTime()}</span></div>`;
  } else {
    row.innerHTML = `<div class="chat-bubble">${text}<span class="chat-time">${nowTime()}</span></div>`;
  }
  wrap.appendChild(row);
  wrap.scrollTop = wrap.scrollHeight;
}
function showTyping(){
  const wrap = document.getElementById('chatMessages');
  const row = document.createElement('div');
  row.className = 'chat-typing';
  row.id = 'chatTypingIndicator';
  row.innerHTML = `<span class="chat-agent-avatar sm">SE</span><div class="chat-typing-bubble"><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span></div>`;
  wrap.appendChild(row);
  wrap.scrollTop = wrap.scrollHeight;
}
function hideTyping(){
  const el = document.getElementById('chatTypingIndicator');
  if(el) el.remove();
}
function sendChatMessage(text){
  if(!text.trim()) return;
  appendChatMsg('user', escapeHtml(text));
  const qr = document.getElementById('chatQuickReplies');
  if(qr) qr.remove();
  showTyping();
  const key = text.trim().toLowerCase();
  const reply = chatAutoReplies[key] || genericReply();
  setTimeout(()=>{
    hideTyping();
    appendChatMsg('agent', reply);
  }, 1100 + Math.random()*700);
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function openChat(){
  document.getElementById('chatPanel').classList.add('open');
  document.getElementById('chatFab').classList.add('open');
  document.getElementById('chatFabBadge').style.display = 'none';
  setTimeout(()=> document.getElementById('chatInput').focus(), 200);
}
function closeChat(){
  document.getElementById('chatPanel').classList.remove('open');
  document.getElementById('chatFab').classList.remove('open');
}
function bindChatWidget(){
  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatCloseBtn');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const supportTrigger = document.getElementById('openLiveChatBtn');

  fab.addEventListener('click', ()=>{
    panel.classList.contains('open') ? closeChat() : openChat();
  });
  closeBtn.addEventListener('click', closeChat);
  if(supportTrigger) supportTrigger.addEventListener('click', openChat);

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const val = input.value;
    input.value = '';
    sendChatMessage(val);
  });

  document.querySelectorAll('.chat-quick-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> sendChatMessage(btn.dataset.msg));
  });
}

function init(){
  buildKpiGrid();
  buildLiveGrid();
  buildPhaseTable();
  buildAlertList();
  buildReportGrid();
  buildQualityGrid();
  buildPerfGrid();
  updateBusReadouts();
  initCharts();
  bindEnergyRange();
  bindNav();
  bindSidebarToggle();
  bindDropdowns();
  bindExports();
  bindChatWidget();
  updateDateTime();

  setInterval(updateDateTime, 1000);
  setInterval(()=>{
    tick();
    updateKpiGrid();
    updateLiveGrid();
    updateBusReadouts();
    updateLiveCharts();
    if(Math.random() < 0.15) buildPhaseTable();
  }, 2000);
}

document.addEventListener('DOMContentLoaded', init);

})();
