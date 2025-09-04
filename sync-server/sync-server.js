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

// Zentraler Error-Handler für alle Fehler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err, 'Request:', req.method, req.originalUrl);
  res.status(500).json({ error: 'Internal server error' });
});