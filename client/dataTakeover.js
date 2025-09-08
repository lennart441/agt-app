// dataTakeover.js
// Mechanismus für Client-Wechsel und Datenübernahme
// Siehe copilot-instructions.md für Architekturhinweise

// Globale Variablen
let takeoverPollingInterval = null;
let takeoverPending = false;
let futureUUID = null;
let lastChecksum = null;

/**
 * Hilfsfunktion für Debug-Ausgaben mit Client-Typ und Schritt-Info.
 * @param {string} clientType - 'Alter Client' oder 'Neuer Client'.
 * @param {number} step - Schritt im Prozess (1-5).
 * @param {string} message - Die Debug-Nachricht.
 */
function debugLog(clientType, step, message) {
    console.log(`[DEBUG] [${clientType}, Schritt ${step}] ${message}`);
}

/**
 * Hilfsfunktion: Lädt verfügbare UUIDs vom Server.
 * @param {string} token - Operationstoken.
 */
async function loadAvailableUUIDs(token) {
    if (isOfflineMode()) return [];
    try {
        const url = `${window.SYNC_API_URL.replace('/trupps', '/uuids')}?token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) {
            debugLog('Neuer Client', 2, `UUIDs Response Error: ${res.status}, ${await res.text()}`);
            return [];
        }
        const data = await res.json();
        debugLog('Neuer Client', 2, `UUIDs Response Data: ${JSON.stringify(data)}`);
        return data.uuids || [];
    } catch (e) {
        debugLog('Neuer Client', 2, `UUIDs Fetch Exception: ${e}`);
        return [];
    }
}

/**
 * Zeigt die UUID-Liste im Übernahmeantrag (UI-bezogen, aber hier für Konsistenz).
 */
async function showTakeoverUUIDList() {
    if (isOfflineMode()) {
        const listDiv = document.getElementById('settings-takeover-uuid-list');
        if (listDiv) {
            listDiv.innerHTML = '<div class="no-uuid-message">Offline-Modus aktiv. Keine Geräte verfügbar.</div>';
        }
        if (document.getElementById('settings-takeover-send')) {
            document.getElementById('settings-takeover-send').disabled = true;
        }
        return;
    }
    const listDiv = document.getElementById('settings-takeover-uuid-list');
    if (!listDiv) return;
    listDiv.innerHTML = '<div>Lade UUIDs...</div>';
    const uuids = await loadAvailableUUIDs(window.OPERATION_TOKEN);
    debugLog('Neuer Client', 2, `UUIDs vom Server: ${uuids}`);
    // Eigene UUID herausfiltern
    const filtered = uuids.filter(uuid => uuid !== window.DEVICE_UUID);
    if (!filtered.length) {
        listDiv.innerHTML = '<div class="no-uuid-message">Keine anderen Geräte gefunden.</div>';
        document.getElementById('settings-takeover-send').disabled = true;
        return;
    }
    // Lade Daten für jede UUID
    const uuidDataPromises = filtered.map(async (uuid) => {
        try {
            const url = `${window.SYNC_API_URL}?token=${encodeURIComponent(window.OPERATION_TOKEN)}&uuid=${encodeURIComponent(uuid)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                return { uuid, deviceName: data.deviceName || 'Unbekannt', timestamp: data.timestamp || 0 };
            } else {
                return { uuid, deviceName: 'Unbekannt', timestamp: 0 };
            }
        } catch (e) {
            return { uuid, deviceName: 'Unbekannt', timestamp: 0 };
        }
    });
    const uuidData = await Promise.all(uuidDataPromises);
    // Sortiere nach timestamp absteigend (neueste oben)
    uuidData.sort((a, b) => b.timestamp - a.timestamp);
    // Funktion zur Berechnung der Zeitdifferenz
    function getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (days > 0) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
        if (hours > 0) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
        if (minutes > 0) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
        return 'gerade eben';
    }
    // HTML generieren
    listDiv.innerHTML = uuidData.map(data => {
        const date = new Date(data.timestamp).toLocaleString('de-DE');
        const timeAgo = getTimeAgo(data.timestamp);
        return `<div class="uuid-item" data-uuid="${data.uuid}">
            <div class="uuid-info">
                <strong>UUID:</strong> ${data.uuid}<br>
                <strong>Gerät:</strong> ${data.deviceName}<br>
                <strong>Letzter Kontakt:</strong> ${date} (${timeAgo})
            </div>
        </div>`;
    }).join('');
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
    // Timer für Live-Update der Zeitdifferenz
    if (window.takeoverTimer) clearInterval(window.takeoverTimer);
    window.takeoverTimer = setInterval(() => {
        const infoDivs = listDiv.querySelectorAll('.uuid-info');
        infoDivs.forEach((div, index) => {
            const data = uuidData[index];
            const timeAgo = getTimeAgo(data.timestamp);
            const date = new Date(data.timestamp).toLocaleString('de-DE');
            div.innerHTML = `
                <strong>UUID:</strong> ${data.uuid}<br>
                <strong>Gerät:</strong> ${data.deviceName}<br>
                <strong>Letzter Kontakt:</strong> ${date} (${timeAgo})
            `;
        });
    }, 60000); // Aktualisiere alle 60 Sekunden
}

