const express = require('express');
const router = express.Router();
const db = require('./db');
const config = require('./config/config.js')
const client = db.client;
const crypto = require('crypto');
const CryptoJS = require("crypto-js");
var strings = require("./lang/en.json");

const nodemailer = require('nodemailer');
const hasMailConfig = Boolean(config.GMAIL_PASS);
const transporter = hasMailConfig
  ? nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: config.ADMIN_EMAIL,
      pass: config.GMAIL_PASS,
    },
  })
  : null;

/*


   _____          _                    ______                _   _                 
  / ____|        | |                  |  ____|              | | (_)                
 | |    _   _ ___| |_ ___  _ __ ___   | |__ _   _ _ __   ___| |_ _  ___  _ __  ___ 
 | |   | | | / __| __/ _ \| '_ ` _ \  |  __| | | | '_ \ / __| __| |/ _ \| '_ \/ __|
 | |___| |_| \__ \ || (_) | | | | | | | |  | |_| | | | | (__| |_| | (_) | | | \__ \
  \_____\__,_|___/\__\___/|_| |_| |_| |_|   \__,_|_| |_|\___|\__|_|\___/|_| |_|___/
                                                                                   
                                                                                   

  Keywords (for easy searching): custom functions, custom, functions, funcs
*/
/**
 * Middleware for routes to require authentication
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
function authUser(req, res, next) {
  const userId = req.cookies?.u_id;

  if (userId && userId.trim().length > 0) {
    return next();
  }

  return forbidUser(res, req);
}

/**
 * Middleware- Ensure that the parameter in the URL is UUIDv4.
 * @param {*} paramName name of parameter.
 * @returns 
 */
const validateParam = (paramName) => (req, res, next) => {
  let uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  if (uuidRegex.test(req.params[paramName])) {
    return next();
  } else {
    return res.render('pages/404', { session: req.session, code: "Not Found", cookies: req.cookies });
  }
};
/**
 * Uses HTTP request to determine if the user is logged in.
 * @param {object} req ExpressJS API's HTTP request
 * @returns {boolean} true or false
 */
function isLoggedIn(req) {
  const uId = req.cookies?.u_id?.trim();
  return !!uId;
}

/**
 * Generates an object containing HTTP request cookies.
 * @param {object} req ExpressJS API request
 * @returns {object} Collected of cookies associated by request. Retrieve with object['key'].
 */
const getCookies = (req) => {

  // We extract the raw cookies from the request headers
  if (!req.headers.cookie) return {}; // <-- This should have been {} and not 'undefined', since {} has keys and 'undefined' does not. Causes errors down the line.
  const rawCookies = req.headers.cookie.split('; ');

  const parsedCookies = {};
  rawCookies.forEach(rawCookie => {
    const parsedCookie = rawCookie.split('=');
    // parsedCookie = ['myapp', 'secretcookie'], ['analytics_cookie', 'beacon']
    parsedCookies[parsedCookie[0]] = parsedCookie[1];
  });
  if (parsedCookies == undefined) {
    // Look in req.session? Is the value in there?
    req.session.forEach((value, key) => {
      parsedCookies[key] = value;
    });
  }
  return parsedCookies;
};

/**
 * Checks if the request is specifically an internal API call, or a browser making a request.
 * @param {object} req ExpressJS API request. 
 * @returns {boolean} true or false
 */
function apiEyesOnly(req) {
  if (req.headers['api-lh-call'] == 'api-lh-call') {
    // This is an internal call.
    return true;
  } else {
    return false;
  }
}


/**
 * Encrypts a string using AES encryption. DO NOT USE FOR PASSWORDS.
 * @param {String} text - The text to encrypt.
 * @param {String} passphrase - The passphrase to use for encryption.
 * @returns {String} The encrypted text.
 */
function encryptWithAES(text, passphrase = config.CRYPT_KEY) {
  return CryptoJS.AES.encrypt(text, passphrase).toString();
}

/**
 * Decrypts a string using AES encryption. DO NOT USE FOR PASSWORDS.
 * @param {String} ciphertext - The encrypted text to decrypt.
 * @param {String} passphrase - The passphrase to use for decryption.
 * @returns {String} The decrypted text.
 */
