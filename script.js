const client = mqtt.connect("wss://ddf927fd9af44789b245774345c7bf14.s1.eu.hivemq.cloud:8884/mqtt", {
  username: "user9",
  password: "hknnQlRofqnyqj_aQxmeoJ6vPbvK-4fX",
  connectTimeout: 8000,
  reconnectPeriod: 4000,
  clean: true,
});

const relays = [false, false, false, false]; // initial state

// === ESP Status Indicator ===
const statusDiv = document.getElementById("espStatus");

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

  if (topic.startsWith("car/relay/")) {
    const index = parseInt(topic.split("/")[2]);
    if (!isNaN(index) && index >= 0 && index < relays.length) {
      relays[index] = msg === "on";
      updateRelayUI(index);
    }
  }

  if (topic === "car/status") {
    statusDiv.innerText = msg.includes("online") ? "ESP Online ✅" : "ESP Offline ❌";
    statusDiv.style.color = msg.includes("online") ? "green" : "red";
  }
});

let carStarted = false;

function startCar() {
  if (!carStarted) {
    carStarted = true;

    // 1️⃣ Turn OFF all relays first
    for (let i = 0; i < relays.length; i++) {
      client.publish(`car/relay/${i}`, "off");
      relays[i] = false;
      updateRelayUI(i);
    }

    // 2️⃣ Start sequence
    setTimeout(() => { // ACC ON
      client.publish(`car/relay/0`, "on");
      relays[0] = true;
      updateRelayUI(0);
    }, 0);

    setTimeout(() => { // IGN ON
      client.publish(`car/relay/1`, "on");
      relays[1] = true;
      updateRelayUI(1);
    }, 500);

    setTimeout(() => { // START ON
      client.publish(`car/relay/2`, "on");
      relays[2] = true;
      updateRelayUI(2);
    }, 1500);

    setTimeout(() => { // START OFF (simulate key release)
      client.publish(`car/relay/2`, "off");
      relays[2] = false;
      updateRelayUI(2);
    }, 2500);

    setTimeout(() => { // AC ON
      client.publish(`car/relay/3`, "on");
      relays[3] = true;
      updateRelayUI(3);
    }, 3500);

  } else {
    // 🔹 STOP SEQUENCE
    carStarted = false;

    setTimeout(() => { // AC OFF
      client.publish(`car/relay/3`, "off");
      relays[3] = false;
      updateRelayUI(3);
    }, 0);

    setTimeout(() => { // START OFF
      client.publish(`car/relay/2`, "off");
      relays[2] = false;
      updateRelayUI(2);
    }, 500);

    setTimeout(() => { // IGN OFF
      client.publish(`car/relay/1`, "off");
      relays[1] = false;
      updateRelayUI(1);
    }, 1000);

    setTimeout(() => { // ACC OFF
      client.publish(`car/relay/0`, "off");
      relays[0] = false;
      updateRelayUI(0);
    }, 1500);
  }
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
