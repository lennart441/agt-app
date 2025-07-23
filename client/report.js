async function uploadToNextcloud() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const timestamp = now.toLocaleString('de-DE');
  let yOffset = 20;

  doc.setFontSize(16);
  doc.text('Atemschutzüberwachung Bericht', 20, yOffset);
  yOffset += 10;
  doc.setFontSize(12);
  doc.text(`Erstellt am: ${timestamp}`, 20, yOffset);
  yOffset += 10;

  const inactiveTrupps = trupps.filter(t => t.inaktiv);
  if (inactiveTrupps.length === 0) {
    alert("Keine aufgelösten Trupps zum Senden.");
    return;
  }

  inactiveTrupps.forEach((trupp, index) => {
    yOffset += 10;
    doc.setFontSize(14);
    doc.text(`Trupp: ${trupp.name}`, 20, yOffset);
    yOffset += 10;
    doc.setFontSize(12);
    trupp.members.forEach(member => {
      doc.text(`${member.role === "TF" ? "Truppführer" : `Truppmann ${member.role.slice(2)}`}: ${member.name} (Initial: ${member.druck} bar)`, 30, yOffset);
      yOffset += 7;
    });
    trupp.meldungen.forEach(meldung => {
      const meldungText = meldung.members
        ? `${meldung.kommentar} (${meldung.members.map(m => `${m.role}: ${m.druck} bar`).join(", ")})`
        : meldung.kommentar;
      doc.text(meldungText, 30, yOffset);
      yOffset += 7;
    });
    if (index < inactiveTrupps.length - 1) {
      yOffset += 5;
    }
  });

  const pdfBlob = doc.output('blob');
  const filename = `Atemschutzbericht_${now.toISOString().replace(/[:.]/g, '-')}.pdf`;

  try {
    const formData = new FormData();
    formData.append('report', pdfBlob, filename);

    const response = await fetch('https://agt.ff-stocksee.de/v1/report/upload-report', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Fehler beim Hochladen: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    alert(result.message);
    clearTrupps();
  } catch (error) {
    console.error('Fehler beim Hochladen des Berichts:', error);
    alert(`Fehler beim Hochladen des Berichts: ${error.message}`);
  }
}

function clearTrupps() {
  const inactiveTrupps = trupps.filter(t => t.inaktiv);
  inactiveTrupps.forEach(t => {
    const card = document.getElementById(`trupp-${t.id}`);
    if (card) card.remove();
  });
  trupps.length = 0;
  localStorage.removeItem('trupps');
}