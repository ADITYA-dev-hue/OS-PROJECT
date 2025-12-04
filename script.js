// UI helpers
function $(sel){ return document.querySelector(sel); }
function setLastUpdate(){ $('#lastUpdate').textContent = new Date().toLocaleTimeString(); }

// Gauge class
class Gauge {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.value = 0;
  }
  draw(){
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const cx = W/2, cy = H/2, r = Math.min(W,H)*0.38;
    ctx.clearRect(0,0,W,H);
    ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,0,false); ctx.stroke();
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    const grad = ctx.createLinearGradient(cx-r,cy,cx+r,cy);
    if(isLight){ grad.addColorStop(0,'#10b981'); grad.addColorStop(0.5,'#f59e0b'); grad.addColorStop(1,'#fb923c'); }
    else { grad.addColorStop(0,'#06b6d4'); grad.addColorStop(1,'#34d399'); }
    ctx.strokeStyle = grad;
    ctx.beginPath();
    const start = Math.PI, end = Math.PI + Math.PI*(this.value/100);
    ctx.arc(cx,cy,r,start,end,false); ctx.stroke();
    const angle = Math.PI + Math.PI*(this.value/100);
    const nx = cx + Math.cos(angle)*(r-8), ny = cy + Math.sin(angle)*(r-8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = isLight ? '#000' : '#fff'; // needle color change requested
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(nx,ny); ctx.stroke();
    ctx.fillStyle = isLight ? '#000' : '#fff';
    ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
  }
  setValue(v){ this.value = Math.max(0,Math.min(100,v)); this.draw(); }
}

// Chart helpers
function createChartData(maxPoints=60){ const data=[]; return { push(v){ data.push(v); if(data.length>maxPoints) data.shift(); return data.slice(); }, get(){ return data.slice(); }, maxPoints }; }

