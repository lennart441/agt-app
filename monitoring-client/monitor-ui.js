// monitor-ui.js

// Trupp-Fetching, Rendering und Event-Handler

async function fetchTrupps(uuid = selectedUUID, updateUI = true) {
  try {
    const url = `${SYNC_API_URL}?token=${encodeURIComponent(OPERATION_TOKEN)}${uuid ? `&uuid=${encodeURIComponent(uuid)}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const data = await response.json();
    lastSyncTimestamp = data.timestamp || Date.now();
    if (updateUI) renderTrupps(data.trupps || []);
    document.getElementById('sync-timestamp').textContent = `Sync-Zeitpunkt: ${formatTimestamp(data.timestamp)}`;
    return data;
  } catch (error) {
    showErrorOverlay('Fehler beim Laden der Trupps: ' + error.message);
    return {trupps: [], deviceName: '', timestamp: null};
  }
}

// State: { [uuid]: { [truppId]: trupp } }
let currentTrupps = {}; // z.B. { uuid1: { 1: truppObj, 2: truppObj }, uuid2: { ... } }

function truppsEqual(a, b) {
  // Vergleiche relevante Felder (id, druck, mission, notfallAktiv, inaktiv, meldungen)
  if (!a || !b) return false;
  if (a.id !== b.id) return false;
  if (a.mission !== b.mission) return false;
  if (a.previousMission !== b.previousMission) return false;
  if (a.notfallAktiv !== b.notfallAktiv) return false;
  if (a.inaktiv !== b.inaktiv) return false;
  if (a.members.length !== b.members.length) return false;
  for (let i = 0; i < a.members.length; i++) {
    if (a.members[i].name !== b.members[i].name ||
        a.members[i].druck !== b.members[i].druck ||
        a.members[i].role !== b.members[i].role) return false;
  }
  if ((a.meldungen?.length || 0) !== (b.meldungen?.length || 0)) return false;
  // Optional: Meldungen vergleichen (nur letzten Kommentar)
  if (a.meldungen?.length && b.meldungen?.length) {
    if (a.meldungen[a.meldungen.length-1]?.kommentar !== b.meldungen[b.meldungen.length-1]?.kommentar) return false;
  }
  return true;
}

function getTruppCardId(uuid, trupp) {
  return `trupp-${uuid}-${trupp.id}`;
}

function updateOrCreateTruppCard(uuid, trupp) {
  const container = document.getElementById('trupp-container');
  const cardId = getTruppCardId(uuid, trupp);
  let card = document.getElementById(cardId);
  if (!card) {
    // Neu erstellen
    card = renderTruppCard(uuid, trupp);
    container.appendChild(card);
  } else {
    // Nur aktualisieren, wenn sich relevante Daten geändert haben
    if (!truppsEqual(trupp, currentTrupps[uuid]?.[trupp.id])) {
      const newCard = renderTruppCard(uuid, trupp);
      container.replaceChild(newCard, card);
    }
  }
  // Timer immer lokal aktualisieren
  updateTruppTimer(uuid, trupp);
}

function updateTruppTimer(uuid, trupp) {
  const cardId = getTruppCardId(uuid, trupp);
  const timerDiv = document.getElementById(`timer-${cardId}`);
  const card = document.getElementById(cardId);
  if (!timerDiv || !card) return;
  const zeitBasis = trupp.lastMeldungZeit || trupp.startZeit;
  // Klassen immer entfernen, dann ggf. neu setzen
  card.classList.remove('warnphase', 'alarmphase');
  if (!trupp.inaktiv && zeitBasis) {
    const vergangen = Math.floor((Date.now() - zeitBasis) / 1000);
    const min = Math.floor(vergangen / 60).toString().padStart(2, '0');
    const sec = (vergangen % 60).toString().padStart(2, '0');
    timerDiv.textContent = `Zeit seit letzter Meldung: ${min}:${sec}`;
    if (vergangen > 600) {
      card.classList.add('alarmphase');
    } else if (vergangen > 540) {
      card.classList.add('warnphase');
    }
  } else {
    timerDiv.textContent = 'Trupp hat nicht angelegt';
  }
}

function renderTrupps(trupps, uuid = selectedUUID) {
  // Für Single-UUID
  if (!uuid) return;
  if (!currentTrupps[uuid]) currentTrupps[uuid] = {};
  const toDelete = new Set(Object.keys(currentTrupps[uuid]));
  trupps.forEach(trupp => {
    updateOrCreateTruppCard(uuid, trupp);
    toDelete.delete(trupp.id + "");
    currentTrupps[uuid][trupp.id] = trupp;
  });
  // Entferne Cards, die nicht mehr existieren
  toDelete.forEach(id => {
    const cardId = getTruppCardId(uuid, {id});
    const card = document.getElementById(cardId);
    if (card) card.remove();
    delete currentTrupps[uuid][id];
  });
}

