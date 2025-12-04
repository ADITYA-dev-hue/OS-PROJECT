/*
  Dashboard engine:
   - scales canvases for high DPI
   - draws CPU gauge, system multi-line plot and heat detector
   - accepts payloads from dataService or websocket
   - "Activate Device" triggers connection
*/
(function(){
  const qs = s => document.querySelector(s);
  const cpuGauge = qs('#cpuGauge');
  const systemPlot = qs('#systemPlotSmall');
  const heatPlot = qs('#heatPlotSmall');
  const miniCpu = qs('#miniCpu');
  const miniMem = qs('#miniMem');

  const cpuEl = qs('#cpuPercent'), gpuEl = qs('#gpuPercent'), memEl = qs('#memPercent');
  const throughputEl = qs('#throughput'), lastSmall = qs('#lastUpdateSmall');
  const deviceStatus = qs('#deviceStatus');

  const HISTORY = 100;
  const sysHist = { cpu: [], gpu: [], mem: [] };
  const heatHist = { cpu: [], gpu: [] };
  const miniCpuH = [], miniMemH = [];

  function dpr() { return window.devicePixelRatio || 1; }
  function resizeCanvas(c){
    if(!c) return;
    const r = dpr();
    const w = Math.max(1, Math.floor(c.clientWidth * r));
    const h = Math.max(1, Math.floor(c.clientHeight * r));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    // keep CSS pixel size in sync with client size (prevents visual mismatch on some browsers)
    c.style.width = c.clientWidth + 'px';
    c.style.height = c.clientHeight + 'px';
  }

  function drawGauge(canvas, pct){
    if(!canvas) return;
    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const cx = canvas.width/2, cy = canvas.height/2;
    const r = Math.min(cx, cy) - Math.round(20 * dpr());
    ctx.lineCap = 'round';

    // background arc
    ctx.beginPath(); ctx.lineWidth = Math.max(4, r*0.12); ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.arc(cx, cy, r, Math.PI*0.75, Math.PI*0.25, false); ctx.stroke();

    // value arc
    const span = Math.PI * 1.5;
    const end = Math.PI*0.75 + Math.max(0, Math.min(1, pct/100)) * span;
    const g = ctx.createLinearGradient(0,0,canvas.width,0);
    g.addColorStop(0, '#34d399'); g.addColorStop(0.6, '#60a5fa'); g.addColorStop(1, '#f59e0b');
    ctx.beginPath(); ctx.strokeStyle = g; ctx.lineWidth = Math.max(4, r*0.12);
    ctx.arc(cx, cy, r, Math.PI*0.75, end, false); ctx.stroke();

    // text
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#0f1724';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const f = Math.max(10, Math.floor(r*0.4));
    ctx.font = `bold ${f}px Inter, Segoe UI, Arial`;
    ctx.fillText(Math.round(pct) + '%', cx, cy);
  }

  function drawMultiLine(canvas, seriesArr, colors){
    if(!canvas) return;
    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const padL=8* dpr(), padR=8* dpr(), padT=8* dpr(), padB=18* dpr();
    const W = canvas.width, H = canvas.height;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const len = Math.max(...seriesArr.map(s=>s.length));
    if (!len) return;

    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
    for (let g=0; g<=3; g++){
      const y = padT + (g/3)*plotH; ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    }

    // clip to plotting rect to avoid strokes outside canvas (prevents stray lines showing under page elements)
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL - 1, padT - 1, plotW + 2, plotH + 2);
    ctx.clip();

    seriesArr.forEach((arr, idx)=>{
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = colors[idx] || '#888';
      for (let i=0;i<arr.length;i++){
        const v = (typeof arr[i] === 'number' ? arr[i] : 0);
        const x = padL + (i/(Math.max(1, arr.length-1))) * plotW;
        const y = padT + (1 - Math.max(0, Math.min(1, v/100))) * plotH;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawHeat(canvas, heatSeries){
    if(!canvas) return;
    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const padL=8* dpr(), padR=8* dpr(), padT=8* dpr(), padB=18* dpr();
    const W = canvas.width, H = canvas.height;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const len = Math.max(heatSeries.cpu.length, heatSeries.gpu.length);
    if (!len) return;
    const all = heatSeries.cpu.concat(heatSeries.gpu);
    const minV = Math.max(0, Math.floor(Math.min(...all, 20) - 5));
    const maxV = Math.max(60, Math.ceil(Math.max(...all, 60) + 5));

    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
    for (let g=0; g<=3; g++){ const y = padT + (g/3)*plotH; ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke(); }

    // clip drawing area
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL - 1, padT - 1, plotW + 2, plotH + 2);
    ctx.clip();

    function plot(arr, color){
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = color;
      for (let i=0;i<arr.length;i++){
        const v = arr[i] ?? minV;
        const x = padL + (i/(Math.max(1, arr.length-1))) * plotW;
        const y = padT + (1 - ((v - minV) / Math.max(1, maxV - minV))) * plotH;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    plot(heatSeries.cpu, '#ef4444'); plot(heatSeries.gpu, '#f59e0b');

    ctx.restore();
  }

  function push(arr, val, max){ arr.push(val); if (arr.length>max) arr.shift(); }

  function redraw(){
    drawGauge(cpuGauge, Number((cpuEl?.textContent||'0').replace('%','')) || 0);
    drawMultiLine(systemPlot, [sysHist.cpu, sysHist.gpu, sysHist.mem], ['#60a5fa','#34d399','#f59e0b']);
    drawHeat(heatPlot, heatHist);
    drawMultiLine(miniCpu, [miniCpuH], ['#60a5fa']);
    drawMultiLine(miniMem, [miniMemH], ['#f59e0b']);
  }

  function setLast(){ if(lastSmall) lastSmall.textContent = new Date().toLocaleTimeString(); }
  setInterval(()=>{ const el = qs('#clock'); if(el) el.textContent = new Date().toLocaleTimeString(); },1000);

  // main payload handler
  function handlePayload(payload){
    if (!payload) return;

    function toNumber(v, fallback = 0){
      if (v === undefined || v === null) return fallback;
      const n = Number(String(v).replace('%',''));
      return Number.isFinite(n) ? n : fallback;
    }

    // CPU
    let cpuVal;
    if (payload && typeof payload.cpu !== 'undefined') cpuVal = payload.cpu;
    else if (payload && typeof payload.cpuPct !== 'undefined') cpuVal = payload.cpuPct;
    else cpuVal = parseInt((cpuEl && cpuEl.textContent) ? cpuEl.textContent.replace('%','') : '0') || 0;
    const cpu = toNumber(cpuVal, 0);

    // GPU
    let gpuVal;
    if (payload && payload.gpuInfo && typeof payload.gpuInfo.utilization !== 'undefined') gpuVal = payload.gpuInfo.utilization;
    else if (payload && typeof payload.gpu !== 'undefined') gpuVal = payload.gpu;
    else if (payload && typeof payload.gpuPct !== 'undefined') gpuVal = payload.gpuPct;
    else gpuVal = parseInt((gpuEl && gpuEl.textContent) ? gpuEl.textContent.replace('%','') : '0') || 0;
    const gpu = toNumber(gpuVal, 0);

    // MEM
    let memVal;
    if (payload && payload.system && payload.system.mem && typeof payload.system.mem.percent !== 'undefined') memVal = payload.system.mem.percent;
    else if (payload && typeof payload.memPercent !== 'undefined') memVal = payload.memPercent;
    else memVal = parseInt((memEl && memEl.textContent) ? memEl.textContent.replace('%','') : '0') || 0;
    const mem = toNumber(memVal, 0);

    cpuEl.textContent = Math.round(cpu) + '%';
    gpuEl.textContent = Math.round(gpu) + '%';
    memEl.textContent = (Number.isFinite(mem) ? Math.round(mem) + '%' : mem);

    // throughput (compatible fallback)
    let tp;
    if (payload && typeof payload.throughput !== 'undefined') tp = payload.throughput;
    else if (payload && typeof payload.requestsPerSecond !== 'undefined') tp = payload.requestsPerSecond;
    throughputEl.textContent = (typeof tp !== 'undefined' ? tp : throughputEl.textContent) + ' req/s';

    setLast();

    push(sysHist.cpu, cpu, HISTORY);
    push(sysHist.gpu, gpu, HISTORY);
    push(sysHist.mem, mem, HISTORY);

    // CPU/GPU temps (compatible access)
    let cpuTemp = NaN, gpuTemp = NaN;
    if (payload && payload.cpuInfo){
      cpuTemp = (typeof payload.cpuInfo.temp !== 'undefined') ? payload.cpuInfo.temp : (typeof payload.cpuInfo.temperature !== 'undefined' ? payload.cpuInfo.temperature : NaN);
    } else if (payload && payload.system && typeof payload.system.cpuTemp !== 'undefined'){
      cpuTemp = payload.system.cpuTemp;
    }

    if (payload && payload.gpuInfo){
      gpuTemp = (typeof payload.gpuInfo.temperature !== 'undefined') ? payload.gpuInfo.temperature : (typeof payload.gpuInfo.temp !== 'undefined' ? payload.gpuInfo.temp : NaN);
    } else if (payload && typeof payload.gpuTemp !== 'undefined'){
      gpuTemp = payload.gpuTemp;
    }

    push(heatHist.cpu, Number.isFinite(Number(cpuTemp)) ? Number(cpuTemp) : (heatHist.cpu[heatHist.cpu.length-1] || 0), HISTORY);
    push(heatHist.gpu, Number.isFinite(Number(gpuTemp)) ? Number(gpuTemp) : (heatHist.gpu[heatHist.gpu.length-1] || 0), HISTORY);

    push(miniCpuH, cpu, 40);
    push(miniMemH, mem, 40);

    // schedule redraw (throttle)
    if (!window._dashRaf) window._dashRaf = requestAnimationFrame(()=>{ redraw(); window._dashRaf = null; });
  }

  // expose global hook for external bridges
  window.handleDashboardPayload = handlePayload;

  // device activation logic
  function activateDevice(){
    if (!deviceStatus) return;
    try {
      if (window.dataService && typeof dataService.start === 'function') {
        dataService.subscribe(p => handlePayload(p));
        dataService.start();
        deviceStatus.textContent = 'Device: connected (dataService)';
        return;
      }
    } catch(e){ console.warn('dataService start failed', e); }

    // websocket fallback
    const url = 'ws://localhost:8765/';
    try {
      if (window._dashWs && window._dashWs.readyState === WebSocket.OPEN) { deviceStatus.textContent = 'Device: connected (ws)'; return; }
      const ws = new WebSocket(url);
      window._dashWs = ws;
      deviceStatus.textContent = 'Device: connecting (ws)…';
      ws.addEventListener('open', ()=> deviceStatus.textContent = 'Device: connected (ws)');
      ws.addEventListener('message', ev => {
        try { const d = JSON.parse(ev.data); handlePayload(d); } catch(e){ console.warn('ws parse', e); }
      });
      ws.addEventListener('close', ()=> deviceStatus.textContent = 'Device: disconnected (ws)');
      ws.addEventListener('error', ()=> deviceStatus.textContent = 'Device: error (ws)');
    } catch(e){
      deviceStatus.textContent = 'Device: cannot connect';
      console.error(e);
    }
  }

  qs('#activateDevice')?.addEventListener('click', activateDevice);

  // if dataService exists but you want automatic connect on load, uncomment:
  // if (window.dataService) { activateDevice(); }

  // demo fallback to keep dashboard alive until device connects
  if (!window.dataService){
    let tc=36, tg=22, tm=48, cpuT=44, gpuT=40;
    setInterval(()=>{
      tc = Math.max(1, Math.min(99, tc + Math.round((Math.random()-0.5)*8)));
      tg = Math.max(0, Math.min(99, tg + Math.round((Math.random()-0.5)*8)));
      tm = Math.max(1, Math.min(99, tm + Math.round((Math.random()-0.5)*5)));
      cpuT = Math.max(20, Math.min(95, cpuT + (Math.random()-0.5)*3));
      gpuT = Math.max(20, Math.min(95, gpuT + (Math.random()-0.5)*3));
      handlePayload({ cpu: tc, gpu: tg, system: { mem: { percent: tm } }, throughput: Math.round(200 + Math.random()*120), cpuInfo: { temp: Math.round(cpuT) }, gpuInfo: { temperature: Math.round(gpuT) } });
    }, 1200);
  } else {
    // If dataService is present, subscribe but do not auto-start (user will click Activate Device)
    try { dataService.subscribe(p => handlePayload(p)); } catch(e){}
  }

  // initial draw and responsiveness
  function redrawAll(){ resizeCanvas(cpuGauge); resizeCanvas(systemPlot); resizeCanvas(heatPlot); resizeCanvas(miniCpu); resizeCanvas(miniMem); redraw(); }
  window.addEventListener('resize', redrawAll);
  setTimeout(redrawAll, 200);

})();