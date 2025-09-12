// ui.js
// Modul für die UI-Logik und das Rendering der Truppkarten
// Steuert die Darstellung, Interaktion und Aktualisierung der Truppkarten im Haupt-UI
// Overlay-Interaktionen werden an overlays.js delegiert

// Alle Funktionen werden als window-Funktionen verwendet
let memberCounter = 2;
let selectedMission = '';
// const PRESSURE_REMINDER_SECONDS = 12 * 60; // Zeit in Sekunden bis zum Druck-Erinnerungs-Alarm
const PRESSURE_REMINDER_SECONDS = 20; // DEV 

/**
 * Zeigt das Formular zum Erstellen eines neuen Trupps an oder versteckt es.
 */
function showTruppForm() {
  const formWrapper = document.getElementById("trupp-form-wrapper");
  formWrapper.style.display = formWrapper.style.display === "none" ? "flex" : "none";
  window.setFakeInputValue('trupp-name-input', '');
  window.setFakeInputValue('trupp-mission-display', '');
  window.setFakeInputValue('tf-name', '');
  window.setFakeInputValue('tf-druck', '');
  window.setFakeInputValue('tm1-name', '');
  window.setFakeInputValue('tm1-druck', '');
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
  // Truppkarte erstellen und mit aktuellen Daten aus localStorage füllen
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
  missionDisplay.innerHTML = `<strong>Auftrag: ${trupp.mission || 'Kein Auftrag'}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}`;
  card.appendChild(missionDisplay);

  const changeMissionBtn = document.createElement("button");
  changeMissionBtn.textContent = "Auftrag ändern";
  changeMissionBtn.onclick = () => showMissionOverlay('update', trupp.id);
  changeMissionBtn.style.display = trupp.inaktiv ? "none" : "inline";
  card.appendChild(changeMissionBtn);

  const agtInfo = document.createElement("p");
  agtInfo.id = `info-${trupp.id}`;
  agtInfo.innerHTML = trupp.members
    .map(m => `${m.role === "TF" ? "Truppführer" : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
    .join("<br>");
  card.appendChild(agtInfo);

  // Druckbalken
  const minPressure = Math.min(...trupp.members.map(m => m.druck));
  const pressureBarContainer = document.createElement('div');
  pressureBarContainer.className = 'pressure-bar-container';
  pressureBarContainer.id = `pressure-bar-container-${trupp.id}`;
  const pressureBar = document.createElement('div');
  pressureBar.className = 'pressure-bar';
  pressureBar.classList.add(
    minPressure <= 50 ? 'low' : minPressure <= 160 ? 'medium' : 'high'
  );
  const maxPressure = 320;
  pressureBar.style.width = `${(minPressure / maxPressure) * 100}%`;
  pressureBarContainer.appendChild(pressureBar);
  card.appendChild(pressureBarContainer);

  // Buttons
  const startButton = document.createElement("button");
  startButton.textContent = "Trupp legt an";
  startButton.onclick = () => window.handleTruppStart(trupp);
  card.appendChild(startButton);

  const ablegenBtn = document.createElement("button");
  ablegenBtn.textContent = "Trupp legt ab";
  ablegenBtn.onclick = () => {
    const now = Date.now();
    let errorMsg = "";
    const updatedMembers = trupp.members.map((m, idx) => {
      const druckDiv = document.getElementById(`meldung-${idx}-${trupp.id}`);
      const enteredDruck = druckDiv ? parseInt(druckDiv.textContent.trim()) : undefined;
      if (enteredDruck === undefined || isNaN(enteredDruck)) {
        errorMsg += `${m.name}: Es muss ein gültiger Druck für jedes Mitglied eingegeben werden.\n`;
      } else if (enteredDruck > m.druck) {
        errorMsg += `${m.name}: Neuer Druck (${enteredDruck}) darf nicht höher als aktueller Druck (${m.druck}) sein.\n`;
      }
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
  notfallBtn.onclick = () => showNotfallOverlay(trupp.id, trupp.notfallAktiv);
  card.appendChild(notfallBtn);

  const loeschenBtn = document.createElement("button");
  loeschenBtn.textContent = "Trupp auflösen";
  loeschenBtn.onclick = () => window.dissolveTrupp(trupp.id);
  card.appendChild(loeschenBtn);

  // Timer direkt unter den Buttons
  let timerDiv = card.querySelector(`#timer-${trupp.id}`);
  if (!timerDiv) {
    timerDiv = document.createElement("div");
    timerDiv.id = `timer-${trupp.id}`;
    timerDiv.className = 'timer-bold';
    card.appendChild(timerDiv);
  }
  // Timer-Logik
  if (!trupp.inaktiv && trupp.startZeit) {
    let baseTime = trupp.startZeit;
    if (trupp.lastMeldungZeit && trupp.lastMeldungZeit > trupp.startZeit) {
      baseTime = trupp.lastMeldungZeit;
    }
    // Initialisiere Status-Variable für Alarm, falls nicht vorhanden
    if (typeof trupp.pressureReminderTriggered === 'undefined') {
      trupp.pressureReminderTriggered = false;
    }
    function updateTimer() {
      const now = Date.now();
      const diff = Math.floor((now - baseTime) / 1000);
      const min = Math.floor(diff / 60);
      const sec = Math.floor((diff % 60));
      timerDiv.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
      card.classList.remove('warnphase', 'alarmphase');
      if (diff >= 600) {
        card.classList.add('alarmphase');
      } else if (diff >= 540) {
        card.classList.add('warnphase');
      }
      // Druck-Erinnerungs-Overlay nur einmal nach Ablauf anzeigen
      if (diff >= PRESSURE_REMINDER_SECONDS && !trupp.pressureReminderTriggered) {
        showPressureReminderOverlay(trupp.id);
        trupp.pressureReminderTriggered = true;
      } else if (diff < PRESSURE_REMINDER_SECONDS) {
        // Reset, falls Timer wieder unter die Grenze fällt
        trupp.pressureReminderTriggered = false;
      }
    }
    updateTimer();
    if (timerDiv._interval) clearInterval(timerDiv._interval);
    timerDiv._interval = setInterval(updateTimer, 1000);
  } else {
    timerDiv.textContent = "";
    if (timerDiv._interval) clearInterval(timerDiv._interval);
    card.classList.remove('warnphase', 'alarmphase');
    // Reset pressure reminder state when timer is reset
    trupp.pressureReminderTriggered = false;
  }

  // Separator
  const separator = document.createElement('div');
  separator.className = 'meldung-separator';
  card.appendChild(separator);

  // Meldungsformular
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
    <button onclick="window.meldung(${trupp.id})">Melden</button>
    <span id="edit-trupp-btn-${trupp.id}"></span>
    <div id="meldungen-${trupp.id}"></div>
  `;
  card.appendChild(meldungForm);

  // Trupp bearbeiten Button nur anzeigen, wenn startZeit und lastMeldungZeit beide undefined
  if (typeof trupp.startZeit === 'undefined' && typeof trupp.lastMeldungZeit === 'undefined') {
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Trupp bearbeiten';
    editBtn.style.marginLeft = '8px';
    editBtn.onclick = function() {
      window.showTruppEditOverlay(trupp.id);
    };
    const btnSpan = meldungForm.querySelector(`#edit-trupp-btn-${trupp.id}`);
    if (btnSpan) btnSpan.appendChild(editBtn);
  }

  card.classList.add(trupp.inaktiv ? "inaktiv" : "aktiv");
  if (trupp.notfallAktiv) {
    card.classList.add("notfall");
  } else {
    card.classList.remove("notfall");
  }

  // Low-pressure-Logik
  card.classList.remove('low-pressure');
  if (trupp.members.some(m => m.druck <= 50)) {
    card.classList.add('low-pressure');
  }

  // Buttons und Formular für inaktive Trupps ausblenden
  if (trupp.inaktiv) {
    startButton.style.display = "none";
    ablegenBtn.style.display = "none";
    notfallBtn.style.display = "none";
    loeschenBtn.style.display = "none";
    changeMissionBtn.style.display = "none";
    meldungForm.style.display = "none";
  } else {
    // Button-Logik für aktiven/abgelegten Zustand
    if (trupp.startZeit) {
      startButton.style.display = "none";
      ablegenBtn.style.display = "inline";
      notfallBtn.textContent = trupp.notfallAktiv ? "AGT Notfall beenden" : "AGT Notfall";
      notfallBtn.style.display = "inline";
      loeschenBtn.style.display = "none";
    } else {
      startButton.style.display = "inline";
      ablegenBtn.style.display = "none";
      loeschenBtn.style.display = "inline";
      if (trupp.notfallAktiv) {
        notfallBtn.textContent = "AGT Notfall beenden";
        notfallBtn.style.display = "inline";
      } else {
        notfallBtn.style.display = "none";
      }
    }
    changeMissionBtn.style.display = "inline";
    meldungForm.style.display = "block";
  }

  // Meldungen anzeigen
  card.appendChild(renderMeldungenList(trupp.meldungen));
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
  card.appendChild(renderMeldungenList(trupp.meldungen));
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

  // --- VALIDIERUNG ---
  let errorMsg = '';
  if (!name || name.length < 2) errorMsg += 'Truppname fehlt oder zu kurz!\n';
  if (!mission || mission.length < 2) errorMsg += 'Auftrag fehlt oder zu kurz!\n';
  if (members.length < 2) errorMsg += 'Mindestens zwei Mitglieder erforderlich!\n';
  members.forEach((m, idx) => {
    if (!m.name || m.name.length < 2) errorMsg += `Mitglied ${idx + 1}: Name fehlt oder zu kurz!\n`;
    if (!m.druck || isNaN(m.druck) || m.druck < 270) errorMsg += `Mitglied ${idx + 1}: Druck muss mindestens 270 bar sein!\n`;
  });
  if (errorMsg) {
    if (typeof showErrorOverlay === 'function') showErrorOverlay(errorMsg.trim());
    return;
  }
  // --- ENDE VALIDIERUNG ---

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
  // Validierung ausgelagert nach logic.js
  if (!window.validateMemberData(name, druck)) return;
  const trupp = window.getTrupp(truppId);
  if (!trupp) {
    if (typeof showErrorOverlay === 'function') showErrorOverlay('Trupp nicht gefunden!');
    return;
  }
  // Nur gültige Member-Objekte behalten
  const validMembers = Array.isArray(trupp.members)
    ? trupp.members.filter(m => typeof m === 'object' && m.name && m.druck && m.role)
    : [];
  // Ermittle die nächste freie TM-Nummer
  let maxNum = 1;
  validMembers.forEach(m => {
    if (typeof m.role === 'string' && m.role.startsWith('TM')) {
      const num = parseInt(m.role.slice(2));
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  const nextRole = `TM${maxNum + 1}`;
  const newMember = { name, druck, role: nextRole };
  const updatedMembers = [...validMembers, newMember];
  window.updateTrupp(truppId, { members: updatedMembers }); // Local Storage Update
  renderAllTrupps(); // UI neu rendern
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

// Hilfsfunktion zum Rendern der Meldungen-Liste
function renderMeldungenList(meldungen) {
  const meldungenDiv = document.createElement('div');
  meldungenDiv.className = 'meldungen-list';
  meldungenDiv.innerHTML = '<h4>Meldungen:</h4>';
  if (Array.isArray(meldungen)) {
    [...meldungen].reverse().forEach(m => {
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
  return meldungenDiv;
}

// Hilfsfunktion für die Timeranzeige eines Trupps (aus logic.js verschoben)
function startTimer(trupp) {
  trupp.startZeit = Date.now();
  const card = document.getElementById(`trupp-${trupp.id}`);
  const timerDiv = document.getElementById(`timer-${trupp.id}`);

  if (trupp.intervalRef) clearInterval(trupp.intervalRef);

  // Initialisiere Status-Variable für Alarm
  trupp.pressureReminderTriggered = false;

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

    // Druck-Erinnerungs-Overlay nur einmal nach Ablauf anzeigen
    if (vergangen >= PRESSURE_REMINDER_SECONDS) {
      if (!trupp.pressureReminderTriggered) {
        showPressureReminderOverlay(trupp.id);
        trupp.pressureReminderTriggered = true;
      }
    } else {
      // Reset, falls Timer wieder unter die Grenze fällt
      trupp.pressureReminderTriggered = false;
    }
  }, 1000);
}

