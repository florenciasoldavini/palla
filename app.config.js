const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {})
  }
});
