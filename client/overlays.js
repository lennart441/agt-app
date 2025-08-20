// overlays.js
// Enthält alle Overlay-bezogenen Funktionen und Event-Listener

function showDruckOverlay(inputId) {
  const overlay = document.getElementById('druck-overlay');
  const grid = document.getElementById('druck-grid');
  grid.innerHTML = '';

  const druckWerteMeldung = Array.from({ length: 32 }, (_, i) => 320 - i * 10);
  druckWerteMeldung.forEach(wert => {
    const btn = document.createElement('button');
    btn.className = 'druck-btn';
    btn.textContent = `${wert}`;
    btn.setAttribute('data-druck', wert);
    btn.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      input.value = `${wert} bar`;
      closeDruckOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function showNameOverlay(inputId) {
  const overlay = document.getElementById('name-overlay');
  const grid = document.getElementById('name-grid');
  grid.innerHTML = '';

  // Add custom name input
  const customInputDiv = document.createElement('div');
  customInputDiv.className = 'custom-name';
  customInputDiv.innerHTML = `
    <label>Alternativer Name:</label>
    <input type="text" id="custom-name-input">
    <button onclick="selectCustomName('${inputId}')">Bestätigen</button>
  `;
  grid.appendChild(customInputDiv);

  // Add predefined names
  agtlerNamen.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'name-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      input.value = name;
      closeNameOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function selectCustomName(inputId) {
  const customInput = document.getElementById('custom-name-input');
  const input = document.getElementById(inputId);
  if (customInput.value.trim()) {
    input.value = customInput.value.trim();
    closeNameOverlay();
  } else {
    alert("Bitte einen Namen eingeben.");
  }
}

function showTruppNameOverlay() {
  const overlay = document.getElementById('truppname-overlay');
  const grid = document.getElementById('truppname-grid');
  grid.innerHTML = '';

  // Add custom truppname input
  const customInputDiv = document.createElement('div');
  customInputDiv.className = 'custom-name';
  customInputDiv.innerHTML = `
    <label>Alternativer Truppname:</label>
    <input type="text" id="custom-truppname-input">
    <button onclick="selectCustomTruppName()">Bestätigen</button>
  `;
  grid.appendChild(customInputDiv);

  // Add predefined truppnames
  truppNameVorschlaege.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'name-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      const input = document.getElementById('trupp-name-input');
      input.value = name;
      closeTruppNameOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function selectCustomTruppName() {
  const customInput = document.getElementById('custom-truppname-input');
  const input = document.getElementById('trupp-name-input');
  if (customInput.value.trim()) {
    input.value = customInput.value.trim();
    closeTruppNameOverlay();
  } else {
    alert("Bitte einen Truppnamen eingeben.");
  }
}

function showMissionOverlay(context, truppId = null) {
  const overlay = document.getElementById('mission-overlay');
  const grid = document.getElementById('mission-grid');
  grid.innerHTML = '';

  // Add custom mission input
  const customInputDiv = document.createElement('div');
  customInputDiv.className = 'custom-mission';
  customInputDiv.innerHTML = `
    <label>Alternativer Auftrag:</label>
    <input type="text" id="custom-mission-input">
    <button onclick="selectCustomMission('${context}', ${truppId})">Bestätigen</button>
  `;
  grid.appendChild(customInputDiv);

  // Add predefined missions
  auftragVorschlaege.forEach(auftrag => {
    const btn = document.createElement('button');
    btn.className = 'mission-btn';
    btn.textContent = auftrag;
    btn.addEventListener('click', () => {
      if (context === 'create') {
        selectedMission = auftrag;
        document.getElementById('trupp-mission-display').value = auftrag;
      } else {
        updateMission(truppId, auftrag);
      }
      closeMissionOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function selectCustomMission(context, truppId) {
  const customInput = document.getElementById('custom-mission-input');
  if (customInput.value.trim()) {
    if (context === 'create') {
      selectedMission = customInput.value.trim();
      document.getElementById('trupp-mission-display').value = customInput.value.trim();
    } else {
      updateMission(truppId, customInput.value.trim());
    }
    closeMissionOverlay();
  } else {
    alert("Bitte einen Auftrag eingeben.");
  }
}

function closeMissionOverlay() {
  const overlay = document.getElementById('mission-overlay');
  overlay.style.display = 'none';
}

function showNotfallOverlay(truppId, isEndNotfall = false) {
  const overlay = document.getElementById('notfall-overlay');
  const content = document.getElementById('notfall-content');
  content.innerHTML = `
    <h3>${isEndNotfall ? 'AGT Notfall beenden' : 'AGT Notfall auslösen'}</h3>
    <button onclick="confirmNotfall(${truppId}, ${isEndNotfall})">Bestätigen</button>
    <button onclick="closeNotfallOverlay()">Abbrechen</button>
  `;
  overlay.style.display = 'flex';
}

function closeNotfallOverlay() {
  const overlay = document.getElementById('notfall-overlay');
  overlay.style.display = 'none';
}

function closeDruckOverlay() {
  const overlay = document.getElementById('druck-overlay');
  overlay.style.display = 'none';
}

function closeNameOverlay() {
  const overlay = document.getElementById('name-overlay');
  overlay.style.display = 'none';
}

function closeTruppNameOverlay() {
  const overlay = document.getElementById('truppname-overlay');
  overlay.style.display = 'none';
}

function showTokenOverlay() {
  let overlay = document.getElementById('token-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'token-overlay';
    overlay.style.position = 'fixed';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.color = '#fff';
    overlay.style.padding = '20px';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
      <div style="margin-bottom:10px;">Operation-Token eingeben:</div>
      <input id="token-input" type="text" value="${OPERATION_TOKEN}" style="width:200px;">
      <button id="token-save-btn">Speichern</button>
      <button id="token-cancel-btn">Abbrechen</button>
    `;
    document.body.appendChild(overlay);
    document.getElementById('token-save-btn').onclick = function() {
      const newToken = document.getElementById('token-input').value.trim();
      setTokenInUrl(newToken);
      document.body.removeChild(overlay);
    };
    document.getElementById('token-cancel-btn').onclick = function() {
      document.body.removeChild(overlay);
    };
  }
}

function addTokenButton() {
  let btn = document.getElementById('token-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'token-btn';
    btn.textContent = 'Token ändern';
    btn.style.position = 'fixed';
    btn.style.bottom = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '9999';
    btn.onclick = showTokenOverlay;
    document.body.appendChild(btn);
  }
}

// Event-Listener für Overlay-Schließen-Buttons

document.addEventListener('DOMContentLoaded', () => {
  const closeDruckBtn = document.getElementById('close-overlay');
  if (closeDruckBtn) {
    closeDruckBtn.addEventListener('click', closeDruckOverlay);
  }
  const closeNameBtn = document.getElementById('close-name-overlay');
  if (closeNameBtn) {
    closeNameBtn.addEventListener('click', closeNameOverlay);
  }
  const closeNotfallBtn = document.getElementById('close-notfall-overlay');
  if (closeNotfallBtn) {
    closeNotfallBtn.addEventListener('click', closeNotfallOverlay);
  }
  const closeMissionBtn = document.getElementById('close-mission-overlay');
  if (closeMissionBtn) {
    closeMissionBtn.addEventListener('click', closeMissionOverlay);
  }
  const closeTruppNameBtn = document.getElementById('close-truppname-overlay');
  if (closeTruppNameBtn) {
    closeTruppNameBtn.addEventListener('click', closeTruppNameOverlay);
  }
});
