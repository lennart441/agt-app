const express = require('express');
const multer = require('multer');
const { createClient } = require('webdav');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const upload = multer({ dest: 'uploads/' });

// CORS-Konfiguration
const corsOptions = {
  origin: (origin, callback) => {
    // Für lokale Tests vorübergehend alle Ursprünge erlauben
    // In der Produktion durch spezifische Ursprünge ersetzen
    callback(null, true);
    /*
    const allowedOrigins = [
      'http://localhost:5500', // VS Code Five Server
      'http://127.0.0.1:5500', // Alternative lokale Adresse
      'https://your-pwa-domain.com' // Ersetze durch Produktionsdomain
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || '*');
    } else {
      console.error(`CORS blockiert: Ungültiger Origin ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
    */
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('/upload-report', cors(corsOptions));

// Nextcloud-Zugangsdaten aus Umgebungsvariablen
const nextcloudConfig = {
  webdavUrl: process.env.NEXTCLOUD_WEBDAV_URL,
  username: process.env.NEXTCLOUD_USERNAME,
  password: process.env.NEXTCLOUD_PASSWORD
};

// Validierung der Umgebungsvariablen
if (!nextcloudConfig.webdavUrl || !nextcloudConfig.username || !nextcloudConfig.password) {
  console.error('Fehler: NEXTCLOUD_WEBDAV_URL, NEXTCLOUD_USERNAME oder NEXTCLOUD_PASSWORD fehlen.');
  process.exit(1);
}

// Erstelle WebDAV-Client
const client = createClient(nextcloudConfig.webdavUrl, {
  username: nextcloudConfig.username,
  password: nextcloudConfig.password
});

// API-Endpunkt zum Empfangen und Hochladen der PDF
app.post('/upload-report', upload.single('report'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const filePath = req.file.path;
    const filename = req.file.originalname;

    console.log(`Empfange Datei: ${filename}, Origin: ${req.headers.origin}`);

    // Lese die hochgeladene Datei
    const fileContent = await fs.readFile(filePath);

    // Lade die Datei in Nextcloud hoch
    await client.putFileContents(`/${filename}`, fileContent);

    // Lösche die temporäre Datei
    await fs.unlink(filePath);

    res.status(200).json({ message: `Bericht ${filename} erfolgreich in Nextcloud hochgeladen.` });
  } catch (error) {
    console.error('Fehler beim Hochladen:', error);
    res.status(500).json({ error: `Fehler beim Hochladen: ${error.message}` });
  }
});

// Starte den Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});