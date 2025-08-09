// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const connectedDevices = {};
const API_TOKEN = process.env.API_TOKEN;

// Serve a simple HTML page showing connected devices
app.get('/', (req, res) => {
  let html = `
  <html>
    <head>
      <title>Connected Devices</title>
      <style>
        body { font-family: Arial; background: #f0f0f0; padding: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; background: white; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>Connected Devices</h1>
      <table>
        <tr><th>Device ID</th><th>Status</th><th>Last Seen</th></tr>
  `;

  for (let id in connectedDevices) {
    html += `<tr>
      <td>${id}</td>
      <td>${connectedDevices[id].status}</td>
      <td>${connectedDevices[id].lastSeen}</td>
    </tr>`;
  }

  html += `</table></body></html>`;
  res.send(html);
});
app.get('/devices', (req, res) => {
  const now = Date.now();
  const activeDevices = {};
  Object.keys(connectedDevices).forEach(id => {
    if (now - connectedDevices[id].lastSeen.getTime() <= 30000) {
      let newId = (id.toLowerCase() === 'browser') ? 'Web Client' : id;
      activeDevices[newId] = connectedDevices[id];
    }
  });
  res.json(activeDevices);
});

// Endpoint Arduino calls to update status
app.post('/status', (req, res) => {
  const { deviceId, status, token } = req.body;

  if (token !== API_TOKEN) {
    return res.status(403).send('Invalid token');
  }

  connectedDevices[deviceId] = { status, lastSeen: new Date().toLocaleString() };
  res.send("OK");
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
