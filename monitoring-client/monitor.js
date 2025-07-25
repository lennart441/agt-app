const SYNC_API_URL = 'https://agt.ff-stocksee.de/v1/sync-api/trupps';
//const SYNC_API_URL = 'http://localhost:3000/v1/sync-api/trupps';

const OPERATION_TOKEN = 'abc123def456ghi7';
let lastSyncTimestamp = null;

function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('de-DE');
}

function updateSyncTimer() {
  if (!lastSyncTimestamp) {
    document.getElementById('last-sync-time').textContent = 'Letzte Synchronisation: -';
    return;
  }
  const now = Date.now();
  const secondsSinceSync = Math.floor((now - lastSyncTimestamp) / 1000);
  const min = Math.floor(secondsSinceSync / 60).toString().padStart(2, '0');
  const sec = (secondsSinceSync % 60).toString().padStart(2, '0');
  document.getElementById('last-sync-time').textContent = `Letzte Synchronisation: ${min}:${sec} zuvor`;
}

async function fetchTrupps() {
  try {
    const response = await fetch(SYNC_API_URL, {
      headers: {
        'X-Operation-Token': OPERATION_TOKEN
      }
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const data = await response.json();
    lastSyncTimestamp = data.timestamp;
    document.getElementById('sync-timestamp').textContent = `Sync-Zeitpunkt: ${formatTimestamp(data.timestamp)}`;
    renderTrupps(data.trupps || []);
  } catch (error) {
    console.error('Error fetching trupps:', error);
  }
}

function renderTrupps(trupps) {
  const container = document.getElementById('trupp-container');
  container.innerHTML = '';
  trupps.forEach(trupp => {
    const card = document.createElement('div');
    card.className = `trupp-card ${trupp.inaktiv ? 'inaktiv' : 'aktiv'}`;
    card.id = `trupp-${trupp.id}`;

    // Check for AGT emergency
    if (trupp.notfallAktiv) {
      card.classList.add('notfall');
    }

    // Check for low pressure (below 50 bar)
    const minPressure = Math.min(...trupp.members.map(m => m.druck));
    if (minPressure <= 50) {
      card.classList.add('low-pressure');
    }

    const title = document.createElement('h2');
    title.textContent = trupp.name;
    card.appendChild(title);

    const missionDisplay = document.createElement('div');
    missionDisplay.id = `mission-${trupp.id}`;
    missionDisplay.innerHTML = `
      <strong>Auftrag: ${trupp.mission || 'Kein Auftrag'}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}
    `;
    card.appendChild(missionDisplay);

    const agtInfo = document.createElement('p');
    agtInfo.innerHTML = trupp.members
      .map(m => `${m.role === 'TF' ? 'Truppführer' : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
      .join('<br>');
    card.appendChild(agtInfo);

    // Pressure bar for minimum pressure
    const pressureBarContainer = document.createElement('div');
    pressureBarContainer.className = 'pressure-bar-container';
    const pressureBar = document.createElement('div');
    pressureBar.className = 'pressure-bar';
    pressureBar.classList.add(
      minPressure <= 50 ? 'low' : minPressure <= 160 ? 'medium' : 'high'
    );
    const maxPressure = 320; // Maximum pressure for scaling
    pressureBar.style.width = `${(minPressure / maxPressure) * 100}%`;
    pressureBarContainer.appendChild(pressureBar);
    card.appendChild(pressureBarContainer);

    const timerDiv = document.createElement('div');
    timerDiv.id = `timer-${trupp.id}`;
    timerDiv.className = 'timer-bold';
    if (!trupp.inaktiv && trupp.startZeit) {
      const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
      const min = Math.floor(vergangen / 60).toString().padStart(2, '0');
      const sec = (vergangen % 60).toString().padStart(2, '0');
      timerDiv.textContent = `Zeit seit letzter Meldung: ${min}:${sec}`;
    } else {
      timerDiv.textContent = 'Trupp hat nicht angelegt';
    }
    card.appendChild(timerDiv);

    // Separator for meldungen
    const separator = document.createElement('div');
    separator.className = 'meldung-separator';
    card.appendChild(separator);

    const meldungDiv = document.createElement('div');
    meldungDiv.id = `meldungen-${trupp.id}`;
    // Reverse meldungen to show newest first
    [...trupp.meldungen].reverse().forEach(m => {
      const p = document.createElement('p');
      p.textContent = m.members
        ? `${m.kommentar} (${m.members.map(mem => `${mem.role}: ${mem.druck} bar`).join(', ')})`
        : m.kommentar;
      meldungDiv.appendChild(p);
    });
    card.appendChild(meldungDiv);

    if (trupp.hatWarnungErhalten) {
      const warnung = document.createElement('div');
      warnung.className = 'warnung';
      warnung.textContent = `⚠️ Warnung: Einer der Träger hat unter 50% Luft.`;
      card.appendChild(warnung);
    }

    if (!trupp.inaktiv && trupp.startZeit) {
      const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
      if (vergangen > 600) {
        card.classList.add('alarmphase');
      } else if (vergangen > 540) {
        card.classList.add('warnphase');
      }
    }

    container.appendChild(card);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  fetchTrupps();
  setInterval(fetchTrupps, 2000); // Fetch every 2 seconds
  setInterval(updateSyncTimer, 1000); // Update timer every second
});