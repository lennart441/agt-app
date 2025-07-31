## Was kann die Atemschutzüberwachungs-Anwendung?

Diese Anwendung dient der digitalen Überwachung und Dokumentation von Atemschutztrupps bei Feuerwehreinsätzen. Sie besteht aus mehreren Modulen, die zusammenarbeiten:

### 1. **Atemschutzüberwachung (Client)**
- **Trupps anlegen:** Du kannst neue Atemschutztrupps mit Namen, Auftrag und Mitgliedern (Truppführer, Truppmänner) anlegen.
- **Druckmeldungen & Notizen:** Während des Einsatzes können für jeden Trupp regelmäßig aktuelle Flaschendrücke und Notizen gemeldet werden.
- **Timer:** Die Anwendung überwacht automatisch die Zeit seit der letzten Meldung und warnt, wenn ein Trupp zu lange keine Rückmeldung gibt.
- **Notfallmanagement:** Es können Notfälle ausgelöst und beendet werden.
- **Synchronisation:** Alle Daten werden automatisch mit dem zentralen Sync-Server synchronisiert, sodass mehrere Geräte parallel arbeiten können.
- **Berichte:** Nach dem Einsatz können Berichte als PDF erstellt und direkt an Nextcloud übertragen werden.

### 2. **Monitoring (Monitoring-Client)**
- **Live-Überwachung:** Auf einem separaten Gerät (z.B. im ELW) können alle Trupps und deren Status live überwacht werden.
- **Filterung nach Einsatz:** Über einen Token werden nur die Trupps des aktuellen Einsatzes angezeigt.
- **Warnungen:** Kritische Zustände (z.B. niedriger Druck, Zeitüberschreitung) werden hervorgehoben.

### 3. **Sync-Server**
- **Zentrale Datendrehscheibe:** Alle Clients und Monitoring-Clients synchronisieren ihre Daten über diesen Server.
- **Mehrere Einsätze:** Über einen Einsatz-Token werden die Daten verschiedener Einsätze getrennt gehalten.

### 4. **Report-Server**
- **PDF-Export:** Automatisches Erstellen und Hochladen von Einsatzberichten (PDF) zu Nextcloud.

---

**Zusammengefasst:**  
Mit dieser Anwendung kannst du Atemschutztrupps digital verwalten, überwachen, dokumentieren und Berichte erstellen – alles synchronisiert und von mehreren Geräten aus nutzbar. Sie unterstützt die Sicherheit und Nachvollziehbarkeit im Einsatz und erleichtert die Nachbereitung.




TODO
- UI optimieren für Ipad
- auf Ipad fest installieren
