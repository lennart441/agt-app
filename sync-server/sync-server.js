const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for trupp data (keyed by operation token)
const operations = {};

// Load tokens from JSON file
let validTokens = [];
const tokenFilePath = path.join(__dirname, 'tokens.json');

async function loadTokens() {
  try {
    const data = await fs.readFile(tokenFilePath, 'utf8');
    validTokens = JSON.parse(data).tokens;
  } catch (error) {
    console.error('Error loading tokens:', error);
    validTokens = ['abc123def456ghi7']; // Fallback token
  }
}

// Middleware to validate token
function validateToken(req, res, next) {
  const token = req.headers['x-operation-token'];
  if (!token || !validTokens.includes(token)) {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }
  req.operationToken = token;
  next();
}

// Initialize tokens on startup
loadTokens();

// Endpoint to upload trupp data
app.post('/v1/sync-api/trupps', validateToken, (req, res) => {
  const { trupps, timestamp } = req.body;
  if (!trupps || !timestamp) {
    return res.status(400).json({ error: 'Missing trupps or timestamp' });
  }

  operations[req.operationToken] = operations[req.operationToken] || [];
  operations[req.operationToken] = { trupps, timestamp };
  console.log(`Received data for token ${req.operationToken} at ${new Date(timestamp).toISOString()}`);
  res.json({ status: 'success', timestamp });
});

// Endpoint to download trupp data
app.get('/v1/sync-api/trupps', validateToken, (req, res) => {
  const data = operations[req.operationToken] || { trupps: [], timestamp: null };
  res.json(data);
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});