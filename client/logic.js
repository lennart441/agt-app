const druckWerte = Array.from({ length: 11 }, (_, i) => 270 + i * 5); // 270 bis 320 in 5er-Schritten

const trupps = [];
let truppIdCounter = 0;

let truppNameVorschlaege = [];
let agtlerNamen = [];
let auftragVorschlaege = [];

const SYNC_API_URL = 'https://agt.ff-stocksee.de/v1/sync-api/trupps';
//const SYNC_API_URL = 'http://localhost:3000/v1/sync-api/trupps';

const OPERATION_TOKEN = 'abc123def456ghi7';

async function ladeTruppnamen() {
  try {
    const response = await fetch('truppnamen.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Truppnamen: ${response.status}`);
    }
    truppNameVorschlaege = await response.json();
  } catch (error) {
    console.error('Konnte Truppnamen nicht laden:', error);
    truppNameVorschlaege = [];
  }
}

async function ladeAgtlerNamen() {
  try {
    const response = await fetch('agtler.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Agtler-Namen: ${response.status}`);
    }
    agtlerNamen = await response.json();
  } catch (error) {
    console.error('Konnte Agtler-Namen nicht laden:', error);
    agtlerNamen = [];
  }
}

async function ladeAuftragVorschlaege() {
  try {
    const response = await fetch('auftrag.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Aufträge: ${response.status}`);
    }
    auftragVorschlaege = await response.json();
  } catch (error) {
    console.error('Konnte Aufträge nicht laden:', error);
    auftragVorschlaege = [];
  }
}

async function syncTruppsToServer() {
  try {
    const response = await fetch(SYNC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Operation-Token': OPERATION_TOKEN
      },
      body: JSON.stringify({
        trupps: trupps,
        timestamp: Date.now()
      })
    });
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
    console.log('Trupps successfully synced to server');
  } catch (error) {
    console.error('Error syncing trupps:', error);
  }
}

function saveTruppsToLocalStorage() {
  const serializableTrupps = trupps
    .filter(t => t.inaktiv)
    .map(t => ({
      id: t.id,
      name: t.name,
      mission: t.mission,
      previousMission: t.previousMission,
      members: t.members.map(m => ({
        name: m.name,
        druck: m.druck,
        role: m.role
      })),
      meldungen: t.meldungen.map(m => ({
        kommentar: m.kommentar,
        members: m.members ? m.members.map(mem => ({
          role: mem.role,
          druck: mem.druck
        })) : undefined
      })),
      hatWarnungErhalten: t.hatWarnungErhalten,
      inaktiv: t.inaktiv,
      notfallAktiv: t.notfallAktiv
    }));
  localStorage.setItem('trupps', JSON.stringify(serializableTrupps));
}

function loadTruppsFromLocalStorage() {
  const storedTrupps = localStorage.getItem('trupps');
  if (storedTrupps) {
    try {
      const parsedTrupps = JSON.parse(storedTrupps);
      const maxStoredId = parsedTrupps.length > 0 
        ? Math.max(...parsedTrupps.map(t => t.id || 0), 0)
        : 0;
      truppIdCounter = Math.max(truppIdCounter, maxStoredId + 1);
      
      parsedTrupps.forEach(trupp => {
        if (!trupp.id || trupps.some(t => t.id === trupp.id)) {
          trupp.id = truppIdCounter++;
        }
        trupp.inaktiv = true;
        trupp.intervalRef = null;
        trupp.startZeit = null;
        trupp.timer = null;
        trupp.notfallAktiv = trupp.notfallAktiv || false;
        trupp.mission = trupp.mission || '';
        trupp.previousMission = trupp.previousMission || '';
        trupp.meldungen = trupp.meldungen || [];
        trupp.hatWarnungErhalten = trupp.hatWarnungErhalten || false;
        trupp.members = trupp.members || [];
        trupp.meldungen = trupp.meldungen.map(m => ({
          kommentar: m.kommentar || '',
          members: m.members ? m.members.map(mem => ({
            role: mem.role || '',
            druck: mem.druck || 0
          })) : undefined
        }));
        trupps.push(trupp);
        renderTrupp(trupp);
        zeigeMeldungen(trupp);
      });
    } catch (error) {
      console.error('Fehler beim Laden der Trupps aus Local Storage:', error);
      localStorage.removeItem('trupps'); // Clear corrupted data
    }
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([ladeTruppnamen(), ladeAgtlerNamen(), ladeAuftragVorschlaege()]);
  console.log('Geladene Truppnamen:', truppNameVorschlaege);
  console.log('Geladene Agtler-Namen:', agtlerNamen);
  console.log('Geladene Aufträge:', auftragVorschlaege);
  loadTruppsFromLocalStorage();
  
  // Start automatic sync every 2 seconds
  setInterval(syncTruppsToServer, 2000);
});

