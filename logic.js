const druckWerte = Array.from({ length: 11 }, (_, i) => 270 + i * 5); // 270 bis 320 in 5er-Schritten

const trupps = [];
let truppIdCounter = 0;

let truppNameVorschlaege = [];

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

window.addEventListener('DOMContentLoaded', async () => {
  await ladeTruppnamen();
  console.log('Geladene Truppnamen:', truppNameVorschlaege);
});

function createTrupp() {
  const truppName = document.getElementById("trupp-name-select").value;
  const memberDivs = document.querySelectorAll("#trupp-members .trupp-member");
  const members = Array.from(memberDivs).map((div, index) => {
    const nameInput = div.querySelector(`input[id$="-name"]`);
    const druckSelect = div.querySelector(`select[id$="-druck"]`);
    return {
      name: nameInput.value,
      druck: parseInt(druckSelect.value),
      role: index === 0 ? "TF" : `TM${index}`
    };
  });

  if (members.some(member => !member.name || isNaN(member.druck))) {
    alert("Bitte alle Namen und Druckwerte angeben.");
    return;
  }

  const trupp = {
    id: truppIdCounter++,
    name: truppName,
    members: members,
    meldungen: [],
    hatWarnungErhalten: false,
    timer: null,
    startZeit: null,
    inaktiv: false,
    intervalRef: null
  };
  trupps.push(trupp);
  renderTrupp(trupp);
  document.getElementById("trupp-form-wrapper").style.display = "none";
  document.getElementById("trupp-members").innerHTML = `
    <div class="trupp-member">
      <label>Truppführer Name:</label>
      <input type="text" id="tf-name">
      <label>Druck:</label>
      <select id="tf-druck"></select>
    </div>
    <div class="trupp-member">
      <label>Truppmann 1 Name:</label>
      <input type="text" id="tm1-name">
      <label>Druck:</label>
      <select id="tm1-druck"></select>
    </div>
  `;
  fülleTruppnamenDropdown();
  fülleDruckDropdown("tf-druck");
  fülleDruckDropdown("tm1-druck");
}

function startTimer(trupp) {
  trupp.startZeit = Date.now();
  const card = document.getElementById(`trupp-${trupp.id}`);
  const timerDisplay = document.getElementById(`timer-${trupp.id}`);

  if (trupp.intervalRef) clearInterval(trupp.intervalRef);

  trupp.intervalRef = setInterval(() => {
    const vergangen = Math.floor((Date.now() - trupp.startZeit) / 1000);
    const min = Math.floor(vergangen / 60).toString().padStart(2, '0');
    const sec = (vergangen % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `Zeit seit letzter Meldung: ${min}:${sec}`;

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
    druck: parseInt(document.getElementById(`meldung-${index}-${id}`).value),
    role: index === 0 ? "TF" : `TM${index}`
  }));
  const notiz = document.getElementById(`notiz-${id}`).value;
  const zeit = new Date().toLocaleTimeString();

  const letzteMeldung = trupp.meldungen.length > 0
    ? trupp.meldungen[trupp.meldungen.length - 1].members
    : trupp.members.map(m => ({ role: m.role, druck: m.druck }));

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
  startTimer(trupp);

  if (!trupp.hatWarnungErhalten && trupp.members.some(m => m.druck <= 160)) {
    const warnung = document.createElement("div");
    warnung.className = "warnung";
    warnung.textContent = `⚠️ Warnung: Einer der Träger hat unter 50% Luft.`;
    document.getElementById(`trupp-${id}`).appendChild(warnung);
    trupp.hatWarnungErhalten = true;
  }
}

function ablegen(trupp) {
  if (trupp.intervalRef) clearInterval(trupp.intervalRef);
  const zeit = new Date().toLocaleTimeString();
  trupp.meldungen.push({ kommentar: `${zeit}: Trupp hat abgelegt`, members: trupp.members.map(m => ({ role: m.role, druck: m.druck })) });
  zeigeMeldungen(trupp);
  document.getElementById(`trupp-${trupp.id}`).classList.remove("warnphase", "alarmphase");
}

function sendreport() {
  trupps
    .filter(t => t.inaktiv)
    .forEach(t => {
      const card = document.getElementById(`trupp-${t.id}`);
      if (card) card.remove();
    });
  alert("Bericht gesendet. Aufgelöste Trupps wurden entfernt.");
}