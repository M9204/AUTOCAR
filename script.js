// ==== MQTT CONFIG ====
const client = mqtt.connect("wss://ddf927fd9af44789b245774345c7bf14.s1.eu.hivemq.cloud:8884/mqtt", {
  username: "user9",
  password: "hknnQlRofqnyqj_aQxmeoJ6vPbvK-4fX",
  connectTimeout: 8000,
  reconnectPeriod: 4000,
  clean: true,
});

const relays = [false, false, false, false]; // Local relay states
let carStarted = false;

// === ESP Status Indicator ===
const statusDiv = document.getElementById("espStatus");

// ==== MQTT EVENTS ====
client.on("connect", () => {
  console.log("✅ Connected to HiveMQ");
  client.subscribe("car/#");
  statusDiv.innerText = "MQTT Connected ✅";
  statusDiv.style.color = "green";
});

client.on("error", (err) => {
  console.error("❌ MQTT Error:", err);
  statusDiv.innerText = "MQTT Disconnected ❌";
  statusDiv.style.color = "red";
});

client.on("message", (topic, message) => {
  const msg = message.toString();
  console.log("📩 Message:", topic, msg);

  // ✅ Update relay status from ESP
  if (topic.startsWith("car/relay/") && topic.endsWith("/state")) {
    const index = parseInt(topic.split("/")[2]);
    if (!isNaN(index) && index >= 0 && index < relays.length) {
      relays[index] = msg === "on";
      updateRelayUI(index);
    }
  }

  // ✅ Update ESP status
  if (topic === "car/status") {
    statusDiv.innerText = msg.includes("online") ? "ESP Online ✅" : "ESP Offline ❌";
    statusDiv.style.color = msg.includes("online") ? "green" : "red";
  }
});

// ==== CAR START / STOP SEQUENCE ====
//let carStarted = false; // initial state

function startCar() {
  const btn = document.getElementById("mainBtn");

  if (!carStarted) {
    carStarted = true;
    btn.innerText = "Stop Car";

    // Start sequence
    for (let i = 0; i < relays.length; i++) {
      client.publish(`car/relay/${i}`, "off");
      relays[i] = false;
      updateRelayUI(i);
    }

    setTimeout(() => { client.publish(`car/relay/0`, "on"); }, 0);     // ACC ON
    setTimeout(() => { client.publish(`car/relay/1`, "on"); }, 500);   // IGN ON
    setTimeout(() => { client.publish(`car/relay/2`, "on"); }, 1500);  // START ON
    setTimeout(() => { client.publish(`car/relay/2`, "off"); }, 2500); // START OFF (key release)
    setTimeout(() => { client.publish(`car/relay/3`, "on"); }, 3500);  // AC ON

  } else {
    carStarted = false;
    btn.innerText = "Start Car";

    // Stop sequence
    setTimeout(() => { client.publish(`car/relay/3`, "off"); }, 0);     // AC OFF
    setTimeout(() => { client.publish(`car/relay/1`, "off"); }, 500);   // IGN OFF
    setTimeout(() => { client.publish(`car/relay/0`, "off"); }, 1000);  // ACC OFF

    // Also update UI states accordingly
    for (let i = 0; i < relays.length; i++) {
      relays[i] = false;
      updateRelayUI(i);
    }
  }
}

// On page load, set button text correctly based on initial state
window.onload = () => {
  const relayDiv = document.getElementById("relays");
  const btn = document.getElementById("mainBtn");
  btn.innerText = carStarted ? "Stop Car" : "Start Car";

  for (let i = 0; i < relays.length; i++) {
    const btnRelay = document.createElement("button");
    btnRelay.id = `relay${i}`;
    btnRelay.className = "relay-btn relay-off";
    btnRelay.innerText = `Relay ${i}: OFF`;
    btnRelay.onclick = () => toggleRelay(i);
    relayDiv.appendChild(btnRelay);
  }
};


// ==== TOGGLE RELAY MANUALLY ====
function toggleRelay(index) {
  const newState = !relays[index];
  client.publish(`car/relay/${index}`, newState ? "on" : "off");
}

// ==== UPDATE UI BUTTONS ====
function updateRelayUI(index) {
  const btn = document.getElementById(`relay${index}`);
  if (btn) {
    btn.innerText = `Relay ${index}: ${relays[index] ? "ON" : "OFF"}`;
    btn.className = "relay-btn " + (relays[index] ? "relay-on" : "relay-off");
  }
}

/* ==== INIT BUTTONS ====
window.onload = () => {
  const relayDiv = document.getElementById("relays");
  for (let i = 0; i < relays.length; i++) {
    const btn = document.createElement("button");
    btn.id = `relay${i}`;
    btn.className = "relay-btn relay-off";
    btn.innerText = `Relay ${i}: OFF`;
    btn.onclick = () => toggleRelay(i);
    relayDiv.appendChild(btn);
  }
};
*/

