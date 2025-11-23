// UI helpers
function $(sel) { return document.querySelector(sel); }
function setLastUpdate() {
  const now = new Date();
  $('#lastUpdate').textContent = now.toLocaleTimeString();
}

// CPU Gauge - simple semicircular gauge using canvas
class Gauge {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.value = 0; // 0..100
    this.size = Math.min(canvas.width, canvas.height);
  }
  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.38;

    ctx.clearRect(0, 0, W, H);

    // background arc
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.stroke();

    // dynamic gradient based on theme (light => green→yellow→orange, dark => cyan→green)
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    let gradient;
    if (isLight) {
      gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      gradient.addColorStop(0, '#10b981'); // emerald
      gradient.addColorStop(0.5, '#f59e0b'); // amber
      gradient.addColorStop(1, '#fb923c'); // orange
    } else {
      gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      gradient.addColorStop(0, '#06b6d4'); // cyan
      gradient.addColorStop(1, '#34d399'); // green
    }
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    const start = Math.PI;
    const end = Math.PI + Math.PI * (this.value / 100);
    ctx.arc(cx, cy, r, start, end, false);
    ctx.stroke();

    // needle (black in light mode, white in dark mode)
    const angle = Math.PI + Math.PI * (this.value / 100);
    const nx = cx + Math.cos(angle) * (r - 8);
    const ny = cy + Math.sin(angle) * (r - 8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = isLight ? '#000' : '#fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // center knob (match needle color)
    ctx.fillStyle = isLight ? '#000' : '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  setValue(v) {
    this.value = Math.max(0, Math.min(100, v));
    this.draw();
  }
}

function createChart(ctx) {
  const data = [];
  const maxPoints = 60;
  return {
    push: (v) => {
      data.push(v);
      if (data.length > maxPoints) data.shift();
      return data.slice();
    },
    get: () => data.slice(),
    maxPoints
  };
}

// Data service abstraction
const dataService = (function() {
  let interval = null;
  let subscribers = [];
  const start = () => {
    if (interval) return;
    // seed with some initial values
    let t = 60;
    interval = setInterval(() => {
      // simulate data
      const cpu = Math.max(1, Math.min(98, 40 + Math.sin(t / 5) * 25 + Math.random() * 10));
      const throughput = Math.max(0, Math.round(50 + Math.sin(t / 3) * 25 + Math.random() * 10));
      const processes = [
        { name: 'procA', cpu: Math.max(0.1, cpu * 0.6 / 10 + Math.random()), mem: Math.max(0.2, Math.random() * 2.5), status: 'running' },
        { name: 'procB', cpu: Math.max(0.1, cpu * 0.3 / 10 + Math.random()), mem: Math.max(0.2, Math.random() * 3.0), status: 'running' },
        { name: 'procC', cpu: Math.max(0.1, cpu * 0.1 / 10 + Math.random()), mem: Math.max(0.2, Math.random() * 1.5), status: 'sleep' }
      ];
      const payload = {
        cpu,
        throughput,
        processes
      };
      t += 1;
      subscribers.forEach(cb => cb(payload));
    }, 1000);
  };
  const stop = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };
  const subscribe = (cb) => {
    subscribers.push(cb);
    return () => {
      subscribers = subscribers.filter(s => s !== cb);
    };
  };
  return { start, stop, subscribe };
})();

