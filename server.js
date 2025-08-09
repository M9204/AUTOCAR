require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const API_TOKEN = process.env.API_TOKEN;

let connectedDevices = {};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/status', (req, res) => {
  const { deviceId, status, token } = req.body;

  if (token !== API_TOKEN) {
    return res.status(403).send('Invalid token');
  }

  connectedDevices[deviceId] = { status, lastSeen: new Date() };
  res.send("OK");
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
