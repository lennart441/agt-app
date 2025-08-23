// ui.js
// Modul für die UI-Logik und das Rendering der Truppkarten
// Steuert die Darstellung, Interaktion und Aktualisierung der Truppkarten im Haupt-UI
// Overlay-Interaktionen werden an overlays.js delegiert

// Zählt die Anzahl der Mitglieder im Trupp-Formular
let memberCounter = 2;
// Speichert den aktuell ausgewählten Auftrag
let selectedMission = '';

/**
 * Zeigt das Formular zum Erstellen eines neuen Trupps an oder versteckt es.
 */
function showTruppForm() {
  const formWrapper = document.getElementById("trupp-form-wrapper");
  formWrapper.style.display = formWrapper.style.display === "none" ? "flex" : "none";
  document.getElementById("trupp-name-input").value = '';
  document.getElementById("trupp-mission-display").value = '';
  document.getElementById("tf-druck").value = '';
  document.getElementById("tm1-druck").value = '';
  selectedMission = '';
}

/**
 * Fügt ein weiteres Mitglied (Truppmann) zum Trupp-Formular hinzu.
 */
function addTruppMember() {
  const membersDiv = document.getElementById("trupp-members");
  const newMemberDiv = document.createElement("div");
  newMemberDiv.className = "trupp-member";
  newMemberDiv.innerHTML = `
    <label>Truppmann ${memberCounter} Name:</label>
    <input type="text" id="tm${memberCounter}-name" onclick="showNameOverlay('tm${memberCounter}-name')" readonly>
    <label>Druck:</label>
    <input type="text" id="tm${memberCounter}-druck" onclick="showDruckOverlay('tm${memberCounter}-druck')" readonly>
  `;
  membersDiv.appendChild(newMemberDiv);
  memberCounter++;
}

/**
 * Fügt einen Event-Listener für das Druck-Eingabefeld hinzu, um das Overlay zu öffnen.
 */
function setupMeldungInput(id) {
  const input = document.getElementById(id);
  input.addEventListener('click', () => showDruckOverlay(id));
}

/**
 * Rendert eine Trupp-Karte im UI mit allen Buttons und Infos.
 * @param {object} trupp - Das Trupp-Objekt mit allen Daten.
 */
function renderTrupp(trupp) {
  const container = document.getElementById("trupp-container");
  let card = document.getElementById(`trupp-${trupp.id}`);
  // Button-, Timer- und Intervall-Zustände merken
  let buttonStates = {};
  let timerText = "";
  let savedStartZeit = trupp.startZeit;
  let savedIntervalRef = trupp.intervalRef;
  if (card) {
    const btns = card.querySelectorAll('button');
    btns.forEach(btn => {
      if (btn.textContent === "Trupp legt an") buttonStates.start = btn.style.display;
      if (btn.textContent === "Trupp legt ab") buttonStates.ablegen = btn.style.display;
      if (btn.textContent === "Trupp auflösen") buttonStates.loeschen = btn.style.display;
      if (btn.textContent === "Auftrag ändern") buttonStates.changeMission = btn.style.display;
    });
    const notfallBtn = card.querySelector('.notfall-btn');
    if (notfallBtn) buttonStates.notfall = notfallBtn.style.display;
    const timerDiv = card.querySelector(`#timer-${trupp.id}`);
    if (timerDiv) timerText = timerDiv.textContent;
  }
  if (!card) {
    card = document.createElement("div");
    card.className = "trupp-card";
    card.id = `trupp-${trupp.id}`;
    container.appendChild(card);
  } else {
    card.innerHTML = ""; // Bestehende Karte leeren, um sie neu zu rendern
  }

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
    loeschenBtn.style.display = "none";
    // Button 'Mitglied hinzufügen' entfernen
    const addMemberBtnRemove = card.querySelector('.add-member-btn');
    if (addMemberBtnRemove) addMemberBtnRemove.remove();
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
    if (ablegen(trupp)) {
      startButton.style.display = "inline";
      ablegenBtn.style.display = "none";
      notfallBtn.style.display = "none";
      loeschenBtn.style.display = "inline";
      // Druckfelder leeren
      trupp.members.forEach((_, index) => {
        const druckInput = document.getElementById(`meldung-${index}-${trupp.id}`);
        if (druckInput) druckInput.value = '';
      });
      updateTruppCard(trupp); // Druckanzeige und Grafik aktualisieren
    }
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
    // Karte aus trupp-container entfernen
    card.remove();
    // Im Archiv anzeigen
    renderArchivTrupp(trupp);
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

  // Button zum Hinzufügen eines Mitglieds neben dem Melden-Button
  const addMemberBtn = document.createElement('button');
  addMemberBtn.textContent = 'Mitglied hinzufügen';
  addMemberBtn.className = 'add-member-btn';
  addMemberBtn.onclick = () => showAddMemberOverlay(trupp.id);
  // Button-Bereich finden und neuen Button einfügen
  const buttonArea = card.querySelector('.button-area');
  if (!trupp.startZeit) {
    if (buttonArea) {
      buttonArea.appendChild(addMemberBtn);
    } else {
      card.appendChild(addMemberBtn);
    }
  }

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

  // Nach dem Rendern die Button- und Timer-Zustände wiederherstellen
  const btns = card.querySelectorAll('button');
  btns.forEach(btn => {
    if (btn.textContent === "Trupp legt an" && buttonStates.start !== undefined) btn.style.display = buttonStates.start;
    if (btn.textContent === "Trupp legt ab" && buttonStates.ablegen !== undefined) btn.style.display = buttonStates.ablegen;
    if (btn.textContent === "Trupp auflösen" && buttonStates.loeschen !== undefined) btn.style.display = buttonStates.loeschen;
    if (btn.textContent === "Auftrag ändern" && buttonStates.changeMission !== undefined) btn.style.display = buttonStates.changeMission;
  });
  const notfallBtnRestore = card.querySelector('.notfall-btn');
  if (notfallBtnRestore && buttonStates.notfall !== undefined) notfallBtnRestore.style.display = buttonStates.notfall;
  const timerDivRestore = card.querySelector(`#timer-${trupp.id}`);
  if (timerDivRestore && timerText) timerDivRestore.textContent = timerText;
  // Timer- und Intervall-Zustände zurücksetzen
  trupp.startZeit = savedStartZeit;
  trupp.intervalRef = savedIntervalRef;
  // Timer-Intervall nur setzen, wenn noch keins läuft und startZeit existiert
  if (!trupp.inaktiv && trupp.startZeit && !trupp.intervalRef) {
    startTimer(trupp);
  }
}

