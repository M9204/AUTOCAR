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
  client.subscribe("car/carStarted"); // subscribe to car start/stop retained topic

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

  // Update relay states
  if (topic.startsWith("car/relay/") && topic.endsWith("/state")) {
    const index = parseInt(topic.split("/")[2]);
    if (!isNaN(index) && index >= 0 && index < relays.length) {
      relays[index] = (msg === "on");
      updateRelayUI(index);
    }
  }

  // Update ESP status
  if (topic === "car/status") {
    statusDiv.innerText = msg.includes("online") ? "ESP Online ✅" : "ESP Offline ❌";
    statusDiv.style.color = msg.includes("online") ? "green" : "red";
  }

  // Update car started state and main button text
  if (topic === "car/carStarted") {
    carStarted = (msg === "true");
    updateMainBtnText();
  }
});

// ==== Start/Stop car ====
function startCar() {
  if (!carStarted) {
    client.publish("car/start", "start");
  } else {
    client.publish("car/start", "stop");
  }
}

// ==== Toggle individual relay ====
function toggleRelay(index) {
  const newState = !relays[index];
  client.publish(`car/relay/${index}`, newState ? "on" : "off");
}

// ==== Update relay buttons UI ====
function updateRelayUI(index) {
  const btn = document.getElementById(`relay${index}`);
  if (!btn) return;

  btn.innerText = `Relay ${index}: ${relays[index] ? "ON" : "OFF"}`;
  btn.className = "relay-btn " + (relays[index] ? "relay-on" : "relay-off");
}

// ==== Update Start/Stop button text ====
function updateMainBtnText() {
  const mainBtn = document.getElementById("mainBtn");
  if (!mainBtn) return;

  mainBtn.innerText = carStarted ? "Stop Car" : "Start Car";
}

// ==== Initialize relay buttons and main button text ====
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

  updateMainBtnText();
};
