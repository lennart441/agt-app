// Express-Server für Truppdaten-Synchronisation
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// Middleware für CORS und JSON-Parsing
app.use(cors());
app.use(express.json());

// In-Memory-Speicher für Truppdaten, nach Token und UUID getrennt
const operations = {};

// Token werden aus externer JSON-Datei geladen
let validTokens = [];
const tokenFilePath = path.join(__dirname, 'tokens.json');

// Lädt gültige Tokens aus Datei, Fallback bei Fehler
async function loadTokens() {
  try {
    const data = await fs.readFile(tokenFilePath, 'utf8');
    validTokens = JSON.parse(data).tokens;
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
}

// Extrahiert Token aus Request (Header oder Query)
function getTokenFromRequest(req) {
  if (req.method === 'GET') {
    return req.query.token;
  }
  return req.headers['x-operation-token'];
}

// Middleware: Prüft, ob Token gültig ist
function validateToken(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token || !validTokens.includes(token)) {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }
  req.operationToken = token;
  next();
}

// Speichert Truppdaten für ein Token und eine UUID
function saveTruppData(token, deviceUUID, trupps, timestamp, deviceName) {
  if (!operations[token]) {
    operations[token] = {};
  }
  operations[token][deviceUUID] = { trupps, timestamp, deviceName };
}

// Lädt Truppdaten für ein Token (alle UUIDs oder spezifische UUID)
function loadTruppData(token, deviceUUID = null) {
  if (!operations[token]) {
    return deviceUUID ? null : {};
  }
  if (deviceUUID) {
    return operations[token][deviceUUID] || null;
  }
  return operations[token]; // Alle UUIDs mit ihren Daten
}

// Lädt alle aktiven UUIDs für ein Token
function loadActiveUUIDs(token) {
  if (!operations[token]) {
    return [];
  }
  return Object.keys(operations[token]);
}

// Serverstart erst nach erfolgreichem Laden der Tokens
loadTokens().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}).catch((error) => {
  console.error('Failed to load tokens, server not started:', error);
});

// POST-Endpoint: Empfängt und speichert Truppdaten
app.post('/v1/sync-api/trupps', validateToken, (req, res, next) => {
  try {
    const { trupps, timestamp, deviceUUID, deviceName } = req.body;
    // Validierung der Eingabedaten
    if (!Array.isArray(trupps) || typeof timestamp !== 'number' || isNaN(new Date(timestamp).getTime()) || !deviceUUID || !deviceName) {
      console.warn(`Validation failed for token ${req.operationToken}: trupps=${JSON.stringify(trupps)}, timestamp=${timestamp}, deviceUUID=${deviceUUID}, deviceName=${deviceName}`);
      return res.status(400).json({ error: 'Invalid trupps, timestamp, deviceUUID, or deviceName format' });
    }
    saveTruppData(req.operationToken, deviceUUID, trupps, timestamp, deviceName);
    console.log(`Received data for token ${req.operationToken}, UUID ${deviceUUID}, Device ${deviceName} at ${new Date(timestamp).toISOString()}`);
    res.json({ status: 'success', timestamp });
  } catch (error) {
    console.error(`Error in POST /v1/sync-api/trupps for token ${req.operationToken}:`, error);
    next(error);
  }
});

// GET-Endpoint: Gibt Truppdaten für Token zurück (alle UUIDs oder spezifische UUID)
app.get('/v1/sync-api/trupps', validateToken, (req, res, next) => {
  try {
    const { uuid } = req.query;
    const data = loadTruppData(req.operationToken, uuid);
    if (uuid && !data) {
      return res.status(404).json({ error: 'No data found for the specified UUID' });
    }
    console.log(`Sent data for token ${req.operationToken}${uuid ? `, UUID ${uuid}` : ' (all UUIDs)'}: ${JSON.stringify(data)}`);
    res.json(data);
  } catch (error) {
    console.error(`Error in GET /v1/sync-api/trupps for token ${req.operationToken}:`, error);
    next(error);
  }
});

// GET-Endpoint: Gibt alle aktiven UUIDs für einen Token zurück
app.get('/v1/sync-api/uuids', validateToken, (req, res, next) => {
  try {
    const uuids = loadActiveUUIDs(req.operationToken);
    console.log(`Sent active UUIDs for token ${req.operationToken}: ${JSON.stringify(uuids)}`);
    res.json({ uuids });
  } catch (error) {
    console.error(`Error in GET /v1/sync-api/uuids for token ${req.operationToken}:`, error);
    next(error);
  }
});

