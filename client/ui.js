// ui.js
// Modul für die UI-Logik und das Rendering der Truppkarten
// Steuert die Darstellung, Interaktion und Aktualisierung der Truppkarten im Haupt-UI
// Overlay-Interaktionen werden an overlays.js delegiert

// Alle Funktionen werden als window-Funktionen verwendet
let memberCounter = 2;
let selectedMission = '';

/**
 * Zeigt das Formular zum Erstellen eines neuen Trupps an oder versteckt es.
 */
function showTruppForm() {
  const formWrapper = document.getElementById("trupp-form-wrapper");
  formWrapper.style.display = formWrapper.style.display === "none" ? "flex" : "none";
  setFakeInputValue('trupp-name-input', '');
  setFakeInputValue('trupp-mission-display', '');
  setFakeInputValue('tf-name', '');
  setFakeInputValue('tf-druck', '');
  setFakeInputValue('tm1-name', '');
  setFakeInputValue('tm1-druck', '');
  // Mitglieder auf Standard zurücksetzen
  const membersDiv = document.getElementById("trupp-members");
  membersDiv.innerHTML = `
    <div class="trupp-member">
      <label>Truppführer Name:</label>
      <div id="tf-name" class="fake-input" onclick="showNameOverlay('tf-name')"></div>
      <label>Druck:</label>
      <div id="tf-druck" class="fake-input" onclick="showDruckOverlay('tf-druck')"></div>
    </div>
    <div class="trupp-member">
      <label>Truppmann 1 Name:</label>
      <div id="tm1-name" class="fake-input" onclick="showNameOverlay('tm1-name')"></div>
      <label>Druck:</label>
      <div id="tm1-druck" class="fake-input" onclick="showDruckOverlay('tm1-druck')"></div>
    </div>
  `;
  memberCounter = 2;
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
    <div id="tm${memberCounter}-name" class="fake-input" onclick="showNameOverlay('tm${memberCounter}-name')"></div>
    <label>Druck:</label>
    <div id="tm${memberCounter}-druck" class="fake-input" onclick="showDruckOverlay('tm${memberCounter}-druck')"></div>
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
 * Rendert alle Trupps im UI.
 */
function renderAllTrupps() {
  const container = document.getElementById("trupp-container");
  container.innerHTML = "";
  // Hole IMMER die aktuellen Truppdaten aus Local Storage
  window.getAllTrupps().filter(t => !t.inaktiv).forEach(trupp => {
    renderTrupp(trupp);
  });
}

/**
 * Rendert eine Trupp-Karte im UI mit allen Buttons und Infos.
 * @param {object} trupp - Das Trupp-Objekt mit allen Daten.
 */
function renderTrupp(trupp) {
  const container = document.getElementById("trupp-container");
  let card = document.getElementById(`trupp-${trupp.id}`);
  if (!card) {
    card = document.createElement("div");
    card.className = "trupp-card";
    card.id = `trupp-${trupp.id}`;
    container.appendChild(card);
  } else {
    card.innerHTML = "";
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
    handleTruppStart(trupp);
  };
  card.appendChild(startButton);

  const ablegenBtn = document.createElement("button");
  ablegenBtn.textContent = "Trupp legt ab";
  ablegenBtn.onclick = () => {
    const now = Date.now();
    let errorMsg = "";
    let druckChanged = false;
    const updatedMembers = trupp.members.map((m, idx) => {
      const druckDiv = document.getElementById(`meldung-${idx}-${trupp.id}`);
      const enteredDruck = druckDiv ? parseInt(druckDiv.textContent.trim()) : undefined;
      if (enteredDruck === undefined || isNaN(enteredDruck)) {
        errorMsg += `${m.name}: Es muss ein gültiger Druck für jedes Mitglied eingegeben werden.\n`;
      } else if (enteredDruck > m.druck) {
        errorMsg += `${m.name}: Neuer Druck (${enteredDruck}) darf nicht höher als aktueller Druck (${m.druck}) sein.\n`;
      }
      if (!isNaN(enteredDruck) && enteredDruck !== m.druck) druckChanged = true;
      return { ...m, druck: (!isNaN(enteredDruck) ? enteredDruck : m.druck) };
    });
    if (errorMsg) {
      if (typeof showErrorOverlay === 'function') showErrorOverlay(errorMsg.trim());
      return;
    }
    window.updateTruppData(trupp.id, { members: updatedMembers, startZeit: null, lastMeldungZeit: null });
    window.addMeldungForTrupp(trupp.id, { kommentar: `Trupp legt ab (${new Date(now).toLocaleTimeString()})`, members: updatedMembers, zeit: now });
  };
  card.appendChild(ablegenBtn);

  const notfallBtn = document.createElement("button");
  notfallBtn.className = "notfall-btn";
  notfallBtn.textContent = trupp.notfallAktiv ? "AGT Notfall beenden" : "AGT Notfall";
  notfallBtn.onclick = () => {
    showNotfallOverlay(trupp.id, trupp.notfallAktiv);
  };
  card.appendChild(notfallBtn);

  const loeschenBtn = document.createElement("button");
  loeschenBtn.textContent = "Trupp auflösen";
  loeschenBtn.onclick = () => {
    window.dissolveTrupp(trupp.id);
  };
  card.appendChild(loeschenBtn);

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
      <div id="meldung-${index}-${trupp.id}" class="fake-input" onclick="showDruckOverlay('meldung-${index}-${trupp.id}')"></div>
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
  if (trupp.notfallAktiv) {
    card.classList.add("notfall");
  } else {
    card.classList.remove("notfall");
  }

  // Timer-UI wie v1: Live-Anzeige, Minuten:Sekunden, jede Sekunde aktualisieren
  let timerDiv = card.querySelector(`#timer-${trupp.id}`);
  if (!timerDiv) {
    timerDiv = document.createElement("div");
    timerDiv.id = `timer-${trupp.id}`;
    timerDiv.className = 'timer-bold';
    card.appendChild(timerDiv);
  }
  let diff = 0;
  if (!trupp.inaktiv && trupp.startZeit) {
    let baseTime = trupp.startZeit;
    if (trupp.lastMeldungZeit && trupp.lastMeldungZeit > trupp.startZeit) {
      baseTime = trupp.lastMeldungZeit;
    }
    function updateTimer() {
      const now = Date.now();
      diff = Math.floor((now - baseTime) / 1000); // Sekunden seit letzter Meldung
      const min = Math.floor(diff / 60);
      const sec = Math.floor((diff % 60));
      timerDiv.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
      // CSS-Klassen für warnphase und alarmphase
      card.classList.remove('warnphase', 'alarmphase');
      if (diff >= 600) {
        card.classList.add('alarmphase');
      } else if (diff >= 540) {
        card.classList.add('warnphase');
      }
    }
    updateTimer();
    if (timerDiv._interval) clearInterval(timerDiv._interval);
    timerDiv._interval = setInterval(updateTimer, 1000);
  } else {
    timerDiv.textContent = "";
    if (timerDiv._interval) clearInterval(timerDiv._interval);
    card.classList.remove('warnphase', 'alarmphase');
  }

  // Low-pressure-Logik
  card.classList.remove('low-pressure');
  if (trupp.members.some(m => m.druck <= 50)) {
    card.classList.add('low-pressure');
  }

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

  // Button-Display-Logik NUR nach Local Storage Zustand
  if (!trupp.inaktiv) {
    if (trupp.startZeit) {
      startButton.style.display = "none";
      ablegenBtn.style.display = "inline";
      loeschenBtn.style.display = "inline";
      notfallBtn.textContent = trupp.notfallAktiv ? "AGT Notfall beenden" : "AGT Notfall";
      notfallBtn.style.display = "inline";
    } else {
      startButton.style.display = "inline";
      ablegenBtn.style.display = "none";
      notfallBtn.style.display = "none";
      loeschenBtn.style.display = "inline";
    }
  } else {
    startButton.style.display = "none";
    ablegenBtn.style.display = "none";
    notfallBtn.style.display = "none";
    loeschenBtn.style.display = "none";
  }

  // Meldungen chronologisch unter dem Button anzeigen
  const meldungenDiv = document.createElement('div');
  meldungenDiv.className = 'meldungen-list';
  meldungenDiv.innerHTML = '<h4>Meldungen:</h4>';
  if (Array.isArray(trupp.meldungen)) {
    [...trupp.meldungen].reverse().forEach(m => {
      const p = document.createElement('p');
      let msg = '';
      if (m.zeit) msg += `[${new Date(m.zeit).toLocaleTimeString()}] `;
      msg += m.kommentar || '';
      if (Array.isArray(m.members) && m.members.length) {
        msg += ' (' + m.members.map(mem => `${mem.role}: ${mem.druck} bar`).join(', ') + ')';
      }
      p.textContent = msg;
      meldungenDiv.appendChild(p);
    });
  }
  card.appendChild(meldungenDiv);
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
    // Setze den gewählten Druck in das entsprechende Feld
    setFakeInputValue(`tm${memberCounter - 1}-druck`, druck);
  };
}

