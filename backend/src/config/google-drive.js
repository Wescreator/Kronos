const { google } = require('googleapis')

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id:   process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
})

const drive = google.drive({ version: 'v3', auth })

module.exports = drive