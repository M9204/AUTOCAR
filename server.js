// server.js
// Relay control + connected devices dashboard
// Reads API_TOKEN from env (Render -> Environment -> API_TOKEN)

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || ""; // must be set on Render
const PERSIST_FILE = path.join(__dirname, 'relays.json');

// Default relays 22-25 (false = OFF / HIGH, true = ON / LOW)
let relays = { "22": false, "23": false, "24": false, "25": false };
let devices = {}; // { deviceId: { lastSeen: number, status: string } }

// load persisted relay states if available
try {
  if (fs.existsSync(PERSIST_FILE)) {
    const raw = fs.readFileSync(PERSIST_FILE);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') relays = parsed;
  }
} catch (e) {
  console.error("Failed to load relays.json:", e.message);
}

function persistRelays() {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(relays));
  } catch (e) {
    console.error("Failed to persist relays:", e.message);
  }
}

// Simple token check: accepts token in header x-api-token, query param token, or body.token
function authCheck(req) {
  const headerToken = req.get('x-api-token');
  const qToken = req.query.token;
  const bToken = req.body && req.body.token;
  return (headerToken === API_TOKEN) || (qToken === API_TOKEN) || (bToken === API_TOKEN);
}

// Middleware to require token
function requireAuth(req, res, next) {
  if (!API_TOKEN) return res.status(500).json({ error: "Server misconfigured: API_TOKEN not set" });
  if (!authCheck(req)) return res.status(401).json({ error: "Invalid or missing API token" });
  next();
}

// GET /relays?token=...&deviceId=...
// returns current relay states and updates device heartbeat (deviceId optional)
app.get('/relays', requireAuth, (req, res) => {
  const deviceId = req.query.deviceId;
  if (deviceId) {
    devices[deviceId] = { lastSeen: Date.now(), status: 'online' };
  }
  res.json(relays);
});

// POST /relays/:pin/toggle  (toggle specified pin)
app.post('/relays/:pin/toggle', requireAuth, (req, res) => {
  const pin = req.params.pin;
  if (!["22","23","24","25"].includes(pin)) return res.status(400).json({ error: "invalid pin" });
  relays[pin] = !relays[pin];
  persistRelays();
  res.json({ pin, state: relays[pin] });
});

// POST /relays/:pin  (set explicit state via { state: true|false })
app.post('/relays/:pin', requireAuth, (req, res) => {
  const pin = req.params.pin;
  if (!["22","23","24","25"].includes(pin)) return res.status(400).json({ error: "invalid pin" });
  if (typeof req.body.state !== 'boolean') return res.status(400).json({ error: "state must be boolean" });
  relays[pin] = req.body.state;
  persistRelays();
  res.json({ pin, state: relays[pin] });
});

// POST /status  (device heartbeat / registration)
// Accepts body: { deviceId: "my-device", status: "online", token: "..." } OR header x-api-token
app.post('/status', requireAuth, (req, res) => {
  const deviceId = req.body.deviceId || req.query.deviceId;
  const status = req.body.status || 'online';
  if (!deviceId) return res.status(400).json({ error: "deviceId required" });
  devices[deviceId] = { lastSeen: Date.now(), status };
  console.log(`Status from ${deviceId}: ${status}`);
  res.json({ ok: true, deviceId });
});

// Simple dashboard: shows relay controls + connected devices
app.get('/', (req, res) => {
  const now = Date.now();
  const onlineThreshold = 30 * 1000; // 30s considered online
  const deviceRows = Object.keys(devices).length === 0 ? '<tr><td colspan="3">No devices</td></tr>' :
    Object.entries(devices).map(([id, info]) => {
      const online = (now - info.lastSeen) < onlineThreshold;
      const lastSeen = new Date(info.lastSeen).toLocaleString();
      return `<tr>
        <td>${id}</td>
        <td>${info.status} ${online ? '✅' : '⚠️'}</td>
        <td>${lastSeen}</td>
      </tr>`;
    }).join('\n');

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Relay Control & Devices</title>
      <style>
        body{font-family: Arial, Helvetica, sans-serif; padding:20px}
        table{border-collapse:collapse}
        td,th{padding:8px;border:1px solid #ccc}
        button{padding:8px 12px;margin:4px}
      </style>
    </head>
    <body>
      <h1>Relays 22-25</h1>
      <div id="controls"></div>

      <h2>Connected Devices (seen within 30s)</h2>
      <table>
        <thead><tr><th>Device ID</th><th>Status</th><th>Last Seen</th></tr></thead>
        <tbody id="devices">${deviceRows}</tbody>
      </table>

      <script>
        const TOKEN = "${API_TOKEN}";
        async function getStates(){
          try {
            const res = await fetch('/relays?token=' + TOKEN + '&deviceId=browser');
            const json = await res.json();
            const container = document.getElementById('controls');
            container.innerHTML = '';
            ['22','23','24','25'].forEach(pin => {
              const state = json[pin];
              const btn = document.createElement('button');
              btn.textContent = 'Pin ' + pin + ' — ' + (state ? 'ON (LOW)' : 'OFF (HIGH)');
              btn.onclick = async ()=> {
                await fetch('/relays/' + pin + '/toggle', { method:'POST', headers:{ 'x-api-token': TOKEN } });
                getStates();
              };
              container.appendChild(btn);
            });
          } catch(e) {
            console.error('Failed to fetch relays', e);
          }
        }
        getStates();
        setInterval(getStates, 5000);
        // refresh device list every 5s by reloading the page fragment
        setInterval(()=> fetch(window.location.href).then(r=>r.text()).then(t=> {
          const tmp = document.createElement('div'); tmp.innerHTML = t;
          const newDevices = tmp.querySelector('#devices');
          if (newDevices) document.getElementById('devices').innerHTML = newDevices.innerHTML;
        }), 5000);
      </script>
    </body>
  </html>`;

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  if (!API_TOKEN) console.warn('Warning: API_TOKEN not set. Set environment variable on Render!');
});