/**
 * Aktualisiert die Trupp-Karte (z.B. nach einer Meldung oder Notfall).
 */
function updateTruppCard(trupp) {
  renderAllTrupps();
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
  const archivContainer = document.getElementById("archiv-container");
  archivContainer.innerHTML = "";
  getAllTrupps().filter(t => t.inaktiv).forEach(renderArchivTrupp);
}

// Nach dem Laden der Seite
window.addEventListener('DOMContentLoaded', async () => {
  renderAllTrupps();
  renderArchivierteTrupps();
});

function setFakeInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}
// Beispiel: Nach Auswahl im Overlay aufrufen
// setFakeInputValue('tf-name', 'Max Mustermann');
// setFakeInputValue('tf-druck', '300 bar');
// setFakeInputValue('trupp-name-input', 'Trupp 1');
// setFakeInputValue('trupp-mission-display', 'Brandbekämpfung');

window.showTruppForm = showTruppForm;
window.addTruppMember = addTruppMember;
window.createTrupp = function() {
  // Truppdaten aus dem Formular sammeln
  const name = document.getElementById('trupp-name-input').textContent.trim();
  const mission = document.getElementById('trupp-mission-display').textContent.trim();
  const members = [];
  // Truppführer
  members.push({
    name: document.getElementById('tf-name').textContent.trim(),
    druck: parseInt(document.getElementById('tf-druck').textContent.trim()) || '',
    role: 'TF'
  });
  // Truppmann 1
  members.push({
    name: document.getElementById('tm1-name').textContent.trim(),
    druck: parseInt(document.getElementById('tm1-druck').textContent.trim()) || '',
    role: 'TM1'
  });
  // Weitere Mitglieder falls vorhanden
  for (let i = 2; i < memberCounter; i++) {
    const nameEl = document.getElementById(`tm${i}-name`);
    const druckEl = document.getElementById(`tm${i}-druck`);
    if (nameEl && druckEl) {
      members.push({
        name: nameEl.textContent.trim(),
        druck: parseInt(druckEl.textContent.trim()) || '',
        role: `TM${i}`
      });
    }
  }
  // Neues Trupp-Objekt
  const trupp = {
    id: Date.now(),
    name,
    mission,
    members,
    meldungen: [],
    inaktiv: false,
    notfallAktiv: false
  };
  window.saveTrupp(trupp); // Speichern im Local Storage
  renderAllTrupps(); // UI neu rendern
  // Formular schließen
  document.getElementById('trupp-form-wrapper').style.display = 'none';
};

