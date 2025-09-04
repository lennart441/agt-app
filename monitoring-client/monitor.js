//const SYNC_API_URL = 'https://agt.ff-stocksee.de/v1/sync-api/trupps';
const SYNC_API_URL = 'http://localhost:3001/v1/sync-api/trupps';

//let OPERATION_TOKEN = getTokenFromUrl();
let OPERATION_TOKEN = "abc123def456ghi7";
//let OPERATION_TOKEN = "Atemschutz9";
let lastSyncTimestamp = null;
let selectedUUID = null;
let refreshInterval = null;
let settingsUUIDInterval = null;

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

function setTokenInUrl(token) {
  const params = new URLSearchParams(window.location.search);
  params.set('token', token);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  OPERATION_TOKEN = token;
}

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
      fetchTrupps(); // Nach Token-Wechsel neu laden
    };
    document.getElementById('token-cancel-btn').onclick = function() {
      document.body.removeChild(overlay);
    };
  }
}

// Einstellungen Overlay Logik
function showSettingsOverlay() {
  const overlay = document.getElementById('settings-overlay');
  overlay.style.display = 'flex';
  document.getElementById('settings-token-input').value = OPERATION_TOKEN;
  selectSettingsPanel('token');
  renderSettingsUUIDList();
  if (settingsUUIDInterval) clearInterval(settingsUUIDInterval);
  settingsUUIDInterval = setInterval(() => {
    if (document.getElementById('setting-uuid').style.display === 'block') {
      renderSettingsUUIDList();
    }
  }, 2000);
}

function hideSettingsOverlay() {
  document.getElementById('settings-overlay').style.display = 'none';
  if (settingsUUIDInterval) {
    clearInterval(settingsUUIDInterval);
    settingsUUIDInterval = null;
  }
}

function selectSettingsPanel(setting) {
  // Alle Panels ausblenden
  document.querySelectorAll('.setting-panel').forEach(p => p.style.display = 'none');
  // Aktuelles Panel einblenden
  const panel = document.getElementById('setting-' + setting);
  if (panel) panel.style.display = 'block';
  // Auswahl hervorheben
  document.querySelectorAll('.settings-item').forEach(i => i.classList.remove('selected'));
  const item = document.querySelector('.settings-item[data-setting="' + setting + '"]');
  if (item) item.classList.add('selected');
  if (setting === 'uuid') renderSettingsUUIDList();
}

