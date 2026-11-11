const SPREADSHEET_ID = '1nm3-ABWBH9zf_GwwY38FoJxkPo6g0pjWyq_2Un3wZME';
const RESPONSES_SHEET = 'Anmeldungen';
const SUMMARY_SHEET = 'Auswertung';
const PERSONALIZATION_SHEET = 'Personalisierung';
const ADMIN_PASSWORD = '2702';
const AUTH_BUILD = '2026-11-02-1';
const HEADERS = [
  'Eingangszeit',
  'Rückmeldung',
  'Vornamen',
  'Nachnamen',
  'Anzahl Personen',
  'Nachricht',
  'Persönliches Kennwort'
];

function setupRsvpSpreadsheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const responses = getOrCreateSheet_(spreadsheet, RESPONSES_SHEET);
  const columnCount = Math.max(responses.getLastColumn(), HEADERS.length);
  const currentHeaders = responses.getRange(1, 1, 1, columnCount)
    .getDisplayValues()[0].map(value => value.trim());
  const messageColumn = currentHeaders.indexOf('Nachricht') + 1;
  const messageHeaderIndex = HEADERS.indexOf('Nachricht');
  const hasExpectedPrefix = HEADERS.slice(0, messageHeaderIndex)
    .every((value, index) => currentHeaders[index] === value);
  const hasPasswordHeader = currentHeaders[HEADERS.length - 1] === HEADERS[HEADERS.length - 1];
  const hasNoTrailingHeaders = currentHeaders.slice(hasPasswordHeader ? HEADERS.length : messageColumn)
    .every(header => !header);
  if (responses.getLastRow()
      && (!hasExpectedPrefix || messageColumn < messageHeaderIndex + 1
        || (hasPasswordHeader && messageColumn !== messageHeaderIndex + 1)
        || !hasNoTrailingHeaders)) {
    throw new Error(`The "${RESPONSES_SHEET}" sheet already contains different headers. Review it before setup.`);
  }
  if (messageColumn > messageHeaderIndex + 1) {
    const existingFilter = responses.getFilter();
    if (existingFilter) existingFilter.remove();
    responses.getBandings().forEach(banding => banding.remove());
    for (let column = messageColumn - 1; column >= messageHeaderIndex + 1; column--) {
      responses.deleteColumn(column);
    }
  }
  responses.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  responses.setFrozenRows(1);
  responses.setTabColor('#536b59');
  responses.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#536b59')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setWrap(true);
  [165, 120, 190, 190, 125, 260, 155].forEach((width, index) => {
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
  ensureSummaryChangeTrigger_(spreadsheet);

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
  if (firstValue_(params.action) === 'authenticate') {
    const access = findGuestsByPassword_(firstValue_(params.password));
    return resultPage_(Boolean(access), requestId, { ...(access || {}), authBuild: AUTH_BUILD });
  }
  if (firstValue_(params.website)) return resultPage_(true, requestId);

  const guestNames = values_(params.guestName);
  const guests = guestNames.map(guestNameParts_);
  const attendances = values_(params.attendance);
  const accessPassword = firstValue_(params.accessPassword);
  const access = findGuestsByPassword_(accessPassword);
  const count = Number(firstValue_(params.people));
  const message = firstValue_(params.message).trim();

  if (!access || access.admin || !sameGuestNames_(guestNames, access.guests)
      || !Number.isInteger(count) || count < 1
      || guestNames.length !== count
      || attendances.length !== count
      || guestNames.some(name => !name.trim() || name.trim().length > 100)
      || attendances.some(attendance => !['Ja, wir kommen', 'Leider verhindert'].includes(attendance))
      || message.length > 1000) {
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
    const lastRow = sheet.getLastRow();
    const existingRows = lastRow > 1
      ? sheet.getRange(2, 2, lastRow - 1, HEADERS.length - 1).getDisplayValues()
      : [];
    const invitedNames = new Set(access.guests.map(guest =>
      `${guest.firstName} ${guest.lastName}`.trim().replace(/\s+/g, ' ')
    ));
    const alreadySubmitted = existingRows.some(([
      ,
      existingFirstNames,
      existingLastNames,
      ,
      ,
      existingPassword
    ]) => {
      if (existingPassword.trim() === accessPassword) return true;
      if (existingPassword.trim()) return false;
      const firstNames = existingFirstNames.split(/\r?\n/);
      const lastNames = existingLastNames.split(/\r?\n/);
      return firstNames.some((firstName, index) =>
        invitedNames.has(`${firstName} ${lastNames[index] || ''}`.trim().replace(/\s+/g, ' '))
      );
    });
    if (alreadySubmitted) {
      return resultPage_(false, requestId, { alreadySubmitted: true });
    }

    const timestamp = new Date();
    const rows = guests.map((guest, index) => [
      timestamp,
      attendances[index] === 'Ja, wir kommen' ? 'Zusage' : 'Absage',
      safeCell_(guest.firstName),
      safeCell_(guest.lastName),
      1,
      safeCell_(message),
      safeCell_(accessPassword)
    ]);
    sheet.getRange(lastRow + 1, 1, rows.length, HEADERS.length).setValues(rows);
    updateSummaryCounts_(sheet, spreadsheet.getSheetByName(SUMMARY_SHEET));
  } finally {
    lock.releaseLock();
  }
  return resultPage_(true, requestId);
}

function generatePersonalizationPasswords() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PERSONALIZATION_SHEET);
  if (!sheet) throw new Error(`The "${PERSONALIZATION_SHEET}" sheet is missing.`);

  sheet.getRange('B3:B4').setValues([[ADMIN_PASSWORD], [ADMIN_PASSWORD]]);
  syncPersonalizationPasswords_(sheet);
}

