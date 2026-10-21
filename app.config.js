const {
  origin: shareOrigin
} = require("./src/config/session-link-defaults.json");
const shareHost = new URL(
  process.env.EXPO_PUBLIC_SESSION_SHARE_URL || shareOrigin
).hostname;
const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    associatedDomains: [`applinks:${shareHost}`],
    ...(process.env.APPLE_TEAM_ID
      ? { appleTeamId: process.env.APPLE_TEAM_ID }
      : {})
  },
  android: {
    ...appJson.expo.android,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        category: ["BROWSABLE", "DEFAULT"],
        data: [{ scheme: "https", host: shareHost, path: "/session" }]
      }
    ],
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {})
  }
});
