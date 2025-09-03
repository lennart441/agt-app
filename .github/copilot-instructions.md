# Copilot Instructions for AGT-App

## Architektur & Komponenten
- Die Anwendung besteht aus vier Hauptmodulen:
  - **Client** (`client/`): Web-App zur Verwaltung und Überwachung von Atemschutztrupps. Enthält UI, Logik, Overlays, Styles und Datenmodelle.
  - **Monitoring-Client** (`monitoring-client/`): Zeigt Truppdaten und Warnungen live auf separaten Geräten an.
  - **Sync-Server** (`sync-server/`): Node.js-Server für die Synchronisation aller Truppdaten über Einsatz-Tokens.
  - **Report-Server** (`report-server/`): Erstellt und exportiert PDF-Berichte, z.B. für Nextcloud.

## Datenfluss & Kommunikation
- **Truppdaten** werden im Client angelegt und alle 2 Sekunden per REST-API an den Sync-Server übertragen (`POST /v1/sync-api/trupps` mit X-Operation-Token Header).
- **Monitoring-Client** fragt die Truppdaten alle 2 Sekunden live vom Sync-Server ab (`GET /v1/sync-api/trupps?token=...`).
- **Report-Server** verarbeitet die Truppdaten und erstellt PDF-Berichte; PDFs werden per `POST /v1/report/upload-report` hochgeladen und via WebDAV zu Nextcloud übertragen.
- **Einsatz-Tokens** trennen verschiedene Einsätze und steuern die Sichtbarkeit/Synchronisation der Daten (Beispiele: "Wasser112", "Feuerwehr112").

## Wichtige Patterns & Konventionen
- **UI-Logik**: Truppkarten werden dynamisch gerendert (siehe `renderTrupp(trupp)` in `ui.js` und `monitor.js`).
- **Overlays**: Für Eingaben (Druck, Name, Auftrag, Notfall) werden Overlays genutzt (`overlays.js`, HTML-Overlays in `index.html`). Fake-Inputs (`.fake-input`) öffnen Overlays beim Klick.
- **CSS-Klassen**: Status wie Warnung, Alarm, Notfall werden über CSS-Klassen gesteuert:
  - `.warnphase`: Zeit seit letzter Meldung >9 Minuten
  - `.alarmphase`: Zeit seit letzter Meldung >10 Minuten
  - `.notfall`: AGT-Notfall aktiv
  - `.low-pressure`: Mindestdruck ≤50 bar
  - `.inaktiv`: Trupp aufgelöst
- **Lokale Speicherung**: Inaktive Trupps werden im Local Storage gehalten (`logic.js`).
- **PDF-Export**: Berichte werden mit `jspdf` erstellt (`report.js`), inkl. Truppdetails, Mitgliedern und Meldungen.
- **Fehler- und Statusanzeigen**: Warnungen und Fehler werden im UI hervorgehoben, nicht als Popups (siehe `showErrorOverlay`).
- **Service Workers**: PWA-Funktionalität für Offline-Nutzung (`sw.js`, `monitor-sw.js`).
- **Datenmodell**: Trupp-Objekt mit `id`, `name`, `mission`, `members` (Array mit `name`, `druck`, `role`), `meldungen` (Array mit `kommentar`, `members`), `inaktiv`, `notfallAktiv`, etc.

## Entwickler-Workflows
- **Starten (Client):** Öffne `index.html` im Browser. Für Live-Reload nutze VS Code Five Server Extension oder `npx live-server client/`.
- **Sync-Server:** Starte mit `docker compose -f sync-server/docker-compose.yaml up -d --build`.
- **Monitoring-Client:** Öffne `monitoring.html` im Browser.
- **Report-Server:** Starte mit `docker compose -f report-server/docker-compose.yml up -d --build`.
- **Debugging:** Nutze Browser-Konsole für UI-Fehler, prüfe Server-Logs für Sync-Probleme. Tokens werden in `sync-server/tokens.json` definiert.
- **Lokale Entwicklung:** Sync-Server läuft standardmäßig auf `http://localhost:3001`, Report-Server auf `http://localhost:3000`.

## Integration & Abhängigkeiten
- **Externe Libraries:**
  - `jspdf` für PDF-Export (`client/lib/jspdf.umd.min.js`)
  - `webdav` für Nextcloud-Upload (`client/lib/webdav.min.js`)
- **Datenmodelle:**
  - Truppdaten: Name, Auftrag, Mitglieder, Druck, Meldungen, Status
  - JSON-Vorschlagslisten: `truppnamen.json`, `agtler.json`, `auftrag.json`
- **Umgebungsvariablen (Report-Server):** `NEXTCLOUD_WEBDAV_URL`, `NEXTCLOUD_USERNAME`, `NEXTCLOUD_PASSWORD`

## Beispiele für typische Muster
- **Truppkarte rendern:**
  - Siehe `renderTrupp(trupp)` in `ui.js` und `monitor.js`: Erstelle `<div class="trupp-card">` mit Titel, Auftrag, Mitgliederliste, Druckbalken, Buttons.
- **Overlay öffnen:**
  - `showDruckOverlay('tf-druck')` öffnet Druck-Overlay für Truppführer; Werte von 320 bis 10 bar in 10er-Schritten.
- **Warnung anzeigen:**
  - CSS-Klasse `.trupp-card.low-pressure` wird bei ≤50 bar gesetzt; `.warnung` Div mit Text "⚠️ Warnung: Einer der Träger hat unter 50% Luft."
- **Sync durchführen:**
  - `syncTruppsToServer()` sendet `POST` mit `{ trupps, timestamp }` und Token-Header.
- **PDF erstellen:**
  - `uploadToNextcloud()` nutzt `jsPDF` für mehrseitigen Bericht mit Truppdetails, dann `fetch` zu Report-Server.

## Hinweise für AI Agents
- Halte dich an die bestehende Modulstruktur und trenne UI, Logik und Overlays.
- Nutze die vorhandenen Datenmodelle und Synchronisationsmechanismen.
- Beachte die Einsatz-Tokens für alle serverseitigen Operationen.
- Übernimm die Patterns für Overlays und Statusanzeigen aus den bestehenden Dateien.
- Bei Änderungen an Truppdaten immer `syncTruppsToServer()` aufrufen.
- Für neue Features prüfe Konsistenz zwischen Client und Monitoring-Client.

---

Bitte gib Feedback, falls bestimmte Bereiche oder Workflows noch unklar sind oder weitere Beispiele benötigt werden.