function setupPersonalizationEditTrigger() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(PERSONALIZATION_SHEET);
  if (!sheet) throw new Error(`The "${PERSONALIZATION_SHEET}" sheet is missing.`);

  const handler = 'syncPersonalizationPasswordsOnEdit_';
  const exists = ScriptApp.getProjectTriggers().some(trigger =>
    trigger.getHandlerFunction() === handler
    && trigger.getTriggerSourceId() === spreadsheet.getId()
  );
  if (!exists) {
    ScriptApp.newTrigger(handler).forSpreadsheet(spreadsheet).onEdit().create();
  }
  syncPersonalizationPasswords_(sheet);
}

function syncPersonalizationPasswordsOnEdit_(event) {
  if (!event || !event.range) throw new Error('This function must be run by its spreadsheet edit trigger.');
  const range = event.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== PERSONALIZATION_SHEET
      || range.getColumn() > 1
      || range.getLastColumn() < 1
      || range.getLastRow() < 5) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Could not lock personalization sheet to update passwords.');
  try {
    syncPersonalizationPasswords_(sheet);
  } finally {
    lock.releaseLock();
  }
}

function syncPersonalizationPasswords_(sheet) {
  const lastRow = Math.max(5, sheet.getLastRow());
  const rowCount = lastRow - 4;
  const names = sheet.getRange(5, 1, rowCount, 1).getDisplayValues().map(([name]) => name.trim());
  const existingPasswords = sheet.getRange(5, 2, rowCount, 1)
    .getDisplayValues().map(([password]) => password.trim());
  const usedPasswords = new Set([ADMIN_PASSWORD]);
  const results = Array(rowCount).fill('');

  for (let start = 0; start < rowCount;) {
    if (!names[start]) {
      results[start] = 'Kein Passwort benötigt';
      start++;
      continue;
    }

    let end = start + 1;
    while (end < rowCount && names[end]) end++;
    const existing = existingPasswords.slice(start, end)
      .find(password => /^\d{4}$/.test(password) && !usedPasswords.has(password));
    const password = existing || generateUniquePassword_(usedPasswords);
    usedPasswords.add(password);
    for (let row = start; row < end; row++) results[row] = password;
    start = end;
  }

  sheet.getRange(5, 2, rowCount, 1).setValues(results.map(password => [password]));
}

function generateUniquePassword_(usedPasswords) {
  if (usedPasswords.size >= 10000) throw new Error('No unique four-digit passwords remain.');
  let password;
  do {
    password = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  } while (usedPasswords.has(password));
  return password;
}

function findGuestsByPassword_(password) {
  if (!/^\d{4}$/.test(password)) return null;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PERSONALIZATION_SHEET);
  if (!sheet) throw new Error(`The "${PERSONALIZATION_SHEET}" sheet is missing.`);

  const adminPasswords = sheet.getRange('B3:B4').getDisplayValues().flat();
  if (adminPasswords.includes(password)) return { admin: true, guests: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow < 5) return null;
  const rows = sheet.getRange(5, 1, lastRow - 4, 2).getDisplayValues();
  const guests = rows
    .filter(([name, assignedPassword]) =>
      name.trim() && assignedPassword.trim() === password
    )
    .map(([name]) => guestNameParts_(name));
  if (!guests.length || guests.some(guest => !guest.firstName)) return null;
  return { admin: false, guests };
}

