// overlays.js
// Modul für alle Overlay-bezogenen Funktionen und Event-Listener
// Steuert die Anzeige, Auswahl und Schließlogik der Overlays für Eingaben (Druck, Name, Auftrag, Notfall, Token)
// Ruft zentrale Logikfunktionen aus logic.js auf

/**
 * Zeigt das Druck-Overlay zur Auswahl eines Druckwerts an.
 * @param {string} inputId - Die ID des Eingabefelds, das gesetzt werden soll.
 */
function showDruckOverlay(inputId) {
  const overlay = document.getElementById('druck-overlay');
  const grid = document.getElementById('druck-grid');
  grid.innerHTML = '';

  const druckWerteMeldung = Array.from({ length: 32 }, (_, i) => 320 - i * 10);
  druckWerteMeldung.forEach(wert => {
    const btn = document.createElement('button');
    btn.className = 'druck-btn';
    btn.textContent = `${wert}`;
    btn.setAttribute('data-druck', wert);
    btn.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      if (input) input.value = `${wert} bar`;
      closeDruckOverlay();
      if (window.selectDruckForAddMember) {
        window.selectDruckForAddMember(wert);
        window.selectDruckForAddMember = null;
      }
      setFakeInputValue(inputId, `${wert} bar`); // Setzt den Wert im .fake-input Feld
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
  addOverlayEscListener('druck-overlay', closeDruckOverlay);
}

/**
 * Zeigt das Name-Overlay zur Auswahl eines Namens an.
 * @param {string} inputId - Die ID des Eingabefelds, das gesetzt werden soll.
 */
function showNameOverlay(inputId) {
  const overlay = document.getElementById('name-overlay');
  const grid = document.getElementById('name-grid');
  grid.innerHTML = '';

  // Add custom name input
  const customInputDiv = document.createElement('div');
  customInputDiv.className = 'custom-name';
  let buttonHtml = '';
  if (inputId.startsWith('tm') || inputId === 'tf-name') {
    // Trupp-Erstellung: nur "Bestätigen" anzeigen
    buttonHtml = `<button onclick="selectCustomName('${inputId}')">Bestätigen</button>`;
  } else {
    // Mitglied hinzufügen: nur "Mitglied hinzufügen" anzeigen
    buttonHtml = `<button onclick="window.selectCustomNameForAddMember && window.selectCustomNameForAddMember(document.getElementById('custom-name-input').value)">Mitglied hinzufügen</button>`;
  }
  customInputDiv.innerHTML = `
    <label>Alternativer Name:</label>
    <input type="text" id="custom-name-input">
    ${buttonHtml}
  `;
  grid.appendChild(customInputDiv);

  // Add predefined names
  agtlerNamen.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'name-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      if (input) input.value = name;
      closeNameOverlay();
      if (!inputId.startsWith('tm') && inputId !== 'tf-name' && window.selectCustomNameForAddMember) {
        window.selectCustomNameForAddMember(name);
        window.selectCustomNameForAddMember = null;
      }
      setFakeInputValue(inputId, name); // Setzt den Wert im .fake-input Feld
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
  addOverlayEscListener('name-overlay', closeNameOverlay);
}

/**
 * Setzt den benutzerdefinierten Namen im Eingabefeld.
 */
function selectCustomName(inputId) {
  const customInput = document.getElementById('custom-name-input');
  const input = document.getElementById(inputId);
  if (customInput.value.trim()) {
    input.value = customInput.value.trim();
    closeNameOverlay();
    setFakeInputValue(inputId, customInput.value.trim()); // Setzt den Wert im .fake-input Feld
  } else {
    showErrorOverlay("Bitte einen Namen eingeben.");
  }
}

/**
 * Zeigt das Overlay zur Auswahl eines Truppnamens an.
 */
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
      setFakeInputValue('trupp-name-input', name); // Setzt den Wert im .fake-input Feld
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
  addOverlayEscListener('truppname-overlay', closeTruppNameOverlay);
}

/**
 * Setzt den benutzerdefinierten Truppnamen im Eingabefeld.
 */
function selectCustomTruppName() {
  const customInput = document.getElementById('custom-truppname-input');
  const input = document.getElementById('trupp-name-input');
  if (customInput.value.trim()) {
    input.value = customInput.value.trim();
    closeTruppNameOverlay();
    setFakeInputValue('trupp-name-input', customInput.value.trim()); // Setzt den Wert im .fake-input Feld
  } else {
    showErrorOverlay("Bitte einen Truppnamen eingeben.");
  }
}

/**
 * Zeigt das Overlay zur Auswahl eines Auftrags an.
 */
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
      setFakeInputValue('trupp-mission-display', auftrag); // Setzt den Wert im .fake-input Feld
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
  addOverlayEscListener('mission-overlay', closeMissionOverlay);
}

