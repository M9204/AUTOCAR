require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;
const API_TOKEN = process.env.API_TOKEN || 'changeme';

let connectedDevices = {};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/status', (req, res) => {
  const { deviceId, status, token } = req.body;
  if (token !== API_TOKEN) return res.status(403).send('Invalid token');

  connectedDevices[deviceId] = { status, lastSeen: new Date() };
  res.send("OK");
});

app.get('/devices', (req, res) => {
  const now = Date.now();
  const activeDevices = {};
  for (const id of Object.keys(connectedDevices)) {
    if (now - connectedDevices[id].lastSeen.getTime() <= 30000) {
      activeDevices[id === 'browser' ? 'Web Client' : id] = connectedDevices[id];
    }
  }
  res.json(activeDevices);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
