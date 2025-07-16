// app.js



const druckWerte = Array.from({ length: 11 }, (_, i) => 270 + i * 5); // 270 bis 320 in 5er-Schritten
const truppNameVorschlaege = ["Angriffstrupp", "Wassertrupp", "Sicherheitstrupp", "Schlauchtrupp"];

const trupps = [];
let truppIdCounter = 0;

// Funktion zum zeigen eines neuen Trupp Formulares
function showTruppForm() {
  const formWrapper = document.getElementById("trupp-form-wrapper");
  formWrapper.style.display = formWrapper.style.display === "none" ? "block" : "none";
  fülleDruckDropdown("tf-druck");
  fülleDruckDropdown("tm-druck");
  fülleTruppnamenDropdown();
}

// Funktion zum erstellen des Druck Dropdown Menüs 
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

// Funktion zum erstellen der Eingabefelder für die Namen der Truppleute
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




// Funktion zum erstellen eines Trupps
function createTrupp() {
  const tfName = document.getElementById("tf-name").value;
  const tmName = document.getElementById("tm-name").value;
  const tfDruck = parseInt(document.getElementById("tf-druck").value);
  const tmDruck = parseInt(document.getElementById("tm-druck").value);
  const truppName = document.getElementById("trupp-name-select").value;

  const trupp = {
    id: truppIdCounter++,
    name: truppName,
    tf: { name: tfName, druck: tfDruck },
    tm: { name: tmName, druck: tmDruck },
    meldungen: [],
    timer: null,
    startZeit: null,
    intervalRef: null
  };
  trupps.push(trupp);
  renderTrupp(trupp);
  document.getElementById("trupp-form-wrapper").style.display = "none";
}


// Trupp wird nach dem erstellen angezeigt
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

  }
  card.appendChild(ablegenBtn);

  const loeschenBtn = document.createElement("button");
  loeschenBtn.textContent = "Trupp auflösen";
  loeschenBtn.onclick = () => {
    document.getElementById(`trupp-${trupp.id}`).remove();
    const index = trupps.findIndex(t => t.id === trupp.id);
    if (index > -1) trupps.splice(index, 1);
    clearInterval(trupp.intervalRef);
  };
  card.appendChild(loeschenBtn);

  const timerDiv = document.createElement("div");
  timerDiv.id = `timer-${trupp.id}`;
  card.appendChild(timerDiv);

  const meldungForm = document.createElement("div");
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
  fülleDruckDropdown(`meldung-tf-${trupp.id}`);
  fülleDruckDropdown(`meldung-tm-${trupp.id}`);
}


// Startet Timer
function startTimer(trupp) {
  trupp.startZeit = Date.now();
  const card = document.getElementById(`trupp-${trupp.id}`);
  const timerDisplay = document.getElementById(`timer-${trupp.id}`);

  if (trupp.intervalRef) clearInterval(trupp.intervalRef);

  trupp.intervalRef = setInterval(() => {
    const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
    const min = Math.floor(vergangen / 60).toString().padStart(2, '0');
    const sec = (vergangen % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `Zeit seit Start: ${min}:${sec}`;

    if (vergangen > 600) {
      card.classList.remove("warnphase");
      card.classList.add("alarmphase");
    } else if (vergangen > 540) {
      card.classList.add("warnphase");
      card.classList.remove("alarmphase");
    } else {
      card.classList.remove("warnphase", "alarmphase");
    }
  }, 1000);
}


// neuen Druck bzw Status melden
function meldung(id) {
  const trupp = trupps.find(t => t.id === id);
  const tfDruck = parseInt(document.getElementById(`meldung-tf-${id}`).value);
  const tmDruck = parseInt(document.getElementById(`meldung-tm-${id}`).value);
  const notiz = document.getElementById(`notiz-${id}`).value;
  const zeit = new Date().toLocaleTimeString();

  const letzteMeldung = trupp.meldungen.length > 0
    ? trupp.meldungen[trupp.meldungen.length - 1]
    : { tf: trupp.tf.druck, tm: trupp.tm.druck };

  if (tfDruck > letzteMeldung.tf || tmDruck > letzteMeldung.tm) {
    alert("Druck darf nicht höher sein als bei der letzten Meldung oder beim Anlegen.");
    return;
  }

  trupp.tf.druck = tfDruck;
  trupp.tm.druck = tmDruck;

  document.getElementById(`info-${id}`).innerHTML =
    `Truppführer: ${trupp.tf.name} (${trupp.tf.druck} bar)<br>Truppmann: ${trupp.tm.name} (${trupp.tm.druck} bar)`;

  trupp.meldungen.push({ kommentar: `${zeit}: ${notiz}`, tf: tfDruck, tm: tmDruck });
  zeigeMeldungen(trupp);
  startTimer(trupp);

  if (tfDruck <= 160 || tmDruck <= 160) {
    const warnung = document.createElement("div");
    warnung.className = "warnung";
    warnung.textContent = `⚠️ Warnung: Rückzug! Einer der Träger hat unter 50% Luft.`;
    document.getElementById(`trupp-${id}`).appendChild(warnung);
  }
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


// Funktion zum ablegen
function ablegen(trupp) {
  if (trupp.intervalRef) clearInterval(trupp.intervalRef);
  const zeit = new Date().toLocaleTimeString();
  trupp.meldungen.push({ kommentar: `${zeit}: Trupp hat abgelegt`, tf: trupp.tf.druck, tm: trupp.tm.druck });
  zeigeMeldungen(trupp);
  document.getElementById(`trupp-${trupp.id}`).classList.remove("warnphase", "alarmphase");
}
