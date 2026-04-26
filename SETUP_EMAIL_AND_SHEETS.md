# PlayRyze form automation

This site is a static HTML page, so the easiest backend is Google Apps Script.

## What this setup does

- sends a confirmation email to team registrations
- sends you a registration alert email
- saves team registrations into a `Registrations` sheet tab
- sends a confirmation email to volunteer applicants
- sends you a volunteer alert email
- saves volunteer applications into a separate `Volunteers` sheet tab
- optionally stores registration payment screenshots in Google Drive

## 1. Create the Google Sheet

1. Create a new Google Sheet.
2. Open `Extensions -> Apps Script`.
3. Replace the default script with the contents of `apps-script/RegistrationWebhook.gs`.

## 2. Configure the script

Edit these values near the top:

```js
const OWNER_EMAIL = 'your@email.com';
const DRIVE_FOLDER_ID = 'OPTIONAL_DRIVE_FOLDER_ID';
```

- Set `OWNER_EMAIL` to the inbox where you want the alerts.
- Set `DRIVE_FOLDER_ID` if you want registration screenshot uploads saved in Drive.
- If you do not need screenshot storage, leave `DRIVE_FOLDER_ID` as-is.

## 3. Deploy the script

1. Click `Deploy -> New deployment`.
2. Choose `Web app`.
3. Set:
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Deploy and copy the web app URL.

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

## Notes

- Google Apps Script email sending uses the Google account that owns the script.
- If you redeploy a new version of the web app, keep the latest URL in `index.html`.
- The registration form sends the uploaded screenshot as base64, so keep uploads reasonably small.
