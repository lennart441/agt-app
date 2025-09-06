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
                showTakeoverUUIDList();
            }
        };
    });
});

// Hilfsfunktion: UUIDs vom Server laden
async function loadAvailableUUIDs(token) {
    try {
        const url = `${window.SYNC_API_URL.replace('/trupps', '/uuids')}?token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.log('[DEBUG] UUIDs Response Error:', res.status, await res.text());
            return [];
        }
        const data = await res.json();
        console.log('[DEBUG] UUIDs Response Data:', data);
        return data.uuids || [];
    } catch (e) {
        console.log('[DEBUG] UUIDs Fetch Exception:', e);
        return [];
    }
}

// Zeigt die UUID-Liste im Übernahmeantrag
async function showTakeoverUUIDList() {
    const listDiv = document.getElementById('settings-takeover-uuid-list');
    if (!listDiv) return;
    listDiv.innerHTML = '<div>Lade UUIDs...</div>';
    const uuids = await loadAvailableUUIDs(window.OPERATION_TOKEN);
    console.log('[DEBUG] UUIDs vom Server:', uuids);
    // Eigene UUID herausfiltern
    const filtered = uuids.filter(uuid => uuid !== window.DEVICE_UUID);
    if (!filtered.length) {
        listDiv.innerHTML = '<div class="no-uuid-message">Keine anderen Geräte gefunden.</div>';
        document.getElementById('settings-takeover-send').disabled = true;
        return;
    }
    let selectedUUID = null;
    listDiv.innerHTML = filtered.map(uuid => `<div class="uuid-item" data-uuid="${uuid}">${uuid}</div>`).join('');
    const items = listDiv.querySelectorAll('.uuid-item');
    items.forEach(item => {
        item.onclick = function() {
            items.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedUUID = item.getAttribute('data-uuid');
            document.getElementById('settings-takeover-send').disabled = false;
            document.getElementById('settings-takeover-send').dataset.uuid = selectedUUID;
        };
    });
    document.getElementById('settings-takeover-send').disabled = true;
}

// Übernahmeantrag senden
window.sendTakeoverRequest = async function(targetUUID) {
    try {
        const url = `${window.SYNC_API_URL.replace('/trupps', '/takeover-request')}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Operation-Token': window.OPERATION_TOKEN
            },
            body: JSON.stringify({
                targetUUID,
                requesterUUID: window.DEVICE_UUID,
                requesterName: window.DEVICE_NAME || 'Unbekannt',
                timestamp: Date.now()
            })
        });
        if (!res.ok) {
            console.log('[DEBUG] Takeover Request Error:', res.status, await res.text());
            return false;
        }
        console.log('[DEBUG] Takeover Request sent for UUID:', targetUUID);
        // Nach Absenden: Einstellungen schließen und Lade-Overlay anzeigen
        window.closeSettingsOverlay();
        window.showTakeoverLoadingOverlay();
        // Starte Polling auf Antwort
        window.pollTakeoverResponse(targetUUID);
        return true;
    } catch (e) {
        console.log('[DEBUG] Takeover Request Exception:', e);
        return false;
    }
};

// Pollt auf Antwort vom alten Client
window.pollTakeoverResponse = function(targetUUID) {
    let pollInterval = setInterval(async () => {
        try {
            const url = `${window.SYNC_API_URL.replace('/trupps', '/takeover-response')}?token=${window.OPERATION_TOKEN}&requesterUUID=${window.DEVICE_UUID}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data.status) {
                    window.hideTakeoverLoadingOverlay();
                    clearInterval(pollInterval);
                    if (data.status === 'accepted') {
                        alert('Übernahme bestätigt!');
                    } else if (data.status === 'declined') {
                        alert('Übernahme abgelehnt!');
                    }
                }
            }
        } catch (e) {}
    }, 2000);
};

// Benachrichtigt den neuen Client über die Antwort (accepted/declined)
window.notifyTakeoverRequester = function(targetUUID, status) {
    // Pollt auf den /takeover-response Endpoint, um die Antwort zu signalisieren
    let pollCount = 0;
    let maxPolls = 10; // 20 Sekunden
    let pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
            clearInterval(pollInterval);
            window.showTakeoverResultOverlay('timeout');
            return;
        }
        try {
            const url = `${window.SYNC_API_URL.replace('/trupps', '/takeover-response')}?token=${window.OPERATION_TOKEN}&requesterUUID=${targetUUID}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data && data.status) {
                    clearInterval(pollInterval);
                    window.showTakeoverResultOverlay(data.status);
                }
            }
        } catch (e) {}
    }, 2000);
};

// Overlay für das Ergebnis der Übernahme
window.showTakeoverResultOverlay = function(status) {
    let overlay = document.getElementById('takeover-result-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'takeover-result-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.zIndex = '10004';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        document.body.appendChild(overlay);
    }
    let msg = '';
    if (status === 'accepted') {
        msg = '<h2>Übernahme bestätigt!</h2><p>Das neue Gerät kann jetzt übernehmen.</p>';
    } else if (status === 'declined') {
        msg = '<h2>Übernahme abgelehnt!</h2><p>Das neue Gerät hat die Übernahme nicht erhalten.</p>';
    } else {
        msg = '<h2>Keine Antwort erhalten</h2><p>Die Übernahme wurde nicht bestätigt.</p>';
    }
    overlay.innerHTML = `<div style="background:#fff;padding:2em 2.5em;border-radius:10px;box-shadow:0 2px 16px rgba(0,0,0,0.18);min-width:320px;text-align:center;">${msg}<br><button onclick="document.getElementById('takeover-result-overlay').style.display='none'">Schließen</button></div>`;
    overlay.style.display = 'flex';
};

// Eventlistener für Antrag senden Button
window.addEventListener('DOMContentLoaded', function() {
    const takeoverBtn = document.getElementById('settings-takeover-send');
    if (takeoverBtn) {
        takeoverBtn.onclick = async function() {
            const uuid = takeoverBtn.dataset.uuid;
            if (uuid) {
                await window.sendTakeoverRequest(uuid);
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