window.updateTruppData = function(truppId, changes) {
  const updated = window.updateTrupp(truppId, changes); // Speichern im Local Storage
  renderAllTrupps(); // UI neu rendern
  return updated;
};
// Beispiel für die Nutzung:
// window.updateTruppData(truppId, { mission: 'Neuer Auftrag' });

// Auftrag ändern Button:
// changeMissionBtn.onclick = () => {
//   showMissionOverlay('update', trupp.id);
//   // Nach Auswahl im Overlay:
//   // window.updateTruppData(trupp.id, { mission: neuerWert });
// };

// Notfall Button:
// notfallBtn.onclick = () => {
//   window.updateTruppData(trupp.id, { notfallAktiv: !trupp.notfallAktiv });
//   showNotfallOverlay(trupp.id, !trupp.notfallAktiv);
// };

// Mitglied hinzufügen:
// addMemberToTrupp(truppId, name, druck) =>
//   window.updateTruppData(truppId, { members: [...trupp.members, { name, druck, role: ... }] });

// Trupp auflösen:
// loeschenBtn.onclick = () => {
//   window.updateTruppData(trupp.id, { inaktiv: true });
//   // Archiv-Render etc.
// };

// Auftrag ändern Overlay Callback
window.setMissionForTrupp = function(truppId, mission) {
  const trupp = window.getTrupp(truppId);
  if (!mission || typeof mission !== 'string' || mission.length < 2 || !trupp) return;
  const oldMission = trupp.mission || '';
  window.updateTruppData(truppId, { mission });
  window.addMeldungForTrupp(truppId, { kommentar: `Neuer Auftrag: ${oldMission} → ${mission}`, zeit: Date.now() });
};

