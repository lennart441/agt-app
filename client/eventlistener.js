// eventlistener.js
// Globale Hilfsfunktionen und Event-Listener für die UI

window.setFakeInputValue = function(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
};

window.setupMeldungInput = function(id) {
  const input = document.getElementById(id);
  input.addEventListener('click', () => showDruckOverlay(id));
};

window.addEventListener('DOMContentLoaded', async () => {
  window.renderAllTrupps();
  window.renderArchivierteTrupps();
});
// ...weitere Event-Listener können hier ergänzt werden...
