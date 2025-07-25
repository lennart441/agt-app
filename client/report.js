async function uploadToNextcloud() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const timestamp = now.toLocaleString('de-DE');
  let yOffset = 20;
  const maxWidth = 170; // Maximum text width (595pt page - 20pt left margin - 5pt right margin)
  const lineHeight = 7; // Line height for text
  const pageHeight = 842; // A4 page height in points
  const bottomMargin = 20; // Bottom margin to avoid content at page edge

  // Function to render wrapped text and update yOffset
  function renderWrappedText(text, x, y, fontSize) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
      if (yOffset + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        yOffset = 20; // Reset yOffset for new page
      }
      doc.text(line, x, yOffset);
      yOffset += lineHeight;
    });
  }

  // Add header on the first page
  doc.setFontSize(16);
  renderWrappedText('Atemschutzüberwachung Bericht', 20, yOffset, 16);
  doc.setFontSize(12);
  renderWrappedText(`Erstellt am: ${timestamp}`, 20, yOffset, 12);
  yOffset += 10; // Extra spacing after header

  const inactiveTrupps = trupps.filter(t => t.inaktiv);
  if (inactiveTrupps.length === 0) {
    alert("Keine aufgelösten Trupps zum Senden.");
    return;
  }

  inactiveTrupps.forEach((trupp, index) => {
    // Start a new page for each trupp except the first
    if (index > 0) {
      doc.addPage();
      yOffset = 20; // Reset yOffset for the new page
    }

    // Add trupp content
    renderWrappedText(`Trupp: ${trupp.name}`, 20, yOffset, 14);
    renderWrappedText(`Auftrag: ${trupp.mission || 'Kein Auftrag'}`, 30, yOffset, 12);
    trupp.members.forEach(member => {
      const memberText = `${member.role === "TF" ? "Truppführer" : `Truppmann ${member.role.slice(2)}`}: ${member.name} (Initial: ${member.druck} bar)`;
      renderWrappedText(memberText, 30, yOffset, 12);
    });
    trupp.meldungen.forEach(meldung => {
      const meldungText = meldung.members
        ? `${meldung.kommentar} (${meldung.members.map(m => `${m.role}: ${m.druck} bar`).join(", ")})`
        : meldung.kommentar;
      renderWrappedText(meldungText, 30, yOffset, 12);
    });
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