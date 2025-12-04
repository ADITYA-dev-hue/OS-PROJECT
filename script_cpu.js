// CPU + Throughput page logic (no alerts)
(function(){
  // small DOM helper
  const $ = s => document.querySelector(s);
  function setLastUpdate(){ $('#lastUpdate').textContent = new Date().toLocaleTimeString(); }

  // reuse Gauge and chart helpers (same logic as before)
  class Gauge {
    constructor(canvas){ this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.value=0; }
    draw(){
      const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
      const cx=W/2, cy=H/2, r=Math.min(W,H)*0.38;
      ctx.clearRect(0,0,W,H);
      ctx.lineWidth=14; ctx.lineCap='round';
      ctx.strokeStyle='rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.arc(cx,cy,r,Math.PI,0,false); ctx.stroke();
      const isLight = document.documentElement.getAttribute('data-theme')!=='dark';
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
      ctx.strokeStyle = isLight ? '#000' : '#fff';
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(nx,ny); ctx.stroke();
      ctx.fillStyle = isLight ? '#000' : '#fff';
      ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
    }
    setValue(v){ this.value = Math.max(0,Math.min(100,v)); this.draw(); }
  }

  function createChartData(max=60){ const a=[]; return { push(v){ a.push(v); if(a.length>max) a.shift(); }, get(){ return a.slice(); } }; }

  // page init
  window.addEventListener('DOMContentLoaded', ()=>{
    const cpuCanvas = $('#cpuGauge'), tc = $('#throughputChart');
    const cpuGauge = new Gauge(cpuCanvas);

    // --- NEW: CPU history + UI helpers for readability/interactivity ---
    const cpuHistory = []; const CPU_HISTORY_MAX = 120;
    let paused = false;

    // create overlay container (position relative to canvas parent)
    const cpuWrap = cpuCanvas.parentElement || document.body;
    if (getComputedStyle(cpuWrap).position === 'static') cpuWrap.style.position = 'relative';

    // center numeric label (big, accessible)
    const centerLabel = document.createElement('div');
    centerLabel.id = 'cpuCenterLabel';
    centerLabel.setAttribute('aria-live','polite');
    centerLabel.style.position = 'absolute';
    centerLabel.style.left = '50%';
    centerLabel.style.top = '50%';
    centerLabel.style.transform = 'translate(-50%,-52%)';
    centerLabel.style.fontSize = '26px';
    centerLabel.style.fontWeight = '700';
    centerLabel.style.pointerEvents = 'none';
    centerLabel.style.color = 'var(--text)';
    centerLabel.style.textShadow = '0 1px 0 rgba(255,255,255,0.02)';
    centerLabel.textContent = '0%';
    cpuWrap.appendChild(centerLabel);

    // stats row (min / avg / max) and pause button
    const statsRow = document.createElement('div');
    statsRow.style.display='flex';
    statsRow.style.justifyContent='center';
    statsRow.style.gap='10px';
    statsRow.style.marginTop = '8px';
    statsRow.style.width = '100%';
    statsRow.style.boxSizing = 'border-box';
    const minEl = document.createElement('div'); minEl.style.color='var(--muted)'; minEl.textContent='Min: —';
    const avgEl = document.createElement('div'); avgEl.style.color='var(--muted)'; avgEl.textContent='Avg: —';
    const maxEl = document.createElement('div'); maxEl.style.color='var(--muted)'; maxEl.textContent='Max: —';
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'btn-small';
    pauseBtn.textContent = 'Pause';
    pauseBtn.title = 'Pause live CPU updates (Space)';
    pauseBtn.addEventListener('click', ()=>{ paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; pauseBtn.style.opacity = paused ? '0.8' : '1'; });
    statsRow.appendChild(minEl); statsRow.appendChild(avgEl); statsRow.appendChild(maxEl); statsRow.appendChild(pauseBtn);
    cpuWrap.appendChild(statsRow);

    // small sparkline canvas below gauge (for CPU history)
    const spark = document.createElement('canvas');
    spark.id = 'cpuSparkline';
    spark.style.width = '160px';
    spark.style.height = '40px';
    spark.style.display = 'block';
    spark.style.margin = '8px auto 0';
    cpuWrap.appendChild(spark);
    const sparkCtx = spark.getContext('2d');

    function drawSparkline(){
      const W = spark.width = spark.clientWidth; const H = spark.height = spark.clientHeight;
      sparkCtx.clearRect(0,0,W,H);
      if (!cpuHistory.length) return;
      const max = Math.max(10, ...cpuHistory);
      sparkCtx.lineWidth = 2;
      sparkCtx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#60a5fa' : '#10b981';
      sparkCtx.beginPath();
      cpuHistory.forEach((v,i)=>{
        const x = (i/(cpuHistory.length-1||1)) * (W - 6) + 3;
        const y = H - 3 - (v / max) * (H - 6);
        if (i===0) sparkCtx.moveTo(x,y); else sparkCtx.lineTo(x,y);
      });
      sparkCtx.stroke();
      // marker for last value
      const last = cpuHistory[cpuHistory.length-1];
      const lx = (cpuHistory.length-1)/(cpuHistory.length-1||1) * (W - 6) + 3;
      const ly = H - 3 - (last / max) * (H - 6);
      sparkCtx.fillStyle = '#fff'; sparkCtx.beginPath(); sparkCtx.arc(lx, ly, 3, 0, Math.PI*2); sparkCtx.fill();
    }

    function updateCpuStats(){
      if (!cpuHistory.length){ minEl.textContent='Min: —'; avgEl.textContent='Avg: —'; maxEl.textContent='Max: —'; return; }
      const min = Math.min(...cpuHistory), max = Math.max(...cpuHistory);
      const avg = cpuHistory.reduce((s,v)=>s+v,0)/cpuHistory.length;
      minEl.textContent = `Min: ${min.toFixed(0)}%`;
      avgEl.textContent = `Avg: ${avg.toFixed(0)}%`;
      maxEl.textContent = `Max: ${max.toFixed(0)}%`;
    }

    // keyboard shortcut Space to toggle pause
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Space'){ e.preventDefault(); paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; }
    });

    // ensure layout on resize
    function resize(){
      const dpr = window.devicePixelRatio||1;
      const w = cpuCanvas.clientWidth||240, h = cpuCanvas.clientHeight||240;
      cpuCanvas.width = Math.max(200, w*dpr); cpuCanvas.height = Math.max(200, h*dpr);
      cpuGauge.ctx.setTransform(dpr,0,0,dpr,0,0);
      tc.width = (tc.parentElement||document.body).clientWidth; tc.height = 180;
      // redraw sparkline scaling
      drawSparkline();
    }
    resize(); window.addEventListener('resize', resize);

    const tcCtx = tc.getContext('2d');
    const chart = createChartData(60);

    // --- EXISTING tooltip/overlay code (throughput) kept here ---
    // overlay badges
    const throughputWrap = tc.parentElement || document.body;
    const overlay = document.createElement('div'); overlay.style.position='absolute'; overlay.style.right='12px'; overlay.style.top='8px'; overlay.style.zIndex='20';
    const valueBadge = document.createElement('div'); valueBadge.id='throughputValue'; valueBadge.style.background='rgba(0,0,0,0.55)'; valueBadge.style.color='#fff'; valueBadge.style.padding='6px 10px'; valueBadge.style.borderRadius='8px'; valueBadge.textContent='TP: --';
    overlay.appendChild(valueBadge);
    // tooltip for chart hover
    const tip = document.createElement('div'); tip.style.position='absolute'; tip.style.pointerEvents='none'; tip.style.background='rgba(0,0,0,0.8)'; tip.style.color='#fff'; tip.style.padding='6px 8px'; tip.style.borderRadius='6px'; tip.style.fontSize='12px'; tip.style.display='none'; tip.style.zIndex='30';
    throughputWrap.appendChild(tip);

    if (getComputedStyle(throughputWrap).position==='static') throughputWrap.style.position='relative';
    throughputWrap.appendChild(overlay);

    function drawChart(data, hoverIndex = -1, hoverX = null, hoverY = null){
      const W=tc.width, H=tc.height; tcCtx.clearRect(0,0,W,H);
      tcCtx.lineWidth = 1; tcCtx.strokeStyle='rgba(255,255,255,0.12)'; tcCtx.beginPath(); tcCtx.moveTo(0,H-20); tcCtx.lineTo(W,H-20); tcCtx.stroke();
      const maxY = Math.max(10, Math.max(...data,100));
      const maxX = Math.max(1, data.length);
      const paddingLeft = 8, paddingRight = 8;
      const chartW = W - paddingLeft - paddingRight, chartH = H - 28;
      tcCtx.lineWidth = 2;
      const isLight = document.documentElement.getAttribute('data-theme')!=='dark';
      const grad = tcCtx.createLinearGradient(0,0,0,H);
      if(isLight){ grad.addColorStop(0,'rgba(16,185,129,0.95)'); grad.addColorStop(0.5,'rgba(251,146,60,0.95)'); grad.addColorStop(1,'rgba(245,158,11,0.95)'); }
      else { grad.addColorStop(0,'#22d3ee'); grad.addColorStop(1,'#4c8bf5'); }
      tcCtx.strokeStyle = grad;
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

      // hover marker
      if (hoverIndex >= 0 && data[hoverIndex] !== undefined){
        const i = hoverIndex;
        const x = paddingLeft + (i/(maxX-1||1))*chartW;
        const y = H - 20 - (data[i] / maxY) * chartH;
        // vertical line
        tcCtx.strokeStyle = 'rgba(255,255,255,0.2)'; tcCtx.lineWidth = 1;
        tcCtx.beginPath(); tcCtx.moveTo(x, 8); tcCtx.lineTo(x, H-12); tcCtx.stroke();
        // circle
        tcCtx.fillStyle = '#fff'; tcCtx.beginPath(); tcCtx.arc(x,y,4,0,Math.PI*2); tcCtx.fill();
      }
    }

    // interaction: hover on throughput canvas (existing)
    let lastHoverIndex = -1;
    tc.addEventListener('mousemove', (ev)=>{
      const rect = tc.getBoundingClientRect();
      const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      const data = chart.get();
      if (!data.length) { tip.style.display='none'; return; }
      const W = tc.width, H = tc.height;
      const paddingLeft = 8, paddingRight = 8;
      const chartW = W - paddingLeft - paddingRight;
      const maxX = Math.max(1, data.length);
      let idx = Math.round(((x - paddingLeft) / chartW) * (maxX - 1));
      idx = Math.max(0, Math.min(data.length - 1, idx));
      if (idx !== lastHoverIndex){
        lastHoverIndex = idx;
        drawChart(data, idx);
      } else {
        drawChart(data, idx);
      }
      // show tooltip
      const val = data[idx];
      tip.style.display = 'block';
      tip.textContent = `${val} TP`;
      const parentRect = throughputWrap.getBoundingClientRect();
      let left = ev.clientX - parentRect.left + 12;
      let top = ev.clientY - parentRect.top + 12;
      if (left + tip.offsetWidth > parentRect.width) left = ev.clientX - parentRect.left - tip.offsetWidth - 12;
      if (top + tip.offsetHeight > parentRect.height) top = ev.clientY - parentRect.top - tip.offsetHeight - 12;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    });
    tc.addEventListener('mouseleave', ()=>{ drawChart(chart.get(), -1); tip.style.display='none'; lastHoverIndex = -1; });

    // CPU gauge hover tooltip (existing) - keep but update to show paused state and stats
    const cpuTip = document.createElement('div');
    cpuTip.style.position='absolute'; cpuTip.style.pointerEvents='none'; cpuTip.style.background='rgba(0,0,0,0.8)'; cpuTip.style.color='#fff'; cpuTip.style.padding='6px 8px'; cpuTip.style.borderRadius='6px'; cpuTip.style.fontSize='12px'; cpuTip.style.display='none'; cpuTip.style.zIndex='40';
    document.body.appendChild(cpuTip);
    cpuCanvas.addEventListener('mousemove', (ev)=>{
      const rect = cpuCanvas.getBoundingClientRect();
      cpuTip.style.display='block';
      const cpuValText = $('#cpuCaption').textContent || '';
      // show extra stats in tooltip
      const min = cpuHistory.length ? Math.min(...cpuHistory).toFixed(0) + '%' : '—';
      const avg = cpuHistory.length ? (cpuHistory.reduce((s,v)=>s+v,0)/cpuHistory.length).toFixed(0) + '%' : '—';
      const max = cpuHistory.length ? Math.max(...cpuHistory).toFixed(0) + '%' : '—';
      cpuTip.textContent = `CPU: ${cpuValText} — Min ${min} Avg ${avg} Max ${max} ${paused ? ' (paused)' : ''}`;
      let left = ev.clientX + 12, top = ev.clientY + 12;
      const maxLeft = window.innerWidth - cpuTip.offsetWidth - 8;
      const maxTop = window.innerHeight - cpuTip.offsetHeight - 8;
      if (left > maxLeft) left = ev.clientX - cpuTip.offsetWidth - 12;
      if (top > maxTop) top = ev.clientY - cpuTip.offsetHeight - 12;
      cpuTip.style.left = left + 'px';
      cpuTip.style.top = top + 'px';
    });
    cpuCanvas.addEventListener('mouseleave', ()=>{ cpuTip.style.display='none'; });

    // ...existing animateNumber, renderProcesses, etc...
    function animateNumber(el, from, to, suffix='', duration=300){
      const start = performance.now();
      function step(now){ const t = Math.min(1,(now-start)/duration); const val = Math.round(from + (to-from)*t); el.textContent = val + suffix; if(t<1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }

    function renderProcesses(procs){
      const tbody = $('#processBody'); tbody.innerHTML = '';
      (procs||[]).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.name||'-'}</td><td>${p.cpu!==undefined?p.cpu:'-'}</td><td>${p.mem||'-'}</td><td>${p.status||'-'}</td>`;
        tbody.appendChild(tr);
      });
    }

    // connectivity/theme/service handlers (shared simple logic)
    const statusChip = $('#statusChip');
    const themeToggle = $('#themeToggle');
    let serviceRunning = true;
    function setStatus(online){ statusChip.classList.remove('online','offline','stopped'); statusChip.classList.add(online ? 'online' : 'offline'); statusChip.textContent = `Status: ${online ? 'Online' : 'Offline'}`; setLastUpdate(); }
    themeToggle?.addEventListener('click', ()=>{ const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t==='dark'?'dark':''); themeToggle.textContent = t==='dark'?'Light Mode':'Dark Mode'; });
    $('#toggleService')?.addEventListener('click', ()=>{ serviceRunning = !serviceRunning; if(!serviceRunning){ dataService.stop(); statusChip.classList.remove('online','offline'); statusChip.classList.add('stopped'); statusChip.textContent='Status: Stopped'; $('#toggleService').textContent='Start Data'; } else { dataService.start(); $('#toggleService').textContent='Stop Data'; statusChip.textContent='Status: Connecting...'; } });

    // subscribe to dataService
    dataService.subscribe(payload=>{
      if(!payload){ $('#statusChip') && $('#statusChip').classList.add('offline'); return; }
      $('#statusChip') && $('#statusChip').classList.remove('offline');
      const cpuVal = payload.cpu ?? 0;

      // update cpu history & stats
      cpuHistory.push(cpuVal); if (cpuHistory.length > CPU_HISTORY_MAX) cpuHistory.shift();
      updateCpuStats();
      drawSparkline();

      // only update live gauge/center label when not paused
      if (!paused){
        cpuGauge.setValue(cpuVal);
        $('#cpuCaption').textContent = Math.round(cpuVal) + '%';
        centerLabel.textContent = Math.round(cpuVal) + '%';
      } else {
        // when paused indicate paused state visually
        centerLabel.textContent = centerLabel.textContent + ''; // keep frozen value
      }

      // throughput
      const tval = payload.throughput ?? 0;
      chart.push(tval);
      drawChart(chart.get());
      valueBadge.textContent = `TP: ${tval}`;
      setLastUpdate();
    });

    dataService.start();
    setLastUpdate();
  });
})();