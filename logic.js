// logic.js

const druckWerte = Array.from({ length: 11 }, (_, i) => 270 + i * 5); // 270 bis 320 in 5er-Schritten

const trupps = [];
let truppIdCounter = 0;


// Funktion zum Laden der Truppnamen
let truppNameVorschlaege = [];

async function ladeTruppnamen() {
  try {
    const response = await fetch('truppnamen.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Truppnamen: ${response.status}`);
    }
    truppNameVorschlaege = await response.json();
  } catch (error) {
    console.error('Konnte Truppnamen nicht laden:', error);
    truppNameVorschlaege = []; // Fallback: leeres Array
  }
}

// Hier werden die Truppnamen geladen
window.addEventListener('DOMContentLoaded', async () => {
  await ladeTruppnamen();
  // Jetzt kannst du mit truppNameVorschlaege weiterarbeiten
  console.log('Geladene Truppnamen:', truppNameVorschlaege);
});




// Funktion zum Erstellen eines Trupps
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
    timerDisplay.textContent = `Zeit seit letzter Meldung: ${min}:${sec}`;

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

// Neuen Druck bzw. Status melden
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

// Funktion zum Ablegen
function ablegen(trupp) {
  if (trupp.intervalRef) clearInterval(trupp.intervalRef);
  const zeit = new Date().toLocaleTimeString();
  trupp.meldungen.push({ kommentar: `${zeit}: Trupp hat abgelegt`, tf: trupp.tf.druck, tm: trupp.tm.druck });
  zeigeMeldungen(trupp);
  document.getElementById(`trupp-${trupp.id}`).classList.remove("warnphase", "alarmphase");
}