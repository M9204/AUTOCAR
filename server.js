const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

let relayStates = {
  22: true,
  23: true,
  24: true,
  25: true,
};

app.use(express.json());
app.use(express.static('public')); // serve index.html and assets from 'public'

// API to get relay states
app.get('/api/relays', (req, res) => {
  res.json(relayStates);
});

// API to toggle a relay by pin number
app.post('/api/relays/:pin', (req, res) => {
  const pin = req.params.pin;
  if (relayStates.hasOwnProperty(pin)) {
    relayStates[pin] = !relayStates[pin];
    console.log(`Relay ${pin} toggled to ${relayStates[pin] ? 'ON' : 'OFF'}`);
    res.json({ success: true, state: relayStates[pin] });
  } else {
    res.status(400).json({ error: "Invalid relay pin" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