// Notfall aktivieren/beenden
window.toggleNotfallForTrupp = function(truppId, aktiv) {
  window.updateTruppData(truppId, { notfallAktiv: aktiv });
  window.addMeldungForTrupp(truppId, { kommentar: aktiv ? 'AGT Notfall aktiviert' : 'AGT Notfall beendet', zeit: Date.now() });
};

// Druck/Meldung erfassen
window.addMeldungForTrupp = function(truppId, meldung) {
  if (!meldung || typeof meldung !== 'object') return;
  const trupp = window.getTrupp(truppId);
  if (!trupp) return;
  // Nur members setzen, wenn im Meldungsobjekt vorhanden
  if (meldung.members) {
    meldung.members = meldung.members.map(m => ({ role: m.role, druck: m.druck }));
  }
  trupp.meldungen = trupp.meldungen || [];
  trupp.meldungen.push(meldung);
  window.updateTruppData(truppId, { meldungen: trupp.meldungen });
};

// Mitglied hinzufügen
window.addMemberToTrupp = function(truppId, name, druck) {
  if (!name || typeof name !== 'string' || name.length < 2) return;
  if (!druck || isNaN(druck) || druck < 10 || druck > 320) return;
  const trupp = window.getTrupp(truppId);
  if (!trupp) return;
  const nextRole = `TM${trupp.members.length}`;
  const newMember = { name, druck, role: nextRole };
  const updatedMembers = [...trupp.members, newMember];
  window.updateTruppData(truppId, { members: updatedMembers });
};

// Trupp auflösen
window.dissolveTrupp = function(truppId) {
  window.updateTruppData(truppId, { inaktiv: true });
  if (typeof renderAllTrupps === 'function') renderAllTrupps();
  if (typeof renderArchivierteTrupps === 'function') renderArchivierteTrupps();
};

// Mitgliedsdaten ändern
window.updateMemberForTrupp = function(truppId, memberIndex, changes) {
  const trupp = window.getTrupp(truppId);
  if (!trupp || !trupp.members[memberIndex]) return;
  const updatedMembers = [...trupp.members];
  updatedMembers[memberIndex] = { ...updatedMembers[memberIndex], ...changes };
  window.updateTruppData(truppId, { members: updatedMembers });
};

// Trupp legt an Button-Logik
function handleTruppStart(trupp) {
  const now = Date.now();
  window.updateTruppData(trupp.id, {
    startZeit: now,
    lastMeldungZeit: now
  });
  window.addMeldungForTrupp(trupp.id, { kommentar: `Trupp legt an (${new Date(now).toLocaleTimeString()})`, zeit: now });
}

function meldung(truppId) {
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

  console.log('[DEBUG] Druck geändert:', druckGeaendert);
  console.log('[DEBUG] Notiz eingegeben:', !!notiz, 'Inhalt:', notiz);

  // Fall 1: Mindestens ein Druck geändert
  if (druckGeaendert) {
    console.log('[DEBUG] Verfahre: Druckmeldung' + (notiz ? ' + Notiz' : ''));
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
    console.log('[DEBUG] Verfahre: Nur Notizmeldung');
    window.addMeldungForTrupp(truppId, { kommentar: `Notiz: ${notiz}`, zeit: now });
    document.getElementById(`notiz-${truppId}`).value = "";
    return;
  }

  console.log('[DEBUG] Verfahre: Keine Meldung, da weder Druck noch Notiz geändert.');
}