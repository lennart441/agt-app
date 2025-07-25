let memberCounter = 2;
let selectedMission = '';

function showTruppForm() {
  const formWrapper = document.getElementById("trupp-form-wrapper");
  formWrapper.style.display = formWrapper.style.display === "none" ? "flex" : "none";
  document.getElementById("trupp-name-input").value = '';
  document.getElementById("trupp-mission-display").value = '';
  document.getElementById("tf-druck").value = '';
  document.getElementById("tm1-druck").value = '';
  selectedMission = '';
}

function addTruppMember() {
  const membersDiv = document.getElementById("trupp-members");
  const newMemberDiv = document.createElement("div");
  newMemberDiv.className = "trupp-member";
  newMemberDiv.innerHTML = `
    <label>Truppmann ${memberCounter} Name:</label>
    <input type="text" id="tm${memberCounter}-name" onclick="showNameOverlay('tm${memberCounter}-name')">
    <label>Druck:</label>
    <input type="text" id="tm${memberCounter}-druck" onclick="showDruckOverlay('tm${memberCounter}-druck')">
  `;
  membersDiv.appendChild(newMemberDiv);
  memberCounter++;
}

function setupMeldungInput(id) {
  const input = document.getElementById(id);
  input.addEventListener('click', () => showDruckOverlay(id));
}

