// app.config.js overrides app.json for dynamic values (env vars, etc.)
const { expo } = require('./app.json');

module.exports = {
  expo: {
    ...expo,
    android: {
      ...expo.android,
      // EAS Build writes the google-services.json from the secret file env var.
      // process.env.GOOGLE_SERVICES_JSON resolves to the file path on EAS builders.
      // Falls back to local file for development.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  },
};