// Speicher für Übernahmeanträge: { [token]: { [targetUUID]: {requesterUUID, requesterName, timestamp, timeoutId} } }
const takeoverRequests = {};
// Speicher für Antworten: { [token]: { [requesterUUID]: {responderUUID, status, timestamp} } }
const takeoverResponses = {};
const TAKEOVER_REQUEST_TTL = 60000; // 60 Sekunden
const TAKEOVER_RESPONSE_TTL = 60000; // 60 Sekunden

// POST: Übernahmeantrag stellen
app.post('/v1/sync-api/takeover-request', validateToken, (req, res, next) => {
  try {
    const { targetUUID, requesterUUID, requesterName, timestamp } = req.body;
    if (!targetUUID || !requesterUUID || !requesterName || typeof timestamp !== 'number') {
      return res.status(400).json({ error: 'Invalid takeover request format' });
    }
    if (!takeoverRequests[req.operationToken]) takeoverRequests[req.operationToken] = {};
    const prev = takeoverRequests[req.operationToken][targetUUID];
    if (prev && prev.timeoutId) clearTimeout(prev.timeoutId);
    const timeoutId = setTimeout(() => {
      if (takeoverRequests[req.operationToken] && takeoverRequests[req.operationToken][targetUUID]) {
        delete takeoverRequests[req.operationToken][targetUUID];
        console.log(`[DEBUG] Takeover request for token ${req.operationToken}, targetUUID ${targetUUID} expired and deleted.`);
      }
    }, TAKEOVER_REQUEST_TTL);
    takeoverRequests[req.operationToken][targetUUID] = { requesterUUID, requesterName, timestamp, timeoutId };
    console.log(`[DEBUG] Takeover request stored: token=${req.operationToken}, targetUUID=${targetUUID}, requesterUUID=${requesterUUID}, requesterName=${requesterName}, timestamp=${timestamp}`);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Error in POST /v1/sync-api/takeover-request:', error);
    next(error);
  }
});

// GET: Übernahmeantrag abfragen
app.get('/v1/sync-api/takeover-request', validateToken, (req, res, next) => {
  try {
    const { uuid } = req.query;
    if (!uuid) return res.status(400).json({ error: 'Missing uuid' });
    const reqs = takeoverRequests[req.operationToken] || {};
    const takeover = reqs[uuid] || null;
    if (takeover) {
      if (takeover.timeoutId) clearTimeout(takeover.timeoutId);
      delete takeoverRequests[req.operationToken][uuid];
      console.log(`[DEBUG] Takeover request delivered: token=${req.operationToken}, uuid=${uuid}, requesterUUID=${takeover.requesterUUID}, requesterName=${takeover.requesterName}, timestamp=${takeover.timestamp}`);
      return res.json(takeover);
    }
    res.json({});
  } catch (error) {
    console.error('Error in GET /v1/sync-api/takeover-request:', error);
    next(error);
  }
});

// POST: Antwort auf Übernahmeantrag
app.post('/v1/sync-api/takeover-response', validateToken, (req, res, next) => {
  try {
    const { requesterUUID, responderUUID, status, timestamp } = req.body;
    if (!requesterUUID || !responderUUID || !status || typeof timestamp !== 'number') {
      return res.status(400).json({ error: 'Invalid takeover response format' });
    }
    if (!takeoverResponses[req.operationToken]) takeoverResponses[req.operationToken] = {};
    takeoverResponses[req.operationToken][requesterUUID] = { responderUUID, status, timestamp };
    setTimeout(() => {
      if (takeoverResponses[req.operationToken] && takeoverResponses[req.operationToken][requesterUUID]) {
        delete takeoverResponses[req.operationToken][requesterUUID];
        console.log(`[DEBUG] Takeover response for token ${req.operationToken}, requesterUUID ${requesterUUID} expired and deleted.`);
      }
    }, TAKEOVER_RESPONSE_TTL);
    console.log(`[DEBUG] Takeover response stored: token=${req.operationToken}, requesterUUID=${requesterUUID}, responderUUID=${responderUUID}, status=${status}, timestamp=${timestamp}`);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Error in POST /v1/sync-api/takeover-response:', error);
    next(error);
  }
});

// GET: Antwort auf Übernahmeantrag abfragen
app.get('/v1/sync-api/takeover-response', validateToken, (req, res, next) => {
  try {
    const { requesterUUID } = req.query;
    if (!requesterUUID) return res.status(400).json({ error: 'Missing requesterUUID' });
    const resps = takeoverResponses[req.operationToken] || {};
    const response = resps[requesterUUID] || null;
    if (response) {
      delete takeoverResponses[req.operationToken][requesterUUID];
      console.log(`[DEBUG] Takeover response delivered: token=${req.operationToken}, requesterUUID=${requesterUUID}, responderUUID=${response.responderUUID}, status=${response.status}, timestamp=${response.timestamp}`);
      return res.json(response);
    }
    res.json({});
  } catch (error) {
    console.error('Error in GET /v1/sync-api/takeover-response:', error);
    next(error);
  }
});

