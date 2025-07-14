const truppContainer = document.getElementById("trupp-container");
const neuerTruppBtn = document.getElementById("neuer-trupp-btn");

let truppnamen = [];
let trupps = JSON.parse(localStorage.getItem("trupps")) || [];

fetch("truppnamen.json")
  .then((res) => res.json())
  .then((data) => {
    truppnamen = data;
    renderAlleTrupps();
  });

neuerTruppBtn.addEventListener("click", () => {
  const truppId = `trupp-${Date.now()}`;
  renderTruppForm(truppId);
});

function renderAlleTrupps() {
  truppContainer.innerHTML = "";
  truppContainer.style.display = "flex";
  truppContainer.style.flexWrap = "wrap";
  trupps.forEach((t) => renderTruppCard(t));
}

function createDruckDropdown(id) {
  const options = [];
  for (let i = 270; i <= 320; i += 5) {
    options.push(`<option value="${i}">${i} bar</option>`);
  }
  return `<select id="${id}">${options.join("")}</select>`;
}

function renderTruppForm(truppId) {
  const div = document.createElement("div");
  div.className = "trupp-form";
  div.innerHTML = `
    <h2>Neuen Trupp erstellen</h2>
    <label>Truppname:
      <select id="name-${truppId}">
        ${truppnamen.map((name) => `<option>${name}</option>`).join("")}
      </select>
    </label>
    <input placeholder="Truppführer Name" id="tf-${truppId}" />
    ${createDruckDropdown(`tf-druck-${truppId}`)}
    <input placeholder="Truppmann Name" id="tm-${truppId}" />
    ${createDruckDropdown(`tm-druck-${truppId}`)}
    <button id="create-${truppId}">Trupp erstellen</button>
  `;
  truppContainer.appendChild(div);

  document.getElementById(`create-${truppId}`).addEventListener("click", () => {
    const name = document.getElementById(`name-${truppId}`).value;
    const tfName = document.getElementById(`tf-${truppId}`).value;
    const tfDruck = parseInt(document.getElementById(`tf-druck-${truppId}`).value);
    const tmName = document.getElementById(`tm-${truppId}`).value;
    const tmDruck = parseInt(document.getElementById(`tm-druck-${truppId}`).value);

    const neuerTrupp = {
      id: truppId,
      name,
      tf: { name: tfName, druck: tfDruck },
      tm: { name: tmName, druck: tmDruck },
      timerAktiv: false,
      startzeit: null,
      meldungen: [
        { zeit: new Date().toLocaleTimeString(), notiz: "Trupp erstellt", tfRest: tfDruck, tmRest: tmDruck }
      ]
    };

    trupps.push(neuerTrupp);
    speichern();
    renderAlleTrupps();
  });
}

function renderTruppCard(trupp) {
  const div = document.createElement("div");
  div.className = "trupp-card";
  div.id = trupp.id;

  const warnung = trupp.tf.druck < 100 || trupp.tm.druck < 100 ?
    '<p class="warnung">WARNUNG: Rückzug einleiten! Unter 50%!</p>' : "";

  div.innerHTML = `
    <h2>${trupp.name}</h2>
    ${warnung}
    <p><strong>Truppführer:</strong> ${trupp.tf.name} (${trupp.tf.druck} bar)</p>
    <p><strong>Truppmann:</strong> ${trupp.tm.name} (${trupp.tm.druck} bar)</p>
    <p id="timer-${trupp.id}">Timer: ${trupp.timerAktiv ? "läuft" : "--:--"}</p>
    <button id="start-${trupp.id}" ${trupp.timerAktiv ? "disabled" : ""}>Trupp legt an</button>
    <button id="meldung-${trupp.id}" ${!trupp.timerAktiv ? "disabled" : ""}>Meldung machen</button>
    <button id="ablegen-${trupp.id}" ${!trupp.timerAktiv ? "disabled" : ""}>Trupp legt ab</button>
    <button id="loeschen-${trupp.id}">Trupp auflösen</button>
    <div id="meldungen-${trupp.id}"></div>
  `;

  truppContainer.appendChild(div);

  document.getElementById(`start-${trupp.id}`).addEventListener("click", () => {
    trupp.timerAktiv = true;
    trupp.startzeit = Date.now();
    speichern();
    startTimer(trupp);
    renderAlleTrupps();
  });

  document.getElementById(`meldung-${trupp.id}`).addEventListener("click", () => {
    const tfRest = prompt("Restdruck Truppführer (z. B. 280)?");
    const tmRest = prompt("Restdruck Truppmann (z. B. 275)?");
    const notiz = prompt("Notiz zur Meldung:");

    trupp.tf.druck = parseInt(tfRest);
    trupp.tm.druck = parseInt(tmRest);

    trupp.meldungen.push({
      zeit: new Date().toLocaleTimeString(),
      tfRest, tmRest, notiz
    });

    trupp.startzeit = Date.now();
    speichern();
    renderAlleTrupps();
  });

  document.getElementById(`ablegen-${trupp.id}`).addEventListener("click", () => {
    const tfRest = trupp.tf.druck;
    const tmRest = trupp.tm.druck;
    const notiz = prompt("Kommentar zum Ablegen?") || "Trupp legt ab";

    trupp.timerAktiv = false;
    trupp.meldungen.push({
      zeit: new Date().toLocaleTimeString(),
      tfRest, tmRest, notiz
    });
    speichern();
    renderAlleTrupps();
  });

  document.getElementById(`loeschen-${trupp.id}`).addEventListener("click", () => {
    trupps = trupps.filter((t) => t.id !== trupp.id);
    speichern();
    renderAlleTrupps();
  });

  const meldungenDiv = document.getElementById(`meldungen-${trupp.id}`);
  trupp.meldungen.forEach((m) => {
    const p = document.createElement("p");
    p.innerText = `🕒 ${m.zeit} – TF: ${m.tfRest} bar, TM: ${m.tmRest} bar – ${m.notiz}`;
    meldungenDiv.appendChild(p);
  });

  if (trupp.timerAktiv) {
    startTimer(trupp);
  }
}

function startTimer(trupp) {
  const timerEl = document.getElementById(`timer-${trupp.id}`);
  const truppCard = document.getElementById(trupp.id);
  const update = () => {
    if (!trupp.timerAktiv) return;
    const vergangen = Math.floor((Date.now() - trupp.startzeit) / 1000);
    const verbleibend = 600 - vergangen;

    if (verbleibend <= 0) {
      timerEl.textContent = "Timer: ABGELAUFEN";
      truppCard.classList.remove("warnphase");
      truppCard.classList.add("alarmphase");
    } else {
      const min = Math.floor(verbleibend / 60);
      const sec = verbleibend % 60;
      timerEl.textContent = `Timer: ${min}:${sec.toString().padStart(2, "0")}`;
      if (verbleibend <= 60) {
        truppCard.classList.remove("warnphase");
        truppCard.classList.add("alarmphase");
      } else if (verbleibend <= 120) {
        truppCard.classList.add("warnphase");
      } else {
        truppCard.classList.remove("warnphase", "alarmphase");
      }
      setTimeout(update, 1000);
    }
  };
  update();
}

function speichern() {
  localStorage.setItem("trupps", JSON.stringify(trupps));
  }