const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");

// Enable CORS if you want to keep your webpage elsewhere
app.use(cors());

// Serve index.html and other static files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

let relayStates = ["HIGH", "HIGH", "HIGH", "HIGH"]; // default all high

app.get("/setRelay", (req, res) => {
  const relay = parseInt(req.query.relay);
  const state = req.query.state;
  if (
    relay >= 0 &&
    relay < relayStates.length &&
    (state === "HIGH" || state === "LOW")
  ) {
    relayStates[relay] = state.toUpperCase();
    res.send("OK");
  } else {
    res.status(400).send("Invalid parameters");
  }
});

app.get("/getRelays", (req, res) => {
  res.send(relayStates.join(","));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