function sortUUIDData(uuidData) {
  // Trenne in aktiv/inaktiv
  const now = Date.now();
  const aktiv = [];
  const inaktiv = [];
  uuidData.forEach(data => {
    const ts = data.timestamp || 0;
    if (ts && now - ts <= 10000) {
      aktiv.push(data);
    } else {
      inaktiv.push(data);
    }
  });
  // Sortiere alphabetisch nach deviceName, dann uuid
  const sortFn = (a, b) => {
    const nameA = (a.deviceName || '').toLowerCase();
    const nameB = (b.deviceName || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    if (a.uuid < b.uuid) return -1;
    if (a.uuid > b.uuid) return 1;
    return 0;
  };
  aktiv.sort(sortFn);
  inaktiv.sort(sortFn);
  return {aktiv, inaktiv};
}

async function renderSettingsUUIDList() {
  const listDiv = document.getElementById('settings-uuid-list');
  const settingsRight = document.querySelector('.settings-right');
  // Scrollposition merken
  const prevScroll = settingsRight ? settingsRight.scrollTop : 0;
  listDiv.innerHTML = '';
  const uuids = await fetchUUIDs();
  if (uuids.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'no-uuid-message';
    msg.textContent = 'Keine Überwachungen unter diesem Token aktiv.';
    listDiv.appendChild(msg);
    if (settingsRight) settingsRight.scrollTop = prevScroll;
    return;
  }
  // Fetch data for each UUID
  const uuidData = [];
  for (const uuid of uuids) {
    try {
      const data = await fetchTrupps(uuid, false);
      uuidData.push({
        uuid,
        deviceName: data.deviceName || 'Unbekannt',
        timestamp: data.timestamp || null
      });
    } catch (e) {
      uuidData.push({
        uuid,
        deviceName: 'Fehler',
        timestamp: null
      });
    }
  }
  // Sortiere und zeige Kategorien
  const sorted = sortUUIDData(uuidData);
  if (sorted.aktiv.length > 0) {
    const aktivLabel = document.createElement('div');
    aktivLabel.style.fontWeight = 'bold';
    aktivLabel.style.margin = '10px 0 4px 0';
    aktivLabel.textContent = 'Aktiv (≤ 10 Sekunden)';
    listDiv.appendChild(aktivLabel);
    sorted.aktiv.forEach(data => {
      const item = document.createElement('div');
      item.className = 'uuid-item' + (data.uuid === selectedUUID ? ' selected' : '');
      item.innerHTML = `
        <div class="uuid-header"><strong>UUID:</strong> ${data.uuid}</div>
        <div class="device-name"><strong>Gerät:</strong> ${data.deviceName}</div>
        <div class="timestamp"><strong>Letzte Sync:</strong> ${formatTimestamp(data.timestamp)}</div>
        <div class="timer"><strong>Zeit seit Sync:</strong> ${calculateTimeSince(data.timestamp)}</div>
      `;
      item.onclick = () => {
        selectedUUID = data.uuid;
        renderSettingsUUIDList();
        fetchTrupps(selectedUUID);
        hideSettingsOverlay();
      };
      listDiv.appendChild(item);
    });
  }
  if (sorted.inaktiv.length > 0) {
    const inaktivLabel = document.createElement('div');
    inaktivLabel.style.fontWeight = 'bold';
    inaktivLabel.style.margin = '18px 0 4px 0';
    inaktivLabel.textContent = 'Inaktiv (> 10 Sekunden)';
    listDiv.appendChild(inaktivLabel);
    sorted.inaktiv.forEach(data => {
      const item = document.createElement('div');
      item.className = 'uuid-item' + (data.uuid === selectedUUID ? ' selected' : '');
      item.innerHTML = `
        <div class="uuid-header"><strong>UUID:</strong> ${data.uuid}</div>
        <div class="device-name"><strong>Gerät:</strong> ${data.deviceName}</div>
        <div class="timestamp"><strong>Letzte Sync:</strong> ${formatTimestamp(data.timestamp)}</div>
        <div class="timer"><strong>Zeit seit Sync:</strong> ${calculateTimeSince(data.timestamp)}</div>
      `;
      item.onclick = () => {
        selectedUUID = data.uuid;
        renderSettingsUUIDList();
        fetchTrupps(selectedUUID);
        hideSettingsOverlay();
      };
      listDiv.appendChild(item);
    });
  }
  // Scrollposition wiederherstellen
  if (settingsRight) settingsRight.scrollTop = prevScroll;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('de-DE');
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

async function fetchUUIDs() {
  try {
    const url = `${SYNC_API_URL.replace('/trupps', '/uuids')}?token=${encodeURIComponent(OPERATION_TOKEN)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch UUIDs failed: ${response.status}`);
    }
    const data = await response.json();
    return data.uuids || [];
  } catch (error) {
    console.error('Error fetching UUIDs:', error);
    return [];
  }
}

