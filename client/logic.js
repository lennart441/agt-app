// logic.js
// Modul für zentrale Datenlogik, Synchronisation und Validierung
// Steuert das Datenmodell, die Speicherung, die API-Kommunikation und die Kernfunktionen für Trupps
// Wird von ui.js und overlays.js für alle datenbezogenen Operationen genutzt

// Druckwerte von 270 bis 320 in 5er-Schritten für die Auswahl
const druckWerte = Array.from({ length: 11 }, (_, i) => 270 + i * 5); // 270 bis 320 in 5er-Schritten

// Globale Variablen für Trupps und Vorschlagslisten
let trupps = [];
let truppIdCounter = 0;

let truppNameVorschlaege = [];
let agtlerNamen = [];
let auftragVorschlaege = [];

// URL für die Synchronisation mit dem Server
//const SYNC_API_URL = 'https://agt.ff-stocksee.de/v1/sync-api/trupps';
const SYNC_API_URL = 'http://localhost:3001/v1/sync-api/trupps';

// Token für die Operation, wird aus der URL gelesen
//let OPERATION_TOKEN = getTokenFromUrl();
let OPERATION_TOKEN = "abc123def456ghi7";

// Fester Gerätename (temporär)
const DEVICE_NAME = "AGT-Device";

// UUID für das Gerät, wird beim ersten Laden generiert und gespeichert
let DEVICE_UUID = localStorage.getItem('deviceUUID') || generateUUID();
if (!localStorage.getItem('deviceUUID')) {
  localStorage.setItem('deviceUUID', DEVICE_UUID);
}

/**
 * Generiert eine einfache UUID (für Demo-Zwecke)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    // Lade Trupps aus localStorage über die Helper-Funktion
    const truppsToSync = window.getAllTrupps();

    const response = await fetch(SYNC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operation-Token': OPERATION_TOKEN
      },
      body: JSON.stringify({
        trupps: truppsToSync,
        timestamp: Date.now(),
        deviceUUID: DEVICE_UUID,
        deviceName: DEVICE_NAME
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


// Initialisiert die Anwendung nach dem Laden der Seite
window.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([ladeTruppnamen(), ladeAgtlerNamen(), ladeAuftragVorschlaege()]);
  console.log('Geladene Truppnamen:', truppNameVorschlaege);
  console.log('Geladene Agtler-Namen:', agtlerNamen);
  console.log('Geladene Aufträge:', auftragVorschlaege);
  // Lade Trupps aus localStorage beim Start
  trupps = window.getAllTrupps();
  if (typeof renderAllTrupps === 'function') renderAllTrupps();
  
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
 * Startet einen Trupp (legt an) und setzt die Start- und Meldungszeit.
 * Fügt eine Meldung hinzu.
 */
window.handleTruppStart = function(trupp) {
  const now = Date.now();
  window.updateTruppData(trupp.id, {
    startZeit: now,
    lastMeldungZeit: now
  });
  window.addMeldungForTrupp(trupp.id, { kommentar: `Trupp legt an (${new Date(now).toLocaleTimeString()})`, zeit: now });
};

/**
 * Verarbeitet eine Druckmeldung/Notiz für einen Trupp.
 * Aktualisiert die Member-Daten und fügt eine Meldung hinzu.
 */
window.meldung = function(truppId) {
  const trupp = window.getTrupp(truppId);
  if (!trupp) return;
  const now = Date.now();
  const notiz = document.getElementById(`notiz-${truppId}`)?.value.trim() || "";
  let druckGeaendert = false;
  let errorMsg = "";
  const updatedMembers = trupp.members.map((m, idx) => {
    const druckDiv = document.getElementById(`meldung-${idx}-${truppId}`);
    const enteredDruck = druckDiv ? druckDiv.textContent.trim() : "";
    const druckNum = parseInt(enteredDruck);
    if (enteredDruck !== "" && (isNaN(druckNum) || druckNum > m.druck)) {
      errorMsg += `${m.name}: Es muss ein gültiger Druck ≤ aktueller Druck eingegeben werden.\n`;
    }
    if (enteredDruck !== "" && !isNaN(druckNum) && druckNum !== m.druck) {
      druckGeaendert = true;
    }
    return { ...m, druck: (!isNaN(druckNum) ? druckNum : m.druck) };
  });

  // Fall 1: Mindestens ein Druck geändert
  if (druckGeaendert) {
    if (errorMsg) {
      if (typeof showErrorOverlay === 'function') showErrorOverlay(errorMsg.trim());
      return;
    }
    window.updateTruppData(truppId, { members: updatedMembers, lastMeldungZeit: now });
    let kommentar = 'Druckmeldung';
    if (notiz) kommentar += `; Notiz: ${notiz}`;
    window.addMeldungForTrupp(truppId, {
      kommentar,
      members: updatedMembers,
      zeit: now
    });
    document.getElementById(`notiz-${truppId}`).value = "";
    return;
  }

  // Fall 2: Keine Drücke geändert, aber Notiz vorhanden
  if (!druckGeaendert && notiz) {
    window.addMeldungForTrupp(truppId, { kommentar: `Notiz: ${notiz}`, zeit: now });
    document.getElementById(`notiz-${truppId}`).value = "";
    return;
  }
};

/**
 * Validiert die Daten eines Mitglieds (Name und Druck).
 * Gibt true zurück, wenn gültig, sonst zeigt Fehler und gibt false zurück.
 */
window.validateMemberData = function(name, druck) {
  if (!name || typeof name !== 'string' || name.length < 2) {
    if (typeof showErrorOverlay === 'function') showErrorOverlay('Bitte einen gültigen Namen eingeben!');
    return false;
  }
  if (!druck || isNaN(druck) || druck < 10 || druck > 320) {
    if (typeof showErrorOverlay === 'function') showErrorOverlay('Bitte einen gültigen Druck (10-320 bar) eingeben!');
    return false;
  }
  return true;
};