// UI initialization
window.addEventListener('DOMContentLoaded', () => {
  // Theme toggle (optional)
  const root = document.documentElement;
  let theme = 'dark';
  const saved = localStorage.getItem('theme');
  if (saved) theme = saved;
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  $('#themeName').textContent = theme === 'light' ? 'Light' : 'Dark';

  // Elements
  const cpuCanvas = document.getElementById('cpuGauge');
  const cpuGauge = new Gauge(cpuCanvas);
  // set canvas resolution for crisp rendering
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = cpuCanvas.clientWidth;
    const h = cpuCanvas.clientHeight;
    cpuCanvas.width = Math.max(200, w * dpr);
    cpuCanvas.height = Math.max(200, h * dpr);
    cpuGauge.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Throughput chart
  const tc = document.getElementById('throughputChart');
  const tcCtx = tc.getContext('2d');
  let chart = createChart(tcCtx);
  // initialize canvas size
  function resizeChart() {
    const parent = tc.parentElement;
    const w = parent.clientWidth;
    const h = 180;
    tc.width = w;
    tc.height = h;
  }
  resizeChart();
  window.addEventListener('resize', resizeChart);

  // --- NEW: throughput overlay + toggle percentage UI ---
  const throughputWrap = tc.parentElement || document.body;
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.right = '12px';
  overlay.style.top = '8px';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.gap = '8px';
  overlay.style.zIndex = '20';
  // value badge
  const valueBadge = document.createElement('div');
  valueBadge.id = 'throughputValue';
  valueBadge.style.background = 'rgba(0,0,0,0.55)';
  valueBadge.style.color = '#fff';
  valueBadge.style.padding = '6px 10px';
  valueBadge.style.borderRadius = '8px';
  valueBadge.style.fontWeight = '700';
  valueBadge.style.fontSize = '0.95rem';
  valueBadge.textContent = 'TP: --';
  // percent badge
  const percentBadge = document.createElement('div');
  percentBadge.id = 'throughputPercent';
  percentBadge.style.background = 'linear-gradient(90deg,#10b981,#fb923c)';
  percentBadge.style.color = '#fff';
  percentBadge.style.padding = '6px 10px';
  percentBadge.style.borderRadius = '8px';
  percentBadge.style.fontWeight = '700';
  percentBadge.style.fontSize = '0.95rem';
  percentBadge.textContent = '%: --';
  // toggle button
  const modeBtn = document.createElement('button');
  modeBtn.id = 'throughputToggleMode';
  modeBtn.textContent = 'Show %';
  modeBtn.style.padding = '6px 8px';
  modeBtn.style.border = 'none';
  modeBtn.style.borderRadius = '6px';
  modeBtn.style.cursor = 'pointer';
  modeBtn.style.background = '#2874f0';
  modeBtn.style.color = '#fff';
  modeBtn.style.fontWeight = '600';
  modeBtn.setAttribute('aria-pressed', 'false');

  overlay.appendChild(valueBadge);
  overlay.appendChild(percentBadge);
  overlay.appendChild(modeBtn);

  // ensure parent is positioned
  const parentStyle = window.getComputedStyle(throughputWrap);
  if (parentStyle.position === 'static') throughputWrap.style.position = 'relative';
  throughputWrap.appendChild(overlay);

  // initial visibility
  let showPercent = false;
  percentBadge.style.display = 'none';

  modeBtn.addEventListener('click', () => {
    showPercent = !showPercent;
    percentBadge.style.display = showPercent ? 'block' : 'none';
    valueBadge.style.display = showPercent ? 'none' : 'block';
    modeBtn.textContent = showPercent ? 'Show Value' : 'Show %';
    modeBtn.setAttribute('aria-pressed', String(showPercent));
  });

  // helper: animate numeric value (from -> to)
  function animateNumber(el, from, to, suffix = '', duration = 300) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const val = Math.round(from + (to - from) * t);
      el.textContent = val + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  // --- END overlay ---

  // Process table
  const processBody = document.getElementById('processBody');
  function renderProcesses(procs) {
    processBody.innerHTML = '';
    procs.forEach(p => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = p.name;
      const cpu = document.createElement('td');
      cpu.textContent = p.cpu.toFixed(2);
      const mem = document.createElement('td');
      mem.textContent = p.mem.toFixed(2) + ' MB';
      const status = document.createElement('td');
      status.textContent = p.status;
      tr.appendChild(name); tr.appendChild(cpu); tr.appendChild(mem); tr.appendChild(status);
      processBody.appendChild(tr);
    });
  }

  const alertsList = document.getElementById('alertsList');
  function addAlert(message, level = 'info') {
    const li = document.createElement('li');
    li.innerHTML = `<span class="level" style="color:${level==='critical'?'#fff':'#cbd5e1'};">${level.toUpperCase()}</span>${message}`;
    li.style.borderLeft = `3px solid ${level==='critical'?'#f87171':'#4c8bf5'}`;
    alertsList.prepend(li);
    // auto-remove after some time
    setTimeout(() => li.remove(), 10000);
  }

  // Update loop
  let lastValue = 0;
  let throughputWindow = [];
  function onData(payload) {
    // UI updates
    const cpu = payload.cpu;
    const throughput = payload.throughput;
    lastValue = cpu;
    cpuGauge.setValue(cpu);
    $('#cpuCaption').textContent = cpu.toFixed(0) + '%';
    // chart data
    throughputWindow.push(throughput);
    if (throughputWindow.length > chart.maxPoints) throughputWindow.shift();
    // draw chart
    drawChart(throughputWindow);

    // update overlay badges
    const prevVal = parseInt(valueBadge.textContent.replace(/[^\d]/g, '')) || 0;
    animateNumber(valueBadge, prevVal, throughput, ' TP', 350);

    // compute percent relative to dynamic max
    const observedMax = Math.max(100, 120, ...throughputWindow);
    const scale = Math.max(observedMax * 1.1, 120); // give headroom
    const pct = Math.min(100, Math.round((throughput / scale) * 100));
    const prevPct = parseInt(percentBadge.textContent.replace(/[^\d]/g, '')) || 0;
    animateNumber(percentBadge, prevPct, pct, '%', 350);

    // processes
    renderProcesses(payload.processes);

    // alerts
    if (cpu > 85) {
      addAlert(`High CPU usage: ${cpu.toFixed(1)}%`, 'warning');
    }
    if (throughput > 120) {
      addAlert(`High throughput: ${throughput}`, 'info');
    }

    setLastUpdate();
    $('#statusChip').textContent = 'Status: Online';
  }

  function drawChart(data) {
    const W = tc.width;
    const H = tc.height;
    tcCtx.clearRect(0, 0, W, H);
    // axes
    tcCtx.strokeStyle = 'rgba(255,255,255,.25)';
    tcCtx.lineWidth = 1;
    tcCtx.beginPath();
    tcCtx.moveTo(0, H - 20);
    tcCtx.lineTo(W, H - 20);
    tcCtx.stroke();

    const maxY = Math.max(10, Math.max(...data, 100));
    const maxX = Math.max(1, data.length);
    const paddingLeft = 8;
    const paddingRight = 8;
    const chartW = W - paddingLeft - paddingRight;
    const chartH = H - 28;

    tcCtx.lineWidth = 2;

    // dynamic chart gradient depending on theme
    const isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    const gradient = tcCtx.createLinearGradient(0, 0, 0, H);
    if (isLight) {
      // attractive multi-color gradient for light theme
      gradient.addColorStop(0, 'rgba(16,185,129,0.95)'); // green
      gradient.addColorStop(0.5, 'rgba(251,146,60,0.95)'); // orange
      gradient.addColorStop(1, 'rgba(245,158,11,0.95)'); // amber
    } else {
      gradient.addColorStop(0, '#22d3ee');
      gradient.addColorStop(1, '#4c8bf5');
    }
    tcCtx.strokeStyle = gradient;
    tcCtx.beginPath();
    data.forEach((v, i) => {
      const x = paddingLeft + (i / (maxX - 1 || 1)) * chartW;
      const y = H - 20 - (v / maxY) * chartH;
      if (i === 0) tcCtx.moveTo(x, y);
      else tcCtx.lineTo(x, y);
    });
    tcCtx.stroke();

    // subtle fill under curve for light mode
    if (data.length) {
      tcCtx.globalAlpha = 0.08;
      tcCtx.fillStyle = isLight ? '#10b981' : '#22d3ee';
      tcCtx.beginPath();
      data.forEach((v, i) => {
        const x = paddingLeft + (i / (maxX - 1 || 1)) * chartW;
        const y = H - 20 - (v / maxY) * chartH;
        if (i === 0) tcCtx.moveTo(x, y);
        else tcCtx.lineTo(x, y);
      });
      tcCtx.lineTo(W - paddingRight, H - 20);
      tcCtx.lineTo(paddingLeft, H - 20);
      tcCtx.closePath();
      tcCtx.fill();
      tcCtx.globalAlpha = 1;
    }

    // grid lines
    tcCtx.strokeStyle = 'rgba(255,255,255,.08)';
    tcCtx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = 20 + (g / 4) * chartH;
      tcCtx.beginPath();
      tcCtx.moveTo(0, y);
      tcCtx.lineTo(W, y);
      tcCtx.stroke();
    }
  }

  // Start data service
  dataService.subscribe(onData);
  dataService.start();
  let serviceRunning = true;

  // NEW: handle data ON/OFF button
  const toggleServiceBtn = document.getElementById('toggleService');
  if (toggleServiceBtn) {
    toggleServiceBtn.addEventListener('click', () => {
      serviceRunning = !serviceRunning;
      if (!serviceRunning) {
        dataService.stop();
        // visual: indicate stopped
        const sc = document.getElementById('statusChip');
        if (sc) {
          sc.classList.remove('online','offline');
          sc.classList.add('stopped');
          sc.textContent = 'Status: Stopped';
        }
        toggleServiceBtn.textContent = 'Start Data';
        toggleServiceBtn.setAttribute('aria-pressed', 'true');
      } else {
        // restart service
        dataService.start(); 
        toggleServiceBtn.textContent = 'Stop Data';
        toggleServiceBtn.setAttribute('aria-pressed', 'false');
        // allow next onData to set Online status; show Connecting meanwhile
        const sc = document.getElementById('statusChip');
        if (sc) {
          sc.classList.remove('stopped','offline','online');
          sc.textContent = 'Status: Connecting...';
        }
      }
    });
  }

  // initial UI state
  setLastUpdate();
  $('#themeName').textContent = 'Light';
  $('#statusChip').textContent = 'Status: Connecting...';

    // THEME TOGGLER (persisted)
    (function () {
      const themeToggle = document.getElementById('themeToggle');
      const themeName = document.getElementById('themeName');

      function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : '');
        themeToggle.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode';
        if (themeName) themeName.textContent = t === 'dark' ? 'Dark' : 'Light';
        themeToggle.setAttribute('aria-pressed', String(t === 'dark'));
      }

      // load saved theme or prefer-color-scheme default
      const saved = localStorage.getItem('rtpm_theme');
      const initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      applyTheme(initial);

      themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('rtpm_theme', next);
        applyTheme(next);
      });
    })();

    // Status toggling + connectivity check
    (async function connectivityMonitor(){
      const statusChip = document.getElementById('statusChip');
      const toggleBtn = document.getElementById('toggleStatus');
      const lastUpdate = document.getElementById('lastUpdate');

      let forcedOffline = false;
      const PING_URL = 'dataService.js';
      async function setVisual(online){
        if(!statusChip) return;
        statusChip.classList.remove('online','offline');
        statusChip.classList.add(online ? 'online' : 'offline');
        statusChip.textContent = `Status: ${online ? 'Online' : 'Offline'}`;
        statusChip.setAttribute('data-online', String(online));
        if(lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString();
      }

      async function ping(){
        if(forcedOffline){ await setVisual(false); return; }
        if(typeof navigator !== 'undefined' && !navigator.onLine){ await setVisual(false); return; }
        try{
          const res = await fetch(PING_URL + '?_=' + Date.now(), { method:'HEAD', cache:'no-store' });
          await setVisual(res.ok);
        }catch(e){
          await setVisual(false);
        }
      }

      toggleBtn && toggleBtn.addEventListener('click', () => {
        forcedOffline = !forcedOffline;
        if(forcedOffline) setVisual(false);
        else ping();
      });

      window.addEventListener('online', () => { if(!forcedOffline) ping(); });
      window.addEventListener('offline', () => { if(!forcedOffline) setVisual(false); });

      ping();
      setInterval(ping, 5000);
    })();
});

// End of script