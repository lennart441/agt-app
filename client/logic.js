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
//const SYNC_API_URL = 'https://agt.ff-stocksee.de/v1/sync-api/trupps';
const SYNC_API_URL = 'http://localhost:3001/v1/sync-api/trupps';

// Token für die Operation, wird aus der URL gelesen
let OPERATION_TOKEN = getTokenFromUrl();

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
  // Alle Mitglieder dynamisch auslesen
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
    id: truppIdCounter++,
    name: truppName,
    mission: mission,
    previousMission: '',
    members: members,
    meldungen: [],
    hatWarnungErhalten: false,
    timer: null,
    startZeit: null,
    inaktiv: false,
    intervalRef: null,
    notfallAktiv: false
  };
  // Bei Trupp-Initialisierung oder -Erstellung:
  if (trupp.timer === null || trupp.timer === undefined) {
    trupp.timer = 0; // Initialisiere auf 0 ms
  }
  trupps.push(trupp);
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
  const trupp = trupps.find(t => t.id === id);
  // Druckwerte auslesen aus fake-input
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

  // Find the last meldung with members, or fall back to initial members
  let letzteMeldung = trupp.meldungen.slice().reverse().find(m => m.members)?.members;
  if (!letzteMeldung) {
    letzteMeldung = trupp.members.map(m => ({ role: m.role, druck: m.druck }));
  }

  // Prüfen, ob alle Druckwerte angegeben wurden
  const alleDruckeVorhanden = memberDruckInputs.every((input) => input.druck !== null && !isNaN(input.druck));

  if (alleDruckeVorhanden) {
    // Normale Druckmeldung: Prüfen, ob Werte gültig sind
    for (let i = 0; i < memberDruckInputs.length; i++) {
      const currentDruck = memberDruckInputs[i].druck;
      // Robust: Fallback auf aktuellen Wert, falls keine letzte Meldung für die Rolle existiert
      const lastEntry = letzteMeldung.find(m => m.role === memberDruckInputs[i].role);
      const lastDruck = lastEntry ? lastEntry.druck : trupp.members[i].druck;
      if (isNaN(currentDruck) || currentDruck > lastDruck) {
        showErrorOverlay("Druck darf nicht höher sein als bei der letzten Meldung oder beim Anlegen.");
        return;
      }
    }
    // Druckwerte übernehmen
    trupp.members.forEach((member, index) => {
      member.druck = memberDruckInputs[index].druck;
    });
    document.getElementById(`info-${id}`).innerHTML = trupp.members
      .map(m => `${m.role === "TF" ? "Truppführer" : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
      .join("<br>");
    trupp.meldungen.push({ kommentar: `${zeit}: ${notiz}`, members: memberDruckInputs });
    // Nach erfolgreicher Druckmeldung alle Druckfelder leeren
    trupp.members.forEach((_, index) => {
      setFakeInputValue(`meldung-${index}-${id}`, '');
    });
    if (!trupp.inaktiv && trupp.startZeit) {
      startTimer(trupp); // Timer wird zurückgesetzt
    }
    if (!trupp.hatWarnungErhalten && trupp.members.some(m => m.druck <= 160)) {
      const warnung = document.createElement("div");
      warnung.className = "warnung";
      warnung.textContent = `⚠️ Warnung: Einer der Träger hat unter 50% Luft.`;
      document.getElementById(`trupp-${id}`).appendChild(warnung);
      trupp.hatWarnungErhalten = true;
    }
  } else if (notiz.trim() !== '') {
    // Nur Notiz, keine neuen Druckwerte: Timer bleibt stehen
    trupp.meldungen.push({ kommentar: `${zeit}: ${notiz}` });
    // Druckwerte und Anzeige bleiben unverändert
  } else {
    showErrorOverlay("Bitte entweder alle Druckwerte angeben oder eine Notiz eintragen.");
    return;
  }

  // Clear the notiz field after einer erfolgreichen Meldung
  if (notizInput) notizInput.value = '';

  updateTruppCard(trupp); // Update the trupp card to reflect new pressure values
  syncTruppsToServer(); // Sync after meldung
}

/**
 * Markiert einen Trupp als abgelegt und speichert dies
 */
function ablegen(trupp) {
  // Neue Druckwerte aus dem Meldungsformular holen (konsistent mit meldung Funktion)
  const druckInputs = trupp.members.map((_, index) => {
    const druckValue = getMeldungDruckValue(`meldung-${index}-${trupp.id}`);
    return {
      druck: druckValue === '' ? null : parseInt(druckValue),
      role: index === 0 ? "TF" : `TM${index}`
    };
  });

  // Prüfen, ob alle Druckwerte vorhanden und gültig sind
  const alleDruckeVorhanden = druckInputs.every(input => input.druck !== null && !isNaN(input.druck));
  if (!alleDruckeVorhanden) {
    showErrorOverlay("Bitte für alle Truppmitglieder einen Druckwert eintragen.");
    return false;
  }

  // Prüfen, ob kein Wert höher als der aktuelle Wert ist
  for (let i = 0; i < druckInputs.length; i++) {
    const currentDruck = druckInputs[i].druck;
    const lastDruck = trupp.members[i].druck;
    if (currentDruck > lastDruck) {
      showErrorOverlay("Der abgelegte Druck darf nicht höher als der aktuelle Druck sein.");
      return false;
    }
  }

  // Druckwerte übernehmen
  trupp.members.forEach((member, index) => {
    member.druck = druckInputs[index].druck;
  });

  if (trupp.intervalRef) clearInterval(trupp.intervalRef);
  trupp.startZeit = null; // Reset startZeit to indicate trupp is not active
  trupp.inaktiv = true; // Mark as inactive
  const zeit = new Date().toLocaleTimeString();
  trupp.meldungen.push({ kommentar: `${zeit}: Trupp hat abgelegt`, members: druckInputs });
  //zeigeMeldungen(trupp);
  document.getElementById(`trupp-${trupp.id}`).classList.remove("warnphase", "alarmphase");
  saveTruppsToLocalStorage();
  syncTruppsToServer(); // Sync after ablegen
  return true;
}

/**
 * Bestätigt oder beendet einen Notfall für einen Trupp
 */
function confirmNotfall(truppId, isEndNotfall) {
  const trupp = trupps.find(t => t.id === truppId);
  const zeit = new Date().toLocaleTimeString();
  trupp.meldungen.push({ kommentar: `${zeit}: ${isEndNotfall ? 'AGT Notfall beendet' : 'AGT Notfall ausgelöst'}` });
  trupp.notfallAktiv = !isEndNotfall;
  zeigeMeldungen(trupp);
  const card = document.getElementById(`trupp-${truppId}`);
  const notfallBtn = card.querySelector('.notfall-btn');
  notfallBtn.textContent = trupp.notfallAktiv ? "AGT Notfall beenden" : "AGT Notfall";
  closeNotfallOverlay();
  updateTruppCard(trupp); // Update card to reflect notfall status
  syncTruppsToServer(); // Sync after notfall
}

/**
 * Aktualisiert den Auftrag eines Trupps und speichert die Änderung
 */
function updateMission(truppId, newMission) {
  const trupp = trupps.find(t => t.id === truppId);
  if (newMission && newMission !== trupp.mission) {
    const zeit = new Date().toLocaleTimeString();
    const oldMission = trupp.mission || 'Kein Auftrag';
    trupp.meldungen.push({ 
      kommentar: `${zeit}: Trupp hatte den Auftrag '${oldMission}' und hat jetzt den Auftrag '${newMission}'`
    });
    trupp.previousMission = trupp.mission;
    trupp.mission = newMission;
    zeigeMeldungen(trupp);
    const missionDisplay = document.getElementById(`mission-${trupp.id}`);
    missionDisplay.innerHTML = `
      <strong>Auftrag: ${trupp.mission}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}
    `;
    syncTruppsToServer(); // Sync after mission update
  }
}

/**
 * Fügt ein Mitglied zu einem Trupp hinzu
 */
function addMemberToTrupp(truppId, name, druckRaw) {
    const trupp = getTruppById(truppId);
    // Validierung
    let druck = typeof druckRaw === 'string' ? parseInt(druckRaw.replace(/[^0-9]/g, ''), 10) : druckRaw;
    if (!trupp || !name || isNaN(druck) || druck < 270) {
        showErrorOverlay('Bitte gültigen Namen und Druck (mind. 270 bar) angeben.');
        return;
    }
    // Rolle für neues Mitglied bestimmen
    const nextIndex = trupp.members.length;
    const role = `TM${nextIndex}`;
    trupp.members.push({ name, druck, role });
    // Log-Nachricht erzeugen
    const now = new Date().toLocaleString();
    if (!trupp.meldungen) trupp.meldungen = [];
    trupp.meldungen.push({ kommentar: `Mitglied ${name} mit ${druck} bar hinzugefügt am ${now}` });
    // UI aktualisieren
    saveTruppsToLocalStorage();
    renderTrupp(trupp);
    zeigeMeldungen(trupp);
    // Timer ggf. weiterführen
    if (!trupp.inaktiv && trupp.startZeit) {
      startTimer(trupp);
    }
    syncTruppsToServer();
}

/**
 * Aktualisiert die Grafik/Balken eines Trupps
 */
function updateTruppBar(trupp) {
    const minDruck = Math.min(...trupp.members.map(m => m.druck));
    const maxDruck = Math.max(...trupp.members.map(m => m.druck));
    const drittel = (maxDruck - minDruck) / 3;
    const farben = ['red', 'yellow', 'green'];
    const balken = document.getElementById(`balken-${trupp.id}`);
    if (balken) {
      const gesamtDruck = trupp.members.reduce((sum, m) => sum + m.druck, 0);
      const avgDruck = gesamtDruck / trupp.members.length;
      let farbe = 'green';
      if (avgDruck < minDruck + drittel) {
        farbe = 'red';
      } else if (avgDruck < minDruck + 2 * drittel) {
        farbe = 'yellow';
      }
      balken.style.width = `${avgDruck - minDruck}px`;
      balken.style.backgroundColor = farbe;
    }
}

/**
 * Hilfsfunktion, um einen Trupp anhand der ID zu finden
 */
function getTruppById(truppId) {
  // Annahme: trupps ist ein Array aller Trupps
  return trupps.find(t => t.id === truppId);
}