/**
 * Setzt den benutzerdefinierten Auftrag.
 */
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
    setFakeInputValue('trupp-mission-display', customInput.value.trim()); // Setzt den Wert im .fake-input Feld
  } else {
    showErrorOverlay("Bitte einen Auftrag eingeben.");
  }
}

/**
 * Schließt das Mission-Overlay.
 */
function closeMissionOverlay() {
  const overlay = document.getElementById('mission-overlay');
  overlay.style.display = 'none';
}

/**
 * Zeigt das Notfall-Overlay für einen Trupp an.
 */
function showNotfallOverlay(truppId, isEndNotfall = false) {
  const overlay = document.getElementById('notfall-overlay');
  const content = document.getElementById('notfall-content');
  content.innerHTML = `
    <h3>${isEndNotfall ? 'AGT Notfall beenden' : 'AGT Notfall auslösen'}</h3>
    <button onclick="confirmNotfall(${truppId}, ${isEndNotfall})">Bestätigen</button>
    <button onclick="closeNotfallOverlay()">Abbrechen</button>
  `;
  overlay.style.display = 'flex';
  addOverlayEscListener('notfall-overlay', closeNotfallOverlay);
}

/**
 * Schließt das Notfall-Overlay.
 */
function closeNotfallOverlay() {
  const overlay = document.getElementById('notfall-overlay');
  overlay.style.display = 'none';
}

/**
 * Schließt das Druck-Overlay.
 */
function closeDruckOverlay() {
  const overlay = document.getElementById('druck-overlay');
  overlay.style.display = 'none';
}

/**
 * Schließt das Name-Overlay.
 */
function closeNameOverlay() {
  const overlay = document.getElementById('name-overlay');
  overlay.style.display = 'none';
}

/**
 * Schließt das Truppname-Overlay.
 */
function closeTruppNameOverlay() {
  const overlay = document.getElementById('truppname-overlay');
  overlay.style.display = 'none';
}

/**
 * Zeigt das Token-Overlay zur Eingabe/Änderung des Einsatz-Tokens an.
 */
function showTokenOverlay() {
  let overlay = document.getElementById('token-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'token-overlay';
    overlay.style.position = 'fixed';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.color = '#fff';
    overlay.style.padding = '20px';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
      <div style="margin-bottom:10px;">Operation-Token eingeben:</div>
      <input id="token-input" type="text" value="${OPERATION_TOKEN}" style="width:200px;">
      <button id="token-save-btn">Speichern</button>
      <button id="token-cancel-btn">Abbrechen</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById('token-save-btn').onclick = function() {
      const newToken = document.getElementById('token-input').value.trim();
      setTokenInUrl(newToken);
      document.body.removeChild(overlay);
    };
    document.getElementById('token-cancel-btn').onclick = function() {
      document.body.removeChild(overlay);
    };
  }
}

/**
 * Fügt den Button zum Token-Ändern unten rechts hinzu.
 */