/**
 * Erstellt eine einfache Prüfsumme aus den Truppdaten (für Datenvalidierung).
 * @param {Array} trupps - Array der Truppdaten.
 * @returns {string} - Einfacher Hash der Daten.
 */
function createChecksum(trupps) {
    const dataString = JSON.stringify(trupps);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Konvertiere zu 32bit integer
    }
    return hash.toString();
}

/**
 * Hilfsfunktion: Überprüft, ob der Offline-Modus aktiv ist.
 * @returns {boolean} - Wahr, wenn der Offline-Modus aktiv ist.
 */
function isOfflineMode() {
  return localStorage.getItem('offlineMode') === 'true';
}

/**
 * Sendet einen Übernahmeantrag.
 * Reihenfolge: Schritt 2 im Prozess - wird vom neuen Client ausgeführt.
 * @param {string} targetUUID - UUID des Zielgeräts (alter Client).
 */
window.sendTakeoverRequest = async function(targetUUID) {
    if (isOfflineMode()) {
        window.showErrorOverlay('Übernahmeanträge sind im Offline-Modus deaktiviert.');
        return;
    }
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
            debugLog('Neuer Client', 2, `Takeover Request Error: ${res.status}, ${await res.text()}`);
            return false;
        }
        debugLog('Neuer Client', 2, `Takeover Request sent for UUID: ${targetUUID}`);
        // Nach Absenden: Einstellungen schließen und Lade-Overlay anzeigen
        window.closeSettingsOverlay();
        window.showTakeoverLoadingOverlay();
        // Starte Polling auf Antwort
        window.pollTakeoverResponse(targetUUID);
        return true;
    } catch (e) {
        debugLog('Neuer Client', 2, `Takeover Request Exception: ${e}`);
        return false;
    }
};

/**
 * Pollt auf Antwort vom alten Client.
 * Reihenfolge: Teil von Schritt 2 - wird vom neuen Client ausgeführt.
 * @param {string} targetUUID - UUID des Zielgeräts.
 */
window.pollTakeoverResponse = function(targetUUID) {
    if (isOfflineMode()) return;
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
                        debugLog('Neuer Client', 2, 'Übernahmeantrag angenommen. Rufe Daten ab...');
                        // Daten von der alten UUID abrufen und speichern
                        await window.fetchAndStoreTakeoverData(targetUUID);
                        // Nach dem Speichern: Polle auf endgültige Bestätigung (Schritt 4)
                        window.pollTakeoverConfirm(targetUUID);
                        window.showTakeoverConfirmationOverlay('Übernahme bestätigt!');
                    } else if (data.status === 'declined') {
                        debugLog('Neuer Client', 2, 'Übernahmeantrag abgelehnt.');
                        window.showTakeoverConfirmationOverlay('Übernahme abgelehnt!');
                    }
                }
            }
        } catch (e) {
            debugLog('Neuer Client', 2, `Fehler beim Polling der Antwort: ${e}`);
        }
    }, 2000);
};

