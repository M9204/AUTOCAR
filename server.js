// server.js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let connectedDevices = {};

// Endpoint Arduino calls to update status
app.post('/status', (req, res) => {
  const { deviceId, status } = req.body;
  if (!deviceId) {
    return res.status(400).send("Missing deviceId");
  }
  connectedDevices[deviceId] = {
    status: status || 'online',
    lastSeen: new Date()
  };
  console.log(`Device ${deviceId} is ${status}`);
  res.send("OK");
});

// Simple HTML dashboard
app.get('/', (req, res) => {
  let html = `
  <html>
    <head><title>Connected Devices</title></head>
    <body>
      <h1>Connected Devices</h1>
      <table border="1" cellpadding="5">
        <tr><th>Device</th><th>Status</th><th>Last Seen</th></tr>
  `;
  for (let id in connectedDevices) {
    html += `<tr>
               <td>${id}</td>
               <td>${connectedDevices[id].status}</td>
               <td>${connectedDevices[id].lastSeen.toLocaleString()}</td>
             </tr>`;
  }
  html += `
      </table>
    </body>
  </html>
  `;
  res.send(html);
});

const PORT = process.env.PORT || 10000; // Render will set PORT
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
