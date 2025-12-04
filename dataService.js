// Minimal data service: set METRICS_URL to your metrics endpoint or leave empty to use simulator.
(function(){
  // Configure your metrics endpoint here (CORS required if remote).
  window.METRICS_URL = ''; // e.g. 'http://localhost:3000/metrics' or 'https://mydomain.com/metrics'

  const subscribers = [];
  let interval = null;

  async function fetchMetricsOnce(){
    if (!window.METRICS_URL) return null;
    try{
      const res = await fetch(window.METRICS_URL + '?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('non-200');
      return await res.json();
    }catch(e){
      return null;
    }
  }

  function start(){
    if (interval) return;
    let t = 60;
    interval = setInterval(async ()=>{
      let payload = null;
      if (window.METRICS_URL){
        const j = await fetchMetricsOnce();
        if (j){
          payload = {
            cpu: j.cpuPercent ?? j.cpu ?? (j.currentLoad && j.currentLoad.currentload) ?? 0,
            throughput: j.throughput ?? j.requestsPerSec ?? Math.round(Math.random()*100),
            processes: j.processes ?? j.processList ?? [],
            cpuInfo: j.cpu ?? j.cpuInfo ?? j,
            gpuInfo: j.gpu ?? j.graphics ?? j,
            system: j // raw
          };
        } else {
          payload = null;
        }
      } else {
        // simulator — REPLACED: generate multiple random processes with varied statuses
        const cpu = Math.max(2, Math.min(98, 40 + Math.sin(t/5)*25 + Math.random()*10));
        const throughput = Math.max(0, Math.round(50 + Math.sin(t/3)*25 + Math.random()*10));
        const memTotal = 16000;
        const memUsed = Math.round((30 + Math.abs(Math.sin(t/7))*40 + Math.random()*10)/100 * memTotal);
        const gpuUtil = Math.round(10 + Math.abs(Math.sin(t/4))*60 + Math.random()*10);

        // dynamic process list (5-10 processes) with random statuses and resources
        const statuses = ['running','sleep','stopped','idle'];
        const procCount = 5 + Math.floor(Math.random() * 6); // 5..10
        const processes = Array.from({length: procCount}, (_, i) => {
          const name = `proc${String.fromCharCode(65 + i)}`; // procA, procB, ...
          const cpuUse = +(Math.random() * 20).toFixed(2);
          const memMB = Math.round(20 + Math.random() * 800); // 20..820 MB
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          return { name, cpu: cpuUse, mem: `${memMB} MB`, status };
        });

        payload = {
          cpu,
          throughput,
          processes,
          cpuInfo: { brand: 'SimCPU 4x', physicalCores:4, logicalCores:8, speed: '3.2', loadPercent: cpu, temp: Math.round(40 + Math.abs(Math.sin(t/6))*30) },
          gpuInfo: { name: 'SimGPU 1050', utilization: gpuUtil, memoryUsedMB: Math.round(gpuUtil/100*4096), memoryTotalMB: 4096, memorySharedMB: 512, temperature: 55 + Math.round(Math.random()*20) },
          system: { mem: { total: memTotal*1024*1024, used: memUsed*1024*1024 } }
        };
        t++;
      }
      subscribers.forEach(cb => cb(payload));
    }, 1000);
  }

  function stop(){
    if (interval){ clearInterval(interval); interval = null; }
  }

  function subscribe(cb){
    subscribers.push(cb);
    return () => { const i = subscribers.indexOf(cb); if (i>=0) subscribers.splice(i,1); };
  }

  // expose
  window.dataService = { start, stop, subscribe, fetchOnce: fetchMetricsOnce };
})();