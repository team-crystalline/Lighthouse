const config = require("./config.js")
const pjson = require("../package.json");
const tuning = require("../js/genVars.js");
var strings = require("../lang/en.json");
const langVar = require("../js/languages.js");
const {
  isLoggedIn,
  getCookies,
  apiEyesOnly,
  encryptWithAES,
  decryptWithAES,
  forbidUser,
  lostPage,
  idCheck,
  paginate,
  checkUUID,
  truncate,
  capitalise,
  getKeyByValue,
  splitByGroup,
  randomise,
  getRandomInt,
  generateToken,
  stripHTML,
  distill,
  getOrdinal,
  base64encode,
  base64decode,
  truncateAndStringify,
  renderNestedList,
  getHourFormat,
  formatGMTToLocal,
} = require("../funcs.js");
var pluralize = require("pluralize");

/*
app.locals.apiKey = config.apiKey;
*/
module.exports = {
  version: pjson.version,
  siteLanguage: langVar.siteLanguage,
  editorColours: tuning.editorColours,
  journalArr: splitByGroup(tuning.journals),
  journals: tuning.journals,
  dayNames: tuning.dayNames,
  monthNames: tuning.monthNames,
  skinGroups: tuning.skinGroups,
  strings,
  moods: tuning.moods,
  isLoggedIn,
  capitalise,
  randomise,
  truncate,
  encrypt: encryptWithAES,
  decrypt: decryptWithAES,
  paginate,
  pluralize,
  getHourFormat,
  truncateAndStringify,
  renderNestedList,
  boil: stripHTML,
  getOrdinal,
  distill,
  generateToken,
  encode: base64encode,
  decode: base64decode,
  // Helper functions
  isLoggedIn: (cookies) => !!cookies.u_id,
  pad: (num, digits) => String(num).padStart(digits, "0"),
  // Constants
  dateOptions: {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  },
  timeOptions: { hour: "2-digit", minute: "2-digit" },
  formatGMTToLocal,
  isDev: config.ENVIRONMENT === "dev",
  cloudflare_key: config.ENVIRONMENT == "dev" ? '1x00000000000000000000AA' : config.CLOUDFLARE_KEY
};
