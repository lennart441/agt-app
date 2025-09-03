// logic.js
// Modul für zentrale Datenlogik, Synchronisation und Validierung
// Steuert das Datenmodell, die Speicherung, die API-Kommunikation und die Kernfunktionen für Trupps
// Wird von ui.js und overlays.js für alle datenbezogenen Operationen genutzt

// Druckwerte von 270 bis 320 in 5er-Schritten für die Auswahl
const druckWerte = Array.from({ length: 11 }, (_, i) => 270 + i * 5); // 270 bis 320 in 5er-Schritten

// Globale Variablen für Trupps und Vorschlagslisten
const trupps = [];
let truppIdCounter = 0;

let truppNameVorschlaege = [];
let agtlerNamen = [];
let auftragVorschlaege = [];

// URL für die Synchronisation mit dem Server
const SYNC_API_URL = 'https://agt.ff-stocksee.de/v1/sync-api/trupps';
//const SYNC_API_URL = 'http://localhost:3001/v1/sync-api/trupps';

// Token für die Operation, wird aus der URL gelesen
//let OPERATION_TOKEN = getTokenFromUrl();
let OPERATION_TOKEN = "abc123def456ghi7";


/**
 * Liest den Token aus der URL (?token=...)
 */
function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

/**
 * Setzt den Token in die URL und aktualisiert die globale Variable
 */
function setTokenInUrl(token) {
  const params = new URLSearchParams(window.location.search);
  params.set('token', token);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  OPERATION_TOKEN = token;
}

/**
 * Lädt die Truppnamen-Vorschläge aus einer lokalen JSON-Datei
 */
async function ladeTruppnamen() {
  try {
    const response = await fetch('truppnamen.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Truppnamen: ${response.status}`);
    }
    truppNameVorschlaege = await response.json();
  } catch (error) {
    console.error('Konnte Truppnamen nicht laden:', error);
    truppNameVorschlaege = [];
  }
}

/**
 * Lädt die AGTler-Namen-Vorschläge aus einer lokalen JSON-Datei
 */
async function ladeAgtlerNamen() {
  try {
    const response = await fetch('agtler.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Agtler-Namen: ${response.status}`);
    }
    agtlerNamen = await response.json();
  } catch (error) {
    console.error('Konnte Agtler-Namen nicht laden:', error);
    agtlerNamen = [];
  }
}

/**
 * Lädt die Auftrags-Vorschläge aus einer lokalen JSON-Datei
 */
async function ladeAuftragVorschlaege() {
  try {
    const response = await fetch('auftrag.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Aufträge: ${response.status}`);
    }
    auftragVorschlaege = await response.json();
  } catch (error) {
    console.error('Konnte Aufträge nicht laden:', error);
    auftragVorschlaege = [];
  }
}

/**
 * Synchronisiert die aktuellen Truppdaten mit dem Server
 */
async function syncTruppsToServer() {
  try {
    const response = await fetch(SYNC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operation-Token': OPERATION_TOKEN
      },
      body: JSON.stringify({
        trupps: trupps,
        timestamp: Date.now()
      })
    });
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
    console.log('Trupps successfully synced to server');
  } catch (error) {
    console.error('Error syncing trupps:', error);
  }
}

/**
 * Speichert inaktive Trupps im Local Storage des Browsers
 */
function saveTruppsToLocalStorage() {
  const serializableTrupps = trupps
    .filter(t => t.inaktiv)
    .map(t => ({
      id: t.id,
      name: t.name,
      mission: t.mission,
      previousMission: t.previousMission,
      members: t.members.map(m => ({
        name: m.name,
        druck: m.druck,
        role: m.role
      })),
      meldungen: t.meldungen.map(m => ({
        kommentar: m.kommentar,
        members: m.members ? m.members.map(mem => ({
          role: mem.role,
          druck: mem.druck
        })) : undefined
      })),
      hatWarnungErhalten: t.hatWarnungErhalten,
      inaktiv: t.inaktiv,
      notfallAktiv: t.notfallAktiv
    }));
  localStorage.setItem('trupps', JSON.stringify(serializableTrupps));
}

/**
 * Lädt gespeicherte Trupps aus dem Local Storage und rendert sie
 */
function loadTruppsFromLocalStorage() {
  const storedTrupps = localStorage.getItem('trupps');
  if (storedTrupps) {
    try {
      const parsedTrupps = JSON.parse(storedTrupps);
      const maxStoredId = parsedTrupps.length > 0 
        ? Math.max(...parsedTrupps.map(t => t.id || 0), 0)
        : 0;
      truppIdCounter = Math.max(truppIdCounter, maxStoredId + 1);
      
      parsedTrupps.forEach(trupp => {
        if (!trupp.id || trupps.some(t => t.id === trupp.id)) {
          trupp.id = truppIdCounter++;
        }
        trupp.inaktiv = true;
        trupp.intervalRef = null;
        trupp.startZeit = null;
        trupp.timer = null;
        trupp.notfallAktiv = trupp.notfallAktiv || false;
        trupp.mission = trupp.mission || '';
        trupp.previousMission = trupp.previousMission || '';
        trupp.meldungen = trupp.meldungen || [];
        trupp.hatWarnungErhalten = trupp.hatWarnungErhalten || false;
        trupp.members = trupp.members || [];
        trupp.meldungen = trupp.meldungen.map(m => ({
          kommentar: m.kommentar || '',
          members: m.members ? m.members.map(mem => ({
            role: mem.role || '',
            druck: mem.druck || 0
          })) : undefined
        }));
        trupps.push(trupp);
        // Entferne renderArchivTrupp(trupp) aus loadTruppsFromLocalStorage
        //if (trupp.inaktiv) {
        //  renderArchivTrupp(trupp);
        //}
      });
    } catch (error) {
      console.error('Fehler beim Laden der Trupps aus Local Storage:', error);
      localStorage.removeItem('trupps'); // Clear corrupted data
    }
  }
}

