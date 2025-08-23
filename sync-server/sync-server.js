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

// In-Memory-Speicher für Truppdaten, nach Token getrennt
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
    validTokens = ['abc123def456ghi7']; // Fallback token
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

// Speichert Truppdaten für ein Token
function saveTruppData(token, trupps, timestamp) {
  operations[token] = { trupps, timestamp };
}

// Lädt Truppdaten für ein Token
function loadTruppData(token) {
  return operations[token] || { trupps: [], timestamp: null };
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
    const { trupps, timestamp } = req.body;
    // Validierung der Eingabedaten
    if (!Array.isArray(trupps) || typeof timestamp !== 'number' || isNaN(new Date(timestamp).getTime())) {
      console.warn(`Validation failed for token ${req.operationToken}: trupps=${JSON.stringify(trupps)}, timestamp=${timestamp}`);
      return res.status(400).json({ error: 'Invalid trupps or timestamp format' });
    }
    saveTruppData(req.operationToken, trupps, timestamp);
    console.log(`Received data for token ${req.operationToken} at ${new Date(timestamp).toISOString()}`);
    res.json({ status: 'success', timestamp });
  } catch (error) {
    console.error(`Error in POST /v1/sync-api/trupps for token ${req.operationToken}:`, error);
    next(error);
  }
});

// GET-Endpoint: Gibt Truppdaten für Token zurück
app.get('/v1/sync-api/trupps', validateToken, (req, res, next) => {
  try {
    const data = loadTruppData(req.operationToken);
    console.log(`Sent data for token ${req.operationToken}: ${JSON.stringify(data)}`);
    res.json(data);
  } catch (error) {
    console.error(`Error in GET /v1/sync-api/trupps for token ${req.operationToken}:`, error);
    next(error);
  }
});

// Zentraler Error-Handler für alle Fehler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err, 'Request:', req.method, req.originalUrl);
  res.status(500).json({ error: 'Internal server error' });
});