# Copilot Instructions for AGT-App

## Architektur & Komponenten
- Die Anwendung besteht aus vier Hauptmodulen:
  - **Client** (`client/`): Web-App zur Verwaltung und Überwachung von Atemschutztrupps. Enthält UI, Logik, Overlays, Styles und Datenmodelle.
  - **Monitoring-Client** (`monitoring-client/`): Zeigt Truppdaten und Warnungen live auf separaten Geräten an.
  - **Sync-Server** (`sync-server/`): Node.js-Server für die Synchronisation aller Truppdaten über Einsatz-Tokens.
  - **Report-Server** (`report-server/`): Erstellt und exportiert PDF-Berichte, z.B. für Nextcloud.

## Datenfluss & Kommunikation
- **Truppdaten** werden im Client angelegt und regelmäßig (alle 2 Sekunden) per REST-API an den Sync-Server übertragen (`/v1/sync-api/trupps`).
- **Monitoring-Client** fragt die Truppdaten live vom Sync-Server ab und zeigt Warnungen (z.B. niedriger Druck, Zeitüberschreitung) an.
- **Report-Server** verarbeitet die Truppdaten und erstellt PDF-Berichte.
- **Einsatz-Tokens** trennen verschiedene Einsätze und steuern die Sichtbarkeit/Synchronisation der Daten.

## Wichtige Patterns & Konventionen
- **UI-Logik**: Truppkarten werden dynamisch gerendert (siehe `ui.js`, `monitor.js`).
- **Overlays**: Für Eingaben (Druck, Name, Auftrag, Notfall) werden Overlays genutzt (`overlays.js`, HTML-Overlays in `index.html`).
- **CSS-Klassen**: Status wie Warnung, Alarm, Notfall werden über CSS-Klassen (`warnphase`, `alarmphase`, `notfall`, `low-pressure`) gesteuert.
- **Lokale Speicherung**: Truppdaten werden im Local Storage gehalten und synchronisiert (`logic.js`).
- **PDF-Export**: Berichte werden mit `jspdf` erstellt und können direkt an Nextcloud übertragen werden (`report.js`).
- **Fehler- und Statusanzeigen**: Warnungen und Fehler werden im UI hervorgehoben, nicht als Popups.

## Entwickler-Workflows
- **Starten (Client):** Öffne `index.html` im Browser. Für Live-Reload nutze z.B. Five Server.
- **Sync-Server:** Starte mit `docker compose -f sync-server/docker-compose.yaml up -d --build`.
- **Monitoring-Client:** Öffne `monitoring.html` im Browser.
- **Report-Server:** Starte mit `docker compose -f report-server/docker-compose.yml up -d --build`.
- **Debugging:** Nutze die Browser-Konsole für UI-Fehler, prüfe Server-Logs für Sync-Probleme.

## Integration & Abhängigkeiten
- **Externe Libraries:**
  - `jspdf` für PDF-Export (`client/lib/jspdf.umd.min.js`)
  - `webdav` für Nextcloud-Upload (`client/lib/webdav.min.js`)
- **Datenmodelle:**
  - Truppdaten: Name, Auftrag, Mitglieder, Druck, Meldungen, Status
  - JSON-Vorschlagslisten: `truppnamen.json`, `agtler.json`, `auftrag.json`

## Beispiele für typische Muster
- **Truppkarte rendern:**
  - Siehe `renderTrupp(trupp)` in `ui.js` und `monitor.js`.
- **Overlay öffnen:**
  - `showDruckOverlay('tf-druck')` öffnet das Druck-Overlay für den Truppführer.
- **Warnung anzeigen:**
  - CSS-Klasse `.trupp-card.low-pressure` wird bei <50 bar gesetzt.

## Hinweise für AI Agents
- Halte dich an die bestehende Modulstruktur und trenne UI, Logik und Overlays.
- Nutze die vorhandenen Datenmodelle und Synchronisationsmechanismen.
- Beachte die Einsatz-Tokens für alle serverseitigen Operationen.
- Übernimm die Patterns für Overlays und Statusanzeigen aus den bestehenden Dateien.

---

Bitte gib Feedback, falls bestimmte Bereiche oder Workflows noch unklar sind oder weitere Beispiele benötigt werden.