function decryptWithAES(ciphertext, passphrase = config.CRYPT_KEY) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase);
  try {
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (e) {
    return ciphertext; // <-- Might not be encrypted.
  }
}
/**
 * Renders a 403 error page.
 * @param {object} res ExpressJS API response.
 * @param {object} req ExpressJS API request.
 * @returns {*} An API response that serves an error 403 page.
 */
function forbidUser(res, req) {
  return res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
}
/**
 * Determines if the cookies' user ID matches whatevever string of text.
 * @param {object} req ExpressJS API's HTTP request object, in order to grab the user ID.
 * @param {string} arg The information that should match the user ID
 * @returns {boolean} true or false
 */
function idCheck(req, arg) {
  return getCookies(req)['u_id'] == arg;
}

/**
 * Determines if an input is a number or a UUID.
 * @param {*} input 
 * @returns {boolean} true or false.
 */
function isNumberOrUuid(input) {
  // Check if it's a number
  if (typeof input === "number") {
    return true;
  }

  // Check if it's a valid UUID using a regular expression
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(input);
}

/** Paginates an array.
  * @param a- The array you're paginating.
  * @param n- How many items per page.
  * @returns {Array} A paginated array
*/
function paginate(a, n) {
  // Make a new array object that will carry the paginated results.
  let b = new Array();
  // Iterate 
  for (i in a) {
    // Push an array that splices the original array from index 0 to however many items should be per page.
    b.push(a.splice(0, n));
  }
  // If there's a remainder, tack it on to the end.
  if (a.length > 0) b.push(a)
  return b;
}


/**
 * Renders a 404 error page.
 * @param {object} res ExpressJS API response.
 * @param {object} req ExpressJS API request.
 * @returns {*} An API response that serves an error 403 page.
 */
function lostPage(res, req) {
  return res.status(404).render('pages/404', { session: req.session, code: "Not Found", cookies: req.cookies });
}

/**
 * Renders an error page.
 * @param {Number} err Error Code.
 * @param {object} res ExpressJS API response.
 * @param {object} req ExpressJS API request.
 * @param {object} errorStack The error message (so the console shows it)
 * @returns {*} An API response that serves an error 403 page.
 */
function errorPage(err, res, req, errorStack) {
  console.error(errorStack)
  let page = err == 0 ? "error" : err; // If error code is 0, then do a general error page. Otherwise, use our code.
  try {
    return res.status(err).render(`pages/${page}`, { error: err, cookies: req.cookies, session: req.session });
  } catch (e) {
    // Wrong Error code.
    return res.status(err).render(`pages/error`, { error: err, cookies: req.cookies, session: req.session });
  }

}


function checkUUID(str) {
  let uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return uuidRegex.test(str);
}


function truncate(str, n) {
  return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
};



const parseIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',').shift()
    || req.socket?.remoteAddress;
}