// --- Datenübernahme: Prüfsumme und Bestätigung ---
const takeoverChecksums = {}; // { [token]: { [oldUUID]: { checksum, newUUID, timestamp } } }
const takeoverConfirms = {}; // { [token]: { [newUUID]: { confirmed: true, timestamp } } }
const TAKEOVER_CHECKSUM_TTL = 60000;
const TAKEOVER_CONFIRM_TTL = 60000;

// POST: Neuer Client sendet Prüfsumme
app.post('/v1/sync-api/takeover-checksum', validateToken, (req, res, next) => {
  try {
    const { oldUUID, newUUID, checksum, timestamp } = req.body;
    if (!oldUUID || !newUUID || typeof checksum === 'undefined' || typeof timestamp !== 'number') {
      return res.status(400).json({ error: 'Invalid takeover checksum format' });
    }
    if (!takeoverChecksums[req.operationToken]) takeoverChecksums[req.operationToken] = {};
    takeoverChecksums[req.operationToken][oldUUID] = { checksum, newUUID, timestamp };
    setTimeout(() => {
      if (takeoverChecksums[req.operationToken] && takeoverChecksums[req.operationToken][oldUUID]) {
        delete takeoverChecksums[req.operationToken][oldUUID];
        console.log(`[DEBUG] Checksum entry for token ${req.operationToken}, oldUUID ${oldUUID} expired and deleted.`);
      }
    }, TAKEOVER_CHECKSUM_TTL);
    console.log(`[DEBUG] Takeover checksum received: token=${req.operationToken}, oldUUID=${oldUUID}, newUUID=${newUUID}, checksum=${checksum}, timestamp=${timestamp}`);
    res.json({ status: 'success' });
  } catch (error) {
    next(error);
  }
});

// GET: Alter Client fragt Prüfsumme ab
app.get('/v1/sync-api/takeover-checksum', validateToken, (req, res, next) => {
  try {
    const { oldUUID } = req.query;
    if (!oldUUID) return res.status(400).json({ error: 'Missing oldUUID' });
    const checksums = takeoverChecksums[req.operationToken] || {};
    const entry = checksums[oldUUID] || null;
    if (entry) {
      delete takeoverChecksums[req.operationToken][oldUUID];
      console.log(`[DEBUG] Takeover checksum delivered to oldUUID ${oldUUID}: checksum=${entry.checksum}, newUUID=${entry.newUUID}`);
      return res.json(entry);
    }
    res.json({});
  } catch (error) {
    next(error);
  }
});

// POST: Bestätigung der Datenübernahme
app.post('/v1/sync-api/takeover-confirm', validateToken, (req, res, next) => {
  try {
    const { newUUID, timestamp } = req.body;
    if (!newUUID || typeof timestamp !== 'number') {
      return res.status(400).json({ error: 'Invalid takeover confirm format' });
    }
    if (!takeoverConfirms[req.operationToken]) takeoverConfirms[req.operationToken] = {};
    takeoverConfirms[req.operationToken][newUUID] = { confirmed: true, timestamp };
    setTimeout(() => {
      if (takeoverConfirms[req.operationToken] && takeoverConfirms[req.operationToken][newUUID]) {
        delete takeoverConfirms[req.operationToken][newUUID];
        console.log(`[DEBUG] Takeover confirm for token ${req.operationToken}, newUUID ${newUUID} expired and deleted.`);
      }
    }, TAKEOVER_CONFIRM_TTL);
    console.log(`[DEBUG] Takeover confirm stored: token=${req.operationToken}, newUUID=${newUUID}, timestamp=${timestamp}`);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Error in POST /v1/sync-api/takeover-confirm:', error);
    next(error);
  }
});

// GET: Abfrage der Bestätigung
app.get('/v1/sync-api/takeover-confirm', validateToken, (req, res, next) => {
  try {
    const { newUUID } = req.query;
    if (!newUUID) return res.status(400).json({ error: 'Missing newUUID' });
    const confims = takeoverConfirms[req.operationToken] || {};
    const confirm = confims[newUUID] || null;
    if (confirm) {
      delete takeoverConfirms[req.operationToken][newUUID];
      console.log(`[DEBUG] Takeover confirm delivered to newUUID ${newUUID}: confirmed=${confirm.confirmed}, timestamp=${confirm.timestamp}`);
      return res.json(confirm);
    }
    res.json({});
  } catch (error) {
    console.error('Error in GET /v1/sync-api/takeover-confirm:', error);
    next(error);
  }
});

// Fehlerbehandlung-Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});