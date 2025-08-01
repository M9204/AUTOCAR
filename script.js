const client = mqtt.connect("wss://ddf927fd9af44789b245774345c7bf14.s1.eu.hivemq.cloud:8884/mqtt", {
  username: "user9",
  password: "hknnQlRofqnyqj_aQxmeoJ6vPbvK-4fX",
  connectTimeout: 8000,
  reconnectPeriod: 4000,
  clean: true,
});

const relays = [false, false, false, false];

client.on("connect", () => {
  console.log("✅ Connected to HiveMQ Cloud via WebSocket");
  client.subscribe("car/#");
});

client.on("message", (topic, message) => {
  const msg = message.toString();
  console.log("📩 Message:", topic, msg);

  if (topic.startsWith("car/relay/")) {
    const index = parseInt(topic.split("/")[2]);
    if (!isNaN(index) && index >= 0 && index < relays.length) {
      relays[index] = msg === "on";
      updateRelayUI(index);
    }
  }
});

client.on("error", err => console.error("❌ MQTT Error:", err));

function startCar() {
  client.publish("car/start", "start");
}

function toggleRelay(index) {
  const newState = !relays[index];
  client.publish(`car/relay/${index}`, newState ? "on" : "off");
}

function updateRelayUI(index) {
  const btn = document.getElementById(`relay${index}`);
  if (btn) {
    btn.innerText = `Relay ${index}: ${relays[index] ? "ON" : "OFF"}`;
    btn.className = "relay-btn " + (relays[index] ? "relay-on" : "relay-off");
  }
}
client.subscribe("car/status");

client.on("message", (topic, message) => {
  const msg = message.toString();

  if(topic === "car/status") {
    document.getElementById("status").innerText = `Status: ${msg}`;
    document.getElementById("status").style.color = msg === "online" ? "lime" : "red";
  }

  if (topic.startsWith("car/relay/")) {
    const index = parseInt(topic.split("/")[2]);
    if (!isNaN(index)) {
      relays[index] = msg === "on";
      updateRelayUI(index);
    }
  }
});



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
