// ui.js

// Funktion zum Zeigen eines neuen Trupp-Formulars
function showTruppForm() {
  const formWrapper = document.getElementById("trupp-form-wrapper");
  formWrapper.style.display = formWrapper.style.display === "none" ? "block" : "none";
  fülleDruckDropdown("tf-druck");
  fülleDruckDropdown("tm-druck");
  fülleTruppnamenDropdown();
}

// Funktion zum Erstellen des Druck-Dropdown-Menüs (nur für Trupp-Erstellung, 270–320 bar)
function fülleDruckDropdown(id) {
  const select = document.getElementById(id);
  select.innerHTML = "";
  druckWerte.forEach(wert => {
    const option = document.createElement("option");
    option.value = wert;
    option.textContent = `${wert} bar`;
    select.appendChild(option);
  });
  select.value = 300;
}

// Funktion zum Erstellen der Eingabefelder für die Namen der Truppleute
function fülleTruppnamenDropdown() {
  const select = document.getElementById("trupp-name-select");
  select.innerHTML = "";
  truppNameVorschlaege.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

// Funktion zum Einrichten der Meldungs-Dropdowns mit Overlay-Trigger
function setupMeldungDropdown(id) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">Druck auswählen</option>';
  select.addEventListener('click', () => showDruckOverlay(id));
}

// Funktion zum Anzeigen des Druck-Overlays mit 8x8-Grid
function showDruckOverlay(selectId) {
  const overlay = document.getElementById('druck-overlay');
  const grid = document.getElementById('druck-grid');
  grid.innerHTML = '';

  // Erstelle Druckwerte von 5 bis 320 in 5er-Schritten (64 Werte)
  const druckWerteMeldung = Array.from({ length: 64 }, (_, i) => 5 + i * 5);
  druckWerteMeldung.forEach(wert => {
    const btn = document.createElement('button');
    btn.className = 'druck-btn';
    btn.textContent = `${wert}`;
    btn.setAttribute('data-druck', wert); // Hinzufügen des data-druck-Attributs
    btn.addEventListener('click', () => {
      const select = document.getElementById(selectId);
      select.innerHTML = `<option value="${wert}">${wert} bar</option>`;
      select.value = wert;
      closeDruckOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

// Funktion zum Schließen des Overlays
function closeDruckOverlay() {
  const overlay = document.getElementById('druck-overlay');
  overlay.style.display = 'none';
}

// Trupp wird nach dem Erstellen angezeigt
function renderTrupp(trupp) {
  const container = document.getElementById("trupp-container");
  const card = document.createElement("div");
  card.className = "trupp-card";
  card.id = `trupp-${trupp.id}`;

  const title = document.createElement("h2");
  title.textContent = trupp.name;
  card.appendChild(title);

  const agtInfo = document.createElement("p");
  agtInfo.id = `info-${trupp.id}`;
  agtInfo.innerHTML = `Truppführer: ${trupp.tf.name} (${trupp.tf.druck} bar)<br>Truppmann: ${trupp.tm.name} (${trupp.tm.druck} bar)`;
  card.appendChild(agtInfo);

  const startButton = document.createElement("button");
  startButton.textContent = "Trupp legt an";
  startButton.onclick = () => {
    startButton.style.display = "none";
    startTimer(trupp);
    ablegenBtn.style.display = "inline";

    const startKommentar = `Angelegt um ${new Date().toLocaleTimeString()}`;
    trupp.meldungen.push({ kommentar: startKommentar, tf: trupp.tf.druck, tm: trupp.tm.druck });
    zeigeMeldungen(trupp);
  };
  card.appendChild(startButton);

  const ablegenBtn = document.createElement("button");
  ablegenBtn.textContent = "Trupp legt ab";
  ablegenBtn.style.display = "none";
  ablegenBtn.onclick = () => {
    startButton.style.display = "inline";
    ablegen(trupp);
    ablegenBtn.style.display = "none";
  };
  card.appendChild(ablegenBtn);

  const loeschenBtn = document.createElement("button");
  loeschenBtn.textContent = "Trupp auflösen";
  loeschenBtn.onclick = () => {
    trupp.inaktiv = true;
    if (trupp.intervalRef) clearInterval(trupp.intervalRef);
    card.classList.remove("warnphase", "alarmphase", "aktiv");
    card.classList.add("inaktiv");

    // Hide interactive elements but keep meldungen visible
    const meldungForm = document.getElementById(`meldung-form-${trupp.id}`);
    const inputs = meldungForm.querySelectorAll("select, input, button");
    inputs.forEach(input => input.style.display = "none");
    startButton.style.display = "none";
    ablegenBtn.style.display = "none";
    loeschenBtn.style.display = "none";


  };
  card.appendChild(loeschenBtn);

  const timerDiv = document.createElement("div");
  timerDiv.id = `timer-${trupp.id}`;
  card.appendChild(timerDiv);

  const meldungForm = document.createElement("div");
  meldungForm.id = `meldung-form-${trupp.id}`;
  meldungForm.innerHTML = `
    <h3>Meldung:</h3>
    <label>Druck TF:</label>
    <select id="meldung-tf-${trupp.id}"></select>
    <label>Druck TM:</label>
    <select id="meldung-tm-${trupp.id}"></select>
    <label>Notiz:</label>
    <input type="text" id="notiz-${trupp.id}">
    <button onclick="meldung(${trupp.id})">Melden</button>
    <div id="meldungen-${trupp.id}"></div>
  `;
  card.appendChild(meldungForm);

  container.appendChild(card);
  setupMeldungDropdown(`meldung-tf-${trupp.id}`);
  setupMeldungDropdown(`meldung-tm-${trupp.id}`);
  card.classList.add(trupp.inaktiv ? "inaktiv" : "aktiv");
}

// Anzeigen der neuen Meldungen
function zeigeMeldungen(trupp) {
  const meldungDiv = document.getElementById(`meldungen-${trupp.id}`);
  meldungDiv.innerHTML = "";
  trupp.meldungen.forEach(m => {
    const p = document.createElement("p");
    p.textContent = `${m.kommentar} (TF: ${m.tf} bar, TM: ${m.tm} bar)`;
    meldungDiv.appendChild(p);
  });
}

// Event-Listener für das Schließen des Overlays
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-overlay');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDruckOverlay);
  }
});