async function showUUIDOverlay(uuids) {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  const overlay = document.getElementById('uuid-overlay');
  const list = document.getElementById('uuid-list');
  // Scrollposition merken
  const prevScroll = list ? list.scrollTop : 0;
  list.innerHTML = '';

  if (uuids.length === 0) {
    // Zeige Fehlermeldung
    const message = document.createElement('div');
    message.className = 'no-uuid-message';
    message.textContent = 'Keine Überwachungen unter diesem Token aktiv.';
    list.appendChild(message);
    overlay.style.display = 'flex';
    // Scrollposition wiederherstellen
    if (list) list.scrollTop = prevScroll;
    return; // Kein Refresh nötig
  }

  // Fetch data for each UUID
  const uuidData = [];
  for (const uuid of uuids) {
    try {
      const data = await fetchTrupps(uuid, false); // UI nicht aktualisieren
      uuidData.push({
        uuid,
        deviceName: data.deviceName || 'Unbekannt',
        timestamp: data.timestamp || null
      });
    } catch (error) {
      uuidData.push({
        uuid,
        deviceName: 'Fehler',
        timestamp: null
      });
    }
  }
  // Sortiere und zeige Kategorien
  const sorted = sortUUIDData(uuidData);
  if (sorted.aktiv.length > 0) {
    const aktivLabel = document.createElement('div');
    aktivLabel.style.fontWeight = 'bold';
    aktivLabel.style.margin = '10px 0 4px 0';
    aktivLabel.textContent = 'Aktiv (≤ 10 Sekunden)';
    list.appendChild(aktivLabel);
    sorted.aktiv.forEach(data => {
      const item = document.createElement('div');
      item.className = 'uuid-item';
      item.innerHTML = `
        <div class="uuid-header"><strong>UUID:</strong> ${data.uuid}</div>
        <div class="device-name"><strong>Gerät:</strong> ${data.deviceName}</div>
        <div class="timestamp"><strong>Letzte Sync:</strong> ${formatTimestamp(data.timestamp)}</div>
        <div class="timer" data-timestamp="${data.timestamp || 0}"><strong>Zeit seit Sync:</strong> ${calculateTimeSince(data.timestamp)}</div>
      `;
      item.onclick = () => {
        selectedUUID = data.uuid;
        overlay.style.display = 'none';
        if (refreshInterval) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
        fetchTrupps(selectedUUID);
      };
      list.appendChild(item);
    });
  }
  if (sorted.inaktiv.length > 0) {
    const inaktivLabel = document.createElement('div');
    inaktivLabel.style.fontWeight = 'bold';
    inaktivLabel.style.margin = '18px 0 4px 0';
    inaktivLabel.textContent = 'Inaktiv (> 10 Sekunden)';
    list.appendChild(inaktivLabel);
    sorted.inaktiv.forEach(data => {
      const item = document.createElement('div');
      item.className = 'uuid-item';
      item.innerHTML = `
        <div class="uuid-header"><strong>UUID:</strong> ${data.uuid}</div>
        <div class="device-name"><strong>Gerät:</strong> ${data.deviceName}</div>
        <div class="timestamp"><strong>Letzte Sync:</strong> ${formatTimestamp(data.timestamp)}</div>
        <div class="timer" data-timestamp="${data.timestamp || 0}"><strong>Zeit seit Sync:</strong> ${calculateTimeSince(data.timestamp)}</div>
      `;
      item.onclick = () => {
        selectedUUID = data.uuid;
        overlay.style.display = 'none';
        if (refreshInterval) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
        fetchTrupps(selectedUUID);
      };
      list.appendChild(item);
    });
  }

  // Entferne Abbrechen-Button, da Auswahl erzwungen
  const cancelBtn = document.getElementById('uuid-cancel-btn');
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }

  overlay.style.display = 'flex';

  // Update timers every second
  const updateTimers = () => {
    const timers = list.querySelectorAll('.timer');
    timers.forEach(timer => {
      const timestamp = parseInt(timer.getAttribute('data-timestamp'));
      timer.innerHTML = `<strong>Zeit seit Sync:</strong> ${calculateTimeSince(timestamp)}`;
    });
  };
  setInterval(updateTimers, 1000);

  // Scrollposition wiederherstellen
  if (list) list.scrollTop = prevScroll;

  // Refresh overlay every 2 seconds
  refreshInterval = setInterval(async () => {
    if (overlay.style.display === 'flex') {
      await showUUIDOverlay(uuids);
    } else {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }, 2000);
}

async function fetchTrupps(uuid = null, updateUI = true) {
  try {
    let url = `${SYNC_API_URL}?token=${encodeURIComponent(OPERATION_TOKEN)}`;
    if (uuid) {
      url += `&uuid=${encodeURIComponent(uuid)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const data = await response.json();
    if (uuid) {
      // Data is { trupps, timestamp, deviceName }
      if (updateUI) {
        lastSyncTimestamp = data.timestamp;
        document.getElementById('sync-timestamp').textContent = `Sync-Zeitpunkt: ${formatTimestamp(data.timestamp)} (UUID: ${uuid}, Device: ${data.deviceName})`;
        renderTrupps(data.trupps || []);
      }
      return data; // Return the data
    } else {
      // All data: { [uuid]: { trupps, timestamp, deviceName } }
      // For now, aggregate or show all, but since we select UUID, this might not be called without uuid
      const allTrupps = [];
      Object.values(data).forEach(uuidData => {
        allTrupps.push(...(uuidData.trupps || []));
      });
      if (updateUI) {
        lastSyncTimestamp = Math.max(...Object.values(data).map(d => d.timestamp));
        document.getElementById('sync-timestamp').textContent = `Sync-Zeitpunkt: ${formatTimestamp(lastSyncTimestamp)}`;
        renderTrupps(allTrupps);
      }
      return data; // Return the data
    }
  } catch (error) {
    console.error('Error fetching trupps:', error);
    throw error; // Re-throw to handle in caller
  }
}

function renderTrupps(trupps) {
  const container = document.getElementById('trupp-container');
  container.innerHTML = '';
  trupps.forEach(trupp => {
    const card = document.createElement('div');
    card.className = `trupp-card ${trupp.inaktiv ? 'inaktiv' : 'aktiv'}`;
    card.id = `trupp-${trupp.id}`;

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
    if (!trupp.inaktiv && trupp.startZeit) {
      const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
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

function calculateTimeSince(timestamp) {
  if (!timestamp) return '-';
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  const min = Math.floor(diff / 60);
  const sec = diff % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

window.addEventListener('DOMContentLoaded', async () => {
  if (!OPERATION_TOKEN) {
    showTokenOverlay();
  } else {
    const uuids = await fetchUUIDs();
    showUUIDOverlay(uuids); // Immer Overlay zeigen, auch wenn leer
  }
  setInterval(() => {
    if (selectedUUID) {
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
    }
  };
});