function createTrupp() {
  const truppNameInput = document.getElementById("trupp-name-input");
  const missionDisplay = document.getElementById("trupp-mission-display");
  const truppName = truppNameInput ? truppNameInput.value.trim() : '';
  const mission = missionDisplay ? missionDisplay.value.trim() : selectedMission;
  const memberDivs = document.querySelectorAll("#trupp-members .trupp-member");
  const members = Array.from(memberDivs).map((div, index) => {
    const nameInput = div.querySelector(`input[id$="-name"]`);
    const druckInput = div.querySelector(`input[id$="-druck"]`);
    const druckValue = druckInput ? parseInt(druckInput.value.replace(' bar', '')) : 300;
    return {
      name: nameInput ? nameInput.value.trim() : '',
      druck: isNaN(druckValue) ? 300 : druckValue,
      role: index === 0 ? "TF" : `TM${index}`
    };
  });

  if (!truppName) {
    alert("Bitte einen Truppnamen auswählen.");
    return;
  }

  if (members.some(member => !member.name || isNaN(member.druck))) {
    alert("Bitte alle Namen und Druckwerte angeben.");
    return;
  }

  if (!mission) {
    alert("Bitte einen Auftrag angeben.");
    return;
  }

  const trupp = {
    id: truppIdCounter++,
    name: truppName,
    mission: mission,
    previousMission: '',
    members: members,
    meldungen: [],
    hatWarnungErhalten: false,
    timer: null,
    startZeit: null,
    inaktiv: false,
    intervalRef: null,
    notfallAktiv: false
  };
  trupps.push(trupp);
  renderTrupp(trupp);
  document.getElementById("trupp-form-wrapper").style.display = "none";
  // Reset form
  const truppForm = document.getElementById("trupp-members");
  truppForm.innerHTML = `
    <div class="trupp-member">
      <label>Truppführer Name:</label>
      <input type="text" id="tf-name" onclick="showNameOverlay('tf-name')">
      <label>Druck:</label>
      <input type="text" id="tf-druck" onclick="showDruckOverlay('tf-druck')">
    </div>
    <div class="trupp-member">
      <label>Truppmann 1 Name:</label>
      <input type="text" id="tm1-name" onclick="showNameOverlay('tm1-name')">
      <label>Druck:</label>
      <input type="text" id="tm1-druck" onclick="showDruckOverlay('tm1-druck')">
    </div>
  `;
  if (truppNameInput) truppNameInput.value = '';
  if (missionDisplay) missionDisplay.value = '';
  selectedMission = '';
  memberCounter = 2; // Reset member counter
  syncTruppsToServer(); // Sync immediately after creation
}

function startTimer(trupp) {
  trupp.startZeit = Date.now();
  const card = document.getElementById(`trupp-${trupp.id}`);
  const timerDiv = document.getElementById(`timer-${trupp.id}`);

  if (trupp.intervalRef) clearInterval(trupp.intervalRef);

  trupp.intervalRef = setInterval(() => {
    const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
    const min = Math.floor(vergangen / 60).toString().padStart(2, '0');
    const sec = (vergangen % 60).toString().padStart(2, '0');
    timerDiv.textContent = `Zeit seit letzter Meldung: ${min}:${sec}`;

    if (vergangen > 600) {
      card.classList.remove("warnphase");
      card.classList.add("alarmphase");
    } else if (vergangen > 540) {
      card.classList.add("warnphase");
      card.classList.remove("alarmphase");
    } else {
      card.classList.remove("warnphase", "alarmphase");
    }
  }, 1000);
}

