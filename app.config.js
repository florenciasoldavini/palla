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
  extra: {
    ...appJson.expo.extra,
    googleMapsConfigured: {
      ios: Boolean(process.env.GOOGLE_MAPS_IOS_API_KEY),
      android: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY)
    }
  },
  ios: {
    ...appJson.expo.ios,
    config: {
      ...appJson.expo.ios.config,
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY
    },
    associatedDomains: [`applinks:${shareHost}`],
    ...(process.env.APPLE_TEAM_ID
      ? { appleTeamId: process.env.APPLE_TEAM_ID }
      : {})
  },
  android: {
    ...appJson.expo.android,
    config: {
      ...appJson.expo.android.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }
    },
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