/**
 * Startet das Polling auf Übernahmeanträge.
 * Reihenfolge: Schritt 1 im Prozess - wird vom alten Client ausgeführt, um auf Anträge vom neuen Client zu warten.
 * @param {string} deviceUUID - UUID des aktuellen Geräts (alter Client).
 * @param {string} token - Operationstoken.
 */
function startTakeoverPolling(deviceUUID, token) {
    if (isOfflineMode()) return;
    if (takeoverPollingInterval) return;
    takeoverPollingInterval = setInterval(async () => {
        try {
            const takeoverUrl = `${window.SYNC_API_URL.replace('/trupps', '/takeover-request')}?token=${token}&uuid=${deviceUUID}`;
            const res = await fetch(takeoverUrl);
            if (res.ok) {
                const data = await res.json();
                if (data && data.requesterUUID && deviceUUID === window.DEVICE_UUID) {
                    debugLog('Alter Client', 1, `Übernahmeantrag für eigene UUID erkannt: ${deviceUUID} von ${data.requesterName} (${data.requesterUUID})`);
                    window.showTakeoverOverlay(data.requesterUUID, data.requesterName);
                }
                if (data && data.requesterUUID) {
                    if (!takeoverPending) {
                        takeoverPending = true;
                        debugLog('Alter Client', 1, `takeoverPending gesetzt für UUID ${deviceUUID}`);
                    }
                } else {
                    takeoverPending = false;
                }
            }
            // Poll für Truppdaten und futureUUID
            const res2 = await fetch(`${window.SYNC_API_URL}?token=${token}&uuid=${deviceUUID}`);
            if (!res2.ok) return;
            const data2 = await res2.json();
            if (data2 && data2.futureUUID && data2.futureUUID !== deviceUUID) {
                if (!takeoverPending) {
                    takeoverPending = true;
                    futureUUID = data2.futureUUID;
                    debugLog('Alter Client', 1, `futureUUID erkannt: ${futureUUID} (alt: ${deviceUUID})`);
                    showTakeoverOverlay(futureUUID, data2.deviceName);
                }
            }
            // Prüfsumme abrufen und validieren (für Datenvalidierung)
            const checksumUrl = `${window.SYNC_API_URL.replace('/trupps', '/takeover-checksum')}?token=${token}&oldUUID=${deviceUUID}`;
            const checksumRes = await fetch(checksumUrl);
            if (checksumRes.ok) {
                const checksumData = await checksumRes.json();
                if (checksumData && checksumData.checksum) {
                    const localTrupps = window.getAllTrupps();
                    const localChecksum = createChecksum(localTrupps);
                    if (localChecksum === checksumData.checksum) {
                        debugLog('Alter Client', 3, `Prüfsumme validiert für oldUUID ${deviceUUID}. Setze futureUUID auf ${checksumData.newUUID}.`);
                        // Server benachrichtigen (z. B. über Sync, aber hier simulieren wir es)
                        // In der Praxis: Ändere den Upload, um newUUID zu setzen
                        window.syncTruppsToServerWithNewUUID(checksumData.newUUID);
                    } else {
                        debugLog('Alter Client', 3, `Prüfsumme-Fehler für oldUUID ${deviceUUID}: erwartet ${localChecksum}, erhalten ${checksumData.checksum}`);
                    }
                }
            }
        } catch (e) {
            debugLog('Alter Client', 1, `Fehler im takeoverPolling: ${e}`);
        }
    }, 2000);
}

/**
 * Stoppt das Polling auf Übernahmeanträge.
 * Reihenfolge: Wird aufgerufen, um das Polling zu beenden, typischerweise nach Abschluss der Übernahme (alter Client).
 */
function stopTakeoverPolling() {
    if (takeoverPollingInterval) {
        clearInterval(takeoverPollingInterval);
        takeoverPollingInterval = null;
    }
}

/**
 * Sendet die Antwort auf einen Übernahmeantrag.
 * Reihenfolge: Schritt 3 im Prozess - wird vom alten Client ausgeführt, nachdem ein Antrag erkannt wurde.
 * @param {string} requesterUUID - UUID des anfragenden Geräts (neuer Client).
 * @param {string} status - Status der Antwort (z.B. 'accepted' oder 'rejected').
 */
