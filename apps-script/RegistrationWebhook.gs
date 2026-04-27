const REGISTRATION_SHEET_NAME = 'Registrations';
const VOLUNTEER_SHEET_NAME = 'Volunteers';
const SPREADSHEET_ID = '1bN_csCUQdPTpyXf1znjtxK-VfYe1pjRD_OfNUr71WVI';
const OWNER_EMAIL = 'gripsmartx4@gmail.com';
const DRIVE_FOLDER_ID = '1CMcseZKlsDI0vvBSYOqXLobWPw2wV_sT';

function doPost(e) {  
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const submissionType = inferSubmissionType_(payload);
    const spreadsheet = getSpreadsheet_();

    if (submissionType === 'volunteer') {
      validateVolunteerPayload_(payload);

      const volunteerSheet = getOrCreateSheet_(
        spreadsheet,
        VOLUNTEER_SHEET_NAME,
        [
          'Submitted At',
          'Full Name',
          'Phone',
          'Age',
          'Email',
          'College',
          'Preferred Role',
          'Reason',
          'Availability',
          'Source'
        ]
      );

      volunteerSheet.appendRow([
        new Date(),
        payload.fullName,
        payload.phone,
        payload.age,
        payload.email,
        payload.collegeName,
        payload.preferredRole,
        payload.reason,
        payload.availability,
        payload.source || 'website'
      ]);

      sendVolunteerOwnerEmail_(payload);
      sendVolunteerConfirmationEmail_(payload);
    } else {
      validateRegistrationPayload_(payload);

      const registrationSheet = getOrCreateSheet_(
        spreadsheet,
        REGISTRATION_SHEET_NAME,
        [
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
        ]
      );
      const upload = saveUploadIfPresent_(payload);

      registrationSheet.appendRow([
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

      sendRegistrationOwnerEmail_(payload, upload);
      sendRegistrationConfirmationEmail_(payload);
    }

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

function getSpreadsheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE') {
    throw new Error('Add your Google Sheet ID in SPREADSHEET_ID before using the webhook.');
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function inferSubmissionType_(payload) {
  if (payload.type) {
    return payload.type;
  }

  if (payload.fullName || payload.preferredRole || payload.availability) {
    return 'volunteer';
  }

  return 'registration';
}

function validateRegistrationPayload_(payload) {
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

function validateVolunteerPayload_(payload) {
  const requiredFields = [
    'fullName',
    'phone',
    'age',
    'email',
    'collegeName',
    'preferredRole',
    'availability'
  ];

  requiredFields.forEach((field) => {
    if (!payload[field]) {
      throw new Error('Missing required field: ' + field);
    }
  });
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
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

function sendRegistrationOwnerEmail_(payload, upload) {
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

function sendRegistrationConfirmationEmail_(payload) {
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
    '📱 Join our official WhatsApp group for match schedules, updates, and announcements:',
    'https://chat.whatsapp.com/EVUbFmVEDIM9jmK1ifx0KK',
    '',
    'We will contact you at this email address with the next steps.',
    '',
    'Team PlayRyze'
  ].join('\n');

  GmailApp.sendEmail(payload.captainEmail, subject, body);
}

function sendVolunteerOwnerEmail_(payload) {
  const subject = 'New Volunteer Application: ' + payload.fullName;
  const body = [
    'A new volunteer application has been submitted on the PlayRyze website.',
    '',
    'Full Name: ' + payload.fullName,
    'Phone: ' + payload.phone,
    'Age: ' + payload.age,
    'Email: ' + payload.email,
    'College: ' + payload.collegeName,
    'Preferred Role: ' + payload.preferredRole,
    'Availability: ' + payload.availability,
    'Reason: ' + (payload.reason || 'Not provided')
  ].join('\n');

  GmailApp.sendEmail(OWNER_EMAIL, subject, body);
}

function sendVolunteerConfirmationEmail_(payload) {
  const subject = 'PlayRyze Volunteer Application Received';
  const body = [
    'Hi ' + payload.fullName + ',',
    '',
    'Thanks for applying to volunteer with PlayRyze.',
    'We have received your application and will reach out with the next steps soon.',
    '',
    'Application summary:',
    'Preferred Role: ' + payload.preferredRole,
    'Availability: ' + payload.availability,
    'College: ' + payload.collegeName,
    '',
    '📱 Join our official WhatsApp group for event updates and volunteer briefings:',
    'https://chat.whatsapp.com/EVUbFmVEDIM9jmK1ifx0KK',
    '',
    'Team PlayRyze'
  ].join('\n');

  GmailApp.sendEmail(payload.email, subject, body);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}