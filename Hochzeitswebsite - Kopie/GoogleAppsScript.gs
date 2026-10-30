const SPREADSHEET_ID = '1nm3-ABWBH9zf_GwwY38FoJxkPo6g0pjWyq_2Un3wZME';
const RESPONSES_SHEET = 'Anmeldungen';
const SUMMARY_SHEET = 'Auswertung';
const HEADERS = [
  'Eingangszeit',
  'Rückmeldung',
  'Vornamen',
  'Nachnamen',
  'Anzahl Personen',
  'Unverträglichkeiten',
  'Nachricht'
];
const LEGACY_HEADERS_WITH_EMAIL = [
  'Eingangszeit',
  'Rückmeldung',
  'Vornamen',
  'Nachnamen',
  'Anzahl Personen',
  'E-Mail',
  'Unverträglichkeiten',
  'Nachricht'
];

function setupRsvpSpreadsheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const responses = getOrCreateSheet_(spreadsheet, RESPONSES_SHEET);
  const currentHeaders = responses.getRange(1, 1, 1, LEGACY_HEADERS_WITH_EMAIL.length).getValues()[0];
  const hasLegacyEmailColumn = LEGACY_HEADERS_WITH_EMAIL.every((value, index) => currentHeaders[index] === value);
  const hasCurrentHeaders = HEADERS.every((value, index) => currentHeaders[index] === value);
  if (hasLegacyEmailColumn) {
    const existingFilter = responses.getFilter();
    if (existingFilter) existingFilter.remove();
    responses.getBandings().forEach(banding => banding.remove());
    responses.deleteColumn(6);
  } else if (responses.getLastRow() && !hasCurrentHeaders) {
    throw new Error(`The "${RESPONSES_SHEET}" sheet already contains a different header. Review it before setup.`);
  }
  responses.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  responses.setFrozenRows(1);
  responses.setTabColor('#536b59');
  responses.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#536b59')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setWrap(true);
  [165, 120, 190, 190, 125, 260, 260].forEach((width, index) => {
    responses.setColumnWidth(index + 1, width);
  });
  responses.getRange(2, 1, Math.max(1, responses.getMaxRows() - 1), HEADERS.length)
    .setVerticalAlignment('top')
    .setWrap(true);
  responses.getRange(2, 1, Math.max(1, responses.getMaxRows() - 1), 1)
    .setNumberFormat('dd.mm.yyyy hh:mm');
  responses.getRange(1, 1, responses.getMaxRows(), HEADERS.length)
    .setBorder(true, true, true, true, true, true, '#d9dfd5', SpreadsheetApp.BorderStyle.SOLID);
  const existingFilter = responses.getFilter();
  if (existingFilter) existingFilter.remove();
  responses.getRange(1, 1, responses.getMaxRows(), HEADERS.length).createFilter();
  const existingBanding = responses.getBandings();
  existingBanding.forEach(banding => banding.remove());
  responses.getRange(1, 1, responses.getMaxRows(), HEADERS.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);

  const summary = getOrCreateSheet_(spreadsheet, SUMMARY_SHEET);
  summary.getRange('A1:B1').setValues([['Auswertung', 'Anzahl Personen']]);
  summary.getRange('A2:A3').setValues([['Zusagen'], ['Absagen']]);
  summary.getRange('B2:B3').clearContent();
  summary.setFrozenRows(1);
  summary.setTabColor('#b77860');
  summary.getRange('A2:B3').setBorder(true, true, true, true, true, true);
  summary.setColumnWidth(1, 230);
  summary.setColumnWidth(2, 210);
  summary.getRange('A1:B1')
    .setBackground('#536b59')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  updateSummaryCounts_(responses, summary);
}

function doGet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const isReady = Boolean(spreadsheet.getSheetByName(RESPONSES_SHEET));
  const message = isReady
    ? 'Der Anmelde-Endpunkt ist erreichbar und das Tabellenblatt "Anmeldungen" ist vorhanden.'
    : 'Der Anmelde-Endpunkt ist erreichbar, aber noch nicht eingerichtet. Bitte setupRsvpSpreadsheet ausführen.';
  return ContentService.createTextOutput(message).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(event) {
  const params = event.parameters || {};
  const requestId = firstValue_(params.requestId);
  if (!/^[a-f0-9]{32}$/.test(requestId)) return resultPage_(false, '');
  if (firstValue_(params.website)) return resultPage_(true, requestId);

  const firstNames = values_(params.guestFirstName);
  const lastNames = values_(params.guestLastName);
  const count = Number(firstValue_(params.people));
  const attendance = firstValue_(params.attendance);
  const food = firstValue_(params.food).trim();
  const message = firstValue_(params.message).trim();

  if (!Number.isInteger(count) || count < 1 || count > 8
      || firstNames.length !== count || lastNames.length !== count
      || firstNames.some(name => !name.trim() || name.trim().length > 100)
      || lastNames.some(name => !name.trim() || name.trim().length > 100)
      || !['Ja, wir kommen', 'Leider verhindert'].includes(attendance)
      || food.length > 1000 || message.length > 1000) {
    return resultPage_(false, requestId);
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(RESPONSES_SHEET);
  if (!sheet || sheet.getLastRow() < 1) {
    throw new Error('RSVP spreadsheet is not initialized. Run setupRsvpSpreadsheet first.');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return resultPage_(false, requestId);
  try {
    sheet.appendRow([
      new Date(),
      attendance === 'Ja, wir kommen' ? 'Zusage' : 'Absage',
      safeCell_(firstNames.map(name => name.trim()).join('\n')),
      safeCell_(lastNames.map(name => name.trim()).join('\n')),
      count,
      safeCell_(food),
      safeCell_(message)
    ]);
    updateSummaryCounts_(sheet, spreadsheet.getSheetByName(SUMMARY_SHEET));
  } finally {
    lock.releaseLock();
  }
  return resultPage_(true, requestId);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function values_(value) {
  return (Array.isArray(value) ? value : value ? [value] : []).map(String);
}

function firstValue_(value) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function safeCell_(value) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function updateSummaryCounts_(responses, summary) {
  if (!summary) throw new Error(`The "${SUMMARY_SHEET}" sheet is missing. Run setupRsvpSpreadsheet first.`);
  const lastRow = responses.getLastRow();
  const entries = lastRow > 1
    ? responses.getRange(2, 2, lastRow - 1, 4).getValues()
    : [];
  const counts = entries.reduce((result, [status, , , people]) => {
    const count = Number(people) || 0;
    if (status === 'Zusage') result[0] += count;
    if (status === 'Absage') result[1] += count;
    return result;
  }, [0, 0]);
  summary.getRange('B2:B3').clearContent().setValues([[counts[0]], [counts[1]]]);
}

function resultPage_(success, requestId) {
  const message = JSON.stringify({ type: 'rsvp-result', ok: success, requestId });
  return HtmlService.createHtmlOutput(
    `<script>window.top.postMessage(${message}, '*');</script>`
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
