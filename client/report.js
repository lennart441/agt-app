// Alle Funktionen werden als window-Funktionen verwendet
window.uploadToNextcloud = async function() {
  const inactiveTrupps = window.getAllTrupps().filter(t => t.inaktiv);
  if (inactiveTrupps.length === 0) {
    window.showErrorOverlay('Es gibt keine aufgelösten (inaktiven) Trupps für den Bericht.');
    return;
  }
  // Dateiname im gewünschten Format
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const Min = pad(now.getMinutes());
  const SS = pad(now.getSeconds());
  const geraetename = (window.DEVICE_NAME || 'Geraet').replace(/\s+/g, '-');
  const uuid = window.DEVICE_UUID || 'UUID';
  const filename = `Atemschutzbericht-${YYYY}-${MM}-${DD}-${HH}-${Min}-${SS}-${geraetename}-${uuid}.pdf`;
  if (isOfflineMode()) {
    if (typeof window.generateTruppReportPDF !== 'function') {
      window.showErrorOverlay('PDF-Erstellung nicht möglich: Funktion generateTruppReportPDF fehlt.');
      return;
    }
    const doc = window.generateTruppReportPDF();
    doc.save(filename);
    window.showSuccessOverlay('Bericht wurde lokal als Download angeboten.');
    clearTrupps();
    if (window.renderArchivierteTrupps) window.renderArchivierteTrupps();
    return;
  }
  const doc = window.generateTruppReportPDF();
  const pdfBlob = doc.output('blob');
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
    if (window.renderArchivierteTrupps) window.renderArchivierteTrupps();
    clearArchivContainer();
  } catch (error) {
    console.error('Fehler beim Hochladen des Berichts:', error);
    alert(`Fehler beim Hochladen des Berichts: ${error.message}`);
  }
}

// Überprüft, ob der Offline-Modus aktiviert ist
function isOfflineMode() {
  return localStorage.getItem('offlineMode') === 'true';
}

// Löscht alle inaktiven Trupps aus dem Speicher und entfernt sie aus dem UI
function clearTrupps() {
  const allTrupps = window.getAllTrupps ? window.getAllTrupps() : [];
  const aktiveTrupps = allTrupps.filter(t => !t.inaktiv);
  if (window.saveTruppsToLocalStorage) {
    window.saveTruppsToLocalStorage(aktiveTrupps);
  }
  allTrupps.forEach(t => {
    if (t.inaktiv) {
      const card = document.getElementById(`trupp-${t.id}`);
      if (card) card.remove();
    }
  });
}

window.generateTruppReportPDF = function() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    window.showErrorOverlay('PDF-Bibliothek (jsPDF) nicht geladen.');
    return null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const timestamp = now.toLocaleString('de-DE');
  let yOffset = 20;
  const maxWidth = 170;
  const lineHeight = 7;
  const pageHeight = 842;
  const bottomMargin = 20;
  function renderWrappedText(text, x, fontSize) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
      if (yOffset + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(line, x, yOffset);
      yOffset += lineHeight;
    });
  }
  doc.setFontSize(16);
  renderWrappedText('Atemschutzüberwachung Bericht', 20, 16);
  doc.setFontSize(12);
  renderWrappedText(`Erstellt am: ${timestamp}`, 20, 12);
  yOffset += 10;
  const inactiveTrupps = window.getAllTrupps().filter(t => t.inaktiv);
  inactiveTrupps.forEach((trupp, index) => {
    if (index > 0) {
      doc.addPage();
      yOffset = 20;
    }
    renderWrappedText(`Trupp: ${trupp.name}`, 20, 14);
    renderWrappedText(`Auftrag: ${trupp.mission || 'Kein Auftrag'}`, 30, 12);
    trupp.members.forEach(member => {
      const memberText = `${member.role === "TF" ? "Truppführer" : `Truppmann ${member.role.slice(2)}`}: ${member.name} (Initial: ${member.druck} bar)`;
      renderWrappedText(memberText, 30, 12);
    });
    trupp.meldungen.forEach(meldung => {
      const meldungText = meldung.members
        ? `${meldung.kommentar} (${meldung.members.map(m => `${m.role}: ${m.druck} bar`).join(", ")})`
        : meldung.kommentar;
      renderWrappedText(meldungText, 30, 12);
    });
  });
  doc.text(`Erstellt am: ${now.toLocaleString('de-DE')}`, 15, yOffset);
  return doc;
}

window.createReportPDF = function() {
  const inactiveTrupps = window.getAllTrupps().filter(t => t.inaktiv);
  if (inactiveTrupps.length === 0) {
    window.showErrorOverlay('Es gibt keine aufgelösten (inaktiven) Trupps für den Bericht.');
    return null;
  }
  if (typeof window.generateTruppReportPDF !== 'function') {
    window.showErrorOverlay('PDF-Erstellung nicht möglich: Funktion generateTruppReportPDF fehlt.');
    return null;
  }
  const doc = window.generateTruppReportPDF();
  clearTrupps();
  if (window.renderArchivierteTrupps) window.renderArchivierteTrupps();
  return doc;
}