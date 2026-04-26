const SHEET_NAME = 'Registrations';
const OWNER_EMAIL = 'your@email.com';
const DRIVE_FOLDER_ID = 'OPTIONAL_DRIVE_FOLDER_ID';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    validatePayload_(payload);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(spreadsheet, SHEET_NAME);
    const upload = saveUploadIfPresent_(payload);

    sheet.appendRow([
      new Date(),
      payload.teamName,
      payload.captainName,
      payload.captainPhone,
      payload.captainEmail,
      payload.collegeName,
      payload.teamSize,
      payload.playerNames,
      payload.ageVerified,
      payload.transactionId,
      upload ? upload.url : '',
      upload ? upload.name : '',
      payload.source || 'website'
    ]);

    sendOwnerEmail_(payload, upload);
    sendConfirmationEmail_(payload);

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message || 'Unexpected error'
    });
  }
}

function doGet() {
  return jsonResponse_({ ok: true, message: 'Registration webhook is live.' });
}

function validatePayload_(payload) {
  const requiredFields = [
    'teamName',
    'captainName',
    'captainPhone',
    'captainEmail',
    'collegeName',
    'teamSize',
    'playerNames'
  ];

  requiredFields.forEach((field) => {
    if (!payload[field]) {
      throw new Error('Missing required field: ' + field);
    }
  });
}

function getOrCreateSheet_(spreadsheet, name) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow([
      'Submitted At',
      'Team Name',
      'Captain Name',
      'Captain Phone',
      'Captain Email',
      'College',
      'Team Size',
      'Player Names',
      'Age Verified',
      'Transaction ID',
      'Screenshot URL',
      'Screenshot Filename',
      'Source'
    ]);
  }

  return sheet;
}

function saveUploadIfPresent_(payload) {
  if (!payload.screenshotBase64 || !payload.screenshotName || !DRIVE_FOLDER_ID || DRIVE_FOLDER_ID === 'OPTIONAL_DRIVE_FOLDER_ID') {
    return null;
  }

  const bytes = Utilities.base64Decode(payload.screenshotBase64);
  const blob = Utilities.newBlob(
    bytes,
    payload.screenshotMimeType || 'application/octet-stream',
    payload.screenshotName
  );

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);

  return {
    name: file.getName(),
    url: file.getUrl()
  };
}

function sendOwnerEmail_(payload, upload) {
  const subject = 'New PlayRyze Registration: ' + payload.teamName;
  const body = [
    'A new team has registered on the PlayRyze website.',
    '',
    'Team Name: ' + payload.teamName,
    'Captain Name: ' + payload.captainName,
    'Captain Phone: ' + payload.captainPhone,
    'Captain Email: ' + payload.captainEmail,
    'College: ' + payload.collegeName,
    'Team Size: ' + payload.teamSize,
    'Player Names: ' + payload.playerNames,
    'Age Verified: ' + (payload.ageVerified || 'Not provided'),
    'Transaction ID: ' + (payload.transactionId || 'Not provided'),
    'Screenshot: ' + (upload ? upload.url : 'Not uploaded')
  ].join('\n');

  GmailApp.sendEmail(OWNER_EMAIL, subject, body);
}

function sendConfirmationEmail_(payload) {
  const subject = 'PlayRyze Registration Received';
  const body = [
    'Hi ' + payload.captainName + ',',
    '',
    'Thanks for registering ' + payload.teamName + ' for PlayRyze.',
    'We have received your details and will review your payment confirmation shortly.',
    '',
    'Registration summary:',
    'Team Name: ' + payload.teamName,
    'College: ' + payload.collegeName,
    'Team Size: ' + payload.teamSize,
    'Transaction ID: ' + (payload.transactionId || 'Pending'),
    '',
    'We will contact you at this email address with the next steps.',
    '',
    'Team PlayRyze'
  ].join('\n');

  GmailApp.sendEmail(payload.captainEmail, subject, body);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
