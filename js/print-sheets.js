/**
 * SMZ Coaches V2 — Class Print Sheets
 *
 * Ported from the old card generator's PDF export: 9 cards per
 * 8.5x11" sheet (3x3 grid, 2.5"x3.5" each) with corner crop marks,
 * sized for Office Depot cardstock printing. The old tool only ever
 * handled a fixed 9-card batch; this version paginates automatically
 * for classes with more than 9 players.
 *
 * Front sheets use each player's own saved renderedFront image
 * (CardsState.getPrintableCardsForClass — their most recent card).
 * Back sheets reuse the single shared Power Card back design for
 * every slot, since the back isn't per-player.
 */

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sanitizeFilename(name) {
  return (name || 'Class').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Class';
}

// Corner crop marks — identical coordinates to the proven old tool.
function drawCropMarks(pdf) {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.004);
  const mk = 0.12, gp = 0.04;
  [[0.5, 0.25], [3.0, 0.25], [5.5, 0.25], [8.0, 0.25],
   [0.5, 3.75], [8.0, 3.75],
   [0.5, 7.25], [8.0, 7.25],
   [0.5, 10.75], [3.0, 10.75], [5.5, 10.75], [8.0, 10.75]]
    .forEach(([x, y]) => {
      if (x <= 0.51) pdf.line(x - gp - mk, y, x - gp, y);
      if (x >= 7.99) pdf.line(x + gp, y, x + gp + mk, y);
      if (y <= 0.26) pdf.line(x, y - gp - mk, x, y - gp);
      if (y >= 10.74) pdf.line(x, y + gp, x, y + gp + mk);
    });
}

function getPrintableEntries(schoolId, classId) {
  return CardsState.getPrintableCardsForClass(schoolId, classId)
    .filter(entry => !!entry.card.renderedFront);
}

async function printClassFrontSheet(schoolId, classId) {
  const cls = CardsState.getClass(schoolId, classId);
  const entries = getPrintableEntries(schoolId, classId);
  if (!entries.length) {
    alert('No players in this class have a generated Power Card yet.');
    return;
  }
  if (!window.jspdf) {
    alert('The PDF library did not load — check your internet connection and try again.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 11] });
  const pages = chunkArray(entries, 9);

  pages.forEach((pageEntries, pageIndex) => {
    if (pageIndex > 0) pdf.addPage();
    pageEntries.forEach((entry, i) => {
      const row = Math.floor(i / 3), col = i % 3;
      pdf.addImage(entry.card.renderedFront, 'JPEG', 0.5 + col * 2.5, 0.25 + row * 3.5, 2.5, 3.5);
    });
    drawCropMarks(pdf);
  });

  pdf.save(`${sanitizeFilename(cls && cls.name)}_FrontSheet.pdf`);
}

function printClassBackSheet(schoolId, classId) {
  const cls = CardsState.getClass(schoolId, classId);
  const entries = getPrintableEntries(schoolId, classId);
  if (!entries.length) {
    alert('No players in this class have a generated Power Card yet.');
    return;
  }
  if (!window.jspdf) {
    alert('The PDF library did not load — check your internet connection and try again.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 11] });
  const pageCount = Math.ceil(entries.length / 9);

  for (let p = 0; p < pageCount; p++) {
    if (p > 0) pdf.addPage();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        pdf.addImage(CARD_ASSETS.back, 'JPEG', 0.5 + c * 2.5, 0.25 + r * 3.5, 2.5, 3.5);
      }
    }
    drawCropMarks(pdf);
  }

  pdf.save(`${sanitizeFilename(cls && cls.name)}_BackSheet.pdf`);
}