window.sendTakeoverResponse = async function(requesterUUID, status) {
    try {
        const url = `${window.SYNC_API_URL.replace('/trupps', '/takeover-response')}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Operation-Token': window.OPERATION_TOKEN
            },
            body: JSON.stringify({
                requesterUUID,
                responderUUID: window.DEVICE_UUID,
                status,
                timestamp: Date.now()
            })
        });
        if (!res.ok) throw new Error(await res.text());
        debugLog('Alter Client', 3, `Takeover Response gesendet: ${status} für requesterUUID ${requesterUUID}`);
        return true;
    } catch (e) {
        debugLog('Alter Client', 3, `Fehler beim Senden der Übernahme-Antwort: ${e.message}`);
        window.showErrorOverlay('Fehler beim Senden der Übernahme-Antwort: ' + e.message);
        return false;
    }
};

/**
 * Pollt den Server auf die endgültige Bestätigung der Datenübernahme.
 * Reihenfolge: Schritt 4 im Prozess - wird vom neuen Client ausgeführt, um auf Bestätigung zu warten.
 * @param {string} oldUUID - UUID des alten Geräts, von dem die Daten übernommen werden.
 */
window.pollTakeoverConfirm = function(oldUUID) {
    if (isOfflineMode()) return;
    if (!oldUUID && window.TAKEOVER_OLD_UUID) oldUUID = window.TAKEOVER_OLD_UUID;
    debugLog('Neuer Client', 4, `Starte pollTakeoverConfirm mit oldUUID: ${oldUUID}`);
    let pollInterval = setInterval(async () => {
        try {
            const url = `${window.SYNC_API_URL.replace('/trupps', '/takeover-confirm')}?token=${window.OPERATION_TOKEN}&newUUID=${window.DEVICE_UUID}`;
            debugLog('Neuer Client', 4, `Polling takeover-confirm: ${url}`);
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                debugLog('Neuer Client', 4, `Response takeover-confirm: ${JSON.stringify(data)}`);
                if (data && data.confirmed) {
                    clearInterval(pollInterval);
                    window.showTakeoverConfirmationOverlay('Datenübernahme erfolgreich!');
                    debugLog('Neuer Client', 4, `Datenübernahme erfolgreich für newUUID=${window.DEVICE_UUID}`);
                    // UI aktualisieren: Trupps aus localStorage laden und rendern
                    window.renderAllTrupps();
                    debugLog('Neuer Client', 4, 'UI aktualisiert nach Datenübernahme.');
                    return; // Polling beenden
                }
            } else {
                debugLog('Neuer Client', 4, `Response NOT ok: ${res.status}, ${await res.text()}`);
            }
        } catch (e) {
            debugLog('Neuer Client', 4, `Fehler beim Polling der Übernahmebestätigung: ${e}`);
        }
    }, 2000);
};

/**
 * Ruft Truppdaten von der alten UUID ab und speichert sie im localStorage.
 * Nach dem Speichern: Erstellt Prüfsumme und sendet sie an den Server.
 * Reihenfolge: Schritt 5 im Prozess - wird vom neuen Client ausgeführt, nachdem die Übernahme bestätigt wurde.
 * @param {string} oldUUID - UUID des alten Geräts.
 */
window.fetchAndStoreTakeoverData = async function(oldUUID) {
    if (isOfflineMode()) return;
    debugLog('Neuer Client', 5, `fetchAndStoreTakeoverData aufgerufen mit oldUUID: ${oldUUID}`);
    try {
        const url = `${window.SYNC_API_URL}?token=${window.OPERATION_TOKEN}&uuid=${oldUUID}`;
        debugLog('Neuer Client', 5, `Abrufen der Truppdaten von: ${url}`);
        const res = await fetch(url);
        if (!res.ok) {
            const errText = await res.text();
            debugLog('Neuer Client', 5, `Fehlerhafte Response: ${res.status}, ${errText}`);
            throw new Error(errText);
        }
        const data = await res.json();
        debugLog('Neuer Client', 5, `Truppdaten-Response: ${JSON.stringify(data)}`);
        if (data && data.trupps) {
            if (window.saveTruppsToLocalStorage) {
                window.saveTruppsToLocalStorage(data.trupps);
                debugLog('Neuer Client', 5, `Truppdaten von alter UUID (${oldUUID}) im localStorage gespeichert.`);
                // Prüfsumme erstellen und senden
                const checksum = createChecksum(data.trupps);
                await sendChecksumToServer(oldUUID, checksum);
                debugLog('Neuer Client', 5, `Prüfsumme gesendet: ${checksum} für oldUUID ${oldUUID}`);
                // Seite neu laden, um UI zu aktualisieren (aber nur nach Validierung)
                // location.reload(); // Entfernt, da Validierung zuerst erfolgen muss
            } else {
                debugLog('Neuer Client', 5, 'saveTruppsToLocalStorage nicht verfügbar!');
            }
        } else {
            debugLog('Neuer Client', 5, `Keine Truppdaten für alte UUID gefunden! Data: ${JSON.stringify(data)}`);
            window.showErrorOverlay('Keine Truppdaten für alte UUID gefunden!');
        }
    } catch (e) {
        debugLog('Neuer Client', 5, `Fehler beim Abrufen der Truppdaten: ${e}`);
        window.showErrorOverlay('Fehler beim Abrufen der Truppdaten: ' + e.message);
    }
};

/**
 * Sendet die Prüfsumme an den Server.
 * @param {string} oldUUID - UUID des alten Geräts.
 * @param {string} checksum - Die erstellte Prüfsumme.
 */
async function sendChecksumToServer(oldUUID, checksum) {
    if (isOfflineMode()) return;
    try {
        const url = `${window.SYNC_API_URL.replace('/trupps', '/takeover-checksum')}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Operation-Token': window.OPERATION_TOKEN
            },
            body: JSON.stringify({
                oldUUID,
                newUUID: window.DEVICE_UUID,
                checksum,
                timestamp: Date.now()
            })
        });
        if (!res.ok) {
            debugLog('Neuer Client', 5, `Fehler beim Senden der Prüfsumme: ${res.status}, ${await res.text()}`);
        } else {
            debugLog('Neuer Client', 5, 'Prüfsumme erfolgreich gesendet.');
        }
    } catch (e) {
        debugLog('Neuer Client', 5, `Exception beim Senden der Prüfsumme: ${e}`);
    }
};

