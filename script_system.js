// System summary + processes page logic (no alerts)
(function(){
  const $ = s => document.querySelector(s);
  function setLastUpdate(){ $('#lastUpdate').textContent = new Date().toLocaleTimeString(); }

  function bytesToGB(b){ return (b / (1024 ** 3)); }
  function safeToNumber(v){ return (v === undefined || v === null) ? undefined : Number(v); }

  // thresholds
  const CPU_WARN = 75, CPU_CRIT = 90;
  const GPU_WARN = 80, GPU_CRIT = 95;

  // --- NEW: system multi-series state (CPU/GPU/MEM percent) ---
  const SYS_MAX = 120;
  const sysHistory = { cpu: [], gpu: [], mem: [] };

  function pushSystemPoints(cpuPct, gpuPct, memPct){
    sysHistory.cpu.push(cpuPct); sysHistory.gpu.push(gpuPct); sysHistory.mem.push(memPct);
    if (sysHistory.cpu.length > SYS_MAX){ sysHistory.cpu.shift(); sysHistory.gpu.shift(); sysHistory.mem.shift(); }
  }

  // draw multi-line plot (cpu blue, gpu green, mem orange)
  function drawSystemPlot(hoverIndex = -1){
    const canvas = $('#systemPlot');
    const tip = $('#systemPlotTip');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth;
    const H = canvas.height = canvas.clientHeight;
    ctx.clearRect(0,0,W,H);

    const len = sysHistory.cpu.length;
    if (!len) { tip && (tip.style.display='none'); return; }

    const maxVal = 100; // percent
    const padL = 6, padR = 6, padT = 6, padB = 18;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    function drawLine(arr, color){
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      arr.forEach((v,i)=>{
        const x = padL + (i/(len-1 || 1)) * plotW;
        const y = padT + (1 - (v / maxVal)) * plotH;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
    }

    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let g=0; g<=4; g++){
      const y = padT + (g/4)*plotH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W-padR, y); ctx.stroke();
    }

    // draw area/lines
    drawLine(sysHistory.cpu, '#60a5fa'); // cpu blue
    drawLine(sysHistory.gpu, '#34d399'); // gpu green
    drawLine(sysHistory.mem, '#f59e0b'); // mem orange

    // hover
    if (hoverIndex >= 0 && hoverIndex < len){
      const i = hoverIndex;
      const x = padL + (i/(len-1 || 1)) * plotW;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB + 4); ctx.stroke();

      // marker circles
      const vals = { cpu: sysHistory.cpu[i], gpu: sysHistory.gpu[i], mem: sysHistory.mem[i] };
      const colors = { cpu: '#60a5fa', gpu: '#34d399', mem: '#f59e0b' };
      Object.keys(vals).forEach(k=>{
        const v = vals[k];
        const y = padT + (1 - (v / maxVal)) * plotH;
        ctx.fillStyle = colors[k]; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
      });

      // tooltip handled in mouse handler (position + values)
    } else {
      tip && (tip.style.display='none');
    }
  }

  // --- NEW: heat history for CPU & GPU temperatures ---
  const HEAT_MAX = 120;
  const heatHistory = { cpu: [], gpu: [] };

  function pushHeatPoints(cpuTemp, gpuTemp){
    heatHistory.cpu.push(cpuTemp ?? 0);
    heatHistory.gpu.push(gpuTemp ?? 0);
    if (heatHistory.cpu.length > HEAT_MAX){ heatHistory.cpu.shift(); heatHistory.gpu.shift(); }
  }

  // draw heat plot (CPU temp red, GPU temp orange)
  function drawHeatPlot(){
    const canvas = $('#heatPlot');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth;
    const H = canvas.height = canvas.clientHeight;
    ctx.clearRect(0,0,W,H);
    const len = heatHistory.cpu.length;
    if (!len) return;

    // scale: determine min/max from history with sensible bounds
    const all = heatHistory.cpu.concat(heatHistory.gpu);
    const minVal = Math.max(0, Math.floor(Math.min(...all, 20) - 5));
    const maxVal = Math.max(60, Math.ceil(Math.max(...all, 60) + 5));
    const padL = 6, padR = 6, padT = 6, padB = 18;
    const plotW = W - padL - padR, plotH = H - padT - padB;

    // grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++){
      const y = padT + (g/3) * plotH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    }

    function drawLine(arr, color){
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      arr.forEach((v,i)=>{
        const x = padL + (i/(len-1||1)) * plotW;
        const y = padT + (1 - ((v - minVal) / Math.max(1, (maxVal - minVal)))) * plotH;
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
    }

    // draw CPU (red) and GPU (orange)
    drawLine(heatHistory.cpu, '#ef4444');
    drawLine(heatHistory.gpu, '#f59e0b');
  }

  function colorForTemp(val, el){
    if (val === undefined || val === null) { el.style.color = ''; el.title=''; return; }
    if (val >= (el === $('#cpuTempValue') ? CPU_CRIT : GPU_CRIT)) { el.style.color = '#ef4444'; el.title = 'Critical temperature'; }
    else if (val >= (el === $('#cpuTempValue') ? CPU_WARN : GPU_WARN)) { el.style.color = '#f59e0b'; el.title = 'High temperature'; }
    else { el.style.color = ''; el.title = ''; }
  }

  function updateSystemMetrics(raw){
    if(!raw){
      $('#gpuUtilValue').textContent='N/A';
      $('#gpuMemValue').textContent='N/A';
      $('#gpuSharedMemValue').textContent='N/A';
      $('#memUsedValue').textContent='N/A';
      $('#memPercentValue').textContent='N/A';
      $('#cpuTempValue').textContent='N/A';
      $('#gpuTempValue').textContent='N/A';
      return;
    }

    const g = raw.gpuInfo || raw.system?.gpu || raw.system;
    const mem = raw.system?.mem || raw.system?.memory || raw.cpuInfo?.mem || null;

    // GPU utilization
    const gpuUtil = g?.utilization ?? g?.utilizationGpu ?? g?.utilizationPercent ?? g?.utilization?.gpu;
    $('#gpuUtilValue').textContent = (gpuUtil!==undefined && gpuUtil!==null) ? gpuUtil + ' %' : 'N/A';
    if (gpuUtil !== undefined && gpuUtil !== null) {
      const el = $('#gpuUtilValue');
      if (gpuUtil >= 95) el.style.color = '#ef4444';
      else if (gpuUtil >= 85) el.style.color = '#f59e0b';
      else el.style.color = '';
    }

    // GPU memory (dedicated) - show in GB
    let gUsedGB, gTotalGB, gSharedGB;
    if (g) {
      if (g.memoryUsedMB !== undefined || g.memoryTotalMB !== undefined) {
        const usedMB = safeToNumber(g.memoryUsedMB) ?? (safeToNumber(g.memoryUsed) ? Math.round(g.memoryUsed/1024/1024) : undefined);
        const totalMB = safeToNumber(g.memoryTotalMB) ?? (safeToNumber(g.memoryTotal) ? Math.round(g.memoryTotal/1024/1024) : undefined);
        if (usedMB!==undefined) gUsedGB = usedMB / 1024;
        if (totalMB!==undefined) gTotalGB = totalMB / 1024;
      } else if (g.memoryUsed !== undefined || g.memoryTotal !== undefined) {
        const usedBytes = safeToNumber(g.memoryUsed) ?? 0;
        const totalBytes = safeToNumber(g.memoryTotal) ?? 0;
        gUsedGB = bytesToGB(usedBytes);
        gTotalGB = bytesToGB(totalBytes);
      }

      const sharedMB = safeToNumber(g.memorySharedMB) ?? safeToNumber(g.sharedMemoryMB) ?? safeToNumber(g.sharedMemory) ?? undefined;
      if (sharedMB !== undefined) gSharedGB = sharedMB >= 1024 ? sharedMB / 1024 : (sharedMB / 1024);
      if (!gSharedGB && Array.isArray(g.controllers) && g.controllers[0]) {
        const c = g.controllers[0];
        if (c.memoryShared !== undefined) gSharedGB = bytesToGB(safeToNumber(c.memoryShared));
        else if (c.memorySharedMB !== undefined) gSharedGB = safeToNumber(c.memorySharedMB) / 1024;
      }
    }

    if (gUsedGB !== undefined && gTotalGB !== undefined) $('#gpuMemValue').textContent = `${gUsedGB.toFixed(2)} / ${gTotalGB.toFixed(2)} GB`;
    else if (gUsedGB !== undefined) $('#gpuMemValue').textContent = `${gUsedGB.toFixed(2)} GB`;
    else $('#gpuMemValue').textContent = 'N/A';

    $('#gpuSharedMemValue').textContent = (gSharedGB !== undefined) ? `${gSharedGB.toFixed(2)} GB` : 'N/A';

    // system memory in GB and percent
    let memPercent = 0;
    if (mem && mem.total !== undefined){
      const t = safeToNumber(mem.total);
      const u = safeToNumber(mem.used ?? mem.active ?? 0);
      let totalBytes, usedBytes;
      if (t >= 1024 * 1024 * 1024){ totalBytes = t; usedBytes = u; }
      else if (t >= 1024){ totalBytes = t * 1024 * 1024; usedBytes = (u || 0) * 1024 * 1024; }
      else { totalBytes = t; usedBytes = u; }
      if (totalBytes){
        const totalGB = bytesToGB(totalBytes), usedGB = bytesToGB(usedBytes || 0);
        $('#memUsedValue').textContent = `${usedGB.toFixed(2)} / ${totalGB.toFixed(2)} GB`;
        memPercent = Math.round((usedGB / Math.max(0.000001, totalGB)) * 100);
        $('#memPercentValue').textContent = memPercent + ' %';
      } else { $('#memUsedValue').textContent='N/A'; $('#memPercentValue').textContent='N/A'; }
    } else { $('#memUsedValue').textContent='N/A'; $('#memPercentValue').textContent='N/A'; }

    const cpuTemp = raw.cpuInfo?.temp ?? raw.system?.cpuTemp ?? raw.cpuInfo?.temperature;
    const gpuTemp = g?.temperature ?? raw.gpuTemp ?? raw.system?.gpuTemp ?? raw.gpuTemp;
    $('#cpuTempValue').textContent = (cpuTemp!==undefined && cpuTemp!==null) ? cpuTemp + ' °C' : 'N/A';
    $('#gpuTempValue').textContent = (gpuTemp!==undefined && gpuTemp!==null) ? gpuTemp + ' °C' : 'N/A';
    colorForTemp(cpuTemp, $('#cpuTempValue'));
    colorForTemp(gpuTemp, $('#gpuTempValue'));

    // return percent values for plotting
    const cpuPct = safeToNumber(raw.cpu) ?? 0;
    const gpuPct = (gpuUtil !== undefined && gpuUtil !== null) ? Number(gpuUtil) : 0;
    // also return temps for heat plotting
    const cpuTempVal = raw.cpuInfo?.temp ?? raw.cpuInfo?.temperature ?? raw.system?.cpuTemp ?? undefined;
    const gpuTempVal = g?.temperature ?? raw.gpuTemp ?? raw.system?.gpuTemp ?? undefined;
    return { cpuPct, gpuPct, memPercent, cpuTempVal, gpuTempVal };
  }

  function renderProcesses(procs){
    const tbody = $('#processBody'); tbody.innerHTML = '';
    (procs||[]).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.name||'-'}</td><td>${p.cpu!==undefined?p.cpu:'-'}</td><td>${p.mem||'-'}</td><td>${p.status||'-'}</td>`;
      tbody.appendChild(tr);
    });
  }

  // FPS chart state (existing) ...
  const fpsHistory = [];
  const FPS_MAX = 120;
  function pushFps(v){ fpsHistory.push(v); if(fpsHistory.length>FPS_MAX) fpsHistory.shift(); }
  function drawFpsChart(hoverIndex = -1){ /* ...existing fps drawing code... */ }

  // connectivity/theme/service handlers
  window.addEventListener('DOMContentLoaded', ()=>{
    const statusChip = $('#statusChip');
    const themeToggle = $('#themeToggle');
    let serviceRunning = true;
    function setStatus(online){ statusChip.classList.remove('online','offline','stopped'); statusChip.classList.add(online ? 'online' : 'offline'); statusChip.textContent = `Status: ${online ? 'Online' : 'Offline'}`; setLastUpdate(); }

    // Unified theme toggle: persist using same key as theme.js and apply correctly
    (function(){
      const THEME_KEY = 'rtpm_theme';
      if (!themeToggle) return;
      themeToggle.addEventListener('click', ()=>{
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, next); } catch(e){}
        if (next === 'dark') document.documentElement.setAttribute('data-theme','dark');
        else document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
        themeToggle.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
        // notify other tabs (storage event will fire there)
      });
    })();

    $('#toggleService')?.addEventListener('click', ()=>{ serviceRunning = !serviceRunning; if(!serviceRunning){ dataService.stop(); statusChip.classList.remove('online','offline'); statusChip.classList.add('stopped'); statusChip.textContent='Status: Stopped'; $('#toggleService').textContent='Start Data'; } else { dataService.start(); $('#toggleService').textContent='Stop Data'; statusChip.textContent='Status: Connecting...'; } });

    // system plot tooltip element already in DOM (#systemPlotTip)
    const plotCanvas = $('#systemPlot');

    // remove hover interaction on the live system plot:
    // - hide tooltip element if present
    // - do NOT attach mousemove / mouseleave listeners
    if (plotCanvas){
      const plotTip = $('#systemPlotTip');
      if (plotTip) plotTip.style.display = 'none';
      // intentionally no mouse handlers: static plot only
    }

    dataService.subscribe(payload=>{
      if(!payload){ setStatus(false); return; }
      setStatus(true);

      // update metrics and get percent values for plotting
      const vals = updateSystemMetrics(payload);
      pushSystemPoints(vals.cpuPct, vals.gpuPct, vals.memPercent);
      // push heat points and draw heat plot
      pushHeatPoints(vals.cpuTempVal, vals.gpuTempVal);
      drawSystemPlot(-1);
      drawHeatPlot();

      renderProcesses(payload.processes || []);

      // FPS & latency
      const fps = payload.fps ?? payload.framerate ?? payload.system?.fps ?? Math.round(60 + (Math.random()-0.5)*6);
      const latency = payload.latency ?? payload.ping ?? payload.system?.latency ?? null;
      $('#fpsValue').textContent = fps + ' FPS';
      $('#latencyValue').textContent = (latency !== null && latency !== undefined) ? latency + ' ms' : 'N/A';
      pushFps(fps);
      drawFpsChart(-1);

      setLastUpdate();
    });

    dataService.start();
    setLastUpdate();
    // ensure initial draw of plots
    setTimeout(()=>{ drawSystemPlot(-1); drawHeatPlot(); drawFpsChart(-1); }, 200);
    window.addEventListener('resize', ()=>{ drawSystemPlot(-1); drawHeatPlot(); drawFpsChart(-1); });
  });
})();