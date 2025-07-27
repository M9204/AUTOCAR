const client = mqtt.connect("wss://dog.lmq.cloudamqp.com:443/mqtt", {
  username: "zpfipcnp",
  password: "hknnQlRofqnyqj_aQxmeoJ6vPbvK-4fX",
  connectTimeout: 5000,
  reconnectPeriod: 4000,
  clean: true,
});

const relays = [false, false, false, false]; // initial state

client.on('connect', () => {
  console.log("✅ MQTT Connected");
  client.subscribe("car/#");
});

client.on('error', err => console.error("❌ MQTT Error:", err));

client.on('message', (topic, message) => {
  const msg = message.toString();
  if (topic.startsWith("car/relay/")) {
    const index = parseInt(topic.split("/")[2]);
    if (!isNaN(index) && index >= 0 && index < relays.length) {
      relays[index] = msg === "on";
      updateRelayUI(index);
    }
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
  if (btn) {
    btn.innerText = `Relay ${index}: ${relays[index] ? "ON" : "OFF"}`;
    btn.className = "relay-btn " + (relays[index] ? "relay-on" : "relay-off");
  }
}

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
