## AGT-App: Digitale Atemschutzüberwachung

Diese Anwendung dient der digitalen Überwachung und Dokumentation von Atemschutztrupps bei Feuerwehreinsätzen. Sie besteht aus mehreren Modulen, die zusammenarbeiten:

### Architektur & Module
- **Client (`client/`):** Web-App zur Verwaltung und Überwachung von Trupps. UI, Overlays, lokale Speicherung, Synchronisation und Event-Logik. Alle Daten werden in `localStorage` gehalten und regelmäßig mit dem Sync-Server synchronisiert.
- **Monitoring-Client (`monitoring-client/`):** Read-only Dashboard zur Live-Überwachung aller Trupps eines Einsatzes (gefiltert per Token). Zeigt Warnungen bei kritischen Zuständen (niedriger Druck, Zeitüberschreitung).
- **Sync-Server (`sync-server/`):** Node.js-Server für die Echtzeit-Synchronisation aller Clients. Daten werden pro Einsatz-Token getrennt.
- **Report-Server (`report-server/`):** Node.js-Server zum Erstellen und Hochladen von PDF-Berichten nach Nextcloud.

### Hauptfunktionen
- **Trupps anlegen & verwalten:** Name, Auftrag, Mitglieder, Druckmeldungen, Notizen, Statusänderungen (an/abgelegt, aufgelöst, Notfall).
- **Automatische Zeitüberwachung:** Timer warnt bei fehlender Rückmeldung.
- **Notfallmanagement:** Notfälle können ausgelöst und beendet werden.
- **Synchronisation:** Alle Daten werden automatisch mit dem Sync-Server synchronisiert. Mehrere Geräte können parallel arbeiten.
- **Berichte:** Nach dem Einsatz können Berichte als PDF erstellt und direkt an Nextcloud übertragen werden.

### Workflows & Besonderheiten
- **Alle Daten persistent in `localStorage` speichern!**
- **Trupp-Status und UI-Logik:** Buttons und Overlays werden abhängig vom Status und Notfall angezeigt (siehe `client/ui.js`, `client/overlays.js`).
- **Service Worker:** Assets werden für Offline-Nutzung gecacht, API-Calls sind davon ausgenommen.
- **Einsatz-Token:** Trennt Daten verschiedener Einsätze (siehe `client/logic.js`).
- **Globales Event-Handling:** UI-Events und Hilfsfunktionen sind als `window.*` verfügbar (`client/eventlistener.js`).
- **PDF-Export:** Über `window.uploadToNextcloud()` (nutzt `jspdf.umd.min.js` und `webdav.min.js`).
- **Lokalisierung:** UI und Kommentare sind auf Deutsch.

### Start & Entwicklung
- **Client starten:** `client/index.html` im Browser öffnen (empfohlen: statischer Server wie Five Server).
- **Monitoring starten:** `monitoring-client/monitoring.html` im Browser öffnen.
- **Server starten:**
  - Sync-Server: `node sync-server.js` oder via Docker Compose
  - Report-Server: `node server.js` oder via Docker Compose
- **Debugging:** Browser Dev-Tools, Daten in `localStorage`, Sync via REST-API.
- **Kein Build-Step, keine automatisierten Tests.**

---

**Zusammengefasst:**  
Mit dieser Anwendung kannst du Atemschutztrupps digital verwalten, überwachen, dokumentieren und Berichte erstellen – alles synchronisiert und von mehreren Geräten aus nutzbar. Sie unterstützt die Sicherheit und Nachvollziehbarkeit im Einsatz und erleichtert die Nachbereitung.




TODO
- Akusticher Alarm nach 12 Minuten
- beim erstellen eines trupps auf vollständigkeit der daten achten
- scrollen auserhalb der elemente verhindern!

