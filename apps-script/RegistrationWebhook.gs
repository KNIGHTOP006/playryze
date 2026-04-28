const REGISTRATION_SHEET_NAME = 'Registrations';
const VOLUNTEER_SHEET_NAME = 'Volunteers';
const SPREADSHEET_ID = '1bN_csCUQdPTpyXf1znjtxK-VfYe1pjRD_OfNUr71WVI';
const OWNER_EMAIL = 'gripsmartx4@gmail.com';
const DRIVE_FOLDER_ID = '1CMcseZKlsDI0vvBSYOqXLobWPw2wV_sT';
const GALLERY_FOLDER_ID = 'PASTE_PUBLIC_GALLERY_FOLDER_ID_HERE';
const GALLERY_CATEGORY_DEFINITIONS = [
  { key: 'match-action', title: 'Match Action' },
  { key: 'champions', title: 'Champions' },
  { key: 'trophy-moments', title: 'Trophy Moments' },
  { key: 'previous-winners', title: 'Previous Winners' },
  { key: 'media-coverage', title: 'Media Coverage' }
];

function doPost(e) {  
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    if (payload.action === 'fixtures') {
      return getFixturesResponse_();
    }

    if (payload.action === 'gallery') {
      return getGalleryResponse_();
    }

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

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  
  if (action === 'fixtures') {
    return getFixturesResponse_();
  }

  if (action === 'gallery') {
    return getGalleryResponse_();
  }

  return jsonResponse_({ ok: true, message: 'PlayRyze webhook is live.' });
}

function getFixturesResponse_() {
  try {
    const spreadsheet = getSpreadsheet_();
    let sheet = spreadsheet.getSheetByName('Fixtures');

    if (!sheet) {
      return jsonResponse_({ ok: true, fixtures: [] });
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse_({ ok: true, fixtures: [] });
    }

    const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
    const fixtures = data.slice(1)
      .filter(row => row.some(cell => cell !== ''))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = String(row[i] || '').trim(); });
        const round = normalizeRound_(obj['round']);
        const group = String(obj['group'] || '').trim().toUpperCase();
        const status = normalizeStatus_(obj['status']);
        return {
          matchNo: obj['match_no'] || obj['match'] || '',
          round: round,
          group: group,
          teamA: obj['team_a'] || '',
          teamB: obj['team_b'] || '',
          scoreA: obj['score_a'] || '',
          scoreB: obj['score_b'] || '',
          time: obj['time'] || 'TBD',
          pitch: obj['pitch'] || 'TBD',
          status: status
        };
      });

    return jsonResponse_({ ok: true, fixtures: fixtures, updatedAt: new Date().toISOString() });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.message, fixtures: [], updatedAt: new Date().toISOString() });
  }
}

function getGalleryResponse_() {
  try {
    const folderId = GALLERY_FOLDER_ID;
    if (!folderId || folderId === 'PASTE_PUBLIC_GALLERY_FOLDER_ID_HERE') {
      return jsonResponse_({ ok: true, categories: [] });
    }

    const rootFolder = DriveApp.getFolderById(folderId);
    const folderMap = getGallerySubfolderMap_(rootFolder);
    const categories = GALLERY_CATEGORY_DEFINITIONS.map(function(definition) {
      var folder = folderMap[normalizeGalleryKey_(definition.key)] || folderMap[normalizeGalleryKey_(definition.title)];
      var items = folder ? getGalleryItemsFromFolder_(folder) : [];

      return {
        key: definition.key,
        title: definition.title,
        count: items.length,
        coverImageUrl: items.length ? items[0].imageUrl : '',
        coverFullImageUrl: items.length ? items[0].fullImageUrl : '',
        items: items
      };
    });

    return jsonResponse_({
      ok: true,
      categories: categories,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err.message || 'Failed to load gallery.',
      categories: [],
      updatedAt: new Date().toISOString()
    });
  }
}

function getGallerySubfolderMap_(rootFolder) {
  var folders = rootFolder.getFolders();
  var map = {};

  while (folders.hasNext()) {
    var folder = folders.next();
    map[normalizeGalleryKey_(folder.getName())] = folder;
  }

  return map;
}

function getGalleryItemsFromFolder_(folder) {
  var files = folder.getFiles();
  var items = [];

  while (files.hasNext()) {
    var file = files.next();
    var mimeType = String(file.getMimeType() || '');
    if (mimeType.indexOf('image/') !== 0) {
      continue;
    }

    ensureGalleryFileIsPublic_(file);

    items.push({
      id: file.getId(),
      name: file.getName(),
      updatedAt: file.getLastUpdated().toISOString(),
      imageUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600',
      fullImageUrl: 'https://drive.google.com/uc?export=view&id=' + file.getId(),
      alt: buildGalleryAlt_(file.getName())
    });
  }

  items.sort(function(a, b) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return items;
}

function normalizeGalleryKey_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureGalleryFileIsPublic_(file) {
  if (file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK ||
      file.getSharingPermission() !== DriveApp.Permission.VIEW) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
}

function buildGalleryAlt_(fileName) {
  return String(fileName || 'PlayRyze gallery image')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRound_(value) {
  const round = String(value || '').trim().toLowerCase();

  if (!round) return 'Group Stage';
  if (round === 'group' || round === 'group stage' || round === 'groups') return 'Group Stage';
  if (round === 'round 2' || round === 'round2' || round === 'round two') return 'Round 2';
  if (round === 'semi' || round === 'semi final' || round === 'semi finals' || round === 'semifinal' || round === 'semifinals') return 'Semi Final';
  if (round === 'final' || round === 'finals') return 'Final';

  return String(value).trim();
}

function normalizeStatus_(value) {
  const status = String(value || '').trim().toLowerCase();

  if (!status) return 'Upcoming';
  if (status === 'live' || status === 'ongoing' || status === 'in progress') return 'Live';
  if (status === 'done' || status === 'completed' || status === 'complete' || status === 'finished') return 'Done';

  return 'Upcoming';
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
    'Join our official WhatsApp group for event updates and volunteer briefings:',
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
