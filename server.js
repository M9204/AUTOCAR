// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json());

const TOKEN = process.env.API_TOKEN || "changeme";
const PERSIST_FILE = path.join(__dirname, "relays.json");

// default relays (false = OFF/HIGH, true = ON/LOW)
let relays = { "22": false, "23": false, "24": false, "25": false };

// connected devices { deviceId: lastSeenTimestamp }
let devices = {};

// load saved relays if file exists
if (fs.existsSync(PERSIST_FILE)) {
  try { relays = JSON.parse(fs.readFileSync(PERSIST_FILE)); } 
  catch (e) { console.error("Failed to parse relays.json", e); }
}

function persist() {
  try { fs.writeFileSync(PERSIST_FILE, JSON.stringify(relays)); } 
  catch(e){ console.error(e); }
}

function checkToken(req, res, next) {
  const token = req.get("x-api-token") || req.query.token;
  if (!token || token !== TOKEN) return res.status(401).json({error: "unauthorized"});
  next();
}

// GET relay states + update device heartbeat
app.get("/relays", checkToken, (req, res) => {
  const deviceId = req.query.deviceId || "unknown-device";
  devices[deviceId] = Date.now();
  res.json(relays);
});

// toggle relay state
app.post("/relays/:pin/toggle", checkToken, (req, res) => {
  const pin = req.params.pin;
  if (!["22","23","24","25"].includes(pin)) 
    return res.status(400).json({error:"invalid pin"});
  relays[pin] = !relays[pin];
  persist();
  res.json({pin, state: relays[pin]});
});

// set relay state explicitly
app.post("/relays/:pin", checkToken, (req, res) => {
  const pin = req.params.pin;
  if (!["22","23","24","25"].includes(pin)) 
    return res.status(400).json({error:"invalid pin"});
  if (typeof req.body.state !== "boolean") 
    return res.status(400).json({error:"need boolean state"});
  relays[pin] = req.body.state;
  persist();
  res.json({pin, state: relays[pin]});
});

// Web UI
app.get("/", (req, res) => {
  const token = TOKEN;
  const now = Date.now();
  const connectedList = Object.keys(devices)
    .filter(id => now - devices[id] < 10000)
    .map(id => `<li>${id} (online)</li>`)
    .join("") || "<li>No devices connected</li>";

  res.send(`<!doctype html>
  <html>
  <head><meta charset="utf-8"><title>Relay Control</title></head>
  <body>
  <h1>Relays 22-25</h1>
  <div id="controls"></div>
  <h2>Connected Devices</h2>
  <ul id="deviceList">${connectedList}</ul>
  <script>
  const TOKEN = "${token}";
  async function getStates(){
    const r = await fetch('/relays?token=' + TOKEN + '&deviceId=browser');
    const j = await r.json();
    const container = document.getElementById('controls');
    container.innerHTML = '';
    for(const pin of ['22','23','24','25']){
      const state = j[pin];
      const btn = document.createElement('button');
      btn.textContent = 'Pin ' + pin + ' — ' + (state ? 'ON (LOW)' : 'OFF (HIGH)');
      btn.onclick = async () => {
        await fetch('/relays/' + pin + '/toggle', {method:'POST', headers:{'x-api-token':TOKEN}});
        getStates();
      };
      container.appendChild(btn);
      container.appendChild(document.createElement('br'));
    }
  }
  getStates();
  setInterval(()=>{ window.location.reload(); }, 5000);
  </script>
  </body></html>`);
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log("Listening on", port));
