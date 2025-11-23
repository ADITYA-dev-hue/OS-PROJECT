// dataService.js
// Real-Time Data Service: Mocked real-time feed with optional real backend hook.
// Export a singleton dataService object with:
//// - subscribe(eventType, handler)
//// - unsubscribe(eventType, handler)
//// - start()
//// - stop()
//// - getInitialSnapshot() -> returns a snapshot object for initial render

(function (global) {
  'use strict';

  // Public API surface
  const dataService = {
    subscribe,
    unsubscribe,
    start,
    stop,
    getInitialSnapshot
  };

  // Internal state
  let _intervalId = null;
  let _clients = {
    cpu: new Set(),
    throughput: new Set(),
    processList: new Set(),
    alerts: new Set(),
    lastUpdate: new Set()
  };

  // Simulation state
  let _cpu = 12; // percentage
  let _throughput = 120; // req/s
  let _processList = [
    { name: 'init', cpu: 2.1, mem: '20 MB', status: 'Running' },
    { name: 'worker-1', cpu: 5.3, mem: '45 MB', status: 'Running' },
    { name: 'worker-2', cpu: 3.8, mem: '38 MB', status: 'Running' },
    { name: 'db-conn', cpu: 1.2, mem: '12 MB', status: 'Idle' }
  ];
  let _lastUpdate = new Date();

  // Utilities
  function emit(type, payload) {
    const targets = _clients[type];
    if (!targets || targets.size === 0) return;
    targets.forEach((cb) => {
      try { cb(payload); } catch (e) { console.error('dataService callback error', e); }
    });
  }

  // Subscribing
  function subscribe(type, handler) {
    if (!_clients[type]) {
      _clients[type] = new Set();
    }
    _clients[type].add(handler);
  }

  function unsubscribe(type, handler) {
    if (!_clients[type]) return;
    _clients[type].delete(handler);
  }

  // Public factory: initial snapshot to bootstrap UI
  function getInitialSnapshot() {
    return {
      cpu: _cpu,
      throughput: _throughput,
      processes: _processList,
      lastUpdate: _lastUpdate.toISOString()
    };
  }

  // Mock data generator (can be replaced with real backend)
  function tick() {
    // CPU drifts toward a random target
    const targetCpu = clamp(_cpu + (Math.random() * 6 - 3), 0, 100);
    _cpu = lerp(_cpu, targetCpu, 0.15);

    // Throughput fluctuates
    _throughput = Math.max(0, Math.round(_throughput + (Math.random() * 40 - 20)));

    // Update processes
    _processList = _processList.map((p) => {
      // small random CPU changes
      const delta = (Math.random() * 2 - 1.0) * 0.8;
      const newCpu = clamp(p.cpu + delta, 0, 100);
      // random status change
      if (Math.random() < 0.02) {
        p.status = p.status === 'Running' ? 'Idle' : 'Running';
      }
      return { ...p, cpu: newCpu };
    });

    // Alerts logic (very simple)
    const alerts = [];
    if (_cpu > 85) alerts.push({ id: Date.now(), text: `High CPU usage: ${_cpu.toFixed(0)}%`, level: 'warning' });
    if (_throughput < 20) alerts.push({ id: Date.now(), text: `Low throughput: ${_throughput} req/s`, level: 'info' });

    // Last update
    _lastUpdate = new Date();

    // Emit updates
    emit('cpu', { cpu: Math.round(_cpu) });
    emit('throughput', { throughput: Math.max(0, Math.round(_throughput)) });
    emit('processList', { processes: _processList });
    if (alerts.length > 0) {
      emit('alerts', { alerts });
    } else {
      // emit empty to clear old alerts if you wish
      emit('alerts', { alerts: [] });
    }
    emit('lastUpdate', { lastUpdate: _lastUpdate.toISOString() });
  }

  // Helpers
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // Public lifecycle
  function start() {
    if (_intervalId) return;
    // Immediately push a snapshot to kick things off
    _intervalId = setInterval(tick, 1000); // 1-second cadence
    // Optional immediate tick to surface data instantly
    tick();
  }

  
  function stop() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
  }
    // Expose singleton
  global.dataService = dataService;
})(typeof window !== 'undefined' ? window : this);