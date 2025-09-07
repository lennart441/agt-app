// eventlistener.js
// Globale Hilfsfunktionen und Event-Listener für die UI

window.setFakeInputValue = function(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
};

window.setupMeldungInput = function(id) {
  const input = document.getElementById(id);
  input.addEventListener('click', () => showDruckOverlay(id));
};

window.addEventListener('DOMContentLoaded', async () => {
  window.renderAllTrupps();
  window.renderArchivierteTrupps();
});

// Einstellungen-Overlay öffnen/schließen
window.openSettingsOverlay = function() {
    // Token-Feld mit aktuellem Wert füllen
    const tokenInput = document.getElementById('settings-token-input');
    if (tokenInput && window.OPERATION_TOKEN) {
        tokenInput.value = window.OPERATION_TOKEN;
    }
    // Gerätename-Feld mit aktuellem Wert füllen
    const deviceInput = document.getElementById('settings-device-input');
    if (deviceInput && window.DEVICE_NAME) {
        deviceInput.value = window.DEVICE_NAME;
    }
    document.getElementById('settings-overlay').style.display = 'flex';
};
window.closeSettingsOverlay = function() {
    document.getElementById('settings-overlay').style.display = 'none';
};

// Eventlistener für Button und Close
window.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('settings-btn');
    if (btn) btn.onclick = window.openSettingsOverlay;
    const closeBtn = document.getElementById('settings-close-btn');
    if (closeBtn) closeBtn.onclick = window.closeSettingsOverlay;
    // Tab-Wechsel im Overlay
    const items = document.querySelectorAll('#settings-list .settings-item');
    items.forEach(item => {
        item.onclick = function() {
            items.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            document.querySelectorAll('.setting-panel').forEach(panel => panel.style.display = 'none');
            const panelId = 'setting-' + item.getAttribute('data-setting');
            const panel = document.getElementById(panelId);
            if (panel) panel.style.display = 'block';
            // Bei Übernahmeantrag die UUID-Liste laden
            if (item.getAttribute('data-setting') === 'takeover') {
                window.showTakeoverUUIDList(); // Aufruf aus dataTakeover.js
            }
        };
    });
});

// Eventlistener für Antrag senden Button
window.addEventListener('DOMContentLoaded', function() {
    const takeoverBtn = document.getElementById('settings-takeover-send');
    if (takeoverBtn) {
        takeoverBtn.onclick = async function() {
            const uuid = takeoverBtn.dataset.uuid;
            if (uuid) {
                await window.sendTakeoverRequest(uuid); // Aufruf aus dataTakeover.js
                takeoverBtn.disabled = true;
                takeoverBtn.textContent = 'Antrag gesendet';
                setTimeout(() => {
                    takeoverBtn.textContent = 'Antrag senden';
                    takeoverBtn.disabled = false;
                }, 3000);
            }
        };
    }
});

window.addEventListener('DOMContentLoaded', function() {
    if (window.startTakeoverPolling && window.DEVICE_UUID && window.OPERATION_TOKEN) {
        window.startTakeoverPolling(window.DEVICE_UUID, window.OPERATION_TOKEN);
        console.log('[DEBUG] startTakeoverPolling gestartet:', window.DEVICE_UUID, window.OPERATION_TOKEN);
    }
});

// OPERATION_TOKEN, DEVICE_UUID und SYNC_API_URL aus logic.js übernehmen
if (typeof OPERATION_TOKEN !== 'undefined') {
    window.OPERATION_TOKEN = OPERATION_TOKEN;
}
if (typeof DEVICE_UUID !== 'undefined') {
    window.DEVICE_UUID = DEVICE_UUID;
}
if (typeof DEVICE_NAME !== 'undefined') {
    window.DEVICE_NAME = DEVICE_NAME;
}
if (typeof SYNC_API_URL !== 'undefined') {
    window.SYNC_API_URL = SYNC_API_URL;
}

window.debugShowOwnTakeoverRequest = async function() {
    if (!window.SYNC_API_URL || !window.OPERATION_TOKEN || !window.DEVICE_UUID) return;
    try {
        const takeoverRes = await fetch(`${window.SYNC_API_URL.replace('/trupps', '/takeover-request')}?token=${encodeURIComponent(window.OPERATION_TOKEN)}&uuid=${window.DEVICE_UUID}`);
        if (takeoverRes.ok) {
            const takeoverData = await takeoverRes.json();
            if (takeoverData && takeoverData.requesterUUID) {
                console.log(`[DEBUG] Eigener Übernahmeantrag:`, takeoverData);
                if (window.showTakeoverOverlay) {
                    window.showTakeoverOverlay(takeoverData.requesterUUID, takeoverData.requesterName,
                        function() { console.log('[DEBUG] Übernahme bestätigt'); },
                        function() { console.log('[DEBUG] Übernahme abgelehnt'); }
                    );
                }
            }
        }
    } catch (e) {
        console.log('[DEBUG] Fehler beim Abrufen des eigenen Übernahmeantrags:', e);
    }
};
setInterval(window.debugShowOwnTakeoverRequest, 5000);

window.addEventListener('DOMContentLoaded', function() {
    const debugBtn = document.getElementById('debug-takeover-btn');
    if (debugBtn) {
        debugBtn.onclick = function() {
            if (window.showTakeoverOverlay) {
                window.showTakeoverOverlay(window.DEVICE_UUID, 'Debug-Gerät', function() {
                    console.log('[DEBUG] Übernahme bestätigt');
                }, function() {
                    console.log('[DEBUG] Übernahme abgelehnt');
                });
            } else {
                alert('Overlay-Funktion nicht verfügbar!');
            }
        };
    }
});

// Eventlistener für Device Save Button
window.addEventListener('DOMContentLoaded', function() {
    const deviceSaveBtn = document.getElementById('settings-device-save');
    if (deviceSaveBtn) {
        deviceSaveBtn.onclick = function() {
            const newDeviceName = document.getElementById('settings-device-input').value.trim();
            if (newDeviceName) {
                localStorage.setItem('deviceName', newDeviceName);
                window.DEVICE_NAME = newDeviceName;
                if (typeof syncTruppsToServer === 'function') {
                    syncTruppsToServer(); // Sende den neuen Namen an den Server
                }
                if (typeof showSuccessOverlay === 'function') {
                    showSuccessOverlay('Gerätename gespeichert!');
                }
            } else {
                if (typeof showErrorOverlay === 'function') {
                    showErrorOverlay('Bitte einen gültigen Namen eingeben.');
                }
            }
        };
    }
});
