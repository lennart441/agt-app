# AGT-App: Copilot Instructions for AI Coding Agents

## Project Architecture
- **Modules:**
	- `client/`: Main web client for managing and monitoring fire brigade teams (Trupps). Handles UI, overlays, local storage, sync logic, and event logic.
	- `monitoring-client/`: Read-only dashboard for live status of all Trupps, filtered by operation token.
	- `sync-server/`: Node.js server for real-time data synchronization between clients. Data is separated by operation token.
	- `report-server/`: Node.js server for generating and uploading PDF reports to Nextcloud.

## Data Flow & Integration
- **Trupps** are created/managed in `client/` and synchronized via `sync-server/`.
- **Monitoring** uses the same sync API, but is read-only and highlights warnings (low pressure, timeout).
- **Report generation** is triggered from the client and handled by `report-server/`.
- **Tokens** (see `logic.js`) are used to separate data per operation; passed via URL or config.
- **Service Workers** (`sw.js`, `monitor-sw.js`) cache assets for offline use, but exclude API calls to sync/report servers.

## Local Storage & Data Persistence
- **All client data must be managed via localStorage.**
  - On every change, update localStorage so data survives page reloads and can be exported/imported easily.
  - Never rely solely on in-memory state for critical information.
  - Use helper functions for reading/writing localStorage (see `localStorage.js`).

## Separation of Concerns
- **Strictly separate HTML, CSS, and JS:**
  - HTML structure belongs in `.html` files, CSS in `.css`, JS logic in `.js`.
  - Do not generate large HTML blocks in JS; instead, define overlays and UI elements in HTML with `display: none` and show/hide via JS.
  - Avoid mixing logic and markup; keep UI rendering and business logic in separate functions/files.
  - When adding new features, ensure functions are modular and placed in the correct file (UI, overlays, eventlistener, logic, etc.).
- **Event Listeners & Helper Functions:**
  - Event listeners and global helper functions (e.g. setFakeInputValue, setupMeldungInput) belong in `eventlistener.js` and are exposed as window.*.
  - The order of scripts in `index.html` should be: `eventlistener.js`, `overlays.js`, `ui.js`, `logic.js`.
- **Overlay Callbacks:**
  - Overlay callback functions should be in `overlays.js` or `ui-overlays.js`, not in `ui.js`.
- **Error Handling:**
  - Error overlays and central error handling should be in `overlays.js`.

## Button and UI Logic
- **Trupp Card Buttons:**
  - The buttons "Trupp legt an" (Team gears up), "Trupp legt ab" (Team gears down), "Trupp auflösen" (Dissolve team), "AGT Notfall" (Emergency), "AGT Notfall beenden" (End emergency) are shown depending on the team status and emergency status:
    - After gearing up: show "Trupp legt ab" and "AGT Notfall" (or "AGT Notfall beenden" if active).
    - After gearing down: show "Trupp legt an" and "Trupp auflösen". Show "AGT Notfall beenden" only if active, otherwise no emergency button.

## Developer Workflows
- **Run Client:** Open `client/index.html` in browser. For local development, use a static server (e.g. Five Server).
- **Run Monitoring:** Open `monitoring-client/monitoring.html` in browser.
- **Start Servers:**
	- `sync-server/`: `node sync-server.js` (or via Docker Compose)
	- `report-server/`: `node server.js` (or via Docker Compose)
- **Build/Test:** No build step; pure JS/HTML/CSS. No automated tests present.
- **Debugging:** Use browser dev tools. Data is stored in localStorage and synced via REST API.

## Agent Communication
- **If instructions are unclear or ambiguous, ask the user for clarification before making changes.**
  - Do not guess or implement speculative solutions.
  - Always confirm user intent for non-standard requests.

## Project-Specific Conventions
- **Global Functions:** Most client logic is exposed via `window.*` for UI event handlers, overlays, and event logic.
- **Trupp Data Model:**
	- `{ id, name, mission, previousMission, members: [{name, druck, role}], meldungen: [], inaktiv, notfallAktiv }`
	- Pressure values must be >= 270 bar (see validation in `logic.js`).
- **Overlays:** UI overlays for name, pressure, mission, emergency, etc. are managed in `overlays.js` and triggered from UI.
- **Sync API:** URL is set in `logic.js` (`SYNC_API_URL`). Token is required for all sync operations.
- **PDF Export:** Triggered via `window.uploadToNextcloud()`; uses `report.js` and `jspdf.umd.min.js`.
- **Localization:** UI and comments are in German; keep new code and docs consistent.

## External Dependencies
- `jspdf.umd.min.js` for PDF generation
- `webdav.min.js` for Nextcloud upload
- Docker Compose for server deployment (see `docker-compose.yml`)

## Patterns & Examples
- **Add Team:** Use overlays for name/mission/pressure selection, then call `window.createTrupp()`.
- **Update Mission:** Use `showMissionOverlay('update', truppId)` and `window.setMissionForTrupp(truppId, mission)`.
- **Emergency:** Use `window.toggleNotfallForTrupp(truppId, aktiv)`.
- **Sync:** Call `syncTruppsToServer()` in `logic.js` after changes.
- **Report:** Call `window.uploadToNextcloud()` after the operation.

## Key Files
- `client/logic.js`, `client/ui.js`, `client/overlays.js`, `client/eventlistener.js`, `client/report.js`, `client/index.html`
- `monitoring-client/monitor.js`, `monitoring-client/monitoring.html`
- `sync-server/sync-server.js`, `report-server/server.js`

---
If any section is unclear or missing, please provide feedback for further refinement.
