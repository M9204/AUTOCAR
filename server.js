const cors = require('cors');
// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json());

const TOKEN = process.env.API_TOKEN || "changeme";
const PERSIST_FILE = path.join(__dirname, "relays.json");

// default relays 22-25 = false means OFF (HIGH). true means ON (LOW)
let relays = { "22": false, "23": false, "24": false, "25": false };

// load persisted if exists
if (fs.existsSync(PERSIST_FILE)) {
  try { relays = JSON.parse(fs.readFileSync(PERSIST_FILE)); } catch (e) { console.error("failed to parse relays.json", e); }
}

function persist() {
  try { fs.writeFileSync(PERSIST_FILE, JSON.stringify(relays)); } catch(e){ console.error(e); }
}

// simple token middleware
function checkToken(req, res, next) {
  const token = req.get("x-api-token") || req.query.token;
  if (!token || token !== TOKEN) return res.status(401).json({error: "unauthorized"});
  next();
}

// return current state
app.get("/relays", checkToken, (req, res) => {
  res.json(relays);
});

// toggle pin (22|23|24|25)
app.post("/relays/:pin/toggle", checkToken, (req, res) => {
  const pin = req.params.pin;
  if (!["22","23","24","25"].includes(pin)) return res.status(400).json({error:"invalid pin"});
  relays[pin] = !relays[pin];
  persist();
  res.json({pin, state: relays[pin]});
});

// set explicit state
app.post("/relays/:pin", checkToken, (req, res) => {
  const pin = req.params.pin;
  if (!["22","23","24","25"].includes(pin)) return res.status(400).json({error:"invalid pin"});
  if (typeof req.body.state !== "boolean") return res.status(400).json({error:"need boolean state"});
  relays[pin] = req.body.state;
  persist();
  res.json({pin, state: relays[pin]});
});

// simple web UI (very small)
app.get("/", (req, res) => {
  const token = TOKEN;
  res.send(`<!doctype html>
  <html><head><meta charset="utf-8"><title>Relay Control</title></head>
  <body>
  <h1>Relays 22-25</h1>
  <div id="controls"></div>
  <script>
  const TOKEN = "${token}";
  async function getStates(){
    const r = await fetch('/relays?token=' + TOKEN);
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
  getStates(); setInterval(getStates, 3000);
  </script>
  </body></html>`);
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log("Listening on", port));
