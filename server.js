const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());

let relayStates = ["HIGH", "HIGH", "HIGH", "HIGH"]; // default all high

app.get("/setRelay", (req, res) => {
  const relay = parseInt(req.query.relay);
  const state = req.query.state;
  if (relay >= 0 && relay < relayStates.length) {
    relayStates[relay] = state.toUpperCase();
    res.send("OK");
  } else {
    res.send("Invalid relay");
  }
});

app.get("/getRelays", (req, res) => {
  res.send(relayStates.join(","));
});

app.listen(3000, () => console.log("Relay server running"));