function renderMergedTrupps(truppsWithUUID) {
  // truppsWithUUID: Array von { ...trupp, _uuid }
  const container = document.getElementById('trupp-container');
  // Sammle alle aktuellen Card-IDs
  const allCurrentIds = new Set();
  // Sammle alle neuen Card-IDs
  const newIds = new Set();
  // Initialisiere State
  const newState = {};
  truppsWithUUID.forEach(trupp => {
    const uuid = trupp._uuid;
    if (!newState[uuid]) newState[uuid] = {};
    newState[uuid][trupp.id] = trupp;
    const cardId = getTruppCardId(uuid, trupp);
    newIds.add(cardId);
    updateOrCreateTruppCard(uuid, trupp);
  });
  // Entferne Cards, die nicht mehr existieren
  Object.keys(currentTrupps).forEach(uuid => {
    Object.keys(currentTrupps[uuid]).forEach(truppId => {
      const cardId = getTruppCardId(uuid, {id: truppId});
      allCurrentIds.add(cardId);
      if (!newIds.has(cardId)) {
        const card = document.getElementById(cardId);
        if (card) card.remove();
      }
    });
  });
  currentTrupps = newState;
}

async function fetchTruppsMulti(uuids) {
  try {
    const allTrupps = [];
    for (const uuid of uuids) {
      const data = await fetchTrupps(uuid, false);
      if (data.trupps) {
        data.trupps.forEach(trupp => {
          trupp.deviceName = data.deviceName || uuid;
          trupp._uuid = uuid; // Für eindeutige Card-ID
          allTrupps.push(trupp);
        });
      }
    }
    renderMergedTrupps(allTrupps);
  } catch (error) {
    showErrorOverlay('Fehler beim Laden der Trupps (Multi-UUID): ' + error.message);
  }
}

