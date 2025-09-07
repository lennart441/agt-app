// dataTakeover.js
// Mechanismus für Client-Wechsel und Datenübernahme
// Siehe copilot-instructions.md für Architekturhinweise

// Globale Variablen
let takeoverPollingInterval = null;
let takeoverPending = false;
let futureUUID = null;
let lastChecksum = null;

// Pollt alle 2 Sekunden auf Übernahmeantrag
function startTakeoverPolling(deviceUUID, token) {
    if (takeoverPollingInterval) return;
    takeoverPollingInterval = setInterval(async () => {
        try {
            const takeoverUrl = `${window.SYNC_API_URL.replace('/trupps', '/takeover-request')}?token=${token}&uuid=${deviceUUID}`;
            const res = await fetch(takeoverUrl);
            if (res.ok) {
                const data = await res.json();
                if (data && data.requesterUUID && deviceUUID === window.DEVICE_UUID) {
                    console.log(`[DEBUG] Übernahmeantrag für eigene UUID erkannt: ${deviceUUID} von ${data.requesterName} (${data.requesterUUID})`);
                    window.showTakeoverOverlay(data.requesterUUID, data.requesterName);
                }
                if (data && data.requesterUUID) {
                    if (!takeoverPending) {
                        takeoverPending = true;
                        console.log(`[DEBUG] takeoverPending gesetzt für UUID ${deviceUUID}`);
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
                    console.log(`[DEBUG] futureUUID erkannt: ${futureUUID} (alt: ${deviceUUID})`);
                    showTakeoverOverlay(futureUUID, data2.deviceName);
                }
            }

        } catch (e) {
            console.log('[DEBUG] Fehler im takeoverPolling:', e);
        }
    }, 2000);
}

// Stoppt das Polling
function stopTakeoverPolling() {
    if (takeoverPollingInterval) {
        clearInterval(takeoverPollingInterval);
        takeoverPollingInterval = null;
    }
}

// Entferne die alte showTakeoverOverlay-Funktion aus dataTakeover.js

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
        return true;
    } catch (e) {
        window.showErrorOverlay('Fehler beim Senden der Übernahme-Antwort: ' + e.message);
        return false;
    }
};

/**
 * Pollt den Server auf die endgültige Bestätigung der Datenübernahme.
 * @param {string} oldUUID Die alte UUID des Geräts, von dem die Daten übernommen wurden.
 */
window.pollTakeoverConfirm = function(oldUUID) {
    if (!oldUUID && window.TAKEOVER_OLD_UUID) oldUUID = window.TAKEOVER_OLD_UUID;
    console.log('[DEBUG] Starte pollTakeoverConfirm mit oldUUID:', oldUUID);
    let pollInterval = setInterval(async () => {
        try {
            const url = `${window.SYNC_API_URL.replace('/trupps', '/takeover-confirm')}?token=${window.OPERATION_TOKEN}&newUUID=${window.DEVICE_UUID}`;
            console.log('[DEBUG] Polling takeover-confirm:', url);
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                console.log('[DEBUG] Response takeover-confirm:', data);
                if (data && data.confirmed) {
                    clearInterval(pollInterval);
                    window.showTakeoverConfirmationOverlay('Datenübernahme erfolgreich!');
                    console.log(`[DEBUG] Datenübernahme erfolgreich für newUUID=${window.DEVICE_UUID}`);
                    window.fetchAndStoreTakeoverData(oldUUID);
                }
            } else {
                console.log('[DEBUG] Response NOT ok:', res.status, await res.text());
            }
        } catch (e) {
            console.log('[DEBUG] Fehler beim Polling der Übernahmebestätigung:', e);
        }
    }, 2000);
};

// Neuer Client: Truppdaten von alter UUID abrufen und im localStorage speichern
window.fetchAndStoreTakeoverData = async function(oldUUID) {
    console.log('[DEBUG] fetchAndStoreTakeoverData aufgerufen mit oldUUID:', oldUUID);
    try {
        const url = `${window.SYNC_API_URL}?token=${window.OPERATION_TOKEN}&uuid=${oldUUID}`;
        console.log('[DEBUG] Abrufen der Truppdaten von:', url);
        const res = await fetch(url);
        if (!res.ok) {
            const errText = await res.text();
            console.log('[DEBUG] Fehlerhafte Response:', res.status, errText);
            throw new Error(errText);
        }
        const data = await res.json();
        console.log('[DEBUG] Truppdaten-Response:', data);
        if (data && data.trupps) {
            if (window.saveTruppsToLocalStorage) {
                window.saveTruppsToLocalStorage(data.trupps);
                console.log(`[DEBUG] Truppdaten von alter UUID (${oldUUID}) im localStorage gespeichert.`);
                // Seite neu laden, um UI zu aktualisieren
                location.reload();
            } else {
                console.log('[DEBUG] saveTruppsToLocalStorage nicht verfügbar!');
            }
        } else {
            console.log('[DEBUG] Keine Truppdaten für alte UUID gefunden! Data:', data);
            window.showErrorOverlay('Keine Truppdaten für alte UUID gefunden!');
        }
    } catch (e) {
        window.showErrorOverlay('Fehler beim Abrufen der Truppdaten: ' + e.message);
        console.log('[DEBUG] Fehler beim Abrufen der Truppdaten:', e);
    }
};