// DOM elements & canvas setup
window.addEventListener('DOMContentLoaded', ()=>{
  const cpuCanvas = $('#cpuGauge'), tc = $('#throughputChart');
  const cpuGauge = new Gauge(cpuCanvas);
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const w = cpuCanvas.clientWidth || 240, h = cpuCanvas.clientHeight || 240;
    cpuCanvas.width = Math.max(200, w * dpr); cpuCanvas.height = Math.max(200, h * dpr);
    cpuGauge.ctx.setTransform(dpr,0,0,dpr,0,0);
    // throughput
    const parent = tc.parentElement || document.body;
    tc.width = parent.clientWidth; tc.height = 180;
  }
  resize(); window.addEventListener('resize', resize);
  const tcCtx = tc.getContext('2d');
  const chart = createChartData(60);

  // throughput overlay
  const throughputWrap = tc.parentElement || document.body;
  const overlay = document.createElement('div');
  overlay.style.position='absolute'; overlay.style.right='12px'; overlay.style.top='8px'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.gap='8px'; overlay.style.zIndex='20';
  const valueBadge = document.createElement('div'); valueBadge.id='throughputValue'; valueBadge.style.background='rgba(0,0,0,0.55)'; valueBadge.style.color='#fff'; valueBadge.style.padding='6px 10px'; valueBadge.style.borderRadius='8px'; valueBadge.style.fontWeight='700'; valueBadge.textContent='TP: --';
  const percentBadge = document.createElement('div'); percentBadge.id='throughputPercent'; percentBadge.style.background='linear-gradient(90deg,#10b981,#fb923c)'; percentBadge.style.color='#fff'; percentBadge.style.padding='6px 10px'; percentBadge.style.borderRadius='8px'; percentBadge.style.fontWeight='700'; percentBadge.textContent='%: --';
  const modeBtn = document.createElement('button'); modeBtn.id='throughputToggleMode'; modeBtn.textContent='Show %'; modeBtn.style.padding='6px 8px'; modeBtn.style.border='none'; modeBtn.style.borderRadius='6px'; modeBtn.style.cursor='pointer'; modeBtn.style.background='#2874f0'; modeBtn.style.color='#fff'; modeBtn.style.fontWeight='600';
  overlay.appendChild(valueBadge); overlay.appendChild(percentBadge); overlay.appendChild(modeBtn);
  if (getComputedStyle(throughputWrap).position === 'static') throughputWrap.style.position = 'relative';
  throughputWrap.appendChild(overlay);
  let showPercent = false; percentBadge.style.display = 'none';
  modeBtn.addEventListener('click', ()=>{ showPercent = !showPercent; percentBadge.style.display = showPercent ? 'block' : 'none'; valueBadge.style.display = showPercent ? 'none' : 'block'; modeBtn.textContent = showPercent ? 'Show Value' : 'Show %'; });

  function animateNumber(el, from, to, suffix='', duration=300){
    const start = performance.now();
    function step(now){ const t = Math.min(1,(now-start)/duration); const val = Math.round(from + (to-from)*t); el.textContent = val + suffix; if(t<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  // render helpers
  function renderProcesses(procs){
    const tbody = $('#processBody'); tbody.innerHTML = '';
    (procs||[]).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.name||'-'}</td><td>${p.cpu!==undefined?p.cpu:'-'}</td><td>${p.mem||'-'}</td><td>${p.status||'-'}</td>`;
      tbody.appendChild(tr);
    });
  }
  function addAlert(msg, level='info'){
    const ul = $('#alertsList'); if(!ul) return;
    const li = document.createElement('li'); li.textContent = msg; li.style.borderLeft = `3px solid ${level==='warning'? '#f59e0b' : '#4c8bf5'}`; ul.prepend(li);
    setTimeout(()=>li.remove(), 8000);
  }

  function drawChart(data){
    const W = tc.width, H = tc.height;
    tcCtx.clearRect(0,0,W,H);
    tcCtx.lineWidth = 1; tcCtx.strokeStyle='rgba(255,255,255,0.12)'; tcCtx.beginPath(); tcCtx.moveTo(0,H-20); tcCtx.lineTo(W,H-20); tcCtx.stroke();
    const maxY = Math.max(10, Math.max(...data, 100));
    const maxX = Math.max(1, data.length);
    const paddingLeft = 8, paddingRight = 8;
    const chartW = W - paddingLeft - paddingRight, chartH = H - 28;
    tcCtx.lineWidth = 2;
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    const gradient = tcCtx.createLinearGradient(0,0,0,H);
    if (isLight){ gradient.addColorStop(0,'rgba(16,185,129,0.95)'); gradient.addColorStop(0.5,'rgba(251,146,60,0.95)'); gradient.addColorStop(1,'rgba(245,158,11,0.95)'); }
    else { gradient.addColorStop(0,'#22d3ee'); gradient.addColorStop(1,'#4c8bf5'); }
    tcCtx.strokeStyle = gradient;
    tcCtx.beginPath();
    data.forEach((v,i)=>{
      const x = paddingLeft + (i/(maxX-1 || 1))*chartW;
      const y = H - 20 - (v / maxY) * chartH;
      if(i===0) tcCtx.moveTo(x,y); else tcCtx.lineTo(x,y);
    });
    tcCtx.stroke();
    // fill
    if (data.length){
      tcCtx.globalAlpha = 0.08; tcCtx.fillStyle = isLight ? '#10b981' : '#22d3ee';
      tcCtx.beginPath();
      data.forEach((v,i)=>{
        const x = paddingLeft + (i/(maxX-1 || 1))*chartW;
        const y = H - 20 - (v / maxY) * chartH;
        if(i===0) tcCtx.moveTo(x,y); else tcCtx.lineTo(x,y);
      });
      tcCtx.lineTo(W-paddingRight,H-20); tcCtx.lineTo(paddingLeft,H-20); tcCtx.closePath(); tcCtx.fill(); tcCtx.globalAlpha = 1;
    }
    // grid
    tcCtx.strokeStyle = 'rgba(255,255,255,0.06)'; tcCtx.lineWidth = 1;
    for(let g=0; g<=4; g++){ const y = 20 + (g/4)*(H-28); tcCtx.beginPath(); tcCtx.moveTo(0,y); tcCtx.lineTo(W,y); tcCtx.stroke(); }
  }

  // system metric updaters
  function updateSystemMetrics(raw){
    if(!raw){
      $('#gpuUsageValue').textContent='N/A';
      $('#gpuMemValue').textContent='N/A';
      $('#memUsedValue').textContent='N/A';
      $('#memPercentValue').textContent='N/A';
      $('#cpuTempValue').textContent='N/A';
      return;
    }

    const g = raw.gpuInfo || raw.system?.gpu || raw.system;
    const mem = raw.system?.mem || raw.system?.memory || raw.cpuInfo?.mem || null;

    // GPU utilization (percent)
    const gpuUtil = g?.utilization ?? g?.utilizationGpu ?? g?.utilizationPercent ?? g?.utilization?.gpu;
    $('#gpuUsageValue').textContent = (gpuUtil!==undefined && gpuUtil!==null) ? gpuUtil + ' %' : 'N/A';

    // GPU memory - normalize and display in GB
    let gUsedGB, gTotalGB;
    if (g) {
      if (g.memoryUsedMB !== undefined || g.memoryTotalMB !== undefined) {
        // values in MB
        const usedMB = g.memoryUsedMB ?? (g.memoryUsed ? Math.round(g.memoryUsed/1024/1024) : undefined);
        const totalMB = g.memoryTotalMB ?? (g.memoryTotal ? Math.round(g.memoryTotal/1024/1024) : undefined);
        if (usedMB !== undefined) gUsedGB = usedMB / 1024;
        if (totalMB !== undefined) gTotalGB = totalMB / 1024;
      } else if (g.memoryUsed !== undefined || g.memoryTotal !== undefined) {
        // values in bytes
        const usedBytes = g.memoryUsed ?? 0;
        const totalBytes = g.memoryTotal ?? 0;
        gUsedGB = usedBytes / (1024 ** 3);
        gTotalGB = totalBytes / (1024 ** 3);
      }
    }

    if (gUsedGB !== undefined && gTotalGB !== undefined) {
      $('#gpuMemValue').textContent = `${gUsedGB.toFixed(2)} / ${gTotalGB.toFixed(2)} GB`;
    } else if (gUsedGB !== undefined) {
      $('#gpuMemValue').textContent = `${gUsedGB.toFixed(2)} GB`;
    } else {
      $('#gpuMemValue').textContent = 'N/A';
    }

    // Show Memory in GB (handle bytes or MB input)
    if (mem && (mem.total !== undefined)) {
      let totalBytes = undefined, usedBytes = undefined;
      const t = Number(mem.total);
      const u = Number(mem.used ?? mem.active ?? 0);

      // Heuristic: if total looks like bytes (>= 1GB), use as bytes.
      if (t >= 1024 * 1024 * 1024) {
        totalBytes = t;
        usedBytes = u;
      } else if (t >= 1024) {
        // likely MB -> convert to bytes
        totalBytes = t * 1024 * 1024;
        usedBytes = u * 1024 * 1024;
      } else {
        // fallback: treat as bytes if tiny numbers unlikely
        totalBytes = t;
        usedBytes = u;
      }

      if (totalBytes && !Number.isNaN(totalBytes)) {
        const totalGB = totalBytes / (1024 ** 3);
        const usedGB = (usedBytes || 0) / (1024 ** 3);
        $('#memUsedValue').textContent = `${usedGB.toFixed(2)} / ${totalGB.toFixed(2)} GB`;
        $('#memPercentValue').textContent = Math.round((usedGB / Math.max(0.000001, totalGB)) * 100) + ' %';
      } else {
        $('#memUsedValue').textContent = 'N/A';
        $('#memPercentValue').textContent = 'N/A';
      }
    } else {
      $('#memUsedValue').textContent = 'N/A';
      $('#memPercentValue').textContent = 'N/A';
    }

    const cpuTemp = raw.cpuInfo?.temp ?? raw.system?.cpuTemp ?? raw.cpuInfo?.temperature;
    $('#cpuTempValue').textContent = (cpuTemp!==undefined && cpuTemp!==null) ? cpuTemp + ' °C' : 'N/A';
  }

  // cpu/gpu details (for info card if needed)
  function updateCpuInfo(info, cpuVal){
    if(!info && cpuVal===undefined){ $('#cpuCaption').textContent = 'N/A'; return; }
    $('#cpuCaption').textContent = Math.round(cpuVal ?? (info?.loadPercent ?? 0)) + '%';
    // optional detailed fields in index.html can be updated here if added
  }

  // start connectivity & theme handling
  const statusChip = $('#statusChip');
  async function ping(){
    if (typeof navigator !== 'undefined' && !navigator.onLine){ setStatus(false); return; }
    try{
      // try HEAD to METRICS_URL or same origin
      const url = window.METRICS_URL || location.pathname;
      const res = await fetch(url + '?_=' + Date.now(), { method:'HEAD', cache:'no-store' });
      setStatus(res.ok);
    }catch(e){
      // fallback image ping
      try{
        await new Promise(resolve => { const img = new Image(); img.onload = ()=>resolve(true); img.onerror = ()=>resolve(false); img.src = (window.METRICS_URL || location.origin + '/favicon.ico') + '?_=' + Date.now(); });
        setStatus(true);
      }catch(er){ setStatus(false); }
    }
  }
  function setStatus(online){
    statusChip.classList.remove('online','offline','stopped');
    statusChip.classList.add(online ? 'online' : 'offline');
    statusChip.textContent = `Status: ${online ? 'Online' : 'Offline'}`;
    $('#lastUpdate').textContent = new Date().toLocaleTimeString();
  }
  window.addEventListener('online', ()=>{ ping(); });
  window.addEventListener('offline', ()=>{ setStatus(false); });
  setInterval(ping, 5000); ping();

  // theme toggle
  const themeToggle = $('#themeToggle'), themeName = $('#themeName');
  const saved = localStorage.getItem('rtpm_theme');
  const initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function applyTheme(t){ document.documentElement.setAttribute('data-theme', t==='dark' ? 'dark' : ''); themeToggle.textContent = t==='dark' ? 'Light Mode' : 'Dark Mode'; if(themeName) themeName.textContent = t==='dark' ? 'Dark' : 'Light'; localStorage.setItem('rtpm_theme', t); }
  applyTheme(initial);
  themeToggle.addEventListener('click', ()=> applyTheme(document.documentElement.getAttribute('data-theme')==='dark' ? 'light' : 'dark'));

  // data handling
  const unsubscribe = dataService.subscribe(payload=>{
    if (!payload){ setStatus(false); return; }
    setStatus(true);
    const cpuVal = payload.cpu ?? 0;
    cpuGauge.setValue(cpuVal);
    updateCpuInfo(payload.cpuInfo, cpuVal);
    updateSystemMetrics(payload);
    renderProcesses(payload.processes);
    // throughput chart
    const tval = payload.throughput ?? 0;
    chart.push(tval);
    drawChart(chart.get());
    // overlay badges
    const prevVal = parseInt(valueBadge.textContent.replace(/[^\d]/g,'')) || 0;
    animateNumber(valueBadge, prevVal, tval, ' TP', 300);
    const observedMax = Math.max(100,120, ...chart.get());
    const scale = Math.max(observedMax*1.1, 120);
    const pct = Math.min(100, Math.round((tval/scale)*100));
    const prevPct = parseInt(percentBadge.textContent.replace(/[^\d]/g,'')) || 0;
    animateNumber(percentBadge, prevPct, pct, '%', 300);
    // alerts
    if (cpuVal > 85) addAlert(`High CPU: ${cpuVal.toFixed(1)}%`, 'warning');
    setLastUpdate();
  });

  // start/stop service button
  let serviceRunning = true;
  $('#toggleService')?.addEventListener('click', ()=>{
    serviceRunning = !serviceRunning;
    if (!serviceRunning){ dataService.stop(); statusChip.classList.remove('online','offline'); statusChip.classList.add('stopped'); statusChip.textContent = 'Status: Stopped'; $('#toggleService').textContent = 'Start Data'; }
    else { dataService.start(); $('#toggleService').textContent = 'Stop Data'; statusChip.textContent = 'Status: Connecting...'; }
  });

  // start service
  dataService.start();
  setLastUpdate();
});
