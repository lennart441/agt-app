// dataTakeover.js
// Mechanismus für Client-Wechsel und Datenübernahme
// Siehe copilot-instructions.md für Architekturhinweise

// Globale Variablen
let takeoverPollingInterval = null;
let takeoverPending = false;
let futureUUID = null;
let lastChecksum = null;

// Prüfsummenfunktion für Truppdaten
function calculateChecksum(trupps) {
    // Einfache Prüfsumme: JSON-Stringify + Hash
    const str = JSON.stringify(trupps);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

// Pollt alle 2 Sekunden auf Übernahmeantrag
function startTakeoverPolling(deviceUUID, token) {
    if (takeoverPollingInterval) return;
    takeoverPollingInterval = setInterval(async () => {
        try {
            const takeoverUrl = `${window.SYNC_API_URL.replace('/trupps', '/takeover-request')}?token=${token}&uuid=${deviceUUID}`;
            console.log('[DEBUG] Poll takeover-request:', takeoverUrl);
            const res = await fetch(takeoverUrl);
            if (res.ok) {
                const data = await res.json();
                console.log('[DEBUG] takeover-request Antwort:', data);
                // Prüfe explizit, ob Antrag für eigene UUID vorliegt
                if (data && data.requesterUUID && deviceUUID === window.DEVICE_UUID) {
                    console.log('[DEBUG] Übernahmeantrag für eigene UUID erkannt:', deviceUUID);
                    console.log('[DEBUG] showTakeoverOverlay Typ:', typeof window.showTakeoverOverlay, window.showTakeoverOverlay);
                    window.showTakeoverOverlay(data.requesterUUID, data.requesterName);
                }
                // ...takeoverPending-Logik bleibt für Mehrfachanträge...
                if (data && data.requesterUUID) {
                    if (!takeoverPending) {
                        takeoverPending = true;
                    }
                } else {
                    takeoverPending = false;
                }
            } else {
                console.log('[DEBUG] takeover-request Response not ok:', res.status);
                takeoverPending = false;
            }
            // Korrigiere die Polling-URL für Truppdaten
            const res2 = await fetch(`${window.SYNC_API_URL}?token=${token}&uuid=${deviceUUID}`);
            if (!res2.ok) return;
            const data2 = await res2.json();
            // Prüfe, ob die futureUUID sich geändert hat
            if (data2 && data2.futureUUID && data2.futureUUID !== deviceUUID) {
                if (!takeoverPending) {
                    takeoverPending = true;
                    futureUUID = data2.futureUUID;
                    showTakeoverOverlay(futureUUID, data2.deviceName);
                }
            }
            // Prüfsumme aktualisieren
            if (data2 && data2.trupps) {
                lastChecksum = calculateChecksum(data2.trupps);
            }
        } catch (e) {
            // Fehler ignorieren
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