// Initialisiert die Anwendung nach dem Laden der Seite
window.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([ladeTruppnamen(), ladeAgtlerNamen(), ladeAuftragVorschlaege()]);
  console.log('Geladene Truppnamen:', truppNameVorschlaege);
  console.log('Geladene Agtler-Namen:', agtlerNamen);
  console.log('Geladene Aufträge:', auftragVorschlaege);
  loadTruppsFromLocalStorage();
  
  // Start automatic sync every 2 seconds
  setInterval(syncTruppsToServer, 2000);

  addTokenButton();
});

/**
 * Liest den Wert eines .fake-input Feldes aus
 */
function getFakeInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.textContent.trim() : '';
}

/**
 * Liest den Wert eines Meldungs-Druckfeldes aus (fake-input)
 */
function getMeldungDruckValue(id) {
  const el = document.getElementById(id);
  return el ? el.textContent.replace(' bar', '').trim() : '';
}

/**
 * Erstellt einen neuen Trupp aus den Formulareingaben und rendert ihn
 */
function createTrupp() {
  const truppName = getFakeInputValue('trupp-name-input');
  const mission = getFakeInputValue('trupp-mission-display');
  const memberDivs = document.querySelectorAll('#trupp-members .trupp-member');
  const members = Array.from(memberDivs).map((div, idx) => {
    let name, druck, role;
    if (idx === 0) {
      name = getFakeInputValue('tf-name');
      druck = getFakeInputValue('tf-druck');
      role = 'TF';
    } else {
      name = getFakeInputValue(`tm${idx}-name`);
      druck = getFakeInputValue(`tm${idx}-druck`);
      role = `TM${idx}`;
    }
    return {
      name: name,
      druck: parseInt(druck),
      role: role
    };
  });
  // Validierung: Truppname, alle Namen und alle Druckwerte müssen vorhanden sein
  if (!truppName || !mission || members.some(m => !m.name || !m.druck)) {
    showErrorOverlay('Bitte alle Felder ausfüllen!');
    return;
  }
  // Validate that all members have at least 270 bar
  const invalidMembers = members.filter(member => member.druck < 270);
  if (invalidMembers.length > 0) {
    showErrorOverlay("Alle Truppmitglieder müssen mindestens 270 bar haben.");
    return;
  }
  const trupp = {
    id: Date.now(),
    name: truppName,
    mission: mission,
    previousMission: '',
    members: members,
    meldungen: [],
    hatWarnungErhalten: false,
    timer: 0,
    startZeit: null,
    inaktiv: false,
    intervalRef: null,
    notfallAktiv: false
  };
  window.saveTrupp(trupp);
  renderTrupp(trupp);
  document.getElementById('trupp-form-wrapper').style.display = 'none';
  // Reset form
  const truppForm = document.getElementById('trupp-members');
  truppForm.innerHTML = `
    <div class="trupp-member">
      <label>Truppführer Name:</label>
      <input type="text" id="tf-name" onclick="showNameOverlay('tf-name')">
      <label>Druck:</label>
      <input type="text" id="tf-druck" onclick="showDruckOverlay('tf-druck')">
    </div>
    <div class="trupp-member">
      <label>Truppmann 1 Name:</label>
      <input type="text" id="tm1-name" onclick="showNameOverlay('tm1-name')">
      <label>Druck:</label>
      <input type="text" id="tm1-druck" onclick="showDruckOverlay('tm1-druck')">
    </div>
  `;
  selectedMission = '';
  memberCounter = 2;
  syncTruppsToServer();
}

/**
 * Startet den Timer für einen Trupp und aktualisiert die Anzeige
 */