function showDruckOverlay(inputId) {
  const overlay = document.getElementById('druck-overlay');
  const grid = document.getElementById('druck-grid');
  grid.innerHTML = '';

  const druckWerteMeldung = Array.from({ length: 64 }, (_, i) => 5 + i * 5);
  druckWerteMeldung.forEach(wert => {
    const btn = document.createElement('button');
    btn.className = 'druck-btn';
    btn.textContent = `${wert}`;
    btn.setAttribute('data-druck', wert);
    btn.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      input.value = `${wert} bar`;
      closeDruckOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function showNameOverlay(inputId) {
  const overlay = document.getElementById('name-overlay');
  const grid = document.getElementById('name-grid');
  grid.innerHTML = '';

  // Add custom name input
  const customInputDiv = document.createElement('div');
  customInputDiv.className = 'custom-name';
  customInputDiv.innerHTML = `
    <label>Alternativer Name:</label>
    <input type="text" id="custom-name-input">
    <button onclick="selectCustomName('${inputId}')">Bestätigen</button>
  `;
  grid.appendChild(customInputDiv);

  // Add predefined names
  agtlerNamen.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'name-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      input.value = name;
      closeNameOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function selectCustomName(inputId) {
  const customInput = document.getElementById('custom-name-input');
  const input = document.getElementById(inputId);
  if (customInput.value.trim()) {
    input.value = customInput.value.trim();
    closeNameOverlay();
  } else {
    alert("Bitte einen Namen eingeben.");
  }
}

function showTruppNameOverlay() {
  const overlay = document.getElementById('truppname-overlay');
  const grid = document.getElementById('truppname-grid');
  grid.innerHTML = '';

  // Add custom truppname input
  const customInputDiv = document.createElement('div');
  customInputDiv.className = 'custom-name';
  customInputDiv.innerHTML = `
    <label>Alternativer Truppname:</label>
    <input type="text" id="custom-truppname-input">
    <button onclick="selectCustomTruppName()">Bestätigen</button>
  `;
  grid.appendChild(customInputDiv);

  // Add predefined truppnames
  truppNameVorschlaege.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'name-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      const input = document.getElementById('trupp-name-input');
      input.value = name;
      closeTruppNameOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function selectCustomTruppName() {
  const customInput = document.getElementById('custom-truppname-input');
  const input = document.getElementById('trupp-name-input');
  if (customInput.value.trim()) {
    input.value = customInput.value.trim();
    closeTruppNameOverlay();
  } else {
    alert("Bitte einen Truppnamen eingeben.");
  }
}

function showMissionOverlay(context, truppId = null) {
  const overlay = document.getElementById('mission-overlay');
  const grid = document.getElementById('mission-grid');
  grid.innerHTML = '';

  // Add custom mission input
  const customInputDiv = document.createElement('div');
  customInputDiv.className = 'custom-mission';
  customInputDiv.innerHTML = `
    <label>Alternativer Auftrag:</label>
    <input type="text" id="custom-mission-input">
    <button onclick="selectCustomMission('${context}', ${truppId})">Bestätigen</button>
  `;
  grid.appendChild(customInputDiv);

  // Add predefined missions
  auftragVorschlaege.forEach(auftrag => {
    const btn = document.createElement('button');
    btn.className = 'mission-btn';
    btn.textContent = auftrag;
    btn.addEventListener('click', () => {
      if (context === 'create') {
        selectedMission = auftrag;
        document.getElementById('trupp-mission-display').value = auftrag;
      } else {
        updateMission(truppId, auftrag);
      }
      closeMissionOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function selectCustomMission(context, truppId) {
  const customInput = document.getElementById('custom-mission-input');
  if (customInput.value.trim()) {
    if (context === 'create') {
      selectedMission = customInput.value.trim();
      document.getElementById('trupp-mission-display').value = customInput.value.trim();
    } else {
      updateMission(truppId, customInput.value.trim());
    }
    closeMissionOverlay();
  } else {
    alert("Bitte einen Auftrag eingeben.");
  }
}

function closeMissionOverlay() {
  const overlay = document.getElementById('mission-overlay');
  overlay.style.display = 'none';
}

function showNotfallOverlay(truppId, isEndNotfall = false) {
  const overlay = document.getElementById('notfall-overlay');
  const content = document.getElementById('notfall-content');
  content.innerHTML = `
    <h3>${isEndNotfall ? 'AGT Notfall beenden' : 'AGT Notfall auslösen'}</h3>
    <button onclick="confirmNotfall(${truppId}, ${isEndNotfall})">Bestätigen</button>
  `;
  overlay.style.display = 'flex';
}

function closeNotfallOverlay() {
  const overlay = document.getElementById('notfall-overlay');
  overlay.style.display = 'none';
}

function closeDruckOverlay() {
  const overlay = document.getElementById('druck-overlay');
  overlay.style.display = 'none';
}

function closeNameOverlay() {
  const overlay = document.getElementById('name-overlay');
  overlay.style.display = 'none';
}

function closeTruppNameOverlay() {
  const overlay = document.getElementById('truppname-overlay');
  overlay.style.display = 'none';
}

function renderTrupp(trupp) {
  const container = document.getElementById("trupp-container");
  const card = document.createElement("div");
  card.className = "trupp-card";
  card.id = `trupp-${trupp.id}`;

  const title = document.createElement("h2");
  title.textContent = trupp.name;
  card.appendChild(title);

  const missionDisplay = document.createElement("div");
  missionDisplay.id = `mission-${trupp.id}`;
  missionDisplay.innerHTML = `
    <strong>Auftrag: ${trupp.mission || 'Kein Auftrag'}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}
  `;
  card.appendChild(missionDisplay);

  const changeMissionBtn = document.createElement("button");
  changeMissionBtn.textContent = "Auftrag ändern";
  changeMissionBtn.onclick = () => showMissionOverlay('update', trupp.id);
  changeMissionBtn.style.display = trupp.inaktiv ? "none" : "inline"; // Hide for inactive trupps
  card.appendChild(changeMissionBtn);

  const agtInfo = document.createElement("p");
  agtInfo.id = `info-${trupp.id}`;
  agtInfo.innerHTML = trupp.members
    .map(m => `${m.role === "TF" ? "Truppführer" : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
    .join("<br>");
  card.appendChild(agtInfo);

  // Pressure bar for minimum pressure
  const minPressure = Math.min(...trupp.members.map(m => m.druck));
  const pressureBarContainer = document.createElement('div');
  pressureBarContainer.className = 'pressure-bar-container';
  pressureBarContainer.id = `pressure-bar-container-${trupp.id}`;
  const pressureBar = document.createElement('div');
  pressureBar.className = 'pressure-bar';
  pressureBar.classList.add(
    minPressure <= 50 ? 'low' : minPressure <= 160 ? 'medium' : 'high'
  );
  const maxPressure = 320; // Maximum pressure for scaling
  pressureBar.style.width = `${(minPressure / maxPressure) * 100}%`;
  pressureBarContainer.appendChild(pressureBar);
  card.appendChild(pressureBarContainer);

  const startButton = document.createElement("button");
  startButton.textContent = "Trupp legt an";
  startButton.onclick = () => {
    startButton.style.display = "none";
    ablegenBtn.style.display = "inline";
    notfallBtn.style.display = "inline";
    loeschenBtn.style.display = "none"; // Hide "Trupp auflösen" when active
    startTimer(trupp);
    const startKommentar = `Angelegt um ${new Date().toLocaleTimeString()}`;
    trupp.meldungen.push({ kommentar: startKommentar, members: trupp.members.map(m => ({ role: m.role, druck: m.druck })) });
    zeigeMeldungen(trupp);
  };
  card.appendChild(startButton);

  const ablegenBtn = document.createElement("button");
  ablegenBtn.textContent = "Trupp legt ab";
  ablegenBtn.style.display = "none";
  ablegenBtn.onclick = () => {
    startButton.style.display = "inline";
    ablegenBtn.style.display = "none";
    notfallBtn.style.display = "none";
    loeschenBtn.style.display = "inline"; // Show "Trupp auflösen" when inactive
    ablegen(trupp);
  };
  card.appendChild(ablegenBtn);

  const notfallBtn = document.createElement("button");
  notfallBtn.className = "notfall-btn";
  notfallBtn.textContent = trupp.notfallAktiv ? "AGT Notfall beenden" : "AGT Notfall";
  notfallBtn.style.display = trupp.inaktiv ? "none" : "inline";
  notfallBtn.onclick = () => showNotfallOverlay(trupp.id, trupp.notfallAktiv);
  card.appendChild(notfallBtn);

  const loeschenBtn = document.createElement("button");
  loeschenBtn.textContent = "Trupp auflösen";
  loeschenBtn.style.display = trupp.inaktiv ? "none" : "inline"; // Hide for inactive trupps by default
  loeschenBtn.onclick = () => {
    trupp.inaktiv = true;
    if (trupp.intervalRef) clearInterval(trupp.intervalRef);
    card.classList.remove("warnphase", "alarmphase", "aktiv");
    card.classList.add("inaktiv");
    const meldungForm = document.getElementById(`meldung-form-${trupp.id}`);
    const inputs = meldungForm.querySelectorAll("select, input, button");
    inputs.forEach(input => input.style.display = "none");
    startButton.style.display = "none";
    ablegenBtn.style.display = "none";
    notfallBtn.style.display = "none";
    loeschenBtn.style.display = "none"; // Hide after dissolving
    changeMissionBtn.style.display = "none"; // Hide "Auftrag ändern" for inactive trupps
    saveTruppsToLocalStorage(); // Save to Local Storage when trupp is dissolved
  };
  card.appendChild(loeschenBtn);

  const timerDiv = document.createElement("div");
  timerDiv.id = `timer-${trupp.id}`;
  timerDiv.className = 'timer-bold';
  card.appendChild(timerDiv);

  // Separator for meldungen
  const separator = document.createElement('div');
  separator.className = 'meldung-separator';
  card.appendChild(separator);

  const meldungForm = document.createElement("div");
  meldungForm.id = `meldung-form-${trupp.id}`;
  meldungForm.innerHTML = `
    <h3>Meldung:</h3>
    ${trupp.members.map((member, index) => `
      <label>Druck ${member.role}:</label>
      <input type="text" id="meldung-${index}-${trupp.id}" onclick="showDruckOverlay('meldung-${index}-${trupp.id}')">
    `).join('')}
    <label>Notiz:</label>
    <input type="text" id="notiz-${trupp.id}">
    <button onclick="meldung(${trupp.id})">Melden</button>
    <div id="meldungen-${trupp.id}"></div>
  `;
  card.appendChild(meldungForm);

  container.appendChild(card);
  trupp.members.forEach((_, index) => {
    setupMeldungInput(`meldung-${index}-${trupp.id}`);
  });
  card.classList.add(trupp.inaktiv ? "inaktiv" : "aktiv");

  if (trupp.inaktiv) {
    startButton.style.display = "none";
    ablegenBtn.style.display = "none";
    notfallBtn.style.display = "none";
    loeschenBtn.style.display = "none"; // Hide "Trupp auflösen" for inactive trupps
    changeMissionBtn.style.display = "none"; // Hide "Auftrag ändern" for inactive trupps
    const meldungForm = document.getElementById(`meldung-form-${trupp.id}`);
    const inputs = meldungForm.querySelectorAll("select, input, button");
    inputs.forEach(input => input.style.display = "none");
    zeigeMeldungen(trupp);
  }
}

function updateTruppCard(trupp) {
  const card = document.getElementById(`trupp-${trupp.id}`);
  if (!card) return;

  // Update pressure info
  const agtInfo = document.getElementById(`info-${trupp.id}`);
  if (agtInfo) {
    agtInfo.innerHTML = trupp.members
      .map(m => `${m.role === "TF" ? "Truppführer" : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
      .join("<br>");
  }

  // Update pressure bar
  const minPressure = Math.min(...trupp.members.map(m => m.druck));
  const pressureBarContainer = document.getElementById(`pressure-bar-container-${trupp.id}`);
  if (pressureBarContainer) {
    pressureBarContainer.innerHTML = ''; // Clear existing bar
    const pressureBar = document.createElement('div');
    pressureBar.className = 'pressure-bar';
    pressureBar.classList.add(
      minPressure <= 50 ? 'low' : minPressure <= 160 ? 'medium' : 'high'
    );
    const maxPressure = 320; // Maximum pressure for scaling
    pressureBar.style.width = `${(minPressure / maxPressure) * 100}%`;
    pressureBarContainer.appendChild(pressureBar);
  }

  // Update warning classes
  card.classList.remove('low-pressure', 'notfall');
  if (trupp.notfallAktiv) {
    card.classList.add('notfall');
  } else if (minPressure <= 50) {
    card.classList.add('low-pressure');
  }
}

function zeigeMeldungen(trupp) {
  const meldungDiv = document.getElementById(`meldungen-${trupp.id}`);
  meldungDiv.innerHTML = "";
  // Reverse meldungen to show newest first
  [...trupp.meldungen].reverse().forEach(m => {
    const p = document.createElement("p");
    p.textContent = m.members
      ? `${m.kommentar} (${m.members.map(mem => `${mem.role}: ${mem.druck} bar`).join(", ")})`
      : m.kommentar;
    meldungDiv.appendChild(p);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const closeDruckBtn = document.getElementById('close-overlay');
  if (closeDruckBtn) {
    closeDruckBtn.addEventListener('click', closeDruckOverlay);
  }
  const closeNameBtn = document.getElementById('close-name-overlay');
  if (closeNameBtn) {
    closeNameBtn.addEventListener('click', closeNameOverlay);
  }
  const closeNotfallBtn = document.getElementById('close-notfall-overlay');
  if (closeNotfallBtn) {
    closeNotfallBtn.addEventListener('click', closeNotfallOverlay);
  }
  const closeMissionBtn = document.getElementById('close-mission-overlay');
  if (closeMissionBtn) {
    closeMissionBtn.addEventListener('click', closeMissionOverlay);
  }
  const closeTruppNameBtn = document.getElementById('close-truppname-overlay');
  if (closeTruppNameBtn) {
    closeTruppNameBtn.addEventListener('click', closeTruppNameOverlay);
  }
});