/**
 * Sync-Funktion mit newUUID (für den alten Client, um futureUUID zu setzen).
 * @param {string} newUUID - UUID des neuen Clients.
 */
window.syncTruppsToServerWithNewUUID = async function(newUUID) {
    if (isOfflineMode()) return;
    try {
        const truppsToSync = window.getAllTrupps();
        const deviceName = window.DEVICE_NAME || 'AGT-Device'; // Fallback, falls undefined
        debugLog('Alter Client', 3, `Syncing trupps with newUUID: ${newUUID}, deviceName: ${deviceName}`);
        const response = await fetch(window.SYNC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Operation-Token': window.OPERATION_TOKEN
            },
            body: JSON.stringify({
                trupps: truppsToSync,
                timestamp: Date.now(),
                deviceUUID: window.DEVICE_UUID,
                deviceName: deviceName,
                newUUID // Zusätzliches Feld für Validierung
            })
        });
        if (!response.ok) {
            throw new Error(`Sync failed: ${response.status}`);
        }
        debugLog('Alter Client', 3, `Trupps successfully synced to server with newUUID: ${newUUID}`);
        
        // Nach erfolgreichem Sync: Lösche lokale Daten und lade neu (alter Client zurücksetzen)
        localStorage.removeItem('agt_trupps_v2');
        localStorage.removeItem('deviceUUID');
        debugLog('Alter Client', 3, 'Lokale Daten gelöscht. Seite wird neu geladen...');
        location.reload();
    } catch (error) {
        debugLog('Alter Client', 3, `Error syncing trupps with newUUID: ${error}`);
    }
};

window.startTakeoverPolling = function(deviceUUID, token) {
    if (isOfflineMode()) return;
    startTakeoverPolling(deviceUUID, token);
}