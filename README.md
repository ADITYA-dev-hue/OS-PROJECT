# Real Time Process Monitoring Dashbord

A sleek, lightweight dashboard to visualize system-like metrics in real time. Ideal as a demo, teaching tool, or starting point for building a real monitoring UI.

Key features
- Real-time CPU semicircular gauge driven by the [`Gauge`](OS GITHUB.HTML/script.js) class.
- Live throughput chart with dynamic gradient rendering and a toggleable overlay showing value vs percent.
- Simulated process list and alerts powered by the mocked [`dataService`](OS GITHUB.HTML/dataService.js).
- Theme support (light/dark) with persisted preference and responsive canvas rendering.

Live demo files
- UI shell: [OS GITHUB.HTML/index.html](OS GITHUB.HTML/index.html)
- Frontend logic: [OS GITHUB.HTML/script.js](OS GITHUB.HTML/script.js) — contains [`Gauge`](OS GITHUB.HTML/script.js), [`drawChart`](OS GITHUB.HTML/script.js), and [`animateNumber`](OS GITHUB.HTML/script.js).
- Mock data feed: [OS GITHUB.HTML/dataService.js](OS GITHUB.HTML/dataService.js)

Quick start
1. Open the dashboard in your browser:
   - Double-click [OS GITHUB.HTML/index.html](OS GITHUB.HTML/index.html), or
   - Serve the folder and open https://aditya-dev-hue.github.io/OS-PROJECT/ (example: `python -m http.server`).
2. The page uses an in-browser mock backend (`dataService`) to push updates. Toggle data flow with the "Stop Data" button.

Developer notes
- Canvas elements are scaled for crisp display and react to window resizes.
- The throughput overlay uses [`animateNumber`](OS GITHUB.HTML/script.js) for smooth badge transitions.
- Alerts and process rendering are managed in the UI code; extend `dataService` in [OS GITHUB.HTML/dataService.js](OS GITHUB.HTML/dataService.js) to hook a real backend.

Suggestions to extend
- Replace the mocked [`dataService`](OS GITHUB.HTML/dataService.js) with a WebSocket or SSE server to stream real metrics.
- Add sortable columns and PID filtering to the process table.
- Persist alert history to localStorage or a backend and add severity filters.