// Vollständige Trupp-Rendering- und Meldungslogik aus der Originaldatei
function renderTruppCard(uuid, trupp) {
  const cardId = getTruppCardId(uuid, trupp);
  const card = document.createElement('div');
  card.className = `trupp-card ${trupp.inaktiv ? 'inaktiv' : 'aktiv'}`;
  card.id = cardId;

  if (trupp.notfallAktiv) {
    card.classList.add('notfall');
  }

  const minPressure = Math.min(...trupp.members.map(m => m.druck));
  if (minPressure <= 50) {
    card.classList.add('low-pressure');
  }

  const title = document.createElement('h2');
  title.textContent = trupp.name;
  card.appendChild(title);

  const missionDisplay = document.createElement('div');
  missionDisplay.id = `mission-${trupp.id}`;
  missionDisplay.innerHTML = `<strong>Auftrag: ${trupp.mission || 'Kein Auftrag'}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}`;
  card.appendChild(missionDisplay);

  const agtInfo = document.createElement('p');
  agtInfo.innerHTML = trupp.members
    .map(m => `${m.role === 'TF' ? 'Truppführer' : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
    .join('<br>');
  card.appendChild(agtInfo);

  // Pressure bar
  const pressureBarContainer = document.createElement('div');
  pressureBarContainer.className = 'pressure-bar-container';
  const pressureBar = document.createElement('div');
  pressureBar.className = 'pressure-bar';
  pressureBar.classList.add(
    minPressure <= 50 ? 'low' : minPressure <= 160 ? 'medium' : 'high'
  );
  const maxPressure = 320;
  pressureBar.style.width = `${(minPressure / maxPressure) * 100}%`;
  pressureBarContainer.appendChild(pressureBar);
  card.appendChild(pressureBarContainer);

  const timerDiv = document.createElement('div');
  timerDiv.id = `timer-${cardId}`;
  timerDiv.className = 'timer-bold';
  // Zeit seit letzter Meldung: Nutze lastMeldungZeit, fallback auf startZeit
  const zeitBasis = trupp.lastMeldungZeit || trupp.startZeit;
  if (!trupp.inaktiv && zeitBasis) {
    const vergangen = Math.floor((Date.now() - zeitBasis) / 1000);
    const min = Math.floor(vergangen / 60).toString().padStart(2, '0');
    const sec = (vergangen % 60).toString().padStart(2, '0');
    timerDiv.textContent = `Zeit seit letzter Meldung: ${min}:${sec}`;
  } else {
    timerDiv.textContent = 'Trupp hat nicht angelegt';
  }
  card.appendChild(timerDiv);

  const separator = document.createElement('div');
  separator.className = 'meldung-separator';
  card.appendChild(separator);

  const meldungDiv = document.createElement('div');
  meldungDiv.id = `meldungen-${trupp.id}`;
  [...trupp.meldungen].reverse().forEach(m => {
    const p = document.createElement('p');
    p.textContent = m.members
      ? `${m.kommentar} (${m.members.map(mem => `${mem.role}: ${mem.druck} bar`).join(', ')})`
      : m.kommentar;
    meldungDiv.appendChild(p);
  });
  card.appendChild(meldungDiv);

  if (trupp.hatWarnungErhalten) {
    const warnung = document.createElement('div');
    warnung.className = 'warnung';
    warnung.textContent = `⚠️ Warnung: Einer der Träger hat unter 50% Luft.`;
    card.appendChild(warnung);
  }

  // Timer-Phasen immer korrekt setzen/entfernen
  card.classList.remove('warnphase', 'alarmphase');
  if (!trupp.inaktiv && trupp.startZeit) {
    const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
    if (vergangen > 600) {
      card.classList.add('alarmphase');
    } else if (vergangen > 540) {
      card.classList.add('warnphase');
    }
  }

  return card;
}

function calculateTimeSince(timestamp) {
  if (!timestamp) return '-';
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec} seit Update`;
}

function updateSyncTimer() {
  if (!lastSyncTimestamp) {
    document.getElementById('last-sync-time').textContent = 'Letzte Synchronisation: -';
    return;
  }
  const now = Date.now();
  const secondsSinceSync = Math.floor((now - lastSyncTimestamp) / 1000);
  const min = Math.floor(secondsSinceSync / 60).toString().padStart(2, '0');
  const sec = (secondsSinceSync % 60).toString().padStart(2, '0');
  document.getElementById('last-sync-time').textContent = `Letzte Synchronisation: ${min}:${sec} zuvor`;
}

window.addEventListener('DOMContentLoaded', async () => {
  if (!OPERATION_TOKEN) {
    showTokenOverlay();
  } else {
    const uuids = await fetchUUIDs();
    showUUIDOverlay(uuids); // Immer Overlay zeigen, auch wenn leer
  }
  setInterval(() => {
    if (multiUUIDEnabled && selectedUUIDs.length > 0) {
      fetchTruppsMulti(selectedUUIDs);
    } else if (selectedUUID) {
      fetchTrupps(selectedUUID);
    } // Wenn nichts ausgewählt, nichts fetchen
  }, 2000); // Fetch every 2 seconds
  setInterval(updateSyncTimer, 1000); // Update timer every second
  // Entferne alte Token/UUID-Buttons
  const tokenBtn = document.getElementById('token-btn');
  if (tokenBtn) tokenBtn.remove();
  const uuidBtn = document.getElementById('uuid-btn');
  if (uuidBtn) uuidBtn.remove();
  // Einstellungen Overlay öffnen per Button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.onclick = showSettingsOverlay;
  // Einstellungen Overlay öffnen per Shortcut (Taste E)
  document.addEventListener('keydown', e => {
    if (e.key === 'E' && document.getElementById('settings-overlay') && document.getElementById('settings-overlay').style.display !== 'flex') {
      showSettingsOverlay();
    }
  });
  // Einstellungen Overlay Buttons
  const closeBtn = document.getElementById('settings-close-btn');
  if (closeBtn) closeBtn.onclick = hideSettingsOverlay;
  const tokenSaveBtn = document.getElementById('settings-token-save');
  if (tokenSaveBtn) tokenSaveBtn.onclick = function() {
    const newToken = document.getElementById('settings-token-input').value.trim();
    if (newToken) {
      setTokenInUrl(newToken);
      hideSettingsOverlay();
      fetchTrupps();
    }
  };
  // Auswahl links
  const settingsList = document.getElementById('settings-list');
  if (settingsList) settingsList.onclick = function(e) {
    if (e.target && e.target.dataset.setting) {
      selectSettingsPanel(e.target.dataset.setting);
      if (e.target.dataset.setting === 'sync') updateMultiUUIDSwitchUI();
    }
  };
  // Schieberegler für Mehrfachauswahl
  const multiSwitch = document.getElementById('multi-uuid-switch');
  if (multiSwitch) {
    multiSwitch.onchange = async function() {
      multiUUIDEnabled = multiSwitch.checked;
      updateMultiUUIDSwitchUI();
      if (multiUUIDEnabled && selectedUUID) {
        if (!selectedUUIDs.includes(selectedUUID)) {
          selectedUUIDs.push(selectedUUID);
        }
      }
      // Wenn Mehrfachauswahl deaktiviert wird und mehrere UUIDs ausgewählt sind
      if (!multiUUIDEnabled && selectedUUIDs.length > 1) {
        // Nur die erste UUID behalten
        selectedUUID = selectedUUIDs[0];
        selectedUUIDs = [selectedUUID];
        hideSettingsOverlay();
        const uuids = await fetchUUIDs();
        showUUIDOverlay(uuids);
      }
    };
    updateMultiUUIDSwitchUI();
  }
});

// Timer für alle Karten lokal aktualisieren
setInterval(() => {
  Object.keys(currentTrupps).forEach(uuid => {
    Object.values(currentTrupps[uuid]).forEach(trupp => updateTruppTimer(uuid, trupp));
  });
}, 1000);