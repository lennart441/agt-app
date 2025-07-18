let memberCounter = 2;

function showTruppForm() {
  const formWrapper = document.getElementById("trupp-form-wrapper");
  formWrapper.style.display = formWrapper.style.display === "none" ? "block" : "none";
  fülleTruppnamenDropdown();
  fülleDruckDropdown("tf-druck");
  fülleDruckDropdown("tm1-druck");
}

function addTruppMember() {
  const membersDiv = document.getElementById("trupp-members");
  const newMemberDiv = document.createElement("div");
  newMemberDiv.className = "trupp-member";
  newMemberDiv.innerHTML = `
    <label>Truppmann ${memberCounter} Name:</label>
    <input type="text" id="tm${memberCounter}-name">
    <label>Druck:</label>
    <select id="tm${memberCounter}-druck"></select>
  `;
  membersDiv.appendChild(newMemberDiv);
  fülleDruckDropdown(`tm${memberCounter}-druck`);
  memberCounter++;
}

function fülleDruckDropdown(id) {
  const select = document.getElementById(id);
  select.innerHTML = "";
  druckWerte.forEach(wert => {
    const option = document.createElement("option");
    option.value = wert;
    option.textContent = `${wert} bar`;
    select.appendChild(option);
  });
  select.value = 300;
}

function fülleTruppnamenDropdown() {
  const select = document.getElementById("trupp-name-select");
  select.innerHTML = "";
  truppNameVorschlaege.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function setupMeldungDropdown(id) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">Druck auswählen</option>';
  select.addEventListener('click', () => showDruckOverlay(id));
}

function showDruckOverlay(selectId) {
  const overlay = document.getElementById('druck-overlay');
  const grid = document.getElementById('druck-grid');
  grid.innerHTML = '';

  const druckWerteMeldung = Array.from({ length: 64 }, (_, i) => 5 + i * 5);
  druckWerteMeldung.forEach(wert => {
    const btn = document.createElement('button');
    btn.className = 'druck-btn';
    btn.textContent = `${wert}`;
    btn.setAttribute('data-druck', wert);
    btn.addEventListener('click', () => {
      const select = document.getElementById(selectId);
      select.innerHTML = `<option value="${wert}">${wert} bar</option>`;
      select.value = wert;
      closeDruckOverlay();
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function closeDruckOverlay() {
  const overlay = document.getElementById('druck-overlay');
  overlay.style.display = 'none';
}

function renderTrupp(trupp) {
  const container = document.getElementById("trupp-container");
  const card = document.createElement("div");
  card.className = "trupp-card";
  card.id = `trupp-${trupp.id}`;

  const title = document.createElement("h2");
  title.textContent = trupp.name;
  card.appendChild(title);

  const agtInfo = document.createElement("p");
  agtInfo.id = `info-${trupp.id}`;
  agtInfo.innerHTML = trupp.members
    .map(m => `${m.role === "TF" ? "Truppführer" : `Truppmann ${m.role.slice(2)}`}: ${m.name} (${m.druck} bar)`)
    .join("<br>");
  card.appendChild(agtInfo);

  const startButton = document.createElement("button");
  startButton.textContent = "Trupp legt an";
  startButton.onclick = () => {
    startButton.style.display = "none";
    startTimer(trupp);
    ablegenBtn.style.display = "inline";
    const startKommentar = `Angelegt um ${new Date().toLocaleTimeString()}`;
    trupp.meldungen.push({ kommentar: startKommentar, members: trupp.members.map(m => ({ role: m.role, druck: m.druck })) });
    zeigeMeldungen(trupp);
  };
  card.appendChild(startButton);

  const ablegenBtn = document.createElement("button");
  ablegenBtn.textContent = "Trupp legt ab";
  ablegenBtn.style.display = "none";
  ablegenBtn.onclick = () => {
    startButton.style.display = "inline";
    ablegen(trupp);
    ablegenBtn.style.display = "none";
  };
  card.appendChild(ablegenBtn);

  const loeschenBtn = document.createElement("button");
  loeschenBtn.textContent = "Trupp auflösen";
  loeschenBtn.onclick = () => {
    trupp.inaktiv = true;
    if (trupp.intervalRef) clearInterval(trupp.intervalRef);
    card.classList.remove("warnphase", "alarmphase", "aktiv");
    card.classList.add("inaktiv");
    const meldungForm = document.getElementById(`meldung-form-${trupp.id}`);
    const inputs = meldungForm.querySelectorAll("select, input, button");
    inputs.forEach(input => input.style.display = "none");
    startButton.style.display = "none";
    ablegenBtn.style.display = "none";
    loeschenBtn.style.display = "none";
  };
  card.appendChild(loeschenBtn);

  const timerDiv = document.createElement("div");
  timerDiv.id = `timer-${trupp.id}`;
  card.appendChild(timerDiv);

  const meldungForm = document.createElement("div");
  meldungForm.id = `meldung-form-${trupp.id}`;
  meldungForm.innerHTML = `
    <h3>Meldung:</h3>
    ${trupp.members.map((member, index) => `
      <label>Druck ${member.role}:</label>
      <select id="meldung-${index}-${trupp.id}"></select>
    `).join('')}
    <label>Notiz:</label>
    <input type="text" id="notiz-${trupp.id}">
    <button onclick="meldung(${trupp.id})">Melden</button>
    <div id="meldungen-${trupp.id}"></div>
  `;
  card.appendChild(meldungForm);

  container.appendChild(card);
  trupp.members.forEach((_, index) => {
    setupMeldungDropdown(`meldung-${index}-${trupp.id}`);
  });
  card.classList.add(trupp.inaktiv ? "inaktiv" : "aktiv");

  // Hide buttons and meldung form inputs for inactive troops
  if (trupp.inaktiv) {
    startButton.style.display = "none";
    ablegenBtn.style.display = "none";
    loeschenBtn.style.display = "none";
    const meldungForm = document.getElementById(`meldung-form-${trupp.id}`);
    const inputs = meldungForm.querySelectorAll("select, input, button");
    inputs.forEach(input => input.style.display = "none");
    zeigeMeldungen(trupp); // Ensure meldungen are displayed
  }
}

function zeigeMeldungen(trupp) {
  const meldungDiv = document.getElementById(`meldungen-${trupp.id}`);
  meldungDiv.innerHTML = "";
  trupp.meldungen.forEach(m => {
    const p = document.createElement("p");
    p.textContent = `${m.kommentar} (${m.members.map(mem => `${mem.role}: ${mem.druck} bar`).join(", ")})`;
    meldungDiv.appendChild(p);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-overlay');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDruckOverlay);
  }
});