function addTokenButton() {
  let btn = document.getElementById('token-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'token-btn';
    btn.textContent = 'Token ändern';
    btn.style.position = 'fixed';
    btn.style.bottom = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '9999';
    btn.onclick = showTokenOverlay;
    document.body.appendChild(btn);
  }
}

/**
 * Öffnet das Overlay zum Hinzufügen eines Mitglieds.
 */
function openOverlay(type, truppId) {
    if (type === 'add-member') {
        // Overlay für Name und Druck anzeigen
        document.getElementById('add-member-overlay').style.display = 'block';
        // Name-Feld: Vorschlagsliste wie bei showNameOverlay
        const nameInput = document.getElementById('add-member-name');
        nameInput.onclick = function() {
            showNameOverlay('add-member-name');
        };
        // Druck-Feld: Vorschlagsliste wie bei showDruckOverlay
        const druckInput = document.getElementById('add-member-druck');
        druckInput.onclick = function() {
            showDruckOverlay('add-member-druck');
        };
        // Bestätigungs-Button
        document.getElementById('add-member-confirm').onclick = function() {
            const name = nameInput.value;
            const druck = parseInt(druckInput.value, 10);
            addMemberToTrupp(truppId, name, druck); // Ruft jetzt die zentrale Funktion aus logic.js auf
            document.getElementById('add-member-overlay').style.display = 'none';
            nameInput.value = '';
            druckInput.value = '';
        };
    }
}

// Escape schließt Overlays
function addOverlayEscListener(overlayId, closeFn) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  function escHandler(e) {
    if (e.key === 'Escape') {
      closeFn();
      document.removeEventListener('keydown', escHandler);
    }
  }
  document.addEventListener('keydown', escHandler);
}

// Event-Listener für Overlay-Schließen-Buttons

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

/**
 * Zeigt das zentrale Fehler-Overlay mit einer Nachricht an.
 * @param {string} text - Die Fehlernachricht.
 */
function showErrorOverlay(text) {
  const overlay = document.getElementById('error-overlay');
  const msg = document.getElementById('error-message');
  if (msg) msg.textContent = text;
  if (overlay) overlay.style.display = 'flex';
  addOverlayEscListener('error-overlay', closeErrorOverlay);
}

/**
 * Schließt das Fehler-Overlay.
 */
function closeErrorOverlay() {
  const overlay = document.getElementById('error-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Beispiel für Value-Setzung nach Auswahl:
 */
function selectTruppName(name) {
  setFakeInputValue('trupp-name-input', name);
  closeTruppNameOverlay();
}
function selectMission(mission) {
  setFakeInputValue('trupp-mission-display', mission);
  closeMissionOverlay();
}
function selectName(id, name) {
  setFakeInputValue(id, name);
  closeNameOverlay();
}
function selectDruck(id, druck) {
  setFakeInputValue(id, druck + ' bar');
  closeDruckOverlay();
}

// Ergänze die Overlay-Auswahlfunktionen, sodass sie die Werte setzen.

function showPressureReminderOverlay(truppId) {
    const overlay = document.getElementById('pressure-reminder-overlay');
    if (overlay.style.display === 'none' || overlay.style.display === '') {
        overlay.style.display = 'block';
        const audio = document.getElementById('alarm-audio');
        audio.play();
    }
}

/**
 * Schließt das Pressure-Reminder-Overlay.
 */
function closePressureReminderOverlay() {
    const overlay = document.getElementById('pressure-reminder-overlay');
    overlay.style.display = 'none';
    const audio = document.getElementById('alarm-audio');
    audio.pause();
    audio.currentTime = 0; // Zurück zum Anfang
}

/**
 * Test-Funktion zum manuellen Triggern des Pressure-Reminder-Overlays.
 */
function testPressureReminderOverlay() {
    showPressureReminderOverlay('test-trupp'); // Verwende eine Dummy-ID für Test
}
