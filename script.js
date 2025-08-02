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
  client.subscribe("car/carStarted"); // Subscribe to carStarted state

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

  // Update relay status from ESP
  if (topic.startsWith("car/relay/") && topic.endsWith("/state")) {
    const index = parseInt(topic.split("/")[2]);
    if (!isNaN(index) && index >= 0 && index < relays.length) {
      relays[index] = msg === "on";
      updateRelayUI(index);
    }
  }

  // Update ESP status
  if (topic === "car/status") {
    statusDiv.innerText = msg.includes("online") ? "ESP Online ✅" : "ESP Offline ❌";
    statusDiv.style.color = msg.includes("online") ? "green" : "red";
  }

  // Update carStarted state and button text
  if (topic === "car/carStarted") {
    carStarted = (msg === "true");
    updateMainBtnText();
  }
});

// ==== CAR START / STOP SEQUENCE ====
function startCar() {
  if (!carStarted) {
    carStarted = true;
    client.publish("car/carStarted", "true", { retain: true });

    // Turn OFF all relays first
    for (let i = 0; i < relays.length; i++) {
      client.publish(`car/relay/${i}`, "off");
      relays[i] = false;
      updateRelayUI(i);
    }

    // Start sequence
    setTimeout(() => { client.publish(`car/relay/0`, "on"); }, 0);      // ACC ON
    setTimeout(() => { client.publish(`car/relay/1`, "on"); }, 500);    // IGN ON
    setTimeout(() => { client.publish(`car/relay/2`, "on"); }, 1500);   // START ON
    setTimeout(() => { client.publish(`car/relay/2`, "off"); }, 2500);  // START OFF
    setTimeout(() => { client.publish(`car/relay/3`, "on"); }, 3500);   // AC ON

  } else {
    carStarted = false;
    client.publish("car/carStarted", "false", { retain: true });

    // Stop sequence
    setTimeout(() => { client.publish(`car/relay/3`, "off"); }, 0);     // AC OFF
    setTimeout(() => { client.publish(`car/relay/1`, "off"); }, 500);   // IGN OFF
    setTimeout(() => { client.publish(`car/relay/0`, "off"); }, 1000);  // ACC OFF
  }
  updateMainBtnText();
}

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

// ==== UPDATE START/STOP BUTTON TEXT ====
function updateMainBtnText() {
  const mainBtn = document.getElementById("mainBtn");
  if (!mainBtn) return;
  mainBtn.innerText = carStarted ? "Stop Car" : "Start Car";
}

// ==== INIT BUTTONS ====
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

  updateMainBtnText(); // Initialize main button text on load
};