function startTimer(trupp) {
  trupp.startZeit = Date.now();
  const card = document.getElementById(`trupp-${trupp.id}`);
  const timerDiv = document.getElementById(`timer-${trupp.id}`);

  if (trupp.intervalRef) clearInterval(trupp.intervalRef);

  trupp.intervalRef = setInterval(() => {
    const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
    const min = Math.floor(vergangen / 60).toString().padStart(2, '0');
    const sec = (vergangen % 60).toString().padStart(2, '0');
    timerDiv.textContent = `Zeit seit letzter Meldung: ${min}:${sec}`;

    // Aktualisiere trupp.timer mit der vergangenen Zeit in ms
    trupp.timer = vergangen * 1000;

    if (vergangen > 600) {
      card.classList.remove("warnphase");
      card.classList.add("alarmphase");
    } else if (vergangen > 540) {
      card.classList.add("warnphase");
      card.classList.remove("alarmphase");
    } else {
      card.classList.remove("warnphase", "alarmphase");
    }

    // Neue Bedingung: Nach 12 Minuten das Druck-Erinnerungs-Overlay öffnen
    // console.log('Trupp Timer:', trupp.timer, 'Bedingung erreicht?', trupp.timer >= 12 * 60 * 1000);
    // Optional: Wenn Timer in Sekunden läuft, verwende diese Bedingung stattdessen:
    // if (trupp.timer >= 12 * 60 && !trupp.pressureReminderShown) { // 12 Minuten in Sekunden
    if (trupp.timer >= 12 * 60 * 1000 && !trupp.pressureReminderShown) { // 12 Minuten in ms
      // console.log('Overlay wird geöffnet für Trupp:', trupp.id);
      showPressureReminderOverlay(trupp.id);
      trupp.pressureReminderShown = true; // Flag setzen
    }
  }, 1000);
}

/**
 * Verarbeitet eine neue Druckmeldung oder nur eine Notiz für einen Trupp
 */
function meldung(id) {
  const trupp = getTrupp(id);
  if (!trupp) return;
  const memberDruckInputs = trupp.members.map((_, index) => {
    const druckValue = getMeldungDruckValue(`meldung-${index}-${id}`);
    return {
      druck: druckValue === '' ? null : parseInt(druckValue),
      role: index === 0 ? "TF" : `TM${index}`
    };
  });
  const notizInput = document.getElementById(`notiz-${id}`);
  const notiz = notizInput ? notizInput.value : '';
  const zeit = new Date().toLocaleTimeString();
  const alleDruckeVorhanden = memberDruckInputs.every((input) => input.druck !== null && !isNaN(input.druck));
  if (alleDruckeVorhanden) {
    for (let i = 0; i < memberDruckInputs.length; i++) {
      const currentDruck = memberDruckInputs[i].druck;
      const lastDruck = trupp.members[i].druck;
      if (isNaN(currentDruck) || currentDruck > lastDruck) {
        showErrorOverlay("Druck darf nicht höher sein als bei der letzten Meldung oder beim Anlegen.");
        return;
      }
    }
    trupp.members.forEach((member, index) => {
      member.druck = memberDruckInputs[index].druck;
    });
    addMeldungToTrupp(id, { kommentar: `${zeit}: ${notiz}`, members: memberDruckInputs });
    trupp.members.forEach((_, index) => {
      setFakeInputValue(`meldung-${index}-${id}`, '');
    });
    if (!trupp.inaktiv && trupp.startZeit) {
      startTimer(trupp);
    }
  } else if (notiz.trim() !== '') {
    addMeldungToTrupp(id, { kommentar: `${zeit}: ${notiz}` });
  } else {
    showErrorOverlay("Bitte entweder alle Druckwerte angeben oder eine Notiz eintragen.");
    return;
  }
  if (notizInput) notizInput.value = '';
  renderTrupp(trupp);
}

/**
 * Markiert einen Trupp als abgelegt und speichert dies
 */
function ablegen(trupp) {
  updateTrupp(trupp.id, { inaktiv: true });
  renderTrupp(trupp);
  return true;
}

/**
 * Bestätigt oder beendet einen Notfall für einen Trupp
 */
function confirmNotfall(truppId, isEndNotfall) {
  const trupp = getTrupp(truppId);
  const zeit = new Date().toLocaleTimeString();
  addMeldungToTrupp(truppId, { kommentar: `${zeit}: ${isEndNotfall ? 'AGT Notfall beendet' : 'AGT Notfall ausgelöst'}` });
  updateTrupp(truppId, { notfallAktiv: !isEndNotfall });
  renderTrupp(trupp);
  closeNotfallOverlay();
}

/**
 * Aktualisiert den Auftrag eines Trupps und speichert die Änderung
 */
function updateMission(truppId, newMission) {
  const trupp = getTrupp(truppId);
  if (newMission && newMission !== trupp.mission) {
    const zeit = new Date().toLocaleTimeString();
    addMeldungToTrupp(truppId, { kommentar: `${zeit}: Trupp hatte den Auftrag '${trupp.mission}' und hat jetzt den Auftrag '${newMission}'` });
    updateTrupp(truppId, { previousMission: trupp.mission, mission: newMission });
    renderTrupp(trupp);
  }
}

/**
 * Fügt ein Mitglied zu einem Trupp hinzu
 */
function addMemberToTruppLogic(truppId, name, druckRaw) {
  let druck = typeof druckRaw === 'string' ? parseInt(druckRaw.replace(/[^0-9]/g, ''), 10) : druckRaw;
  if (!name || isNaN(druck) || druck < 270) {
    showErrorOverlay('Bitte gültigen Namen und Druck (mind. 270 bar) angeben.');
    return;
  }
  addMemberToTrupp(truppId, { name, druck, role: `TM${getTrupp(truppId).members.length}` });
  renderTrupp(getTrupp(truppId));
}