function diagnosePersonalizationPasswordSetup() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(PERSONALIZATION_SHEET);
  if (!sheet) throw new Error(`The "${PERSONALIZATION_SHEET}" sheet is missing from the configured spreadsheet.`);

  const adminPasswordCellsMatch = sheet.getRange('B3:B4').getDisplayValues()
    .map(([password]) => password.trim() === ADMIN_PASSWORD);
  const lastRow = sheet.getLastRow();
  const guestRows = lastRow >= 5
    ? sheet.getRange(5, 1, lastRow - 4, 2).getDisplayValues()
    : [];
  const validGuestRows = guestRows.filter(([name, password]) =>
    name.trim() && /^\d{4}$/.test(password.trim())
  ).length;
  const diagnostic = {
    configuredSpreadsheetName: spreadsheet.getName(),
    configuredSpreadsheetId: spreadsheet.getId(),
    activeSpreadsheetMatchesConfigured: Boolean(activeSpreadsheet)
      && activeSpreadsheet.getId() === spreadsheet.getId(),
    personalizationSheetExists: true,
    adminPasswordCellsMatch: adminPasswordCellsMatch,
    validGuestRows
  };
  Logger.log(JSON.stringify(diagnostic));
  return diagnostic;
}

function diagnosePasswordLookupForRows191And192() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(PERSONALIZATION_SHEET);
  if (!sheet) throw new Error(`The "${PERSONALIZATION_SHEET}" sheet is missing.`);

  const results = [191, 192].map(rowNumber => {
    const [name, password] = sheet.getRange(rowNumber, 1, 1, 2).getDisplayValues()[0];
    const normalizedPassword = password.trim();
    const lookup = /^\d{4}$/.test(normalizedPassword)
      ? findGuestsByPassword_(normalizedPassword)
      : null;
    const assignedGuestRows = normalizedPassword
      ? sheet.getRange(5, 2, Math.max(1, sheet.getLastRow() - 4), 1)
        .getDisplayValues().filter(([value]) => value.trim() === normalizedPassword).length
      : 0;
    return {
      row: rowNumber,
      hasName: Boolean(name.trim()),
      passwordIsFourDigits: /^\d{4}$/.test(normalizedPassword),
      lookupFound: Boolean(lookup),
      matchedGuestCount: lookup && !lookup.admin ? lookup.guests.length : 0,
      assignedGuestRows
    };
  });
  const diagnostic = {
    authBuild: AUTH_BUILD,
    configuredSpreadsheetId: spreadsheet.getId(),
    personalizationSheetExists: true,
    rows: results
  };
  Logger.log(JSON.stringify(diagnostic));
  return diagnostic;
}

function guestNameParts_(name) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') };
}

function sameGuestNames_(guestNames, guests) {
  if (!guests || guestNames.length !== guests.length) return false;
  return guestNames.every((name, index) =>
    name.trim().replace(/\s+/g, ' ')
      === `${guests[index].firstName} ${guests[index].lastName}`.trim().replace(/\s+/g, ' ')
  );
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

function ensureSummaryChangeTrigger_(spreadsheet) {
  const handler = 'refreshSummaryOnSpreadsheetChange_';
  const exists = ScriptApp.getProjectTriggers().some(trigger =>
    trigger.getHandlerFunction() === handler
    && trigger.getTriggerSourceId() === spreadsheet.getId()
  );
  if (!exists) {
    ScriptApp.newTrigger(handler).forSpreadsheet(spreadsheet).onChange().create();
  }
}

function refreshSummaryOnSpreadsheetChange_(event) {
  if (!['EDIT', 'REMOVE_ROW'].includes(event.changeType)) return;
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const responses = spreadsheet.getSheetByName(RESPONSES_SHEET);
  if (!responses) throw new Error(`The "${RESPONSES_SHEET}" sheet is missing.`);
  updateSummaryCounts_(responses, spreadsheet.getSheetByName(SUMMARY_SHEET));
}

function resultPage_(success, requestId, details) {
  const message = JSON.stringify({ type: 'rsvp-result', ok: success, requestId, ...details })
    .replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput(
    `<script>window.top.postMessage(${message}, '*');</script>`
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