/**
 * Overlay-Callback für das Hinzufügen eines Mitglieds.
 */
function showAddMemberOverlay(truppId) {
  // Schritt 1: Name wählen
  showNameOverlayForAddMember(truppId);
}

/**
 * Overlay-Callback für die Namensauswahl beim Hinzufügen eines Mitglieds.
 */
function showNameOverlayForAddMember(truppId) {
  showNameOverlay('add-member-temp-name');
  // Nach Auswahl im Overlay wird die Funktion selectCustomNameForAddMember aufgerufen
  window.selectCustomNameForAddMember = function (name) {
    closeNameOverlay();
    showDruckOverlayForAddMember(truppId, name);
  };
}

/**
 * Overlay-Callback für die Druckauswahl beim Hinzufügen eines Mitglieds.
 */
function showDruckOverlayForAddMember(truppId, name) {
  showDruckOverlay('add-member-temp-druck');
  window.selectDruckForAddMember = function (druck) {
    closeDruckOverlay();
    addMemberToTrupp(truppId, name, druck);
  };
}

/**
 * Aktualisiert die Trupp-Karte (z.B. nach einer Meldung oder Notfall).
 */
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

  zeigeMeldungen(trupp);
}

/**
 * Zeigt alle Meldungen eines Trupps im UI an.
 */
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

/**
 * Rendert eine archivierte Trupp-Karte im Archiv-Container
 */
function renderArchivTrupp(trupp) {
  const archivContainer = document.getElementById("archiv-container");
  let card = document.getElementById(`archiv-trupp-${trupp.id}`);
  if (!card) {
    card = document.createElement("div");
    card.className = "trupp-card inaktiv archiv-card";
    card.id = `archiv-trupp-${trupp.id}`;
    archivContainer.appendChild(card);
  } else {
    card.innerHTML = "";
  }
  const title = document.createElement("h3");
  title.textContent = trupp.name;
  card.appendChild(title);
  const missionDisplay = document.createElement("div");
  missionDisplay.innerHTML = `<strong>Auftrag: ${trupp.mission || 'Kein Auftrag'}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}`;
  card.appendChild(missionDisplay);
  const agtInfo = document.createElement("p");
  agtInfo.innerHTML = trupp.members.map(m => `${m.role === "TF" ? "Truppführer" : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`).join("<br>");
  card.appendChild(agtInfo);
  // Meldungen anzeigen
  const meldungDiv = document.createElement("div");
  meldungDiv.innerHTML = "<h4>Meldungen:</h4>";
  [...trupp.meldungen].reverse().forEach(m => {
    const p = document.createElement("p");
    p.textContent = m.members
      ? `${m.kommentar} (${m.members.map(mem => `${mem.role}: ${mem.druck} bar`).join(", ")})`
      : m.kommentar;
    meldungDiv.appendChild(p);
  });
  card.appendChild(meldungDiv);
}

/**
 * Leert den Archiv-Container (z.B. nach Bericht-Upload)
 */
function clearArchivContainer() {
  const archivContainer = document.getElementById("archiv-container");
  archivContainer.innerHTML = "";
}

// Beim Laden archivierte Trupps ins Archiv-Container rendern
function renderArchivierteTrupps() {
  trupps.filter(t => t.inaktiv).forEach(renderArchivTrupp);
}

// Nach dem Laden der Seite
window.addEventListener('DOMContentLoaded', async () => {
  loadTruppsFromLocalStorage();
  renderArchivierteTrupps();
});