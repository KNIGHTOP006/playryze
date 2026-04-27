# PlayRyze form automation

This site is a static HTML page, so the easiest backend is Google Apps Script.

## What this setup does

- sends a confirmation email to team registrations
- sends you a registration alert email
- saves team registrations into a `Registrations` sheet tab
- sends a confirmation email to volunteer applicants
- sends you a volunteer alert email
- saves volunteer applications into a separate `Volunteers` sheet tab
- can optionally send WhatsApp confirmations through Twilio
- optionally stores registration payment screenshots in Google Drive

## 1. Create the Google Sheet

1. Create a new Google Sheet.
2. Open `Extensions -> Apps Script`.
3. Replace the default script with the contents of `apps-script/RegistrationWebhook.gs`.

## 2. Configure the script

Edit these values near the top:

```js
const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const OWNER_EMAIL = 'your@email.com';
const DRIVE_FOLDER_ID = 'OPTIONAL_DRIVE_FOLDER_ID';
const ENABLE_WHATSAPP = false;
const ADMIN_WHATSAPP_NUMBER = '';
const TWILIO_ACCOUNT_SID = 'PASTE_TWILIO_ACCOUNT_SID_HERE';
const TWILIO_AUTH_TOKEN = 'PASTE_TWILIO_AUTH_TOKEN_HERE';
const TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886';
const REGISTRATION_TEMPLATE_SID = 'PASTE_REGISTRATION_CONTENT_SID_HERE';
const VOLUNTEER_TEMPLATE_SID = 'PASTE_VOLUNTEER_CONTENT_SID_HERE';
```

- Set `SPREADSHEET_ID` to the ID from your Google Sheet URL.
- Set `OWNER_EMAIL` to the inbox where you want the alerts.
- Set `DRIVE_FOLDER_ID` if you want registration screenshot uploads saved in Drive.
- If you do not need screenshot storage, leave `DRIVE_FOLDER_ID` as-is.
- Set `ENABLE_WHATSAPP` to `true` only after Twilio is ready.
- Set `ADMIN_WHATSAPP_NUMBER` if you also want admin alerts on WhatsApp.
- Use approved Twilio WhatsApp template `ContentSid` values for registration and volunteer confirmations.

## 3. Deploy the script

1. Click `Deploy -> New deployment`.
2. Choose `Web app`.
3. Set:
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Deploy and copy the web app URL.

## 3b. Optional WhatsApp setup

1. Create a Twilio account and enable WhatsApp.
2. For testing, you can use the Twilio Sandbox for WhatsApp.
3. For live automated confirmations after form submission, create approved WhatsApp templates in Twilio.
4. Copy your:
   - `Account SID`
   - `Auth Token`
   - WhatsApp sender number in `whatsapp:+...` format
   - template `ContentSid` values
5. Paste them into `apps-script/RegistrationWebhook.gs`.
6. Set `ENABLE_WHATSAPP = true`.

## 4. Connect the website

In `index.html`, find:

```js
const REGISTRATION_WEBHOOK_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

Paste your web app URL there.

## 5. Test

1. Submit a team registration.
2. Confirm:
   - the captain gets a confirmation email
   - you get the admin email
   - the Google Sheet gets a new row in `Registrations`
3. Submit a volunteer application.
4. Confirm:
   - the volunteer gets a confirmation email
   - you get the admin email
   - the Google Sheet gets a new row in `Volunteers`
5. If WhatsApp is enabled, confirm the applicant also receives a WhatsApp message.

## Notes

- Google Apps Script email sending uses the Google account that owns the script.
- If you redeploy a new version of the web app, keep the latest URL in `index.html`.
- The registration form sends the uploaded screenshot as base64, so keep uploads reasonably small.
- WhatsApp business-initiated messages generally require an approved template. Twilio documents WhatsApp sending through the Messages resource, and their notification guide covers template-based sends outside the 24-hour window.