function meldung(id) {
  const trupp = trupps.find(t => t.id === id);
  const memberDruckInputs = trupp.members.map((_, index) => ({
    druck: parseInt(document.getElementById(`meldung-${index}-${id}`).value.replace(' bar', '')),
    role: index === 0 ? "TF" : `TM${index}`
  }));
  const notiz = document.getElementById(`notiz-${id}`).value;
  const zeit = new Date().toLocaleTimeString();

  // Find the last meldung with members, or fall back to initial members
  let letzteMeldung = trupp.meldungen.slice().reverse().find(m => m.members)?.members;
  if (!letzteMeldung) {
    letzteMeldung = trupp.members.map(m => ({ role: m.role, druck: m.druck }));
  }

  for (let i = 0; i < memberDruckInputs.length; i++) {
    const currentDruck = memberDruckInputs[i].druck;
    const lastDruck = letzteMeldung.find(m => m.role === memberDruckInputs[i].role).druck;
    if (isNaN(currentDruck) || currentDruck > lastDruck) {
      alert("Druck darf nicht höher sein als bei der letzten Meldung oder beim Anlegen.");
      return;
    }
  }

  trupp.members.forEach((member, index) => {
    member.druck = memberDruckInputs[index].druck;
  });

  document.getElementById(`info-${id}`).innerHTML = trupp.members
    .map(m => `${m.role === "TF" ? "Truppführer" : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
    .join("<br>");

  trupp.meldungen.push({ kommentar: `${zeit}: ${notiz}`, members: memberDruckInputs });
  zeigeMeldungen(trupp);
  if (!trupp.inaktiv && trupp.startZeit) {
    startTimer(trupp);
  }

  if (!trupp.hatWarnungErhalten && trupp.members.some(m => m.druck <= 160)) {
    const warnung = document.createElement("div");
    warnung.className = "warnung";
    warnung.textContent = `⚠️ Warnung: Einer der Träger hat unter 50% Luft.`;
    document.getElementById(`trupp-${id}`).appendChild(warnung);
    trupp.hatWarnungErhalten = true;
  }

  // Clear the notiz field after a successful meldung
  document.getElementById(`notiz-${id}`).value = '';

  updateTruppCard(trupp); // Update the trupp card to reflect new pressure values
  syncTruppsToServer(); // Sync after meldung
}

function ablegen(trupp) {
  if (trupp.intervalRef) clearInterval(trupp.intervalRef);
  trupp.startZeit = null; // Reset startZeit to indicate trupp is not active
  const zeit = new Date().toLocaleTimeString();
  trupp.meldungen.push({ kommentar: `${zeit}: Trupp hat abgelegt`, members: trupp.members.map(m => ({ role: m.role, druck: m.druck })) });
  zeigeMeldungen(trupp);
  document.getElementById(`trupp-${trupp.id}`).classList.remove("warnphase", "alarmphase");
  // Do not set trupp.inaktiv = true; keep trupp active after ablegen
  saveTruppsToLocalStorage();
  syncTruppsToServer(); // Sync after ablegen
}

function confirmNotfall(truppId, isEndNotfall) {
  const trupp = trupps.find(t => t.id === truppId);
  const zeit = new Date().toLocaleTimeString();
  trupp.meldungen.push({ kommentar: `${zeit}: ${isEndNotfall ? 'AGT Notfall beendet' : 'AGT Notfall ausgelöst'}` });
  trupp.notfallAktiv = !isEndNotfall;
  zeigeMeldungen(trupp);
  const card = document.getElementById(`trupp-${truppId}`);
  const notfallBtn = card.querySelector('.notfall-btn');
  notfallBtn.textContent = trupp.notfallAktiv ? "AGT Notfall beenden" : "AGT Notfall";
  closeNotfallOverlay();
  updateTruppCard(trupp); // Update card to reflect notfall status
  syncTruppsToServer(); // Sync after notfall
}

function updateMission(truppId, newMission) {
  const trupp = trupps.find(t => t.id === truppId);
  if (newMission && newMission !== trupp.mission) {
    const zeit = new Date().toLocaleTimeString();
    const oldMission = trupp.mission || 'Kein Auftrag';
    trupp.meldungen.push({ 
      kommentar: `${zeit}: Trupp hatte den Auftrag '${oldMission}' und hat jetzt den Auftrag '${newMission}'`
    });
    trupp.previousMission = trupp.mission;
    trupp.mission = newMission;
    zeigeMeldungen(trupp);
    const missionDisplay = document.getElementById(`mission-${trupp.id}`);
    missionDisplay.innerHTML = `
      <strong>Auftrag: ${trupp.mission}</strong>${trupp.previousMission ? `, davor ${trupp.previousMission}` : ''}
    `;
    syncTruppsToServer(); // Sync after mission update
  }
}