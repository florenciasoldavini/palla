const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo
});
