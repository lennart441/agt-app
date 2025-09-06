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

async function fetchTruppsMulti(uuids) {
  try {
    const allTrupps = [];
    for (const uuid of uuids) {
      const data = await fetchTrupps(uuid, false);
      if (data.trupps) {
        // Füge deviceName zu jedem Trupp hinzu
        data.trupps.forEach(trupp => {
          trupp.deviceName = data.deviceName || uuid;
          allTrupps.push(trupp);
        });
      }
    }
    renderMergedTrupps(allTrupps);
  } catch (error) {
    showErrorOverlay('Fehler beim Laden der Trupps (Multi-UUID): ' + error.message);
  }
}

function renderMergedTrupps(trupps) {
  renderTrupps(trupps);
}

// Vollständige Trupp-Rendering- und Meldungslogik aus der Originaldatei
function renderTrupps(trupps) {
  const container = document.getElementById('trupp-container');
  container.innerHTML = '';
  trupps.forEach(trupp => {
    const card = document.createElement('div');
    card.className = `trupp-card ${trupp.inaktiv ? 'inaktiv' : 'aktiv'}`;
    card.id = `trupp-${trupp.id}`;

    // Device Name anzeigen, falls vorhanden
    if (trupp.deviceName) {
      const deviceDiv = document.createElement('div');
      deviceDiv.className = 'device-name';
      deviceDiv.textContent = `Gerät: ${trupp.deviceName}`;
      card.appendChild(deviceDiv);
    }

    // Check for AGT emergency
    if (trupp.notfallAktiv) {
      card.classList.add('notfall');
    }

    // Check for low pressure (below 50 bar)
    const minPressure = Math.min(...trupp.members.map(m => m.druck));
    if (minPressure <= 50) {
      card.classList.add('low-pressure');
    }

    const title = document.createElement('h2');
    title.textContent = trupp.name;
    card.appendChild(title);

    const missionDisplay = document.createElement('div');
    missionDisplay.id = `mission-${trupp.id}`;
    missionDisplay.innerHTML = `
      <strong>Auftrag: ${trupp.mission || 'Kein Auftrag'}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}
    `;
    card.appendChild(missionDisplay);

    const agtInfo = document.createElement('p');
    agtInfo.innerHTML = trupp.members
      .map(m => `${m.role === 'TF' ? 'Truppführer' : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
      .join('<br>');
    card.appendChild(agtInfo);

    // Pressure bar for minimum pressure
    const pressureBarContainer = document.createElement('div');
    pressureBarContainer.className = 'pressure-bar-container';
    const pressureBar = document.createElement('div');
    pressureBar.className = 'pressure-bar';
    pressureBar.classList.add(
      minPressure <= 50 ? 'low' : minPressure <= 160 ? 'medium' : 'high'
    );
    const maxPressure = 320; // Maximum pressure for scaling
    pressureBar.style.width = `${(minPressure / maxPressure) * 100}%`;
    pressureBarContainer.appendChild(pressureBar);
    card.appendChild(pressureBarContainer);

    const timerDiv = document.createElement('div');
    timerDiv.id = `timer-${trupp.id}`;
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

    // Separator for meldungen
    const separator = document.createElement('div');
    separator.className = 'meldung-separator';
    card.appendChild(separator);

    const meldungDiv = document.createElement('div');
    meldungDiv.id = `meldungen-${trupp.id}`;
    // Reverse meldungen to show newest first
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

    if (!trupp.inaktiv && trupp.startZeit) {
      const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
      if (vergangen > 600) {
        card.classList.add('alarmphase');
      } else if (vergangen > 540) {
        card.classList.add('warnphase');
      }
    }

    container.appendChild(card);
  });
}

function renderTruppCard(trupp) {
  // Die Card-Logik ist identisch zu renderTrupps, kann aber als Helper genutzt werden
  const card = document.createElement('div');
  card.className = `trupp-card ${trupp.inaktiv ? 'inaktiv' : 'aktiv'}`;
  card.id = `trupp-${trupp.id}`;

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
  timerDiv.id = `timer-${trupp.id}`;
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