const broker = "wss:dog.lmq.cloudamqp.com:8883";
 // e.g. CloudMQTT or hosted broker
const options = {
  username: "zpfipcnp", // from dashboard
  password: "hknnQlRofqnyqj_aQxmeoJ6vPbvK-4fX", // from dashboard
  clean: true,
  connectTimeout: 1000,
  reconnectPeriod: 1000,
};

const client = mqtt.connect(broker, options);
client.on('connect', () => console.log("✅ MQTT Connected"));
client.on('error', err => console.error("❌ MQTT Error:", err));

const relays = [false, false, false, false]; // initial state

client.on('connect', () => {
  console.log("Connected to MQTT");
  client.subscribe("car/#");
});

client.on('message', (topic, message) => {
  const msg = message.toString();
  if (topic.startsWith("car/relay/")) {
    const index = parseInt(topic.split("/")[2]);
    relays[index] = msg === "on";
    updateRelayUI(index);
  }
});

function startCar() {
  client.publish("car/start", "start");
}

function toggleRelay(index) {
  const newState = !relays[index];
  client.publish(`car/relay/${index}`, newState ? "on" : "off");
}

function updateRelayUI(index) {
  const btn = document.getElementById(`relay${index}`);
  btn.innerText = `Relay ${index}: ${relays[index] ? "ON" : "OFF"}`;
  btn.className = "relay-btn " + (relays[index] ? "relay-on" : "relay-off");
}

// Generate buttons
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