function capitalise(s) {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function compareByGroup(a, b) {
  return a.group - b.group;
}
/**
 * @param {array} array The array of objects that contain a "group" property.
 * @returns {array} Array of objects separated by "group" property.
 */
const splitByGroup = (array) => {
  const groups = {};
  array.forEach((element) => {
    const group = element.group;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(element);
  });

  return Object.values(groups);
};
/**
 * Selects a random value from array
 * @param {array} arr Array to randomly select from. (This can be an array of anything, including mixed values.)
 * @returns {*} Random value from array.
 */
function randomise(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Creates a random integer from a specified range.
 * @param {number} min Minimum for range
 * @param {number} max MAximum for range
 * @returns {number} Randomised integer
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a token.
 * @param {number} n Length of token
 * @returns {string} token
 */
function generateToken(n) {
  const token = crypto.randomBytes(n).toString('hex');
  return token;
}

/**
 * Removes all HTML from a string
 * @param {string} str 
 * @returns {string} HTML-less string
 */
function stripHTML(str) {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sorts an array of data by date. Is in ascending order. use array.reverse() for descending.
 * @param {*} a 
 * @param {*} b 
 * @returns 
 */
function sortFunction(a, b) {
  var dateA = new Date(a.date).getTime();
  var dateB = new Date(b.date).getTime();
  return dateA > dateB ? 1 : -1;
};

/**
 * Turns an array into a list styled like the following: Item 1, Item 2, and Item 3
 * @param {array} arr 
 * @returns {string} string
 */
function makeString(arr) {
  if (arr.length === 1) return arr[0];
  const firsts = arr.slice(0, arr.length - 1);
  const last = arr[arr.length - 1];
  return firsts.join(', ') + ' and ' + last;
}

/**
* After getting .toString(), removes any extra ' characters at the beginning and end.
* @param {string} str 
* @returns {string} "Distilled" string.
*/
function distill(str) {
  if (str.charAt(0) == "\"") {
    str = str.substring(1);
  }
  if (str.charAt(0) == "'") {
    str = str.substring(1);
  }
  if (str.charAt(str.length - 1) == "\"") {
    str = str.substring(0, str.length - 1);
  }
  if (str.charAt(str.length - 1) == "'") {
    str = str.substring(0, str.length - 1);
  }
  return str
}

/**
 * Determines whether a number needs to end in "st", "nd", "rd", or "th"
 * @param {number} n 
 * @returns {string} suffix/ordinal of a number (number not included)
 */
function getOrdinal(n) {
  var s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}


/**
 * Turns a string to base64 (This isn't to save space; it's just to obfuscate)
 * @param {string} str The string
 * @returns {string} string in base 564
 */
function base64encode(str) {
  return Buffer.from(str).toString('base64')
}

/**
 * Turns a base64 string into a human readable one. (This isn't to save space; it's just to obfuscate)
 * @param {string} str The base64 string
 * @returns {string} The decoded string
 */
function base64decode(str) {
  return Buffer.from(str, "base64").toString()
}


/**
 * Turns an array into a truncated list
 * @param {Array} array Array to be truncated.
 * @param {Number} maxLength How many items before cut-off
 * @returns {String} Truncated array with "(x more)" at the end (x= Remainder of array)
 */
function truncateAndStringify(array, maxLength) {
  if (array.length <= maxLength) {
    return array.join(", ");
  }

  const truncatedArray = array.slice(0, maxLength);
  if (array.length - (maxLength + 1) <= 0) {
    return `${truncatedArray.join(", ")}`;
  } else {
    return `${truncatedArray.join(", ")}... (+${array.length - (maxLength)
      } more)`;
  }

}

/**
* Renders system lists as a nested list
* @param {Array} data the system dataset
* @param {Array} alters The users' alters.
* @returns {*} System in a nested List
*/
function renderNestedList(data, alters) {
  const processed = new Set(); // Track processed item IDs
  let altList = alters;
  function renderItem(item) {

    const hasChildren = data.some(child => child.parent === item.id);
    const listClass = hasChildren ? 'has-children' : '';
    const indent = item.parent ? '&nbsp; &nbsp; &nbsp; ' : '';

    if (processed.has(item.id)) {
      return ''; // Skip rendering if already processed
    }

    processed.add(item.id); // Mark item as processed

    let innerHTML = `
        <li class="${listClass}${indent == '' ? '' : ' subsys'}">
        <a class="dyn" href="/system/editsys/${item.id}"><i class="fa fa-pencil" aria-hidden="true"></i></a>
        <a href="/system/deletesys/${item.id}" name="${item.id}" class="dyn"><i class="fa fa-trash" aria-hidden="true"></i></a>
        <a href="/system/communal-journal?sys=${item.id}"><i class="fa fa-book" aria-hidden="true"></i></a>
        <span class="item-name"><a href="/system/${item.id}">${item.alias}</a></span>`;

    // Add icon
    if (item.icon) {
      innerHTML += `<img src="/img/svg/${item.icon}.svg" class="vvtinyimg">`
    }


    if (item.description !== null) {
      innerHTML += `<div class="subsys dyn"><small>${decryptWithAES(item.description)}</small></div>`
    }
    // Handle Alter list.
    let altArr = []
    altList.forEach((alt) => {
      if (alt.sys_id == item.id) {
        altArr.push(`${base64decode(alt.name)}`)
      }
    });

    if (altArr.length > 0) {
      innerHTML += `<div class="subsys dyn" style="font-style: italic;"><small>[[ALTERSCAP]]: ${truncateAndStringify(altArr, 5)}</small></div>`
    }

    // Now look for children.
    if (hasChildren) {
      const childData = data.filter(child => child.parent === item.id);
      innerHTML += childData.map(renderItem).join('\n');
    }

    innerHTML += `</li>`;
    return innerHTML;
    // End renderItem Function
  }

  // Call the recursive function on the root items (parent === null)
  return data.filter(item => item.parent === null).map(renderItem).join('\n');
}

/**
* Grabs all systems regstered under a user's account.
* @param {*} userID The user's ID
* @param {Object} res The ExpressJS response.
* @param {Object} req The ExpressJS HTTP request.
* @returns {Object} Array of systems.
*/
async function getSystems(userID, res, req) {
  let systems = await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [userID], res, req);
  return systems;
}

function getHourFormat(locale) {
  // Array of locales that typically use 12-hour format
  const twelveHourLocales = [
    'en-US', // United States
    'en-PH', // Philippines
    'en-AU', // Australia (informal)
    'en-NZ', // New Zealand (informal)
    'en-CA', // Canada (informal)
    // Add more locales as needed
  ];

  // Check if the supplied locale is in the array
  return twelveHourLocales.includes(locale);
}


function formatGMTToLocal(gmtTimestamp) {
  const date = new Date(gmtTimestamp);
  const userLocale = navigator.language || 'en-US';
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Determine if the locale uses 12-hour format
  const is12HourFormat = getHourFormat(userLocale);
  console.log(is12HourFormat);

  const localDateTimeString = date.toLocaleString(userLocale, {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: is12HourFormat // Use the determined hour format
  });

  return localDateTimeString;
}

/**
 * Generates a hashed password and an encrypted salt.
 * @param {string} plainTextPassword 
 * @returns {Object} An object containing the hashed password and the encrypted salt.
 */
function createPassword(plainTextPassword) {
  // TODO: Switch to bcrypt. I want to make a potential attacker McStruggle to get a password.
  const rawSalt = crypto.randomBytes(32).toString('hex');
  /* Everyone says this is jank but I don't see why...? This encryption key is not used by the rest of the app. 
  
  I know it's just to make passwords harder to guess against a rainbow table, but like... I dunno. I don't mind working a bit harder to obfuscate the salt. Hardly costs any performance, and it makes the salt more resistant to rainbow table attacks.

  But having said that... TODO: Pepper it too. I'll figure out a decent pepper. Getting a feeling there's other seasonings of password hashing, but idk what they are yet. This'll do for now. I don't think Lighthouse is gonna be some high value target since we don't have financial info or something.

  I'm gonna stop yapping, I got tasks at work to do ha.
  - Blue, Lighthouse System
  */
  const encryptedSalt = encryptWithAES(rawSalt, config.SALT_KEY);
  const passwordHash = CryptoJS.SHA3(plainTextPassword + rawSalt).toString();

  return {
    hash: passwordHash,
    salt: encryptedSalt
  };
}

/**
 * Uses nodemailer to send an email. 
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} data - The HTML content. (EJS template)
 * @returns {Promise<boolean>} - Resolves to true if sent, false if failure.
 */
async function sendEmail(to, subject, data) {
  const from = `"Lighthouse" <${config.ADMIN_EMAIL}>`;
  if (config.LOG_EMAIL) {
    console.log("------ Email dump ------\n",
      `From: ${from}\n`,
      `To: ${to}\n`,
      `Subject: ${subject}\n\n`,
      `${data}`
    );
  }
  if (!transporter) {
    console.warn('Email configuration is missing.');
    return false;
  }

  const mailOptions = {
    from,
    to,
    subject,
    html: data,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

module.exports = {
  isLoggedIn,
  getCookies,
  apiEyesOnly,
  encryptWithAES,
  decryptWithAES,
  forbidUser,
  lostPage,
  idCheck,
  isNumberOrUuid,
  paginate,
  checkUUID,
  truncate,
  parseIp,
  capitalise,
  getKeyByValue,
  compareByGroup,
  splitByGroup,
  randomise,
  getRandomInt,
  generateToken,
  stripHTML,
  sortFunction,
  makeString,
  distill,
  getOrdinal,
  base64encode,
  base64decode,
  truncateAndStringify,
  renderNestedList,
  getSystems,
  authUser,
  validateParam,
  errorPage,
  getHourFormat,
  formatGMTToLocal,
  createPassword,
  sendEmail
}