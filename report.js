async function sendreport() {
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
      doc.text(`${meldung.kommentar} (${meldung.members.map(m => `${m.role}: ${m.druck} bar`).join(", ")})`, 30, yOffset);
      yOffset += 7;
    });
    if (index < inactiveTrupps.length - 1) {
      yOffset += 5;
    }
  });

  const pdfBlob = doc.output('blob');
  const filename = `Atemschutzbericht_${now.toISOString().replace(/[:.]/g, '-')}.pdf`;

  // Create a temporary download link
  try {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert(`Bericht ${filename} wird heruntergeladen.`);
    clearTrupps();
  } catch (error) {
    console.error('Fehler beim Erstellen des Downloads:', error);
    alert(`Fehler beim Herunterladen des Berichts: ${error.message}`);
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