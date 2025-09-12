// Hilfsfunktionen, Overlay- und Settings-Logik
const SYNC_API_URL = 'http://localhost:3001/v1/sync-api/trupps';
let OPERATION_TOKEN = "abc123def456ghi7";
let lastSyncTimestamp = null;
let selectedUUID = null;
let refreshInterval = null;
let settingsUUIDInterval = null;
let multiUUIDEnabled = false;
let selectedUUIDs = [];
let isUpdatingOverlay = false; // Flag für gleichzeitige Overlay-Aktualisierung

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
  // Nach Schließen: Trupps für alle ausgewählten UUIDs anzeigen
  if (multiUUIDEnabled && selectedUUIDs.length > 0) {
    fetchTruppsMulti(selectedUUIDs);
  } else if (!multiUUIDEnabled && selectedUUID) {
    fetchTrupps(selectedUUID);
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

let lastSettingsUUIDData = []; // [{uuid, deviceName, timestamp}]

function uuidsListChanged(newList, oldList) {
  if (newList.length !== oldList.length) return true;
  for (let i = 0; i < newList.length; i++) {
    if (newList[i].uuid !== oldList[i].uuid) return true;
  }
  return false;
}

async function renderSettingsUUIDList() {
  const listDiv = document.getElementById('settings-uuid-list');
  const settingsRight = document.querySelector('.settings-right');
  const prevScroll = settingsRight ? settingsRight.scrollTop : 0;

  const uuids = await fetchUUIDs();
  if (uuids.length === 0) {
    listDiv.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'no-uuid-message';
    msg.textContent = 'Keine Überwachungen unter diesem Token aktiv.';
    listDiv.appendChild(msg);
    if (settingsRight) settingsRight.scrollTop = prevScroll;
    lastSettingsUUIDData = [];
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

  // Prüfe, ob die UUID-Liste komplett neu ist
  if (uuidsListChanged(uuidData, lastSettingsUUIDData)) {
    // Komplett neu: baue die UI neu auf
    listDiv.innerHTML = '';
    const sorted = sortUUIDData(uuidData);
    const renderList = (arr) => {
      arr.forEach(data => {
        let isSelected = multiUUIDEnabled
          ? selectedUUIDs.includes(data.uuid)
          : data.uuid === selectedUUID;
        const item = document.createElement('div');
        item.className = 'uuid-item' + (isSelected ? ' selected' : '');
        item.setAttribute('data-uuid', data.uuid);
        item.innerHTML = `
          <div class="uuid-header"><strong>UUID:</strong> ${data.uuid}</div>
          <div class="device-name"><strong>Gerät:</strong> ${data.deviceName}</div>
          <div class="timestamp"><strong>Letzte Sync:</strong> ${formatTimestamp(data.timestamp)}</div>
          <div class="timer"><strong>Zeit seit Sync:</strong> ${calculateTimeSince(data.timestamp)}</div>
        `;
        item.onclick = () => {
          if (multiUUIDEnabled) {
            if (selectedUUIDs.includes(data.uuid)) {
              selectedUUIDs = selectedUUIDs.filter(u => u !== data.uuid);
            } else {
              selectedUUIDs.push(data.uuid);
            }
            renderSettingsUUIDList();
          } else {
            selectedUUID = data.uuid;
            renderSettingsUUIDList();
            fetchTrupps(selectedUUID);
            hideSettingsOverlay();
          }
        };
        listDiv.appendChild(item);
      });
    };
    if (sorted.aktiv.length > 0) {
      const aktivLabel = document.createElement('div');
      aktivLabel.style.fontWeight = 'bold';
      aktivLabel.style.margin = '10px 0 4px 0';
      aktivLabel.textContent = 'Aktiv (≤ 10 Sekunden)';
      listDiv.appendChild(aktivLabel);
      renderList(sorted.aktiv);
    }
    if (sorted.inaktiv.length > 0) {
      const inaktivLabel = document.createElement('div');
      inaktivLabel.style.fontWeight = 'bold';
      inaktivLabel.style.margin = '18px 0 4px 0';
      inaktivLabel.textContent = 'Inaktiv (> 10 Sekunden)';
      listDiv.appendChild(inaktivLabel);
      renderList(sorted.inaktiv);
    }
    lastSettingsUUIDData = uuidData;
    if (settingsRight) settingsRight.scrollTop = prevScroll;
    return;
  }

  // Nur Details geändert: aktualisiere nur die Felder
  uuidData.forEach((data, idx) => {
    const item = listDiv.querySelector(`.uuid-item[data-uuid="${data.uuid}"]`);
    if (item) {
      // DeviceName geändert?
      const deviceDiv = item.querySelector('.device-name');
      if (deviceDiv && deviceDiv.textContent !== `Gerät: ${data.deviceName}`) {
        deviceDiv.textContent = `Gerät: ${data.deviceName}`;
      }
      // Timestamp geändert?
      const tsDiv = item.querySelector('.timestamp');
      if (tsDiv && tsDiv.textContent !== `Letzte Sync: ${formatTimestamp(data.timestamp)}`) {
        tsDiv.textContent = `Letzte Sync: ${formatTimestamp(data.timestamp)}`;
      }
      // Timer immer aktualisieren
      const timerDiv = item.querySelector('.timer');
      if (timerDiv) {
        timerDiv.textContent = `Zeit seit Sync: ${calculateTimeSince(data.timestamp)}`;
      }
      // Auswahlstatus aktualisieren
      let isSelected = multiUUIDEnabled
        ? selectedUUIDs.includes(data.uuid)
        : data.uuid === selectedUUID;
      if (isSelected) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    }
  });
  lastSettingsUUIDData = uuidData;
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

let lastOverlayUUIDData = []; // [{uuid, deviceName, timestamp}]

function uuidsListChanged(newList, oldList) {
  if (newList.length !== oldList.length) return true;
  for (let i = 0; i < newList.length; i++) {
    if (newList[i].uuid !== oldList[i].uuid) return true;
  }
  return false;
}

async function showUUIDOverlay(uuids) {
  if (isUpdatingOverlay) return;
  isUpdatingOverlay = true;
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  const overlay = document.getElementById('uuid-overlay');
  const list = document.getElementById('uuid-list');
  const prevScroll = list ? list.scrollTop : 0;

  if (uuids.length === 0) {
    list.innerHTML = '';
    const message = document.createElement('div');
    message.className = 'no-uuid-message';
    message.textContent = 'Keine Überwachungen unter diesem Token aktiv.';
    list.appendChild(message);
    overlay.style.display = 'flex';
    if (list) list.scrollTop = prevScroll;
    lastOverlayUUIDData = [];
    isUpdatingOverlay = false;
    return;
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

  // Prüfe, ob die UUID-Liste komplett neu ist
  if (uuidsListChanged(uuidData, lastOverlayUUIDData)) {
    // Komplett neu: baue die UI neu auf
    list.innerHTML = '';
    const sorted = sortUUIDData(uuidData);
    const renderList = (arr) => {
      arr.forEach(data => {
        const item = document.createElement('div');
        item.className = 'uuid-item';
        item.setAttribute('data-uuid', data.uuid);
        item.innerHTML = `
          <div class="uuid-header"><strong>UUID:</strong> ${data.uuid}</div>
          <div class="device-name"><strong>Gerät:</strong> ${data.deviceName}</div>
          <div class="timestamp"><strong>Letzte Sync:</strong> ${formatTimestamp(data.timestamp)}</div>
          <div class="timer"><strong>Zeit seit Sync:</strong> ${calculateTimeSince(data.timestamp)}</div>
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
    };
    if (sorted.aktiv.length > 0) {
      const aktivLabel = document.createElement('div');
      aktivLabel.style.fontWeight = 'bold';
      aktivLabel.style.margin = '10px 0 4px 0';
      aktivLabel.textContent = 'Aktiv (≤ 10 Sekunden)';
      list.appendChild(aktivLabel);
      renderList(sorted.aktiv);
    }
    if (sorted.inaktiv.length > 0) {
      const inaktivLabel = document.createElement('div');
      inaktivLabel.style.fontWeight = 'bold';
      inaktivLabel.style.margin = '18px 0 4px 0';
      inaktivLabel.textContent = 'Inaktiv (> 10 Sekunden)';
      list.appendChild(inaktivLabel);
      renderList(sorted.inaktiv);
    }
    lastOverlayUUIDData = uuidData;
    overlay.style.display = 'flex';
    if (list) list.scrollTop = prevScroll;
    isUpdatingOverlay = false;
    return;
  }

  // Nur Details geändert: aktualisiere nur die Felder
  uuidData.forEach((data, idx) => {
    const item = list.querySelector(`.uuid-item[data-uuid="${data.uuid}"]`);
    if (item) {
      // DeviceName geändert?
      const deviceDiv = item.querySelector('.device-name');
      if (deviceDiv && deviceDiv.textContent !== `Gerät: ${data.deviceName}`) {
        deviceDiv.textContent = `Gerät: ${data.deviceName}`;
      }
      // Timestamp geändert?
      const tsDiv = item.querySelector('.timestamp');
      if (tsDiv && tsDiv.textContent !== `Letzte Sync: ${formatTimestamp(data.timestamp)}`) {
        tsDiv.textContent = `Letzte Sync: ${formatTimestamp(data.timestamp)}`;
      }
      // Timer immer aktualisieren
      const timerDiv = item.querySelector('.timer');
      if (timerDiv) {
        timerDiv.textContent = `Zeit seit Sync: ${calculateTimeSince(data.timestamp)}`;
      }
    }
  });
  lastOverlayUUIDData = uuidData;
  overlay.style.display = 'flex';
  if (list) list.scrollTop = prevScroll;
  isUpdatingOverlay = false;
}

// Fehler-Overlay global definieren
function showErrorOverlay(msg) {
  let overlay = document.getElementById('error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="overlay-content"><h2>Fehler</h2><p>${msg}</p><button onclick="document.getElementById('error-overlay').style.display='none'">Schließen</button></div>`;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('p').textContent = msg;
  }
  overlay.style.display = 'flex';
}

function updateMultiUUIDSwitchUI() {
  const switchEl = document.getElementById('multi-uuid-switch');
  if (!switchEl) return;
  switchEl.checked = multiUUIDEnabled;
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
      if (e.target.dataset.setting === 'sync') updateMultiUUIDSwitchUI();
    }
  };
  // Schieberegler für Mehrfachauswahl
  const multiSwitch = document.getElementById('multi-uuid-switch');
  if (multiSwitch) {
    multiSwitch.onchange = function() {
      multiUUIDEnabled = multiSwitch.checked;
      updateMultiUUIDSwitchUI();
      // Hier könnte die Logik für Mehrfachauswahl ergänzt werden
    };
    updateMultiUUIDSwitchUI();
  }
});

// Funktion zum Laden und Anzeigen der Trupps vom Server
async function loadTruppsFromServer() {
    try {
        const token = getTokenFromUrl();
        if (!token) {
            console.error('Kein Token gefunden.');
            return;
        }
        const url = `${SYNC_API_URL.replace('/trupps', '/trupps')}?token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Fehler beim Laden der Trupps:', res.status);
            return;
        }
        const allData = await res.json();
        // Sammle alle UUIDs und deren Daten
        const truppsByUUID = {};
        for (const uuid in allData) {
            const data = allData[uuid];
            if (data.futureUUID) {
                // Wenn futureUUID vorhanden, verwende die neue UUID
                truppsByUUID[data.futureUUID] = data.trupps || [];
                // Entferne alte UUID, falls vorhanden
                delete truppsByUUID[uuid];
            } else {
                truppsByUUID[uuid] = data.trupps || [];
            }
        }
        // Sammle alle Trupps
        const allTrupps = [];
        for (const uuid in truppsByUUID) {
            allTrupps.push(...truppsByUUID[uuid]);
        }
        // Anzeigen
        displayTrupps(allTrupps);
    } catch (error) {
        console.error('Fehler beim Laden der Trupps:', error);
    }
}