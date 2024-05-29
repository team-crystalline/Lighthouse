
const express = require('express');
var bodyParser=require("body-parser");
var cookieParser = require('cookie-parser');
const session = require('cookie-session');
const path = require('path');
const PORT = process.env.PORT || 5000;
const CryptoJS = require("crypto-js");
const fs = require('fs');
var pdf = require("html-pdf");
const nodemailer = require('nodemailer');
const ejs = require('ejs');
var pluralize = require('pluralize');
var pjson = require('./package.json');
var flash = require('express-flash');

console.log( `${"-".repeat(10)}\n
 _^_
 |@|
=====
 #::
 #::
 #::
╦  ┬┌─┐┬ ┬┌┬┐┬ ┬┌─┐┬ ┬┌─┐┌─┐
║  ││ ┬├─┤ │ ├─┤│ ││ │└─┐├┤ 
╩═╝┴└─┘┴ ┴ ┴ ┴ ┴└─┘└─┘└─┘└─┘ v${pjson.version}\n${"-".repeat(10)}
𝑀𝒶𝒹𝑒 𝒷𝓎 𝒯𝒽𝑒 𝐿𝒾𝑔𝒽𝓉𝒽𝑜𝓊𝓈𝑒 𝒮𝓎𝓈𝓉𝑒𝓂
`);
const fileUpload = require('express-fileupload');

const tuning= require('./js/genVars.js');
var strings= require("./lang/en.json");
const langVar= require("./js/languages.js");
const db= require("./db");
const client = db.client;

const { start } = require('repl');

require('dotenv').config();
let dayNames= ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Back end Functions
function checkUUID(str){
	let uuidRegex= /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
	return uuidRegex.test(str);
}
function truncate (str, n){
	return (str.length > n) ? str.slice(0, n-1) + '...' : str;
  };

function encryptWithAES(text){
	const passphrase = process.env.cryptkey;
	return CryptoJS.AES.encrypt(text, passphrase).toString();
  }
   
  function decryptWithAES(ciphertext){
	const passphrase = process.env.cryptkey;
	const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase);
	const originalText = bytes.toString(CryptoJS.enc.Utf8);
	return originalText;
  }

  const parseIp = (req) =>{
	return req.headers['x-forwarded-for']?.split(',').shift()
|| req.socket?.remoteAddress;
}

function capitalise(s){
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
 * Generates an object containing HTTP request cookies.
 * @param {object} req ExpressJS API request
 * @returns {object} Collected of cookies associated by request. Retrieve with object['key'].
 */
const getCookies = (req) => {
 // We extract the raw cookies from the request headers
 if (!req.headers.cookie) return 'undefined';
 const rawCookies = req.headers.cookie.split('; ');

 const parsedCookies = {};
 rawCookies.forEach(rawCookie=>{
 const parsedCookie = rawCookie.split('=');
 // parsedCookie = ['myapp', 'secretcookie'], ['analytics_cookie', 'beacon']
  parsedCookies[parsedCookie[0]] = parsedCookie[1];
 });
 return parsedCookies;
};

var alterTypes=["Apparently Normal Part", "Emotional/Traumatised Part", "Younger Part", "Older Part",  "Introject (Factual)", "Introject (Fictional)", "Non-human", "Robot", "Animal", "Fragment", "Introject (Mixed)"]


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'dee_deyes@writelighthouse.com',
    pass: process.env.gmail_pass,
  },
});

/**
 * Selects a random value from array
 * @param {array} arr Array to randomly select from. (This can be an array of anything, including mixed values.)
 * @returns {*} Random value from array.
 */
function randomise (arr){
	return arr[Math.floor(Math.random()*arr.length)];
}

/**
 * Creates a random integer from a specified range.
 * @param {number} min Minimum for range
 * @param {number} max MAximum for range
 * @returns {number} Randomised integer
 */
function getRandomInt(min, max){
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * Uses HTTP request to determine if the user is logged in.
 * @param {object} req ExpressJS API's HTTP request
 * @returns {boolean} true or false
 */
function isLoggedIn(req){
  if (!req.cookies.u_id){
	return false;
  } else {
	return true;
  }
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
 * Determines if the cookies' user ID matches whatevever string of text.
 * @param {object} req ExpressJS API's HTTP request object, in order to grab the user ID.
 * @param {string} arg The information that should match the user ID
 * @returns {boolean} true or false
 */
function idCheck(req, arg){
	return getCookies(req)['u_id'] == arg;
	// return getCookies(req)['u_id']== req.session.u_id;
}
var splash;
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
function sortFunction(a,b){  
    var dateA = new Date(a.date).getTime();
    var dateB = new Date(b.date).getTime();
    return dateA > dateB ? 1 : -1;  
}; 

/**
 * Checks if the request is specifically an internal API call, or a browser making a request.
 * @param {object} req ExpressJS API request. 
 * @returns {boolean} true or false
 */
function apiEyesOnly(req) {
	if (req.headers['api-lh-call']) {
	   return true;
	} else {
	  return false;     
	}
  }

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
   * Cuts off a string at a specified length and appends "..." to the end to indicate more information.
   * @param {string} str String to truncate
   * @param {number} [n=16] index in which the string is cut off (Default: 16)
   * @returns {string} Truncated string
   */
  function truncate(str, n=16){
	return (str.length > n) ? str.slice(0, n-1) + '...' : str;
  };

  /**
   * After getting .toString(), removes any extra ' characters at the beginning and end.
   * @param {string} str 
   * @returns {string} "Distilled" string.
   */
  function distill(str){
	if (str.charAt(0) == "\""){
		str= str.substring(1);
	}
	if (str.charAt(0) == "'"){
		str= str.substring(1);
	}
	if (str.charAt(str.length-1) == "\""){
		str= str.substring(0, str.length - 1);
	}
	if (str.charAt(str.length-1) == "'"){
		str= str.substring(0, str.length - 1);
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
/** Paginates an array
  *@param a- The array you're paginating.
  *@param n- How many items per page.
*/
function paginate (a, n){
	// Make a new array object that will carry the paginated results.
	let b= new Array();
	// Iterate 
	for (i in a){
		// Push an array that splices the original array from index 0 to however many items should be per page.
		b.push(a.splice(0,n));
	}
	// If there's a remainder, tack it on to the end.
	if (a.length > 0) b.push(a)
	return b;
}
/**
 * Renders a 403 error page.
 * @param {object} res ExpressJS API response.
 * @param {object} req ExpressJS API request.
 * @returns {*} An API response that serves an error 403 page.
 */
function forbidUser(res, req){
	return res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
}

function lostPage(res, req){
	return res.status(404).render('pages/404',{ session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
}

/**
 * Turns a string to base64 (This isn't to save space; it's just to obfuscate)
 * @param {string} str The string
 * @returns {string} string in base 564
 */
function base64encode (str){
	return Buffer.from(str).toString('base64')
}

/**
 * Turns a base64 string into a human readable one. (This isn't to save space; it's just to obfuscate)
 * @param {string} str The base64 string
 * @returns {string} The decoded string
 */
function base64decode (str){
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
	if (array.length - (maxLength + 1) <= 0){
	  return `${truncatedArray.join(", ")}`;
	} else {
	  return `${truncatedArray.join(", ")}... (+${
		array.length - (maxLength + 1)
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
	let altList= alters;
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
		<a class="dyn" href="/editsys/${item.id}"><i class="fa fa-pencil" aria-hidden="true"></i></a>
		<a href="/deletesys/${item.id}" name="${item.id}" class="dyn"><i class="fa fa-trash" aria-hidden="true"></i></a>
		<a href="/system/communal-journal?sys=${item.id}"><i class="fa fa-book" aria-hidden="true"></i></a>
		<span class="item-name"><a href="/system/${item.id}">${Buffer.from(item.alias, "base64").toString()}</a></span>`;

	  if (item.icon){
		innerHTML += `<img src="/img/svg/${item.icon}.svg" class="vvtinyimg">`
	  }

	  // Handle Alter list.
	  let altArr=[]
	  altList.forEach((alt)=>{
		if (alt.sys_id == item.id){
			altArr.push(`${Buffer.from(alt.name, "base64").toString()}`)
		} 
	  });
	  if (altArr.length > 0){ 
		innerHTML += `<div class="subsys dyn" style="font-style: italic;"><small>[[ALTERSCAP]]: ${truncateAndStringify(altArr, 5)}</small></div>`
	  }
  
	  // Now look for children.
	  if (hasChildren) {
		const childData = data.filter(child => child.parent === item.id);
		innerHTML += childData.map(renderItem).join('\n');
	  }

	  innerHTML += `</li>`;
	  return innerHTML;
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
async function getSystems(userID, res, req){
	let systems= await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [userID], res, req);
	return systems;
}

  
  const apiRouter = require('./api');
  const systemRouter = require('./system');
  const alterRouter = require('./alter');
var app = express();

  app.use('/', express.static(__dirname + '/public'))
  app.use(session({
	name: "session",
	secure: true,
	secret: process.env.sec,
	resave: true,
	saveUninitialized: true,
    }));
	app.use(flash());
app.use(bodyParser.json()).use(bodyParser.urlencoded({extended: true}));
  app.use(cookieParser());
  app.use(fileUpload());
  app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
	});
	app.use(express.static(path.join(__dirname, "node_modules/tabulator-tables/dist/css")));
	app.use(express.static(path.join(__dirname, "node_modules/tabulator-tables/dist/js")));
	
	app.use((req, res, next) => {
		const theme = req.session.skin || getCookies(req)['skin'] || 'lighthouse';  // Set default if missing
		app.locals.theme = theme;
		next();
	  });
	

let monthNames=["January","February","March","April","May","June","July",
"August","September","October","November","December"];
// App Local Variables
app.locals.version= pjson.version;
app.locals.siteLanguage= langVar.siteLanguage;
app.locals.editorColours=tuning.editorColours;
app.locals.journalArr= splitByGroup(tuning.journals);
app.locals.journals= tuning.journals;
app.locals.skinGroups= tuning.skinGroups;
app.locals.strings=strings;
app.locals.apiKey= process.env.apiKey;
app.locals.moods=tuning.moods;
app.locals.isLoggedIn = function(cookies){
	if (!cookies.u_id){
	  return false;
	} else {
	  return true;
	}
  };
app.locals.pad= function (number, digits) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
}
app.locals.randomise= randomise;
app.locals.truncate= truncate;
app.locals.distill= distill;
app.locals.getOrdinal= getOrdinal;
app.locals.monthNames= monthNames;
app.locals.dayNames= dayNames;
app.locals.encrypt= encryptWithAES;
app.locals.decrypt= decryptWithAES;
app.locals.paginate = paginate;
app.locals.capitalise= capitalise;
app.locals.pluralize= pluralize;
app.locals.boil= stripHTML;
app.locals.generateToken= generateToken;
app.locals.encode= base64encode;
app.locals.decode= base64decode;
app.locals.dateOptions= {
	weekday: 'short',
	year: 'numeric',
	month: 'short',
	day: 'numeric',
}
app.locals.timeOptions={
	hour: '2-digit', 
    minute:'2-digit'
}
app.locals.truncateAndStringify= truncateAndStringify;
app.locals.renderNestedList = renderNestedList;

// Other routes 
// Mount API routes
app.use('/api', apiRouter);
app.use("/system", systemRouter);
app.use("/alter", alterRouter);


// ------ //
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs');

// Middleware...?
app.all('*', async function (req, res){
	// Loads before all other routes.
	if (isLoggedIn(req)){
		// Let's only grab the database if we need to.
			const userData= await db.query(client, "SELECT * FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
			let results= userData[0];
			try{
				req.session.u_id= results.id;
					req.session.is_legacy= results.is_legacy;
					req.session.username= results.username;
					req.session.email= results.email;
					req.session.skin= results.skin;
					req.session.system_term= truncate(results.system_term || getCookies(req)['system_term'] || "system",16);
					req.session.alter_term= truncate(results.alter_term || getCookies(req)['alter_term'] || "alter",16);
					req.session.subsystem_term= truncate(results.subsystem_term || getCookies(req)['subsystem_term'] || "subsystem",16);
					req.session.inner_worlds = results.inner_worlds || false;
					req.session.innerworld_term= truncate(results.innerworld_term || getCookies(req)['innerworld_term'] || "inner world",16);
					req.session.plural_term= truncate(results.plural_term || getCookies(req)['plural_term'] || "plural",16);
					req.session.language= results.language || "en";
					req.session.is_dev=([process.env.dev1, process.env.dev2,process.env.dev3].includes(results.id));
					req.session.textsize= results.textsize;
					req.session.worksheets_enabled= results.worksheets_enabled;
					req.session.font= results.font;
					req.session.glossary_enabled= results.glossary_enabled;

					// Now update strings to let it be what their language is.
					strings= require(`./lang/${req.session.language}.json`);
					app.locals.strings= strings;
			} catch (e){
				// They're likely logged out.
			}
			

	} else {
		req.session.alter_term= "alter";
		req.session.system_term= "system";
		req.session.subsystem_term="subsystem";
		req.session.innerworld_term= "inner world";
		req.session.plural_term= "plural";
		req.session.font="Lexend";
		strings= require(`./lang/en.json`);
	}
	
	req.next();
  });

 if (process.env.maintenance== "true"){
	// Maintenance mode on.
	app.use(function(req,res){
		return res.render(`pages/maintenance`, { session: req.session, cookies:req.cookies });
});
	
 }

  // PAGES- GET REQUEST



// Refactored!
  app.get('/', async function (req, res){
	// client, customQuery, customValues, res, req
	const count= await db.query(client, "SELECT COUNT(id) FROM users;", [], res, req);
	const donators= await db.query(client,"SELECT * FROM donators;", [], res, req);
	res.render(`pages/index`, { session: req.session, splash:splash, userCount:count[0].count, cookies:req.cookies, donators:donators });
  });

  // Refactored!
  app.get('/verify/:id', async function (req, res){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
		const userData= await db.query(client, "SELECT * FROM users WHERE id=$1;", [req.params.id], res,req);
		req.session.alter_term= userData[0].alter_term;
		req.session.system_term= userData[0].system_term;
		req.session.subsystem_term= userData[0].subsystem_term;
		req.session.loggedin = true;
		req.session.u_id= userData[0].id;
		req.session.username = Buffer.from(userData[0].username, 'base64').toString();
		req.session.is_legacy= userData[0].is_legacy;
		// Add to cookies
		res
		.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
		.cookie('username',  Buffer.from(userData[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
		.cookie('u_id', userData[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
		.cookie('alter_term', userData[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
		.cookie('system_term', userData[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
		.cookie('subsystem_term', userData[0].subsystem_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
		.cookie('is_legacy', userData[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
		.cookie('skin', userData[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });

		if (userData[0].verified == false){
			console.log("They aren't verified. Fixing this now.");
			const updateAcc=  query(client, "UPDATE users SET verified=true WHERE id=$1", [userData[0].id], res, req);
			updateAcc.then(response=>{
				res.render('pages/verify',{ session: req.session,splash:splash, cookies:req.cookies });
			})
			
		} else {
			req.flash("flash", strings.account.alreadyVerified);
			res.redirect("/")
		}
  });



  // Refactored!
  app.get('/safety-plan', async function(req, res){
	if (isLoggedIn(req)){
		if(apiEyesOnly(req)){
			const safetyPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
			var user={
						id: safetyPlan[0].user,
						name: getCookies(req)['username'],
						symptoms: decryptWithAES(safetyPlan[0].symptoms),
						safepeople: decryptWithAES(safetyPlan[0].safepeople),
						distractions: decryptWithAES(safetyPlan[0].distractions),
						keepsafe: decryptWithAES(safetyPlan[0].keepsafe),
						gethelp: decryptWithAES(safetyPlan[0].gethelp),
						grounding: decryptWithAES(safetyPlan[0].grounding)
					}
			// Read HTML Template
			let pdfType= req.headers.colour== "colour" ? "safetyplan-pdf-col.ejs" : "safetyplan-pdf-bw.ejs";
			ejs.renderFile(path.join(__dirname, './views/pages/', pdfType), {user: user}, (err, data) => {
				if (err) {
						return res.json({code: 404, msg: `Render File: ${err}`});
				} else {
					let dimensions= (req.headers.dimensions).split(",")
					let options = {
						childProcessOptions: {
							env: {
								OPENSSL_CONF: '/dev/null',
							},
							},
						"height": dimensions[0],
						"width": dimensions[1],
					};
					pdf.create(data, options).toFile(path.join(__dirname, './public/pdfs', `${req.headers.user}.pdf`), function (err, data) {
						if (err) {
							return res.json({code: 404, msg: `Generating: ${err}`});
						} else {
							return res.json({code: 200, download: `${req.headers.user}.pdf`});
						}
					});
				}
			});
			
		} else {
			if (!req.session.worksheets_enabled){
				// Make sure they have worksheets enabled.
				const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
				req.session.worksheets_enabled= wsEn[0].worksheets_enabled;
				if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
			}
				var plans;

				const safetyPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
				if (safetyPlan.length != 0){
					// Plan found
					try{
							plans= {
							symptoms: decryptWithAES(safetyPlan[0].symptoms),
							safepeople: decryptWithAES(safetyPlan[0].safepeople),
							distractions: decryptWithAES(safetyPlan[0].distractions),
							keepsafe: decryptWithAES(safetyPlan[0].keepsafe),
							gethelp: decryptWithAES(safetyPlan[0].gethelp),
							grounding: decryptWithAES(safetyPlan[0].grounding)
						}
					} catch (e){
						plans= null;
					}
				} else {
					// No plan. Make a plan.
					const planMake= await db.query(client, "INSERT INTO safetyplans (u_id) VALUES ($1);", [getCookies(req)['u_id']], res, req);
					plans=null;
				}
				res.render(`pages/safetyplan`, { session: req.session, splash:splash, cookies:req.cookies, safetyplan: plans});
			}	
	} else {forbidUser(res,req)}
	
});

// Refactored!
app.get('/safety-plan/edit', async function (req, res){
	if (isLoggedIn(req)){
		let plans;
		// Grab their safety plan
		const safetyPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
		
		if (safetyPlan.length ==0){
			// No plan. Make plan.
			const makePlan= await db.query(client, "INSERT INTO safetyplans (u_id) VALUES($1);", [getCookies(req)['u_id']], res, req);

			// Now grab the new one. This will execute AFTER the insert statement.
			const newPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
			// Generate the new plan.
			plans= {
				symptoms: decryptWithAES(newPlan[0].symptoms),
				safepeople: decryptWithAES(newPlan[0].safepeople),
				distractions: decryptWithAES(newPlan[0].distractions),
				keepsafe: decryptWithAES(newPlan[0].keepsafe),
				gethelp: decryptWithAES(newPlan[0].gethelp),
				grounding: decryptWithAES(newPlan[0].grounding)
			}
		} else {
			// They got a plan!
			try{
				plans= {
				symptoms: decryptWithAES(safetyPlan[0].symptoms),
				safepeople: decryptWithAES(safetyPlan[0].safepeople),
				distractions: decryptWithAES(safetyPlan[0].distractions),
				keepsafe: decryptWithAES(safetyPlan[0].keepsafe),
				gethelp: decryptWithAES(safetyPlan[0].gethelp),
				grounding: decryptWithAES(safetyPlan[0].grounding)
			}
			} catch (e){
				// If for WHATEVER reason we can't generate a plan.
				plans= {
					symptoms: "",
					safepeople: "",
					distractions: "",
					keepsafe: "",
					gethelp: "",
					grounding: ""
				}
			}
		}
		res.render(`pages/edit-safetyplan`, { session: req.session, splash:splash, cookies:req.cookies, safetyplan: plans});	
	} else {forbidUser(res,req)}
	
});

// Refactored!
app.get('/then-and-now', async function (req, res){
	if (isLoggedIn(req)){
	if (!req.session.worksheets_enabled){
		// Make sure they have worksheets enabled.
		const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
		if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
	}
	res.render(`pages/thenandnow`, { session: req.session, splash:splash, cookies:req.cookies});
	} else {forbidUser(res, req)}
	
});

// Refactored!
  app.get('/DES', async function (req, res){
	if (isLoggedIn(req)){
	if (!req.session.worksheets_enabled){
		// Make sure they have worksheets enabled.
		const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
		if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
	}
	res.render(`pages/des`, { session: req.session, splash:splash, cookies:req.cookies});
	} else {forbidUser(res, req)}
	
});

// Refactored!
app.get('/coaxing', async function (req, res){
	if (isLoggedIn(req)){
		if (!req.session.worksheets_enabled){
		// Make sure they have worksheets enabled.
		const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
		if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
	}
	res.render(`pages/coax-alters`, { session: req.session, splash:splash, cookies:req.cookies });	
	} else {forbidUser(res,req)}
	
})

// Refactored!
app.get('/bottle-letters',async function (req, res){
	if (isLoggedIn(req)){
		if (!req.session.worksheets_enabled){
		// Make sure they have worksheets enabled.
		const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
		if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
	}
	res.render(`pages/void-letters`, { session: req.session, splash:splash, cookies:req.cookies });	
	} else {forbidUser(res,req)}
	
})

// Refactored!
app.get('/54321', async function (req, res){
	if (isLoggedIn(req)){
		if (!req.session.worksheets_enabled){
		// Make sure they have worksheets enabled.
		const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
		if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
	}
	res.render(`pages/54321`, { session: req.session, splash:splash, cookies:req.cookies });	
	} else {forbidUser(res,req)}
	
})

 // No need to refactor
app.get('/tutorial', (req, res) => {
		res.render(`pages/tutorial`, { session: req.session, splash:splash, cookies:req.cookies});
	});

	// No need to refactor
app.get('/simply-plural', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/sp-import`, { session: req.session, splash:splash, cookies:req.cookies });
	} else {forbidUser(res,req)}
	});

	// No need to refactor
app.get('/combine/:item', (req, res) => {
	
	if (isLoggedIn(req)){
		let page;
		switch (req.params.item){
			case "alt":
			case "alts":
				page= "alts"
				break;
			default:
				page="alts";
				break; // May not need the break here but just in case.
		}
		res.render(`pages/combine-${page}`, { session: req.session, splash:splash, cookies:req.cookies });
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});

	// Refactored!
app.get('/worksheets', async function (req, res){
	if (isLoggedIn(req)){
		if (isLoggedIn(req)){
			if (!req.session.worksheets_enabled){
			// Make sure they have worksheets enabled.
			const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
			req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
			if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
		}
		res.render(`pages/worksheets`, { session: req.session, splash:splash, cookies:req.cookies });	
		} else {forbidUser(res,req)}
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
  });

  // Refactored!
  app.get('/forum/:id/new', async function(req, res){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		const forumData= await db.query(client, "SELECT * FROM forums WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
		let forumList= new Array();
		forumData.forEach(element=>{
			forumList.push({
				id: element.id,
				name: decryptWithAES(element.topic)
			})
		});
		res.render(`pages/create_topic`, { session: req.session, splash:splash, cookies:req.cookies, forumLisT: forumList });
		
	} else {forbidUser(res, req)}
	
  });

  
  app.get('/inner-world/:id', (req, res) => {
	// if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM inner_worlds WHERE u_id=$1 AND id=$2;",values: [getCookies(req)['u_id'], req.params.id]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			res.render(`pages/edit_innerworld`, { session: req.session, splash:splash, cookies:req.cookies,  iw: {
				id: result.rows[0].id,
				title: Buffer.from(result.rows[0].key, "base64").toString(),
				body: Buffer.from(result.rows[0].value, "base64").toString()
			  } });
		  }
		});
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });

  app.get('/search', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/search`, { session: req.session, splash:splash, cookies:req.cookies });
	splash=null;
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });

  app.get('/forum', (req, res) => {
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM categories WHERE u_id=$1 ORDER BY f_order, created_on ASC;",values: [getCookies(req)['u_id']]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			let categories= new Array();
			for (i in result.rows){
				categories.push({name: decryptWithAES(result.rows[i].name), desc: decryptWithAES(result.rows[i].description), icon: result.rows[i].icon, id: result.rows[i].id, order: result.rows[i].f_order});
			}
			// var forums= new Array();
			var forums = []; // Empty this array or create it.
			client.query({text: "SELECT * FROM forums WHERE u_id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				for (i in result.rows){
					forums.push(
						{
							name: decryptWithAES(result.rows[i].topic), 
							desc: decryptWithAES(result.rows[i].description), 
							cat_id: result.rows[i].cat_id, 
							id: result.rows[i].id
						});
						
					
				}
				res.render(`pages/forum`, { session: req.session, splash:splash, cookies:req.cookies, categories:categories, forums: forums });
						// console.log(i)
			  }
			  
			});
			
		  }
		});
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });
  app.get('/topic/:id/:pg?', (req, res)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "SELECT threads.*, forums.topic FROM threads INNER JOIN forums ON threads.topic_id= forums.id WHERE threads.u_id=$1 AND threads.id=$2;",values: [getCookies(req)['u_id'], req.params.id]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else { 
			// Here's the OP post
			/* issue */
			let originalPost = {
				id: result.rows[0].id,
				title: decryptWithAES(result.rows[0].title),
				body: decryptWithAES(result.rows[0].body),
				created_on: result.rows[0].created_on,
				alt_id: result.rows[0].alt_id,
				is_sticky: result.rows[0].is_sticky,
				is_popular: result.rows[0].is_popular,
				is_locked: result.rows[0].is_locked,
				forum_name: decryptWithAES(result.rows[0].topic),
				topic_id: result.rows[0].topic_id
			}
			client.query({text: "SELECT * FROM thread_posts WHERE thread_id=$1 ORDER BY created_on ASC;",values: [req.params.id]}, (err, aresult) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else { 
				// Replies
				let replyArr= new Array();
				for (i in aresult.rows){
					replyArr.push({
						body: decryptWithAES(aresult.rows[i].body), 
						alt_id: aresult.rows[i].alt_id, 
						created_on: aresult.rows[i].created_on, 
						id: aresult.rows[i].id
					});
				}
				// console.log(`${replyArr.length} replies.`);
				var replyPages= paginate(replyArr, 15);
				var finalPage= replyPages.length;
				if (req.params.pg){
					if (req.params.pg > finalPage) req.params.pg = finalPage;
					if (req.params.pg < 1) req.params.pg = 1;
				}
				replyArr= replyPages[req.params.pg-1 || 0];
				
				// console.log(`Post pagination: ${replyArr.length} replies loading.`);
				client.query({text: `
				SELECT alters.*, alters.alt_id AS "altid", systems.sys_alias, alter_moods.* FROM alters 
				INNER JOIN systems ON alters.sys_id = systems.sys_id 
				LEFT OUTER JOIN alter_moods ON alters.alt_id = alter_moods.alt_id 
				WHERE systems.user_id=$1`,values: [`${getCookies(req)['u_id']}`]}, (err, bresult) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
				  } else { 
					// Get alters
					let alterArr = new Array();
					
					for (i in bresult.rows){
						alterArr.push({
								id: bresult.rows[i].altid,
								name: Buffer.from(bresult.rows[i].name, "base64").toString(),
								pronouns: bresult.rows[i].pronouns?  Buffer.from(bresult.rows[i].pronouns, "base64").toString() : null,
								type: bresult.rows[i].type,
								avatar: Buffer.from(bresult.rows[i].img_url, "base64").toString() || "",
								sys_alias: bresult.rows[i].sys_alias== null ? "Null" : Buffer.from(bresult.rows[i].sys_alias, "base64").toString(),
								is_archived: bresult.rows[i].is_archived,
								img_blob: bresult.rows[i].img_blob,
								mimetype: bresult.rows[i].blob_mimetype,
								colour: bresult.rows[i].colour,
								mood: bresult.rows[i].mood,
								reason: bresult.rows[i].reason ? decryptWithAES(bresult.rows[i].reason) : null
							})

					}
					client.query({text: "SELECT * FROM forums WHERE u_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, cresult) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
					  } else {
						let forumArr= new Array();
						for (i in cresult.rows){
							forumArr.push({id: cresult.rows[i].id, topic: decryptWithAES(cresult.rows[i].topic), description: decryptWithAES(cresult.rows[i].description)})
						}
						res.render(`pages/thread`, { session: req.session, splash:splash, cookies:req.cookies, originalPost: originalPost, replyArr: replyArr, alterArr:alterArr, forumArr: forumArr, finalPage:finalPage, topic: req.params.id, currPage: req.params.pg || 1});					
					  }
					});
				  }
				  
				});
				
			  }
			});
		}
		  });
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });

  app.get('/reply/:id', async function (req, res){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		let threadInfo = await db.query(client, "SELECT thread_posts.*, threads.u_id FROM thread_posts INNER JOIN threads ON thread_posts.thread_id = threads.id WHERE thread_posts.id=$1", [`${req.params.id}`], res, req);
		if (!idCheck(req, threadInfo[0].u_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
		res.render(`pages/edit_reply`, { session: req.session, splash:splash, cookies:req.cookies, chosenReply: {id: threadInfo[0].id, body: decryptWithAES(threadInfo[0].body), alt_id: threadInfo[0].alt_id, thread_id: threadInfo[0].thread_id}});
		
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });
  
  app.get('/forum/:id/:pg?', async function (req, res) {
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		try{
			// Get Forum Name
		let forumInfo = await db.query(client, "SELECT * FROM forums WHERE u_id=$1 AND id=$2;", [getCookies(req)['u_id'], req.params.id], res, req);
		let topicInfo= await db.query(client, 'SELECT threads.*, alters.name AS "alt_name" FROM threads INNER JOIN alters ON alters.alt_id = threads.alt_id WHERE threads.u_id=$1 AND topic_id=$2  ORDER BY created_on DESC;', [getCookies(req)['u_id'], req.params.id], res, req);
		let topics= new Array();
		topicInfo.forEach((topic)=>{
			topics.push({
				name: decryptWithAES(topic.title), 
				preview: decryptWithAES(topic.body), 
				alt_id: topic.alt_id, 
				is_sticky: topic.is_sticky, 
				is_locked: topic.is_locked, 
				is_popular: topic.is_popular, 
				created_on: topic.created_on, 
				id: topic.id, 
				alter: Buffer.from(topic.alt_name, "base64").toString(),
				topic_id: topic.topic_id
			})
		});
		let blurryThreads= await db.query(client, "SELECT * from threads WHERE u_id=$1 AND alt_id is null AND topic_id=$2 ORDER BY created_on DESC;", [getCookies(req)['u_id'], req.params.id], res, req);
		blurryThreads.forEach((topic)=>{
			topics.push({
				name: decryptWithAES(topic.title), 
				preview: decryptWithAES(topic.body), 
				alt_id: null, 
				is_sticky: topic.is_sticky, 
				is_locked: topic.is_locked, 
				is_popular: topic.is_popular, 
				created_on: topic.created_on, 
				id: topic.id, 
				alter: "Blurry",
				topic_id: topic.topic_id
			})
		});
		topics.sort(sortFunction).reverse();
		let topicArr= paginate(topics, 25);
		let categoryInfo = await db.query(client, "SELECT * FROM categories WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
		let catArr= new Array();
		categoryInfo.forEach((cat)=>{
			catArr.push({
				id: cat.id,
				name: decryptWithAES(cat.name)
			})
		});
		res.render(`pages/topics`, { session: req.session, cookies:req.cookies, topics:topicArr[req.params.pg -1 || 0], forumName: decryptWithAES(forumInfo[0].topic), forumDesc: decryptWithAES(forumInfo[0].description), forumid: forumInfo[0].id, catArr: catArr, topicPages: topicArr.length, currPage: req.params.pg || 1, forum: req.params.id });
		} catch (e){
			res.status(404).render('pages/404',{ session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
		}
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });
  app.get('/mod', (req, res) => {
	// console.log(req.socket.remoteAddress);
	if (isLoggedIn(req)){
		if ([process.env.dev1, process.env.dev2, process.env.dev3].includes(getCookies(req)['u_id'])){
			res.render(`pages/mod-panel`, { session: req.session, splash:splash, cookies:req.cookies });
		} else {
			var mailOptions = {
				from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
				to: 'dee_deyes@writelighthouse.com',
				subject: `Unauthorised attempt to access mod panel.`,
				html: `<p>A user has attempted to enter the mod panel!</p><p>User: ID: ${getCookies(req)['u_id'] || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
			  };
		
			  transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
				  return console.log(error);
				}
			  });
			console.log(`An attempt to enter the mod panel was made.\n Attempt made by: ${getCookies(req)['u_id'] || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"}. IP Address: ${req.socket.remoteAddress}`);
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
			}
	} else {
		var mailOptions = {
			from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
			to: 'dee_deyes@writelighthouse.com',
			subject: `Unauthorised attempt to access mod panel.`,
			html: `<p>A user has attempted to enter the mod panel!</p><p>User: ID: ${getCookies(req)['u_id'] || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
		  };
	
		  transporter.sendMail(mailOptions, (error) => {
			if (error) {
			  return console.log(error);
			}
		  });
		console.log(`An attempt to enter the mod panel was made.\n Attempt made by: ${getCookies(req)['u_id'] || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"}. IP Address: ${req.socket.remoteAddress}`);
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}
	
  });
  app.get('/bda', async function (req, res){
	if (isLoggedIn(req)){
		if (apiEyesOnly(req)){
			try{
				const bdaPlans= await db.query(client, "SELECT * FROM bda_plans WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
				const planArr= new Array();
				bdaPlans.forEach(element=>{
					planArr.push({id: element.id, before: decryptWithAES(element.before), during: decryptWithAES(element.during), after: decryptWithAES(element.after), is_active:element.is_active, alias: decryptWithAES(element.alias), timestamp: element.timestamp});
				});
				return res.status(200).json({code:200, body: planArr});
			} catch (e){
				console.log(e)
				return res.status(400).json({code:400})
			}
		} else {
			if (!req.session.worksheets_enabled){
					// Make sure they have worksheets enabled.
					const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
					req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
					if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, splash:splash, cookies:req.cookies });
				}
			res.render(`pages/bda`, { session: req.session, splash:splash, cookies:req.cookies });
			
		}
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });

  app.get('/bda/edit/:id', (req, res) => {
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM bda_plans WHERE id=$1",values: [req.params.id]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			var plan= {
				id: result.rows[0].id,
				name: decryptWithAES(result.rows[0].alias),
				before: decryptWithAES(result.rows[0].before),
				during: decryptWithAES(result.rows[0].during),
				after: decryptWithAES(result.rows[0].after)
			}
			res.render(`pages/edit-bda`, { session: req.session, splash:splash, cookies:req.cookies, plan:plan });
		  }
		});
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
});


  app.get("/pluralkit", (req, res)=> {
	if (isLoggedIn(req)){
		res.render(`pages/pluralkit`, { session: req.session, splash:splash, cookies:req.cookies, lang:req.acceptsLanguages()[0] });
	}
  });


  app.get('/changelog', (req, res) => {
	client.query({text: "SELECT * FROM changelog ORDER BY date DESC LIMIT 50",values: []}, (err, result) => {
		if (err) {
		  console.log(err.stack);
		  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
	  } else {
		res.render(`pages/changelog`, { session: req.session, splash:splash, cookies:req.cookies, changes:result.rows, lang:req.acceptsLanguages()[0] });
	  }
  });

});

// Refactored!
app.get('/glossary', async function(req, res){
	const terms= await db.query(client, "SELECT * FROM glossary ORDER BY term ASC;", [], res, req);
		
	if (isLoggedIn(req)){
		const glossEn= await db.query(client, "SELECT glossary_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);

		if (glossEn[0].glossary_enabled == false){
			// Show the disabled page.
			return res.render(`pages/glossary-disabled`, { session: req.session, splash:splash, cookies:req.cookies, });
		}
	}
	res.render(`pages/glossary`, { session: req.session, splash:splash, cookies:req.cookies, terms:terms, lang:req.acceptsLanguages()[0] });
}); 

app.get('/philosophy', (req, res, next) => { res.render(`pages/phil`, { session: req.session, splash:splash, cookies:req.cookies })});
  

app.get('/about', (req, res, next) => {
      res.render(`pages/about`, { session: req.session, splash:splash, cookies:req.cookies });
  });

  app.get('/tos', (req, res) => {
	res.render(`pages/tos`, { session: req.session, splash:splash, cookies:req.cookies });
});

app.get('/privacypolicy', (req, res) => {
	res.render(`pages/privacypolicy`, { session: req.session, splash:splash, cookies:req.cookies });
});

  app.get('/todos', (req, res, next) => {
      res.render(`pages/todos`, { session: req.session, splash:splash,cookies:req.cookies });
      splash=null;
  });
  app.get('/crisis', (req, res, next) => {
      res.render(`pages/crisis`, { session: req.session, splash:splash,cookies:req.cookies });
      splash=null;
  });
  app.get('/signup', (req, res, next) => {
	res.render(`pages/signup`, { session: req.session, splash:splash,cookies:req.cookies });
  });

  app.get('/login', (req, res) => {
	// Bookmark: login page
	// req.flash('info', 'Welcome');
      res.render(`pages/login`, { session: req.session, splash:splash,cookies:req.cookies });

  });
  app.get('/cookies', (req, res, next) => {
      res.render(`pages/cookies`, { session: req.session, splash:splash,cookies:req.cookies });
      splash=null;
  });

  app.get('/forgot-password', (req, res, next) => {
      res.render(`pages/forgot_pass`, { session: req.session, splash:splash,cookies:req.cookies });
      splash=null;
  });

  app.get('/logout', (req, res)=>{
     
	 try{
		splash= req.flash("flash", strings.account.loggedout);
		//  req.session.destroy();
		req.session= null;
	 } catch(e){
	 }
	
		try{
		res.clearCookie('loggedin');
		} catch(e){
		console.log("Didn't have that cookie.")
		}
		try{
		res.clearCookie('username');
		} catch(e){
		console.log("Didn't have that cookie.")
		}
		try{
		res.clearCookie('u_id');
		} catch(e){
		console.log("Didn't have that cookie.")
		}
		try{
		res.clearCookie('system_term');
		} catch(e){
		console.log("Didn't have that cookie.")
		}
		try{
		res.clearCookie('subsystem_term');
		} catch(e){
		console.log("Didn't have that cookie.")
		}
		try{
			res.clearCookie('innerworld_term');
			} catch(e){
			console.log("Didn't have that cookie.")
			}
			try{
				res.clearCookie('plural_term');
				} catch(e){
				console.log("Didn't have that cookie.")
				}
		try{
		res.clearCookie('alter_term');
		} catch(e){
		console.log("Didn't have that cookie.")
		}
		try{
		res.clearCookie('is_legacy');
		} catch(e){
			console.log("Didn't have that cookie.")
		}
		try{
			res.clearCookie('skin');
			} catch(e){
				console.log("Didn't have that cookie.")
			}
			try{
				res.clearCookie('textsize');
				} catch(e){
					console.log("Didn't have that cookie.")
				}
     res.redirect("/");
  });


  app.get('/reset/:id', (req, res)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
     res.render("pages/new_pass", {session: req.session, splash:splash, cookies:req.cookies});

  });

  app.get('/wish', (req, res) => {
	var filledWishes= [];
	var wishArr= [];
	if (isLoggedIn(req)){
		client.query({text:'SELECT * FROM wishlist WHERE user_id=$1 AND is_filled=false;', values: [getCookies(req)['u_id']]}, (err, result)=>{
			if (err){
				console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			}
			for (i in result.rows){
				wishArr.push({text: decryptWithAES(result.rows[i].wish), checked:result.rows[i].is_filled, uuid: result.rows[i].uuid});
			}

			client.query({text:'SELECT * FROM wishlist WHERE user_id=$1 AND is_filled=true;', values: [getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				}
				for (i in result.rows){
					filledWishes.push({text: decryptWithAES(result.rows[i].wish), checked:result.rows[i].is_filled, uuid: result.rows[i].uuid});
				}	
				res.render(`pages/wishlist`, { session: req.session, splash:splash,cookies:req.cookies, wishArr:wishArr, filledWishes:filledWishes });
				splash=null;
			});
			
		});
		
	}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
});

app.get('/wish/:id', (req, res) => {
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text:'UPDATE wishlist SET is_filled=true WHERE uuid=$1', values: [`${req.params.id}`]}, (err, result)=>{
			if (err){
				console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			}
			splash= req.flash("flash", strings.wish.granted);
			res.redirect("/wish");
		});
		
	}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
});

app.get('/wish-d/:id', (req, res) => {
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text:'DELETE FROM wishlist WHERE uuid=$1', values: [`${req.params.id}`]}, (err, result)=>{
			if (err){
				console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			}
			splash=req.flash("flash", strings.wish.deleted);
			
		});
		res.redirect("/wish");
		
	}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
});

	app.get('/inner-world', (req, res, next) => {
		if (isLoggedIn(req)){
			client.query({text:'SELECT * FROM inner_worlds WHERE u_id=$1', values: [getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					req.session.innerworld_rows = result.rows;
					client.query({text:'SELECT * FROM users WHERE id=$1', values: [getCookies(req)['u_id']]}, (err, bresult)=>{
						if (err){
							console.log(err.stack);
							res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.session.innerworld = bresult.rows[0].inner_worlds || false;
							res.render(`pages/innerworld`, { session: req.session, splash:splash,cookies:req.cookies});
						}
						
					});
				}
				
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});

	app.get('/rules', (req, res, next) => {
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM sys_rules WHERE u_id=$1 ORDER BY created DESC;", values:[getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					req.session.sys_rules=result.rows;
				}
				res.render(`pages/sys_rules`, { session: req.session, splash:splash,cookies:req.cookies });
				splash=null;
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});

	
	app.get('/inner-world/delete/:id', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM inner_worlds WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				req.session.sys_rules= null;
			}
			res.redirect("/inner-world");
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});

  app.get('/editsys/:alt', (req, res, next)=>{
	if (!checkUUID(req.params.alt)) return;
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM systems WHERE sys_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				req.session.chosenSys= result.rows[0];
				client.query({text: "SELECT alters.name, alters.alt_id, alters.sys_id, systems.sys_alias FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
					if (err) {
	  				console.log(err.stack);
	  				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					// console.table(result.rows);
					req.session.alters = result.rows;
				  res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys, alters: result.rows,cookies:req.cookies });
				}
				});
			}
			// res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys });
		  });
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	  // res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.params.alt });
  });

  app.get('/deletesys/:alt', async (req, res)=>{
	// if (!checkUUID(req.params.alt)) return;
	  if (isLoggedIn(req)){
		try{
			const systemDat = await db.query(client, "SELECT * FROM systems WHERE sys_id=$1 AND user_id=$2", [`${req.params.alt}`, getCookies(req)['u_id']], res, req);
			req.session.chosenSys = systemDat[0];
			res.render(`pages/delete_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys,cookies:req.cookies });
		} catch(e){
			lostPage(res, req)
		}
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	  // res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.params.alt });
  });

  app.get('/clearalter', (req, res, next)=>{
	  req.session.journalUser= null;
		res.redirect('/system');
  });

  app.get('/system-data', async function (req, res, next){
	if (isLoggedIn(req)){
		if (apiEyesOnly(req)){
			if (req.headers.grab== "comm-posts"){
				// Communal Journal Posts.
				// In case: "AND subsys_id IS NULL"
				client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  splash= req.flash("flash", "Our database hit an error.");
					  res.status(400).json({code: 400});
				  } else {
					var sysArr = new Array();
					for (i in result.rows){
						sysArr.push({ sys_id: result.rows[i].sys_id, alias: Buffer.from(result.rows[i].sys_alias, "base64").toString(), icon:result.rows[i].icon, subsys: result.rows[i].subsys_id});
					}
					client.query({text: "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false ORDER BY created_on DESC;",values: [`${getCookies(req)['u_id']}`]}, (err, cresult) => {
						if (err) {
						  console.log(err.stack);
						  splash= req.flash("flash", "Our database hit an error.");
						  res.status(400).json({code: 400});
					  } else {
						var nonPinned= new Array();
						for (i in cresult.rows){
							nonPinned.push({ title: decryptWithAES(cresult.rows[i].title), body: decryptWithAES(cresult.rows[i].body),  created_on: cresult.rows[i].created_on, id: cresult.rows[i].id})
						}
						client.query({text: "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=true ORDER BY created_on DESC;",values: [`${getCookies(req)['u_id']}`]}, (err, dresult) => {
							if (err) {
							  console.log(err.stack);
							  splash= req.flash("flash", "Our database hit an error.");
							  res.status(400).json({code: 400});
						  } else {
							var isPinned= new Array();
						for (i in dresult.rows){
							isPinned.push({ title: decryptWithAES(dresult.rows[i].title), body: decryptWithAES(dresult.rows[i].body),  created_on: dresult.rows[i].created_on, id: dresult.rows[i].id})
						}

							// var currPage= paginate(nonPinned,2);
							res.json({code: 200, sysArr: sysArr, nonPinned: nonPinned, isPinned: isPinned});
						  }
						});
					  }
					});
				  }
				});
			} else if (req.headers.grab == "alters"){
				// Fetch alters
				let altInfo = await db.query(client, "SELECT * FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id=$1;", [`${getCookies(req)['u_id']}`], res, req);
				let resArr= new Array();
				altInfo.forEach((alt)=>{
					resArr.push({
						alt_id: alt.alt_id, 
						sys_id: alt.sys_id, 
						name: (alt.name != null ? Buffer.from(alt.name, "base64").toString() : null), 
						acc: (alt.acc != null ? Buffer.from(alt.acc, "base64").toString() : null), 
						agetext: (alt.agetext != null ? Buffer.from(alt.agetext, "base64").toString() : null), 
						birthday: (alt.birthday != null ? Buffer.from(alt.birthday, "base64").toString() : null), 
						dislikes: (alt.dislikes != null ? Buffer.from(alt.dislikes, "base64").toString() : null), 
						first_noted: (alt.first_noted != null ? Buffer.from(alt.first_noted, "base64").toString() : null), 
						fronttells: (alt.fronttells != null ? Buffer.from(alt.fronttells, "base64").toString() : null), 
						gender:(alt.gender != null ? Buffer.from(alt.gender, "base64").toString() : null), 
						img_url: (alt.img_url != null ? Buffer.from(alt.img_url, "base64").toString() : null), 
						job: (alt.job != null ? Buffer.from(alt.job, "base64").toString() : null), 
						likes: (alt.likes != null ? Buffer.from(alt.likes, "base64").toString() : null), 
						sexuality:(alt.sexuality != null ? Buffer.from(alt.sexuality, "base64").toString() : null), 
						source: (alt.source != null ? Buffer.from(alt.source, "base64").toString() : null), 
						sys_alias: Buffer.from(alt.sys_alias, "base64").toString(), 
						triggers_neg: (alt.triggers_neg != null ? Buffer.from(alt.triggers_neg, "base64").toString() : null), 
						triggers_pos: (alt.triggers_pos != null ? Buffer.from(alt.triggers_pos, "base64").toString() : null), 
						type: alt.type, 
						wants: (alt.wants != null ? Buffer.from(alt.wants, "base64").toString() : null), 
						pronouns: (alt.pronouns != null ? Buffer.from(alt.pronouns,"base64").toString() : null),
						relationships: (alt.relationships != null ? Buffer.from(alt.relationships,"base64").toString() : null),
						notes: (alt.notes != null ? Buffer.from(alt.notes,"base64").toString() : null),
						safe_place: (alt.safe_place != null ? Buffer.from(alt.safe_place,"base64").toString() : null),
						is_archived: alt.is_archived,
						img_blob: alt.img_blob != null ? Buffer.from(alt.img_blob).toString("base64") : null,
						blob_mimetype: alt.blob_mimetype
					});
				});
				res.status(200).json({code: 200, search: resArr});
			} else if (req.headers.grab== "journals"){
				client.query({text: "SELECT systems.sys_id, alters.name, alters.is_archived, journals.j_id FROM alters INNER JOIN systems ON systems.sys_id= alters.sys_id INNER JOIN journals ON journals.alt_id = alters.alt_id WHERE systems.user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, aresult) => {
					if (err) {
					  console.log(err.stack);
					  req.flash("Our database hit an error.");
					  res.status(400).json({code: 400});
				  } else {
					let journalArr= new Array();
					for (i in aresult.rows){
						journalArr.push({j_id: aresult.rows[i].j_id, sys_id: aresult.rows[i].sys_id, name: Buffer.from(aresult.rows[i].name, "base64").toString(), is_archived: aresult.rows[i].is_archived})
					}
					res.status(200).json({code: 200, search: journalArr});
				  }
				});
			} else if (req.headers.grab=="journalPosts"){
				client.query({text: "SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;",values: [`${req.headers.uuid}`]}, (err, result) => {
					if (err) {
					   console.log(err.stack);
					   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				   } else {
					let journalPosts = {
						pinned:[],
						nonpin:[]
					};
					for (i in result.rows){
						if (result.rows[i].is_pinned == true){
							// Pinned Post
							journalPosts.pinned.push({title: decryptWithAES(result.rows[i].title), body: decryptWithAES(result.rows[i].body), createdon: result.rows[i].created_on, id: result.rows[i].p_id});
						} else {
							// Not pinned.
							journalPosts.nonpin.push({title: decryptWithAES(result.rows[i].title), body: decryptWithAES(result.rows[i].body), createdon: result.rows[i].created_on, id: result.rows[i].p_id});
						}
					}
					  res.status(200).json({code: 200, search: journalPosts});
	
				   }
			  });
			} else if (req.headers.grab=="subsystems"){
				client.query({text: "SELECT * FROM systems WHERE user_id=$1 AND subsys_id= $2;",values: [`${getCookies(req)['u_id']}`, `${req.headers.sysid}` ]}, (err, result) => {
					if (err) {
					   console.log(err.stack);
					   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				   } else {
					let subArr = new Array();
					for (i in result.rows){
						subArr.push({name: (Buffer.from(result.rows[i].sys_alias, "base64").toString()), icon: result.rows[i].icon, sys_id: result.rows[i].sys_id})
					}
					res.status(200).json({code: 200, systems: subArr});
				   }
				});

			} else if (req.headers.grab=="systems"){
				client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  req.flash("Our database hit an error.");
					  res.status(400).json({code: 400});
				  } else {
					var sysArr = new Array();
						for (i in result.rows){
							sysArr.push({ sys_id: result.rows[i].sys_id, alias: Buffer.from(result.rows[i].sys_alias, "base64").toString(), icon:result.rows[i].icon, subsys: result.rows[i].subsys_id});
						}
						res.status(200).json({code: 200, systems: sysArr});
					}
				})
			} else {
				res.status(406).json({code: 406, msg: "Not Acceptable. (Check grab headers on front and back ends.)"});
			}
			
		} else return res.status(403);
	} else return res.status(403);
  
});

// Refactoring
  app.get('/system', async function(req, res) {
    if (isLoggedIn(req)){
		const innerWorlds= await db.query(client, "SELECT inner_worlds from USERS WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.innerworld = innerWorlds[0].inner_worlds || false;

		const systemData = await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [getCookies(req)['u_id']], res, req);

		const alterData= await db.query(client, "SELECT alters.name, systems.sys_id FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id = $1;", [getCookies(req)['u_id']], res, req);

		let systemMap = new Array();
		systemData.forEach((sys)=>{
			systemMap.push({
				id: sys.sys_id,
				alias: sys.sys_alias,
				icon: sys.icon,
				parent: sys.subsys_id
			})
		})
		  
		  
		// console.log(groupedData)
		res.status(200).render('pages/system',{ session: req.session, splash:splash,cookies:req.cookies, system: systemMap, alters: alterData});
    } else {
        forbidUser(res, req);
    }
  });

	var alterArr;
	// Refactored!
  app.get('/system/:id/:pg?', async function(req, res, next){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
    if (isLoggedIn(req)){
		if (!req.session.worksheets_enabled){
			// Quick, add that.
			const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
			req.session.worksheets_enabled= wsEn[0].worksheets_enabled;
		}
		const sysMap= await db.query(client, "SELECT systems.sys_id, systems.subsys_id, systems.user_id, systems.sys_alias, alters.alt_id, systems.icon FROM systems LEFT JOIN alters ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1 ORDER BY alters.name ASC", [`${req.params.id}`], res, req);
		if (!idCheck(req, sysMap[0].user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
		req.session.chosenSys= sysMap[0];
		if (req.session.chosenSys.subsys_id != null){
			// There's a subsystem.
			const subsysInf= await db.query(client, "SELECT sys_alias FROM systems WHERE sys_id=$1", [`${req.session.chosenSys.subsys_id}`], res, req);
			req.session.chosenSys.subsys_alias= subsysInf[0].sys_alias || getCookies(req)['system_term'];
		}
			const numUp= await db.query(client, "SELECT altupnum FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);

			const alters = await db.query(client, "SELECT alters.alt_id, alters.img_url, alters.sys_id, alters.name, alters.pronouns, alter_moods.mood, alters.is_archived, alters.img_blob, alters.blob_mimetype, alters.colour FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.sys_id = $1 OR (alters.subsys_id1 = $1::text OR alters.subsys_id2 = $1::text OR alters.subsys_id3 = $1::text OR alters.subsys_id4 = $1::text OR alters.subsys_id5 = $1::text) ORDER BY alters.name ASC;", [`${req.params.id}`], res, req);
			req.session.alters=[]
			alters.forEach((alter) =>{
				req.session.alters.push({
					name: Buffer.from(alter.name, 'base64').toString(), 
						id: alter.sys_id, 
						a_id: alter.alt_id, 
						mood: alter.mood, 
						pronouns: alter.pronouns, 
						is_archived: alter.is_archived, 
						icon: alter.img_url || "aHR0cHM6Ly93d3cud3JpdGVsaWdodGhvdXNlLmNvbS9pbWcvYXZhdGFyLWRlZmF1bHQuanBn",
						img_blob: alter.img_blob,
						mimetype: alter.blob_mimetype,
						colour: alter.colour
				})
			});
			let altCount= req.session.alters.length;
			(req.session.alters).sort((a, b) => a.name.localeCompare(b.name))
			req.session.alters= paginate(req.session.alters, Number(numUp[0].altupnum))
			res.render(`pages/sys_info`, { session: req.session, splash:splash, alterArr: req.session.alters[req.params.pg -1 || 0],cookies:req.cookies, sys_id: req.params.id, pgCount: req.session.alters.length, altCount: altCount, curPage: req.params.pg || 1, numup: Number(numUp[0].altupnum), currentSys: req.params.id});

    } else {
		forbidUser(res, req)
    }
    splash=null;
  });

  // Refactored!
  app.get("/alter/:id", async function(req, res, next){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	 if (isLoggedIn(req)){
		// Get Alter.
		const altInfo= await db.query(client, `SELECT alter_moods.*, alters.*, systems.sys_alias, systems.user_id, systems.subsys_id AS "parentsys" FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1`, [`${req.params.id}`], res, req);
		var selectedAlt= altInfo[0];
		// Before going any further-- Check that the alter's user ID and the actual requester's user ID matches.
		if (!idCheck(req, selectedAlt.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });

		req.session.chosenAlt= selectedAlt;

		// If they have a mood reason, decrypt that now.
		try{
			if (selectedAlt.reason){
				selectedAlt.reason = `${decryptWithAES(selectedAlt.reason)}`;
			}
		} catch (e){
			// No mood.
		}
		
		// Grab journal info.
		const journQuer= await db.query(client, "SELECT * FROM journals WHERE alt_id=$1;", [`${req.params.id}`], res, req);
		var altJournal= journQuer[0];
		// If we have none, make a placeholder.
		let skin;
		if (!altJournal){
				skin= {
				   val: "1",
				   c: "Red",
				   group: 1,
				   ext: "png"
				};
			} else {
				skin = (tuning.journals).filter(jn => jn.val == (altJournal.skin).replace(/'/g, ""));

			}
		// Grab all systems.
		req.session.sysList= await db.query(client, "SELECT * FROM systems WHERE user_id=$1;", [`${getCookies(req)['u_id']}`], res, req);
		
		if (selectedAlt.is_archived==true){
			// This alter is archived.
			var archivedPosts= new Array();
			try{
				// This is in the try/catch because altJournal.j_id won't always exist.
				const postQuer= await db.query(client, "SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;", [`${altJournal.j_id}`], res, req);
				postQuer.forEach(post=>{
				archivedPosts.push({
					id: post.p_id,
					title: decryptWithAES(post.title),
					body: decryptWithAES(post.body),
					created_on: post.created_on
				})
			})
			} catch(e){
				// Keep archivedPosts empty.
			}
			res.render(`pages/archived-alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes, alterInfo:selectedAlt, altJournal:altJournal, archivedPosts:archivedPosts });
		} else {
			// Just render alter ejs.
			res.render(`pages/alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes, alterInfo:selectedAlt, altJournal:altJournal, skin: skin[0] });
		}
	 } else {
		forbidUser(res, req);
	 }
  });

  app.get("/archive-alter/:id", (req, res, next)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "SELECT alters.* FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  let chosenAlter = result.rows[0];
			  res.render(`pages/archive-alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes,chosenAlter:chosenAlter });
		  }
		});
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}
 });

  app.get("/edit-alter/:id", async function (req, res, next){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		let sysInfo= await getSystems(getCookies(req)['u_id'], res, req)
		let altInfo= await db.query(client, "SELECT alters.*, systems.sys_alias, systems.user_id FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1", [`${req.params.id}`], res, req);
		let chosenAlter= altInfo[0];
		if (!idCheck(req, chosenAlter.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
		res.render(`pages/edit_alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes,chosenAlter:chosenAlter, sysInfo: sysInfo });

	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}
 });
 app.get("/mood/:id", (req, res, next)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "SELECT alters.name, alters.alt_id, alters.sys_id, alter_moods.* FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  let chosenAlter = result.rows[0];
			  if (chosenAlter.reason){
				chosenAlter.reason = `${decryptWithAES(result.rows[0].reason)}`;
			  }
			  res.render(`pages/set_mood`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes,chosenAlter:chosenAlter });
		  }
		});
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}
 });
 app.get("/del-mood/:id", (req, res, next)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "DELETE FROM alter_moods WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  // Redirect to the alter's page!
			  res.redirect(`/alter/${req.params.id}`);
		  }
		});
	}
});

  app.get('/journal/:id', async (req, res)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	 if (isLoggedIn(req)){
		const journalDat = await db.query(client, "SELECT journals.*, alters.*, systems.sys_alias, systems.user_id FROM journals INNER JOIN alters ON journals.alt_id= alters.alt_id INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1;", [`${req.params.id}`], res, req);
		if ( journalDat.length < 1 || journalDat[0].user_id !== getCookies(req)['u_id'] ){
			return res.status(404).render('pages/404',{ session: req.session, code:"Not Found", cookies:req.cookies });
		}
		let alterInfo= {
			alt_id: journalDat[0].alt_id,
			name: base64decode(journalDat[0].name),
			sys_alias: base64decode(journalDat[0].sys_alias),
			sys_id: journalDat[0].sys_id,
			journId: journalDat[0].j_id
		}
		res.render('pages/journal',{ session: req.session, cookies:req.cookies, alterInfo:alterInfo })
	 } else {
		 res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	 }
  });

  app.get('/journal/:id/delete', (req, res)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM posts WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				// console.log(result.rows[0]);
				// if (getCookies(req)['u_id'] !== result.rows[0].u_id) return res.status(404).render('pages/404',{ session: req.session, code:"Not Found", splash:splash,cookies:req.cookies }); //False 404 to avoid any further penetration attacks
				req.session.jPost= result.rows[0];
				req.session.jPost.body= decryptWithAES(req.session.jPost.body);
				req.session.jPost.title= decryptWithAES(req.session.jPost.title);
				res.render(`pages/delete_post`, { session: req.session, splash:splash,cookies:req.cookies });
			}
		});
	  } else {
		  res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	  }

  });

  app.get('/journal/:id/edit', (req, res)=>{
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT posts.*, journals.alt_id FROM posts INNER JOIN journals ON posts.j_id= journals.j_id WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:req.cookies, cJourn: {id: result.rows[0].p_id, body: decryptWithAES(result.rows[0].body), title: decryptWithAES(result.rows[0].title), is_comm: false, date: result.rows[0].created_on}, journalID: result.rows[0].j_id, alt_id:result.rows[0].alt_id, });
			}
		});
	  } else {
		  res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	  }


  });

  app.get('/comm/:id/edit', async function (req, res){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		const sysCheck = await db.query(client, "SELECT id FROM comm_posts WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
		const sysList = sysCheck.map(obj => obj.id);
		if (!(sysList.includes(req.params.id))) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });

		const postInfo= await db.query(client, "SELECT * FROM comm_posts WHERE id=$1", [`${req.params.id}`], res, req);
		res.render(`pages/edit_post`, { session: req.session, cookies:req.cookies, cJourn: {id: postInfo[0].id, body: decryptWithAES(postInfo[0].body), title: decryptWithAES(postInfo[0].title), is_comm: true, date: postInfo[0].created_on, sysid: postInfo[0].system_id} });
	} else {
		forbidUser(res,req);
	}


  });

  app.get('/comm/:id/delete', async function (req, res){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM comm_posts WHERE id=$1;",values: [`${req.params.id}`]}, async function (err, result) {
		   if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			const sysCheck = await db.query(client, "SELECT id FROM comm_posts WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
			const sysList = sysCheck.map(obj => obj.id);
			if (!(sysList.includes(req.params.id))) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });

			  // console.log(result.rows[0]);
			  req.session.jPost= result.rows[0];
			  req.session.jPost.body= decryptWithAES(req.session.jPost.body);
			  req.session.jPost.title= decryptWithAES(req.session.jPost.title);
			  let sysid= result.rows[0].system_id;
			  res.render(`pages/delete_post`, { session: req.session, splash:splash, cookies:req.cookies, sysid: sysid });
		  }
	  });
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}

  });

	app.get('/alter/:id/delete', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				 if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					let chosenAlter= result.rows[0];
					if (!idCheck(req, chosenAlter.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
					// No alter?
					if (!result.rows[0]) return res.status(400).render('pages/400',{ session: req.session, code:"Database Error", splash:splash,cookies:req.cookies });
					res.render(`pages/delete_alter`, { session: req.session, splash:splash, cookies:req.cookies,chosenAlter: chosenAlter});
				}
				
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}

	});
	app.get('/forum-data', (req, res, next) => {
		if (apiEyesOnly(req)){
			// No browser access.
			var blurry= Buffer.from("Blurry").toString("base64")
			if (req.headers.get== "latestPost"){
				// Get the latest post from a forum.
				client.query({text: `SELECT threads.*, alters.* FROM threads LEFT JOIN alters ON threads.alt_id = alters.alt_id WHERE threads.topic_id = $1 ORDER BY created_on DESC LIMIT 1;`,values: [req.headers.forumid]}, (err, result) => {
				if (err) {
				   console.log(err.stack);
				   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			   } else {
				if (result.rows.length > 0){
					res.json({
					code:200,
					thread_id: result.rows[0].id,
					alt_id: result.rows[0].alt_id,
					name: Buffer.from(result.rows[0].name || blurry, "base64").toString(),
					title: decryptWithAES(result.rows[0].title),
					date: result.rows[0].created_on
				})
				} else {
					res.json({
						code:404
					})
				}
				
			   }
			   
		   });
			} else if (req.headers.get=="latestReply"){
				// get the latest post from a thread.
				client.query({text: `SELECT COUNT(thread_posts.id) FROM thread_posts WHERE thread_posts.thread_id=$1;`,values: [req.headers.threadid]}, (err, aresult) => {
					if (err) {
					   console.log(err.stack);
					   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				   } else {
					let replyCount= aresult.rows[0].count || 0;
					// console.log(replyCount)
					client.query({text: `SELECT alters.alt_id, alters.name, thread_posts.created_on, thread_posts.id FROM alters INNER JOIN thread_posts ON thread_posts.alt_id=alters.alt_id WHERE thread_posts.thread_id=$1 ORDER BY thread_posts.created_on DESC LIMIT 1;`,values: [req.headers.threadid]}, (err, result) => {
						if (err) {
						   console.log(err.stack);
						   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					   } else {
						if (result.rows.length > 0){
							res.json({
							code:200,
							reply_count: replyCount || 0,
							thread_id: result.rows[0].id,
							alt_id: result.rows[0].alt_id,
							name: Buffer.from(result.rows[0].name, "base64").toString(),
							date: result.rows[0].created_on
						})
						} else {
							res.json({
								code:404
							})
						}
						
					   }
					   
				   });

				   }
				});
				
			}
			

		} else {
			return res.json({code:403}).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });;
		}
	})
	app.get('/users', (req, res, next) => {
		if (apiEyesOnly(req)){
			// No browser peeking!! Only Lighthouse's API can see this!
			// ${Buffer.from(req.body.email).toString('base64')}
			if (req.headers.email){
				// Look for an email.
				client.query({text: "SELECT * FROM users WHERE email=$1;", values:[`'${Buffer.from(req.headers.email).toString("base64")}'`]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400);
					} else {
						if (result.rows.length==0){
							return res.json({code:200, taken: false});
						} else {
							return res.json({code:200, taken: true});
						}
					}
				});
			} else if (req.headers.username) {
				// Look for username
				client.query({text: "SELECT * FROM users WHERE username=$1;", values:[`'${Buffer.from(req.headers.username).toString("base64")}'`]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400);
					} else {
						if (result.rows.length==0){
							return res.json({code:200, taken: false});
						} else {
							return res.json({code:200, taken: true});
						}
					}
				});
			} else {
				return res.json({code:422});
			}
			

		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});
		app.get('/profile', (req, res) => {
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM users WHERE id=$1;", values:[getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					req.session.alter_term=result.rows[0].alter_term;
					req.session.system_term=result.rows[0].system_term;
					req.session.plural_term= result.rows[0].plural_term;
					req.session.innerworld_term= result.rows[0].innerworld_term;
					req.session.worksheets_enabled= result.rows[0].worksheets_enabled;
					var theirEmail = Buffer.from(result.rows[0].email, "base64").toString();
					var theirName = Buffer.from(result.rows[0].username, "base64").toString();
					var numUp= result.rows[0].altupnum;
				}
				res.render(`pages/profile`, { session: req.session, splash:splash,cookies:req.cookies, theirEmail: theirEmail, theirName: theirName, numUp: numUp });
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}

	});
	app.get("/profile/tokens", async function (req, res){
		if (isLoggedIn(req)){
			let tokens= await db.query(client, "SELECT * FROM tokens WHERE u_id=$1 ORDER BY name ASC;", [getCookies(req)['u_id']], res, req);
			res.render(`pages/tokens`, { session: req.session, cookies:req.cookies, tokens: tokens });
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});
	

	/*



			---		POST REQUEST PAGES		---



	*/
	
	app.post('/forum/:id/new', (req, res) => {
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			let postAuth= req.body.author== "blur" ? null : req.body.author;
			client.query({text: "INSERT INTO threads (u_id, topic_id, title, body, alt_id) VALUES ($1, $2, $3, $4, $5);",values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.fTitle)}`, `${encryptWithAES(req.body.topicBody)}`, postAuth]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				client.query({text: "SELECT * FROM threads WHERE u_id=$1 ORDER BY created_on DESC;",values: [getCookies(req)['u_id']]}, (err, bresult) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
				  } else {
					req.flash("flash", "Topic posted!");
					res.redirect(301, `/topic/${bresult.rows[0].id}`); // Redirects to the topic
					
				  }
				});
			  }
			});
		}else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});
	app.post('/inner-world/:id', (req, res) => {
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "UPDATE inner_worlds SET key=$3, value=$4 WHERE u_id=$1 AND id=$2;",
			values: [
				getCookies(req)['u_id'], 
				req.params.id,
				`'${Buffer.from(req.body.keytitle).toString("base64")}`,
				`'${Buffer.from(req.body.valuebody).toString("base64")}`,
			]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				req.flash("flash", "Inner world updated!")
				res.redirect("/inner-world")
			  }
			});
		}else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});
	app.post("/archive-alter/:id", (req, res, next)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "UPDATE alters SET is_archived= NOT is_archived WHERE alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				if (req.body.archive){
					req.flash("flash", "Archived.");
				} else {
					req.flash("flash", "Un-Archived");
				}
				  
				  res.redirect(`/alter/${req.params.id}`);
			  }
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	 });

	app.post('/reply/:id', (req, res) => {
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			let postAuth= req.body.replyauthor== "blur" ? null : req.body.replyauthor;
			client.query({text: "UPDATE thread_posts SET body=$2, alt_id=$3 WHERE id=$1;",values: [`${req.params.id}`, `${encryptWithAES(req.body.editor3)}`, postAuth]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				req.flash("flash", "Reply edited!");
				res.redirect(`/topic/${req.body.threadid}`);
			  }
			});
			
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
		
	  });

	app.post('/topic/:id/:pg?', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (req.body.newtop){
			let postAuth= req.body.replyauthor== "blur" ? null : req.body.replyauthor;
			client.query({text: "INSERT INTO thread_posts (alt_id, body, thread_id) VALUES ($1, $2, $3)",values: [postAuth, `${encryptWithAES(req.body.reply)}`, req.params.id]}, (err, result) => {
				if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			} else { 
				req.flash("flash", "Reply posted!");
				// Let's redirect them to the page they were on.
				res.redirect(301, `/topic/${req.params.id}/${req.body.pagenum}`);
			}
			})	
		} else if (req.body.editop){
			let postAuth= req.body.author== "blur" ? null : `${req.body.author}`;
			client.query({text: "UPDATE threads SET title=$3, body=$4, topic_id=$5, alt_id=$6 WHERE u_id=$1 AND id=$2",values: [
				getCookies(req)['u_id'], 
				req.params.id, 
				`${encryptWithAES(req.body.newtitle)}`, 
				`${encryptWithAES(req.body.newbody)}`, 
				req.body.topicforum, 
				postAuth
			]}, (err, result) => {
				if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			} else { 
				req.flash("flash", "Thread updated!");
				res.redirect(301, `/topic/${req.params.id}`);
			}
			})
		}
		
	});
	app.post('/forum/:id', (req, res) => {
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			if (req.body.newtop){
				client.query({text: "INSERT INTO threads (u_id, topic_id, title, body, alt_id) VALUES ($1, $2, $3, $4, $5);",values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.fTitle)}`, `${encryptWithAES(req.body.topicBody)}`, req.body.author]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
				  } else {
					client.query({text: "SELECT * FROM threads WHERE u_id=$1 ORDER BY created_on DESC;",values: [getCookies(req)['u_id']]}, (err, bresult) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
					  } else {
						req.flash("flash", "Topic posted!");
						res.redirect(301, `/topic/${bresult.rows[0].id}`); // Redirects to the topic
						
					  }
					});
				  }
				});
			} else if (req.body.editSubmit){
				client.query({text: "UPDATE forums SET cat_id=$4, topic=$3, description=$5 WHERE id=$2 AND u_id=$1",values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.newName)}`, req.body.newcat, `${encryptWithAES(req.body.newDesc)}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
				  } else {
					req.flash("flash", "Forum updated!");
					res.redirect(301, `/forum/${req.params.id}`); // Later: Redirect to the topic itself.
				  }
				});
			}
			
			
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
		
	  });

	app.post('/forum', (req, res) => {
		if (isLoggedIn(req)){
			if (req.body.newcat){
				// New Category
				client.query({text: "INSERT INTO categories (u_id, name, description, icon) VALUES ($1, $2, $3, $4)",values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.cattitle)}`, `${encryptWithAES(req.body.catdesc)}`, req.body.caticon]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).json({code: 400, message: err.stack});
				  } else {
					req.flash("flash", "Category created!");
					res.status(200).redirect(301, "/forum");
				  }
				  });
			} else if (req.body.newfor){
				client.query({text: "INSERT INTO forums (u_id, topic, description, cat_id) VALUES ($1, $2, $3, $4)",values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.fortitle)}`, `${encryptWithAES(req.body.fordesc)}`, req.body.forumLoc]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).json({code: 400, message: err.stack});
				  } else {
					req.flash("flash", "Forum created!");
					res.status(200).redirect(301, "/forum");
				  }
				  });
			} else if (req.body.editcat){
				// Edit category.
				client.query({text: "UPDATE categories SET name=$2, icon=$4 WHERE u_id=$1 AND id= $3",values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.newCatName)}`, req.body.catid, req.body.newcaticon]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).json({code: 400, message: err.stack});
				  } else {
					req.flash("flash", "Category renamed!");
					res.status(200).redirect(301, "/forum");
				  }
				  });
			}
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});

    
	app.post('/mod', (req, res) => {
		if (isLoggedIn(req)){
			if ([process.env.dev1, process.env.dev2, process.env.dev3].includes(getCookies(req)['u_id'])){
				//This is a developer account; let them in.
				if (req.body.donor){
					// Add a donor!
					client.query({text: "INSERT INTO donators (nickname) VALUES ($1)",values: [req.body.donor]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).json({code: 400, message: err.stack});
					  } else {
						return res.status(200).render(`pages/mod-panel`, { session: req.session, splash:splash, cookies:req.cookies });
					  }
					  });
				}
				if (req.body.pbody){
					// Add a donor!
					client.query({text: "INSERT INTO changelog (title, body) VALUES ($1, $2)",values: [req.body.ptitle, req.body.pbody]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).json({code: 400, message: err.stack});
					  } else {
						req.flash("flash", "Added changelog entry!")
						return res.status(200).render(`pages/mod-panel`, { session: req.session, splash:splash, cookies:req.cookies });
					  }
					  });
				}
			} else {
				var mailOptions = {
					from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
					to: 'dee_deyes@writelighthouse.com',
					subject: `Unauthorised attempt to POST to mod panel.`,
					html: `<p>A user has attempted to POST to the mod panel!</p><p>User: ID: ${getCookies(req)['u_id'] || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
				  };
			
				  transporter.sendMail(mailOptions, (error, info) => {
					if (error) {
					  return console.log(error);
					}
				  });
				console.log(`An attempt to POST to the mod panel was made.\n Attempt made by: ${getCookies(req)['u_id'] || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"} | IP Address: ${req.socket.remoteAddress}`);
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies});
			}
			
		} else {
			var mailOptions = {
				from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
				to: 'dee_deyes@writelighthouse.com',
				subject: `Unauthorised attempt to POST to mod panel.`,
				html: `<p>A user has attempted to POST to the mod panel!</p><p>User: ID: ${getCookies(req)['u_id'] || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
			  };
		
			  transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
				  return console.log(error);
				}
			  });
			console.log(`An attempt to POST to the mod panel was made.\n Attempt made by: ${getCookies(req)['u_id'] || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"} | IP Address: ${req.socket.remoteAddress}`);
	res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies});
		}
	});
	
	app.post('/safety-plan/edit', (req, res) => {
		if (isLoggedIn(req)){
			var plans= {
				symptoms: encryptWithAES(req.body.warning),
				safepeople: encryptWithAES(req.body.friends),
				distractions: encryptWithAES(req.body.distract),
				keepsafe: encryptWithAES(req.body.keepsafe),
				gethelp: encryptWithAES(req.body.help),
				grounding: encryptWithAES(req.body.ground)
			};
			client.query({text:'UPDATE safetyplans SET symptoms=$2, safepeople=$3, distractions=$4, keepsafe= $5, gethelp=$6, grounding=$7 WHERE u_id=$1;', values: [getCookies(req)['u_id'], plans.symptoms, plans.safepeople, plans.distractions, plans.keepsafe, plans.gethelp, plans.grounding]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				res.redirect("/safety-plan");
			  }
			});
			
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
		
	});

	app.post('/bda', (req, res)=>{
		if (apiEyesOnly(req)){
			if (req.body.create){
				client.query({text: "INSERT INTO bda_plans (u_id, before, during, after, alias, timestamp) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))",values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.before)}`, `${encryptWithAES(req.body.during)}`, `${encryptWithAES(req.body.after)}`, `${encryptWithAES(req.body.name)}`, `${Date.now()}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).json({code: 400, message: err.stack});
				  } else {
					return res.status(200).json({code:200});
				  }
				  });
			}
		} else {
			return res.status(403).json({code:403})
		}
		
	});

	app.post('/bda/edit/:id', (req, res) => {
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			if (req.body.planname){
				client.query({text: "UPDATE bda_plans SET alias=$2,before=$3,during=$4,after=$5 WHERE id=$1;",values: [`${req.params.id}`, `${encryptWithAES(req.body.planname)}`,`${encryptWithAES(req.body.planbefore)}`,`${encryptWithAES(req.body.planduring)}`,`${encryptWithAES(req.body.planafter)}`]}, (err, result) => {
					if (err) {
						console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					}
					});
			req.flash("flash", "Plan Updated!");
			res.redirect("/bda");		
			}			
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});
	app.post('/mood/:alt', function(req, res){
		if (!checkUUID(req.params.alt)) return lostPage(res, req);
		var now = new Date();
		client.query({text: "SELECT * FROM alter_moods WHERE alt_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			if (result.rows.length==0){
				// Woops. Add new mood!
				// `${encryptWithAES(req.body.jTitle)}`
				client.query({text: "INSERT INTO alter_moods (alt_id, mood, reason, timestamp) VALUES ($1, $2, $3, $4);",values: [`${req.params.alt}`, req.body.mood, `${encryptWithAES(req.body.reason)}`, `${now.getUTCFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}+${now.getTimezoneOffset()}`]}, (err, result) => {
					if (err) {
						console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					}
						req.flash("flash",(strings.mood.updated));
						res.redirect(302,`/alter/${req.params.alt}`);
					});
			} else {
				client.query({text: "UPDATE alter_moods SET mood=$2, reason=$3, timestamp=$4 WHERE alt_id=$1;",values: [`${req.params.alt}`, req.body.mood, `${encryptWithAES(req.body.reason)}`, `${now.getUTCFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}+${now.getTimezoneOffset()}`]}, (err, result) => {
					if (err) {
						console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					}
						req.flash("flash",strings.mood.updated);
						res.redirect(302,`/alter/${req.params.alt}`);
					});
			}
		  }
		});

		});
	
		app.post('/profile', function(req, res){
		// console.table(req.body);
		client.query({text: "SELECT * FROM users WHERE id=$1",values: [getCookies(req)['u_id']]}, (err, result) => {
			if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } 
		  	if (req.body.deleteAcc){
				if (getCookies(req)['u_id'] == result.rows[0].id){
					// Logged account matches searched account.
					if (req.body.deleteAcc){
					   ejs.renderFile(__dirname + '/views/pages/email-goodbye.ejs', { alias: Buffer.from(result.rows[0].username, 'base64').toString() || randomise(["Buddy", "Friend", "Pal"]) }, (err, data) => {
						if (err) {
						  console.log(err);
						} else {
						  var mailOptions = {
							from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
							to: Buffer.from(result.rows[0].email, 'base64').toString(),
							subject: `Farewell, ${Buffer.from(result.rows[0].username, 'base64').toString()}.`,
							html: data
						  };
					
						  transporter.sendMail(mailOptions, (error, info) => {
							if (error) {
							  return console.log(error);
							}
							// console.log('Message sent: %s', info.messageId);
						  });
						}
					  });
					   client.query({text: "DELETE FROM inner_worlds WHERE u_id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
						if (err){
							console.log(err.stack);
							res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						}
							client.query({text: "DELETE FROM sys_rules WHERE u_id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
							if (err){
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
							}
							
							// Deleting from users will cascade to systems will cascade to alters will cascade to journals will cascade to posts. Hopefully.
							client.query({text: "DELETE FROM users WHERE id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
							if (err){
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
							}
							// Clear all cookies/session data.
							   
							   req.flash("flash", strings.account.deleted);
							   try{
								req.session.destroy();
							   } catch (e){
								console.log("Tried destroying the session, but it seems that wasn't doable!")
							   }
							   res.clearCookie('loggedin');
							   res.clearCookie('username');
							   res.clearCookie('u_id');
							   res.redirect("/");
							   
						});
							
						});
					});
			}
				  
				  
			  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}

		  } else {
				if (req.body.skinSel){
					// Changing Lighthouse's skin.
					client.query({text: 'UPDATE users SET skin=$1 WHERE id=$2', values: [req.body.skinSel, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							
							req.flash("flash", strings.account.skin);
						}
					});
				}
				if (req.body.altTerm){
					// Updating alter term
					client.query({text: 'UPDATE users SET alter_term=$1 WHERE id=$2', values: [req.body.altTerm.toLowerCase(), getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.alter_term= req.body.altTerm.toLowerCase();
						}
					});
				}
				if (req.body.sysTerm){
					// Updating alter term
					client.query({text: 'UPDATE users SET system_term=$1 WHERE id=$2', values: [req.body.sysTerm.toLowerCase(), getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.system_term= req.body.sysTerm.toLowerCase();
						}
					});
				}
				if (req.body.subTerm){
					// Updating alter term
					 client.query({text: 'UPDATE users SET subsystem_term=$1 WHERE id=$2', values: [req.body.subTerm.toLowerCase(), getCookies(req)['u_id']]}, (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.subsystem_term= req.body.subTerm.toLowerCase();
						}
					});
				}
				if (req.body.iwTerm){
					// Updating inner world term
					 client.query({text: 'UPDATE users SET innerworld_term=$1 WHERE id=$2', values: [req.body.iwTerm.toLowerCase(), getCookies(req)['u_id']]}, (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.innerworld_term= req.body.iwTerm.toLowerCase();
						}
					});
				}
				if (req.body.plurTerm){
					// Updating inner world term
					 client.query({text: 'UPDATE users SET plural_term=$1 WHERE id=$2', values: [req.body.plurTerm.toLowerCase(), getCookies(req)['u_id']]}, (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.plural_term= req.body.plurTerm.toLowerCase();
						}
					});
				}
				if (req.body.newEmail){
					// Updating email
					client.query({text: 'UPDATE users SET email=$1 WHERE id=$2', values: [`'${Buffer.from(req.body.newEmail).toString('base64')}'`, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.email= req.body.newEmail;
						}
					});
				}
				if (req.body.newName){
					// Updating username
					client.query({text: 'UPDATE users SET username=$1 WHERE id=$2', values: [`'${Buffer.from(req.body.newName).toString('base64')}'`, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.username= req.body.newName;
						}
					});
				}
				if (req.body.changePass){
					client.query({text: 'UPDATE users SET pass=$1 WHERE id=$2', values: [`'${CryptoJS.SHA3(req.body.newPass1)}'`, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash","Password Updated!");
						}
					});
				}
				if (req.body.innerworld){
					client.query({text: 'UPDATE users SET inner_worlds= $2 WHERE id=$1', values: [getCookies(req)['u_id'], req.body.innerworld]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.session.inner_worlds = req.session.inner_worlds;
							req.flash("flash", strings.account.updated);
						}
					});
				}
				if (req.body.userlang){
					// Update user language
					client.query({text: 'UPDATE users SET language= $2 WHERE id=$1', values: [getCookies(req)['u_id'], req.body.userlang]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.session.language = req.body.userlang;
							req.flash("flash", strings.account.updated);
						}
					});
				}
				if (req.body.textsize){
					// Update user text size
					client.query({text: 'UPDATE users SET textsize= $2 WHERE id=$1', values: [getCookies(req)['u_id'], req.body.textsize]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.session.textsize = req.body.textsize;
							req.flash("flash", strings.account.updated);
						}
					});
				}
				if (req.body.ws){
					// Toggle worksheets
					client.query({text: 'UPDATE users SET worksheets_enabled= $2 WHERE id=$1', values: [getCookies(req)['u_id'], req.body.ws]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.session.worksheets_enabled = req.body.ws;
							req.flash("flash", strings.account.updated);
						}
					});
				}
				if (req.body.font){
					// Change fonts
					client.query({text: 'UPDATE users SET font= $2 WHERE id=$1', values: [getCookies(req)['u_id'], req.body.font]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.session.font = req.body.font;
							req.flash("flash", strings.account.updated);
						}
					});
				}
				if (req.body.gloss){
					// Change fonts
					client.query({text: 'UPDATE users SET glossary_enabled= $2 WHERE id=$1', values: [getCookies(req)['u_id'], req.body.gloss]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.session.glossary_enabled = req.body.gloss;
							req.flash("flash", strings.account.updated);
						}
					});
				}
				if (req.body.numUp){
					let numUp= Number(req.body.numUp)
					client.query({text: 'UPDATE users SET altUpNum=$2 WHERE id=$1', values: [getCookies(req)['u_id'], numUp]}, async (err, result)=>{
						if (err) {
						  return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
						}
					});
				}
				// After all those changes.
				// res.cookie('subsystem_term', req.body.subTerm,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
				res
				.cookie('username', req.body.newName || Buffer.from(req.session.username, "base64").toString() ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('email', req.body.newEmail || req.session.email ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('alter_term', req.body.altTerm || req.session.alter_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('system_term', req.body.sysTerm || req.session.system_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('subsystem_term', req.body.subTerm || req.session.subsystem_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('innerworld_term', req.body.iwTerm || req.session.innerworld_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('plural_term', req.body.plurTerm || req.session.plural_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('skin', req.body.skinSel || req.session.skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('worksheets_enabled', req.body.ws || req.session.worksheets_enabled,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('textsize', req.body.textsize || req.session.textsize || 1,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.redirect(302, "/profile");
			}
		});
	});
	
	app.post('/reset/:id', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		// Reset password
		client.query({text: 'SELECT * FROM users WHERE email_link=$1', values: [`'${req.params.id}'`]}, (err, result)=>{
		  if (err) {
		    res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
		     // Does the PIN match the one in the DB?
				 if (result.rows[0].email_pin == req.body.pin){
					 client.query({text: 'UPDATE users SET pass=$1 WHERE email_link=$2', values: [`'${CryptoJS.SHA3(req.body.newpass)}'`,`'${req.params.id}'`]}, (err, result)=>{
					   if (err) {
							 console.log(err.stack);
					     res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					   } else {
					      // Code here
								req.flash("flash","Updated your password. You can now log in!");
								res.redirect("/login");
					   }
					 });

				 } else {
					 res.render('pages/new_pass',{ session: req.session, code:"Forbidden", splash:"That PIN doesn't match.",cookies:req.cookies });
				 }
		  }
		});
	});

	app.post('/forgot-password', (req, res)=>{
		client.query({text: 'SELECT username, email, email_link, email_pin FROM users WHERE email=$1 ', values:[`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result)=>{
			if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				if ((result.rows).length == 0){
					// User doesn't exist.
					splash= req.flash("flash","That email isn't in use, actually. Did you mean to sign up?");
					res.render(`pages/forgot_pass`, { session: req.session, splash:splash,cookies:req.cookies});
				} else {
					req.session.user= result.rows[0];
					req.session.user.email_pin= getRandomInt(1111,9999);
					client.query({text: 'UPDATE users set email_pin=$1 WHERE email=$2 ', values:[`${req.session.user.email_pin}`,`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result)=>{
						res.render(`pages/forgot_pass2`, { session: req.session, splash:splash,cookies:req.cookies});
						ejs.renderFile(__dirname + '/views/pages/email-forgotpass.ejs', { alias: Buffer.from(req.session.user.username, 'base64').toString() || randomise(["Buddy", "Friend", "Pal"]), userPin: req.session.user.email_pin, resetLink:(req.session.user.email_link).replace(/'/gi, '') }, (err, data) => {
							if (err) {
							  console.log(err);
							} else {
							  var mailOptions = {
								from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
								to: req.body.email,
								subject: `Forgot your password, ${Buffer.from(req.session.user.username, 'base64').toString()}?`,
								html: data
							  };
						
							  transporter.sendMail(mailOptions, (error, info) => {
								if (error) {
								  return console.log(error);
								}
								// console.log('Message sent: %s', info.messageId);
							  });
							}
						  });
					});
				}

			}
		});
	});

	app.post('/rules', async function (req, res){
		if (isLoggedIn(req)){
			if (req.body.create){
				// Create rule.
				client.query({text:`INSERT INTO sys_rules (u_id, rule) VALUES ($1, $2)`, values:[getCookies(req)['u_id'], `'${Buffer.from(req.body.rule).toString('base64')}'`]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
					}
				});
			} else if(req.body.edit){
				await db.query(client, "UPDATE sys_rules SET rule=$1 WHERE id=$2 AND u_id=$3", [`'${Buffer.from(req.body.edit).toString('base64')}'`, req.body.ruleid, getCookies(req)['u_id']], res, req);
			} else {
				// Delete Rule
				client.query({text:`DELETE FROM sys_rules WHERE id=$1;`, values:[getKeyByValue(req.body,"Remove")]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
					}
				});
			}
			res.redirect(req.get('referer'));
			
		} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash, cookies:req.cookies });
		}
	});

	app.post('/alter/:id/delete', async function (req, res){
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			let chosenAlt= await db.query(client, "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1", [req.params.id], res, req);
			if (!idCheck(req, chosenAlt[0].user_id)) return res.status(404).send("Not found");

			client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
				 if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					client.query({text: "DELETE FROM journals WHERE alt_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
						 if (err) {
							console.log(err.stack);
							res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							client.query({text: "DELETE FROM alters WHERE alt_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
								 if (err) {
									console.log(err.stack);
									res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
								} else {
									splash=req.flash("flash",`${getCookies(req)['alter_term']} deleted.`);
									res.redirect(`/system/${req.body.sysid}`);
								}
							});
						}
					});
				}
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post('/comm/:id/delete', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM comm_posts WHERE id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  req.session.jPost= null;
				//   res.redirect(`/system`);
				if (req.body.sysid){
					res.redirect(`/system/communal-journal?sys=${req.body.sysid}`);
				} else {
					res.redirect(`/system/communal-journal`);
				}
			  }
		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post('/comm/:id/edit', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "UPDATE comm_posts SET title=$1, body=$2, created_on=$4 WHERE id=$3; ",
			values: [
				`${encryptWithAES(req.body.jTitle)}`, 
				`${encryptWithAES(req.body.jBody)}`, 
				`${req.params.id}`,
				`${req.body.jDate || new Date().toISOString()}`
			]}, (err, result) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  req.session.jPost= null;
				  if (req.body.sysid){
					res.redirect(`/system/communal-journal?sys=${req.body.sysid}`);
				} else {
					res.redirect(`/system/communal-journal`);
				}
			  }

		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post('/journal/:id/edit', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);

		if (isLoggedIn(req)){
			client.query({text: "UPDATE posts SET title=$1, body=$2, created_on=$4 WHERE p_id=$3; ",values: [`${encryptWithAES(req.body.jTitle)}`, `${encryptWithAES(req.body.jBody)}`, `${req.params.id}`, `${req.body.jDate || new Date().toISOString()}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
 			  } else {
				if (req.body.author && req.body.author !== "skip"){
					// New author specified.
					if(req.body.author=="move-to-comm"){
						// Turn it into a communal journal post. WIP.
					} else {
						// Make it an alter's post.
						client.query({text: "UPDATE posts SET j_id=$2 WHERE p_id=$1;",values: [`${req.params.id}`, `${req.body.author}`]}, (err, result) => {
							if (err) {
							   console.log(err.stack);
							   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						   }
						   // No go redirect appropriately.
							client.query({text: "SELECT alters.alt_id FROM alters INNER JOIN journals ON journals.alt_id = alters.alt_id WHERE journals.j_id=$1;",values: [`${req.body.author}`]}, (err, cresult) => {
								if (err) {
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
							}
								req.session.jPost= null;
								req.flash("flash", strings.posts.moved);
								// Moving posts, so go to the journal for it
								return res.redirect(`/journal/${cresult.rows[0].alt_id}`);
							});
						});
					}
					
				} else {
					res.redirect(`/journal/${req.body.alt_id}`);
				}
				  
 			  }

		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post("/journal/:id", (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			if (req.body.submit){
			client.query({text: "INSERT INTO posts (j_id, created_on, body, title) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4);",values: [`${req.body.j_id}`, `${Date.now()}`, `${encryptWithAES(req.body.j_body)}`, `${encryptWithAES(req.body.j_title)}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies});
 			  } else {
				  res.redirect(`/journal/${req.params.id}`);
 			  }

		  });	
			} else {
			client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [getKeyByValue(req.body,"Remove")]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
 			  } else {
				  req.session.jPost= null;
				  res.redirect(`/journal/${req.params.id}`);
			  }
		  });
			}
			
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post("/alter/:id", async function(req, res){
		if (!checkUUID(req.params.id)) return lostPage(res, req);
			let pass= req.body.jPass || null;
			if (isLoggedIn(req)){
				let chosenAlt= await db.query(client, "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1", [req.params.id], res, req);
				if (!idCheck(req, chosenAlt[0].user_id)) return res.status(404).send("Not found");

				if (req.body.create){
					// Create
					client.query({text: "INSERT INTO journals (alt_id, password, is_private, skin, sys_id) VALUES ($1, $2, $3, $4, $5)",values: [`${req.params.id}`, `'${CryptoJS.SHA3(req.body.jPass)}'`, `${req.body.priv}`, `'${req.body.journ}'`, `${req.body.sys_id}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash });
					  } else {
						  splash= req.flash("flash",`<strong>All set!</strong> Journal created.`);
						  res.redirect(`/alter/${req.params.id}`);
					  }
				  });
			  } else if (req.body.modify){
					// Edit alter.
						client.query({text: "UPDATE alters SET sys_id=$1, name=$2 WHERE alt_id=$3;",values: [req.body.alterSys, `'${Buffer.from(req.body.altname).toString('base64')}'`, req.params.id]}, (err, result) => {
							if (err) {
							  console.log(err.stack);
							  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						  } else {
							  splash= req.flash("flash",`<strong>All set!</strong> ${req.body.altname}'s information has been updated.`);
							  res.redirect(`/alter/${req.params.id}`);
						  }
					  });
				} else if (req.body.changePass){
					// Change alter password.
					client.query({text: "UPDATE journals SET password=$1 WHERE alt_id=$2;",values: [`'${CryptoJS.SHA3(req.body.jPassNew)}'`, req.params.id]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
						  splash= req.flash("flash",`<strong>All set!</strong> This journal's password has been reset.`);
						  res.redirect(`/alter/${req.params.id}`);
					  }
				  });
				} else if (req.body.newjournalSkin){
					// Change journal skin.
					let newskin= req.body.skin.split(",");
					client.query({text: "UPDATE journals SET skin=$1 WHERE alt_id=$2;",values: [newskin[0], req.params.id]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
						  splash= req.flash("flash",`<strong>All set!</strong> Journal skin updated.`);
						  res.redirect(`/alter/${req.params.id}`);
					  }
				  });
				} else if (req.body.unlock){
					client.query({text: "UPDATE journals SET is_private=false WHERE alt_id=$1;",values: [req.params.id]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
						  splash= req.flash("flash",`<strong>All set!</strong> Journal unlocked.`);
						  res.redirect(`/alter/${req.params.id}`);
					  }
				  });
				} else if(req.body.lockJournal){
					client.query({text: "UPDATE journals SET password=$2, is_private=true WHERE alt_id=$1;",values: [req.params.id, `'${CryptoJS.SHA3(req.body.journalPassword)}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
						  splash= req.flash("flash",`<strong>All set!</strong> Journal locked. Just so you remember, the password is: ${req.body.journalPassword}.`);
						  res.redirect(`/alter/${req.params.id}`);
					  }
				  });
				} else {
				  // Login
				  client.query({text: "SELECT password FROM journals WHERE alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
					  if (err) {
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						// res.redirect(`/alter/${req.params.id}`);
					if (result.rows[0].password == `'${CryptoJS.SHA3(req.body.logPass)}'`){
						req.session.journalUser= req.params.id;
						res.redirect(`/journal/${req.params.id}`);
					} else {
						splash= req.flash("flash",`<strong>No, not quite...</strong> That's not the right password.`);
						res.redirect(`/alter/${req.params.id}`);
					}
					}
				});

			  }
			} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
			}
	});
	app.post("/edit-alter/:id", async (req, res, next)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);

		if (isLoggedIn(req)){
			// Is this their alter tho?
			let altInf= await db.query(client, "SELECT systems.user_id FROM systems INNER JOIN alters ON alters.sys_id = systems.sys_id WHERE alters.alt_id = $1;", [`${req.params.id}`], res, req);
			if (!idCheck(req, altInf[0].user_id)) return lostPage(res, req);

			// Ok, this is their alter. Proceed.
			let pkId= req.body.pkid ? `${encryptWithAES(req.body.pkid)}` : null;
			let spId= req.body.spid ? `${encryptWithAES(req.body.spid)}` : null;
			if (req.files){
				
				if (req.files.imgupload){
					// This is for the icons!
					await db.query(client, "UPDATE alters SET img_blob=$2, blob_mimetype=$3, img_url=null WHERE alt_id=$1", [`${req.params.id}`,
					req.body.clear ? null : req.files.imgupload.data,
					req.body.clear ? null : req.files.imgupload.mimetype], 
					res, req);
				}
				
				if (req.files.headeralt){
					// This is for the header!
					await db.query(client, "UPDATE alters SET header_blob=$2, header_mimetype=$3 WHERE alt_id=$1", [`${req.params.id}`,
					req.files.headeralt.data,
					req.files.headeralt.mimetype], 
					res, req);
				}
			} 
				await db.query(client, "UPDATE alters SET name=$2, triggers_pos=$3, triggers_neg= $4, agetext=$5, likes=$6, dislikes=$7, job=$8, safe_place=$9, wants=$10, acc=$11, notes=$12, img_url=$13, type=$14, pronouns=$15, birthday=$16, first_noted=$17, gender=$18, sexuality=$19, source=$20, fronttells=$21, relationships=$22, hobbies=$23, appearance=$24, colour=$25, nickname=$26, species=$27, pk_id=$28, sp_id=$29 WHERE alt_id=$1", [
					`${req.params.id}`,
					`'${Buffer.from(req.body.name).toString('base64')}'`,
					`'${Buffer.from(req.body.postr).toString('base64')}'`,
					`'${Buffer.from(req.body.negtr).toString('base64')}'`,
					`'${Buffer.from(req.body.age).toString('base64')}'`,
					`'${Buffer.from(req.body.likes).toString('base64')}'`,
					`'${Buffer.from(req.body.dislikes).toString('base64')}'`,
					`'${Buffer.from(req.body.internalJob).toString('base64')}'`,
					`'${Buffer.from(req.body.safety).toString('base64')}'`,
					`'${Buffer.from(req.body.wish).toString('base64')}'`,
					`'${Buffer.from(req.body.acc).toString('base64')}'`,
					`'${Buffer.from(req.body.notes).toString('base64')}'`,
					`'${Buffer.from(req.body.imgurl).toString('base64')}'`,
					req.body.type,
					`'${Buffer.from(req.body.pronouns).toString('base64')}'`,
					`'${Buffer.from(req.body.birthday).toString('base64')}'`,
					`'${Buffer.from(req.body.firstnoted).toString('base64')}'`,
					`'${Buffer.from(req.body.gender).toString('base64')}'`,
					`'${Buffer.from(req.body.sexuality).toString('base64')}'`,
					`'${Buffer.from(req.body.source).toString('base64')}'`,
					`'${Buffer.from(req.body.fronttells).toString('base64')}'`,
					`'${Buffer.from(req.body.relationships).toString('base64')}'`,
					`'${Buffer.from(req.body.hobbies).toString('base64')}'`,
					`'${Buffer.from(req.body.appearance).toString('base64')}'`,
					req.body.colour,
					`'${Buffer.from(req.body.nickname).toString('base64')}'`,
					`'${Buffer.from(req.body.species).toString("base64")}'`,
					pkId,
					spId,
				], res, req);
				if (req.body.clear){
					await db.query(client, "UPDATE alters SET  img_blob=null, blob_mimetype=null WHERE alt_id=$1", [`${req.params.id}`], res, req);
				}
				if (req.body.headersclear){
						await db.query(client, "UPDATE alters SET  header_blob=null, header_mimetype=null WHERE alt_id=$1", [`${req.params.id}`], res, req);
					}
			
			let otherSystems;
			if (typeof req.body.othersys == "string"){
				// Make an array
				otherSystems = new Array(req.body.othersys);
			} else if(typeof req.body.othersys == "undefined"){
				otherSystems = new Array(5).fill(null)
			} else {
				otherSystems= req.body.othersys
			}
			try{
				let totalLength = otherSystems.length <= 6 ? otherSystems.length : 6;
			const finalSystem = otherSystems.slice(0, 6).concat(Array(6 - totalLength ).fill(null));

			// Let's update their systems if need be
			for (let i = 1; i < 6; i++) {
					await db.query(client, `UPDATE alters SET subsys_id${i}=$2 WHERE alt_id=$1`, [`${req.params.id}`, finalSystem[i-1]], res, req);
				
			}
			} catch(e){
				console.log(e)
			}
			
			
			
			
			req.flash("flash","Page updated!");
			res.redirect(`/alter/${req.params.id}`);
			
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}

		
	});

	app.post("/system/:alt/:pg?", function(req, res){
		if (!checkUUID(req.params.alt)) return;
		// Post system
			if (isLoggedIn(req)){
				if (req.body.sysid){
					let sysId= req.body.sysid == "none" ? null : req.body.sysid;
					// Setting this in case they want to release a subsystem into a normal system.
					client.query({text: "UPDATE systems SET subsys_id=$2 WHERE sys_id=$1",values: [`${req.params.alt}`, sysId]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  }
					  
				  });
				  req.flash("flash",strings.system.updated);
				}
				if (req.body.journ){
					client.query({text: "UPDATE systems SET icon=$2 WHERE sys_id=$1",values: [`${req.params.alt}`, `${req.body.journ}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  }
					  
				  });
				  req.flash("flash",strings.system.updated);
				}
				if (req.body.submit){
					client.query({text: "INSERT INTO alters (sys_id, name) VALUES ($1, $2)",values: [`${req.params.alt}`, `'${Buffer.from(req.body.altname).toString('base64')}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  }
					  
				  });
				  req.flash("flash",strings.alter.created);
				}
				res.redirect(`/system/${req.params.alt}/`);
				

			} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
			}
	});

	app.post('/inner-world', (req, res)=>{
		if (isLoggedIn(req)){
			if (req.body.create){
				client.query({text:'INSERT INTO inner_worlds (u_id, key, value) VALUES ($1,$2,$3);', values: [`${getCookies(req)['u_id']}`, `${Buffer.from(req.body.key).toString('base64')}`,`${Buffer.from(req.body.value).toString('base64')}`]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					}
				});
			} else {
				// Deleting.
				client.query({text: "DELETE FROM inner_worlds WHERE id=$1;",values: [getKeyByValue(req.body,"Remove")]}, (err, result) => {
					if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					req.session.sys_rules= null;
				}
				});
			}
			res.redirect(req.get('referrer'));
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

  app.post('/system', function (req, res){
	  if (req.body.sysname){
		let subsysID= req.body.subsys == "None" ? null : req.body.subsys;
		  client.query({text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${req.cookies.u_id}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  // console.table(result.rows);
				  if ((result.rows).length == 0){
					  client.query({text: "INSERT INTO systems (sys_alias, user_id, subsys_id) VALUES ($1, $2, $3)",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${getCookies(req)['u_id']}`, subsysID]}, (err, result) => {
					      if (err) {
					        console.log(err.stack);
					        res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					      } else {
					          splash= req.flash("flash",`Added ${req.body.sysname}.`);
							  // res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys });
							  res.redirect("/system");
					      }
					  });
				  } else {
					// res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys });
					splash= req.flash("flash",`You already have a system with the alias "${req.body.sysname}". Please use a unique name. Sorry!`);
					res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys,cookies:req.cookies });
				  }
			  }
		  });
	  } else if (req.body.post) {
		  // Comm journal.
		  // id | u_id | created_on | title | body
		  client.query({text: "INSERT INTO comm_posts (u_id, created_on, title, body) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4)",values: [`${getCookies(req)['u_id']}`, `${Date.now()}`, `${encryptWithAES(req.body.cTitle)}`, `${encryptWithAES(req.body.cBody)}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				res.redirect("/system");
			}
		});
	  } else {
		// Deleting.
		client.query({text: "DELETE FROM comm_posts WHERE id=$1; ",values: [getKeyByValue(req.body,"Remove")]}, (err, result) => {
			if (err) {
			   console.log(err.stack);
			   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		   } else {
			   req.session.jPost= null;
			   res.redirect(`/system`);
		   }
	   });
	  }
  });

	app.post('/deletesys/:alt', async function(req, res){
		if (!checkUUID(req.params.alt)) return lostPage(res, req);
		const sysData = await db.query(client, "SELECT * FROM systems WHERE sys_id=$1", [`${req.params.alt}`], res, req);
		if (getCookies(req)['u_id']= sysData[0].user_id){
			await db.query(client, "DELETE FROM systems WHERE sys_id=$1", [`${req.params.alt}`], res, req);
			await db.query(client, "DELETE FROM systems WHERE subsys_id=$1", [`${req.params.alt}`], res, req);
			req.session.chosenSys= null;
			res.redirect("/system");
		} else {
			forbidUser(res, req)
		}
	});

	app.post('/editsys/:alt', function(req, res){
		if (!checkUUID(req.params.alt)) return;
		client.query({text: "UPDATE systems SET sys_alias=$1 WHERE sys_id=$2;",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${req.params.alt}`]}, (err, result) => {
			if (err){
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				req.flash("flash", strings.system.updated);
				res.redirect(`/system/${req.params.alt}`);
			}
		});
	});

	app.post('/wish', (req, res) => {
		if (isLoggedIn(req)){
			if (req.body.createWish){
				client.query({text: "INSERT INTO wishlist (user_id, wish) VALUES ($1, $2);",values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.wish)}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				  } else {
					splash= req.flash("flash", strings.wish.created);
					res.redirect(req.get('referer'));
						splash=null;
				  }
				});
			}
			
		} else { res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies })}
	});

	app.post('/pluralkit', (req, res)=> {
		if (isLoggedIn(req)){
			var splitList= new Array();
			if (typeof req.body.alterChoice == "string"){
				splitList= [JSON.parse(req.body.alterChoice)];
				if (splitList[0].img== null) splitList[0].img = 'https://www.writelighthouse.com/img/avatar-default.jpg';
				 if (splitList[0].pronouns== null) splitList[0].pronouns = '';
				if (splitList[0].birthday== null) splitList[0].birthday = '';
			} else if(typeof req.body.alterChoice == "undefined"){
				req.flash("flash", strings.import.PK.failure.noCheck);
				  return res.redirect("/pluralkit");
			} else {
				/* Issue */ for (i in req.body.alterChoice){
					splitList.push(JSON.parse(req.body.alterChoice[i]));
					if (splitList[i].img== null) splitList[i].img = 'https://www.writelighthouse.com/img/avatar-default.jpg';
					if (splitList[i].pronouns== null) splitList[i].pronouns = null;
					if (splitList[i].birthday== null) splitList[i].birthday = '';
				}	
			}
			var newSys= "Imported from Pluralkit";
			if (req.body.sysLoc== "new"){ 
				// Check for an existing "Imported from Pluralkit" system
				client.query({text: "SELECT sys_id FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						if (result.rows.length > 0){
							newSys+= ` ${getRandomInt(111,999)}`;
						}
						// Create a new system
					client.query({text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
						if (err) {
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							// Grab its ID.
							client.query({text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
								if (err) {
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
								} else {
									req.session.sys = new Array();
									// Add this system to the session.
									req.session.sys.push({name: Buffer.from(result.rows[0].sys_alias, "base64").toString(), id: result.rows[0].sys_id, icon:null})
									let newSysID= result.rows[0].sys_id;
									// Insert each alter into this new system.
									for (i in splitList){
										// console.log(splitList[i].img);
										client.query({text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url) VALUES($1, $2, $3, $4, $5);",values: [`'${Buffer.from((splitList[i].name).replace(/⠀/g, " ")).toString('base64')}'`, newSysID,`'${Buffer.from(splitList[i].pronouns).toString('base64')}'`,`'${Buffer.from(splitList[i].birthday).toString('base64')}'`,`'${Buffer.from(splitList[i].img).toString('base64')}'`]}, (err, result) => {
											if (err) {
											console.log(err.stack);
											res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
											}
										});
										
									}
									req.flash("flash", strings.system.created);
									delete req.session.sys;
								}
							});
						}
					});	
					}
				})
							
			} else {
				// Add to a system.
				for (i in splitList){
					// console.log(splitList[i].img);
					client.query({text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url) VALUES($1, $2, $3, $4, $5);",values: [`'${Buffer.from((splitList[i].name).replace(/⠀/g, " ")).toString('base64') || ''}'`, req.body.sysLoc,`'${Buffer.from(splitList[i].pronouns).toString('base64') || null}'`,`'${Buffer.from(splitList[i].birthday).toString('base64') || ''}'`,`'${Buffer.from(splitList[i].img).toString('base64') || 'aHR0cHM6Ly9pLmliYi5jby92a3dtV2pGL2F2YXRhci1kZWZhdWx0LmpwZw=='}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						}
					});
					
				}
				req.flash("flash", strings.system.updated);
			}
			return res.redirect(307,"/system");

		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies })
		}
	});

	app.post('/signup', async function(req, res) {
		// Bookmarks: signup post, post signup
	
		if (req.body.mjl2fbbz8s) return res.send("(:"); // It's a bot. Do not let them load anything.
	
		let email= (req.body.email).toLowerCase();
	
		const userCheck = await db.query(client, "SELECT * FROM users WHERE email=$1 OR username=$2;", [`'${Buffer.from((email).toLowerCase()).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`], res, req);
	
	
		if (userCheck.length > 0){
			req.flash("flash", strings.account.alreadyExists);
			return res.render(`pages/signup`, { session: req.session, splash:splash,cookies:req.cookies });
		} 
			// Write to the db
			await db.query(client, "INSERT INTO users (email, username, pass, email_link, worksheets_enabled, system_term, alter_term, email_pin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [`'${Buffer.from(email).toString('base64')}'`,`'${Buffer.from(req.body.username).toString('base64')}'`,`'${CryptoJS.SHA3(req.body.password)}'`,`'${Math.random().toString(36).substr(2, 16)}'`,req.body.ws || true,req.body.system_term || "system",req.body.alter_term || "alter",getRandomInt(1111,9999)], res, req);
	
			const userDat = await db.query(client, "SELECT * FROM users WHERE email=$1;", [`'${Buffer.from(req.body.email).toString('base64')}'`], res, req);
	
			
	
			ejs.renderFile(__dirname + '/views/pages/email-welcome.ejs', { alias: req.body.username || randomise(["Buddy", "Friend", "Pal"]), userid: userDat[0].id }, (err, data) => {
				if (err) {
					console.log(err);
				} else {
					var mailOptions = { from: '"Lighthouse" <dee_deyes@writelighthouse.com>', to: req.body.email, subject: `Welcome to Lighthouse, ${req.body.username}!`, html: data };
					transporter.sendMail(mailOptions, (error, info) => {
					if (error) {
						return console.log(error);
					}
					});
				}
				});
			
				req.session.alter_term= userDat[0].alter_term;
				req.session.system_term= userDat[0].system_term;
				req.session.subsystem_term= userDat[0].subsystem_term;
				req.session.innerworld_term= userDat[0].innerworld_term;
				req.session.plural_term= userDat[0].plural_term;
				req.session.loggedin = true;
				req.session.u_id= userDat[0].id;
				req.session.username = Buffer.from(userDat[0].username, 'base64').toString();
				req.session.is_legacy= userDat[0].is_legacy;
				req.session.font= userDat[0].font;
				
				res
				.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('username',  Buffer.from(userDat[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('u_id', userDat[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('alter_term', userDat[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('system_term', userDat[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('subsystem_term', userDat[0].subsystem_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('innerworld_term', userDat[0].innerworld_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('plural_term', userDat[0].plural_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('is_legacy', userDat[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.cookie('skin', userDat[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
				.redirect("/tutorial");
			
			
	  });

  app.post('/', function(req, res) {
	if (req.body.loggingin){
		var query = {
			text: "SELECT * FROM users WHERE email=$1 AND pass=$2;",
			values: [`'${Buffer.from((req.body.email).toLowerCase()).toString('base64')}'`, `'${CryptoJS.SHA3(req.body.password)}'`]
		  }
		  client.query(query, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				if (result.rows.length == 0){
					req.flash("flash", strings.account.incorrect);
					res.redirect("/");
				} /* else if(result.rows[0].verified== false){
					req.flash("flash", strings.account.notVerified);
					res.redirect("/");
				} */ else {
					req.session.alter_term= result.rows[0].alter_term;
					req.session.system_term= result.rows[0].system_term;
					req.session.subsystem_term= result.rows[0].subsystem_term;
					req.session.innerworld_term= result.rows[0].innerworld_term;
					req.session.plural_term= result.rows[0].plural_term;
					req.session.loggedin = true;
					req.session.u_id= result.rows[0].id;
					req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
					req.session.is_legacy= result.rows[0].is_legacy;
					req.session.textsize= result.rows[0].textsize;
					req.session.worksheets_enabled= result.rows[0].worksheets_enabled;
			  // getCookies(req)['u_id']= result.rows[0].id;
					  // Add to cookies
					  res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('skin', result.rows[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('subsystem_term', result.rows[0].subsystem_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('innerworld_term', result.rows[0].innerworld_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('plural_term', result.rows[0].plural_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('textsize', result.rows[0].textsize,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					  .cookie('worksheets_enabled', result.rows[0].worksheets_enabled,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
			  		req.flash("flash", strings.account.loggedin);
				 	res.redirect(302, '/');
				}
			}
		});
	} else if (req.body.signingup) {
		var splash;
      var query = {
        text: "SELECT * FROM users WHERE email=$1 OR username=$2;",
        values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`]
      }
      client.query(query, (err, result) => {
          if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
          } else {
            // console.log(res.rows)
            if (result.rows.length > 0){
                console.log("Already exists.");
                splash= req.flash("flash","<strong>Uh oh!</strong> That username or email is already in use. <a href='/login'>Do you need to log in instead?</a>");
                res.render(`pages/signup`, { session: req.session, splash:splash,cookies:req.cookies });
            } else {
                // Write to the db
                console.log(`Writing...`)
                var query = {
                  text: "INSERT INTO users (email, username, pass, email_link) VALUES ($1, $2, $3, $4)",
                  values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`, `'${CryptoJS.SHA3(req.body.password)}'`, `'${Math.random().toString(36).substr(2, 16)}'`]
                }
                client.query(query, (err, result) => {
                    if (err) {
                      console.log(err.stack);
                      res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
                  } else {
					ejs.renderFile(__dirname + '/views/pages/email-welcome.ejs', { alias: req.body.username || randomise(["Buddy", "Friend", "Pal"]) }, (err, data) => {
						if (err) {
						  console.log(err);
						} else {
						  var mailOptions = {
							from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
							to: req.body.email,
							subject: `Welcome to Lighthouse, ${req.body.username}!`,
							html: data
						  };
					
						  transporter.sendMail(mailOptions, (error, info) => {
							if (error) {
							  return console.log(error);
							}
							// console.log('Message sent: %s', info.messageId);
						  });
						}
					  });
					/*
					  req.session.alt_term= result.rows[0].alter_term;
				req.session.sys_term= result.rows[0].system_term;
			   req.session.loggedin = true;
			   req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
					*/
					// res.redirect("/");
                    //   res.render(`pages/registered`, { session: req.session, splash:splash,cookies:req.cookies });
					client.query({text: "SELECT * FROM users WHERE email=$1;", values: [`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
						req.session.alter_term= result.rows[0].alter_term;
						req.session.system_term= result.rows[0].system_term;
						req.session.loggedin = true;
						req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
						
					  }
					});
					splash= req.flash("flash",`Welcome to Lighthouse, ${req.body.username}! You are now logged in.`);
						res.redirect("/");
                  }
              });
            }
          }
        });

	}
	
});



 /*

 			OTHER ROUTES (Delete, Put)
			

 */
app.put("/forum-data", (req,res) => {
		// Deleting Forum Data
		if (isLoggedIn(req)){
			if (apiEyesOnly(req)){
				if (req.body.mode=="sticky"){
					// Toggle Sticky Mode.
					client.query({text: "UPDATE threads SET is_sticky= NOT is_sticky WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
						if (err) {
							console.log(err.stack);
							res.status(400).json({code: 400, message: err.stack});
						} else {
						req.flash("flash", "Topic pinned.");
						res.status(200).json({code: 200});
						}
						});
				} else if (req.body.mode=="lock"){
					// Toggle Sticky Mode.
					client.query({text: "UPDATE threads SET is_locked= NOT is_locked WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
						if (err) {
							console.log(err.stack);
							res.status(400).json({code: 400, message: err.stack});
						} else {
						req.flash("flash", "Topic locked.");
						res.status(200).json({code: 200});
						}
						});
				} else if (req.body.mode=="pop"){
					// Toggle Sticky Mode.
					client.query({text: "UPDATE threads SET is_popular= NOT is_popular WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
						if (err) {
							console.log(err.stack);
							res.status(400).json({code: 400, message: err.stack});
						} else {
						req.flash("flash", "Topic made popular.");
						res.status(200).json({code: 200});
						}
						});
				} else if (req.body.mode=="cat-order"){
					// Toggle Sticky Mode.
					client.query({text: "UPDATE categories SET f_order= $3 WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id, req.body.order]}, (err, result) => {
						if (err) {
							console.log(err.stack);
							res.status(400).json({code: 400, message: err.stack});
						} else {
						res.status(200).json({code: 200});
						}
						});
				} 
			} else res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies })
		} else res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies })
	});
 	app.delete("/forum-data", (req,res) => {
		// Deleting Forum Data
		if (isLoggedIn(req)){
			if (apiEyesOnly(req)){
					if (req.body.mode== "category"){
						client.query({text: "DELETE FROM categories WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
							if (err) {
								console.log(err.stack);
								res.status(400).json({code: 400, message: err.stack});
							} else {
							req.flash("flash", "Category deleted.");
							res.status(200).json({code: 200});
							}
							});
					} else if (req.body.mode== "forum"){
						client.query({text: "DELETE FROM forums WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
							if (err) {
								console.log(err.stack);
								res.status(400).json({code: 400, message: err.stack});
							} else {
							req.flash("flash", "Forum deleted.");
							return res.status(200).json({code: 200});
							}
							});
					} else if (req.body.mode== "topic"){
						client.query({text: "DELETE FROM threads WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
							if (err) {
								console.log(err.stack);
								res.status(400).json({code: 400, message: err.stack});
							} else {
							req.flash("flash", "Topic deleted.");
							res.status(200).json({code: 200});
							}
							});
					} else if (req.body.mode== "reply"){
						client.query({text: "DELETE FROM thread_posts WHERE id=$1;",values: [req.body.id]}, (err, result) => {
							if (err) {
								console.log(err.stack);
								res.status(400).json({code: 400, message: err.stack});
							} else {
							req.flash("flash", "Reply deleted.");
							return res.status(200).json({code:200});
							}
							});
					}
						
					} else res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies })
		} else res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies })
	})
	app.delete('/bda', (req, res)=>{
	// Delete this post
	if (apiEyesOnly(req)){
		if (req.body.delete){
			client.query({text: "DELETE FROM bda_plans WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
				if (err) {
					console.log(err.stack);
					res.status(400).json({code: 400, message: err.stack});
				} else {
				return res.status(200).json({code:200});
				}
				});
		}
	} else {
		return res.status(403).json({code:403})
	}

	});
	app.delete('/safety-plan', (req, res)=>{
		if (apiEyesOnly(req)){
			var filePath = `./public/pdfs/${req.headers.user}.pdf`; 
			fs.unlinkSync(filePath);
			return res.json({code:200});
		}
	});

	app.put('/system-data', async function(req, res){
		if (isLoggedIn(req)){
			if (apiEyesOnly(req)){
				let editMode= req.body.edit;
				if (editMode=="pin"){
					let postID= req.body.postID;
					await db.query(client, "UPDATE comm_posts SET is_pinned = NOT is_pinned WHERE id=$1;", [postID], res, req);
					return res.status(200).json({code: 200});
				} else if (editMode== "journalPin"){
					let postID= req.body.postID;
					await db.query(client, "UPDATE posts SET is_pinned = NOT is_pinned WHERE p_id=$1;", [postID], res, req);
					return res.status(200).json({code: 200});				
				} else if (editMode=="pluralkit-system"){
					// Create a new system if user requests in Pluralkit import
					var newSys= "Imported from Pluralkit";
					client.query({text: "SELECT sys_id FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							if (result.rows.length > 0){
								newSys+= ` ${getRandomInt(111,999)}`;
							}
							// Create a new system
						client.query({text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
							if (err) {
							console.log(err.stack);
							res.status(400);
							} else {
								// Grab its ID.
								client.query({text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, fresult) => {
									if (err) {
									console.log(err.stack);
									res.status(400);
									} else {
										res.status(200).json({code:200, sys_id: fresult.rows[0].sys_id});
									}
								})
							}
						})
					}
				})

				} else if(editMode=="pluralkit-alter"){
					// Place selected alters in database.
					let altName= req.body.name == null ? `'${Buffer.from('New alter').toString('base64')}'`: `'${Buffer.from(req.body.name).toString('base64')}'`;
					let altPro= req.body.pronouns == null ? null: `'${Buffer.from(req.body.pronouns).toString('base64')}'`;
					let altBirth= req.body.birthday == null ? null: `'${Buffer.from(req.body.birthday).toString('base64')}'`;
					let altAva= req.body.avatar == null ? `'${Buffer.from('https://www.writelighthouse.com/img/avatar-default.jpg').toString('base64')}'`: `'${Buffer.from(req.body.avatar).toString('base64')}'`;
					client.query({text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url) VALUES($1, $2, $3, $4, $5);",values: [
						altName, 
						req.body.sysId,
						altPro,
						altBirth,
						altAva 
					]}, (err, result) => {
						if (err) {
						console.log(err.stack);
						res.status(400);
						} else {
							res.status(200).json({code: 200})
						}
					
					});
				} else if (editMode=="sp-system"){
					// Create a new system if user requests in Pluralkit import
					var newSys= "Imported from Simply Plural";
					client.query({text: "SELECT sys_id FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							if (result.rows.length > 0){
								newSys+= ` ${getRandomInt(111,999)}`;
							}
							// Create a new system
						client.query({text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
							if (err) {
							console.log(err.stack);
							res.status(400);
							} else {
								// Grab its ID.
								client.query({text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, fresult) => {
									if (err) {
									console.log(err.stack);
									res.status(400);
									} else {
										res.status(200).json({code:200, sys_id: fresult.rows[0].sys_id});
									}
								})
							}
						})
					}
				})

				} else if(editMode=="sp-alter"){
					// Place selected alters in database.
					let altName= req.body.name == null ? `'${Buffer.from('New alter').toString('base64')}'`: `'${Buffer.from(req.body.name).toString('base64')}'`;
					let altPro= req.body.pronouns == null ? null: `'${Buffer.from(req.body.pronouns).toString('base64')}'`;
					let altBirth= req.body.birthday == null ? null: `'${Buffer.from(req.body.birthday).toString('base64')}'`;
					let altAva= req.body.avatar == null ? `'${Buffer.from('https://www.writelighthouse.com/img/avatar-default.jpg').toString('base64')}'`: `'${Buffer.from(req.body.avatar).toString('base64')}'`;
					let altNotes= req.body.notes == null ? null : `'${Buffer.from(req.body.notes).toString('base64')}'`;
					client.query({text: "INSERT INTO alters (name, sys_id, pronouns, img_url, colour, notes) VALUES($1, $2, $3, $4, $5, $6);",values: [
						altName, 
						req.body.sysId,
						altPro,
						altAva,
						req.body.colour,
						altNotes,
					]}, (err, result) => {
						if (err) {
						console.log(err.stack);
						res.status(400);
						} else {
							res.status(200).json({code: 200})
						}
					
					});
				} else if(editMode=="add-ph-alter"){
					// Place placeholder alters in database.
					let iconNo= "https://www.writelighthouse.com/img/" + getRandomInt(1,42) + ".png";
					client.query({text: "INSERT INTO alters (name, sys_id, img_url, gender) VALUES($1, $2, $3, $4);",values: [
						`'${Buffer.from(req.body.altName).toString('base64')}'`, 
						req.body.sysid,
						`'${Buffer.from(iconNo).toString('base64')}'`,
						`'${Buffer.from(req.body.gender).toString('base64')}'`
					]}, (err, result) => {
						if (err) {
						console.log(err.stack);
						res.status(400);
						} else {
							res.status(200).json({code: 200})
						}
					
					});
				} else if(editMode=="add-comb-alter"){
					// Place fused alter into database.
					/*
					"sys_id": $("#sysLoc").val(),
                    "name": $("#newname").val(),
                    "pronouns": $("#newpro").val() == "" ? "" : $("#newpro").val(),
                    "type": $("#newtype").val() == "" ? "" : $("#newtype").val(),
                    "alts": aArr,
                    "method": method,
                    "names": fusedNames
					*/
					var listOfAlts= `Data combined from ${req.body.names}.`;
					const altId= await db.query(client, 'SELECT uuid_generate_v4() AS "newid"', [], res, req);
					const sysId= req.body.sys_id;
					const newId= altId[0].newid;
					const newAlt = await db.query(client, "INSERT INTO alters (alt_id, name, sys_id, pronouns, type, notes) VALUES ($1, $2, $3, $4, $5, $6)", [
						newId,
						`'${Buffer.from(req.body.name).toString('base64')}'`,
						sysId,
						`'${Buffer.from(req.body.pronouns).toString('base64')}'`,
						req.body.type,
						`'${Buffer.from(listOfAlts).toString('base64')}'`
					], res, req)
					
					// Now what did the user want us to do with the other alts?
					for (i in req.body.alts){
						if (req.body.method== "archive"){
							// Archive the alter.
							await db.query(client, "UPDATE alters SET is_archived=true WHERE alt_id=$1", [req.body.alts[i]], res, req);

						} else if (req.body.method== "delete"){
							// Delete the alter.
							await db.query(client, "DELETE FROM alters WHERE alt_id=$1", [req.body.alts[i]], res, req);

						} else if (req.body.method== "combine-del"){
							// Combine and delete the alters.

							try{
								// Get the old alt's id
								var oldJournQ = await db.query(client, "SELECT j_id FROM journals WHERE alt_id=$1", [req.body.alts[i]], res, req);
								var oldJourn = oldJournQ[0].j_id;

								// Make this new alt a journal.
								await db.query(client, "INSERT INTO journals(alt_id, skin, sys_id) VALUES($1, $2, $3)", [
									newId,
									'1',
									sysId
								], res, req);
								var newJourn = await db.query(client, "SELECT j_id FROM journals WHERE alt_id=$1;", [newId], res, req);
								var journId= newJourn[0].j_id;

								
								await db.query(client, "UPDATE posts SET j_id=$1 WHERE j_id=$2;", [journId,oldJourn], res, req);
							} catch (e){
								// console.log(e)
							}
							// Let's set data to the new alter.
							await db.query(client, "UPDATE threads SET alt_id=$1 WHERE alt_id=$2;", [newId, req.body.alts[i]], res, req);
							await db.query(client, "UPDATE thread_posts SET alt_id=$1 WHERE alt_id=$2;", [newId, req.body.alts[i]], res, req);
							// Now delete the alter.
							await db.query(client, "DELETE FROM alters WHERE alt_id=$1", [req.body.alts[i]], res, req);

						} else if (req.body.method== "combine-arch"){
							// Combine and archive.
							try{
								// Get the old alt's id
								var oldJournQ = await db.query(client, "SELECT j_id FROM journals WHERE alt_id=$1", [req.body.alts[i]], res, req);
								var oldJourn = oldJournQ[0].j_id;

								// Make this new alt a journal.
								await db.query(client, "INSERT INTO journals(alt_id, skin, sys_id) VALUES($1, $2, $3)", [
									newId,
									'1',
									sysId
								], res, req);
								var newJourn = await db.query(client, "SELECT j_id FROM journals WHERE alt_id=$1", [newId], res, req);
								var journId= newJourn[0].j_id;
								await db.query(client, "UPDATE posts SET j_id=$1 WHERE j_id=$2;", [journId, oldJourn], res, req);
							} catch (e){
								// console.log(e)
							}
							// Let's set data to the new alter.
							await db.query(client, "UPDATE threads SET alt_id=$1 WHERE alt_id=$2;", [newId, req.body.alts[i]], res, req);
							await db.query(client, "UPDATE thread_posts SET alt_id=$1 WHERE alt_id=$2;", [newId, req.body.alts[i]], res, req);

							// Now archive the alter.
							await db.query(client, "UPDATE alters SET is_archived=true WHERE alt_id=$1", [req.body.alts[i]], res, req);

						} else if(req.body.method== "combine-noth"){
							// Combine only, nothing else.
							try{
								// Get the old alt's id
								var oldJournQ = await db.query(client, "SELECT j_id FROM journals WHERE alt_id=$1", [req.body.alts[i]], res, req);
								var oldJourn = oldJournQ[0].j_id;

								// Make this new alt a journal.
								await db.query(client, "INSERT INTO journals(alt_id, skin, sys_id) VALUES($1, $2, $3)", [
									newId,
									'1',
									sysId
								], res, req);
								var newJourn = await db.query(client, "SELECT j_id FROM journals WHERE alt_id=$1", [newId], res, req);
								var journId= newJourn[0].j_id;
								await db.query(client, "UPDATE posts SET j_id=$1 WHERE j_id=$2;", [journId, oldJourn], res, req);
							} catch (e){
								// console.log(e)
							}
							// Let's set data to the new alter.
							await db.query(client, "UPDATE threads SET alt_id=$1 WHERE alt_id=$2;", [newId, req.body.alts[i]], res, req);
							await db.query(client, "UPDATE thread_posts SET alt_id=$1 WHERE alt_id=$2;", [newId, req.body.alts[i]], res, req);

						} else {
							// Do nothing
						}
					}
					return res.status(200).json({code: 200})
				}

			} else {
				return res.status(403).json({code:403})
			}
		} else {
			return res.status(403).json({code:403})
		}
	})


 	// ROBOTS.TXT
	 app.get("/sitemap.xml", function(req, res) {
		res.setHeader('content-type', 'text/plain');
		res.send(`
<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.writelighthouse.com"
      xsi:schemaLocation="http://www.writelighthouse.com/sitemap.xml">

<url>
  <loc>https://www.writelighthouse.com/</loc>
  <lastmod>2023-05-06T00:29:06+00:00</lastmod>
  <priority>1.00</priority>
</url>
<url>
  <loc>https://www.writelighthouse.com/signup</loc>
  <lastmod>2023-05-06T00:29:06+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>https://www.writelighthouse.com/login</loc>
  <lastmod>2023-05-06T00:29:06+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>https://www.writelighthouse.com/about</loc>
  <lastmod>2023-05-06T00:29:06+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>https://www.writelighthouse.com/changelog</loc>
  <lastmod>2023-05-06T00:29:06+00:00</lastmod>
  <priority>0.80</priority>
</url>
<url>
  <loc>https://www.writelighthouse.com/glossary</loc>
  <lastmod>2023-05-06T00:29:06+00:00</lastmod>
  <priority>0.90</priority>
</url>
<url>
  <loc>https://www.writelighthouse.com/tutorial</loc>
  <lastmod>2023-05-06T00:29:06+00:00</lastmod>
  <priority>0.75</priority>
</url>

</urlset>
		`);
	 })
	 app.get("/robots.txt", function(req, res) {
		res.setHeader('content-type', 'text/plain');
		res.send(`
User-Agent: GPTBot
Disallow: /
User-Agent: CCBot
Disallow: /
User-Agent: *
Disallow: /system
Disallow: /alter
Disallow: /editsys
Disallow: /deletesys
Disallow: /clearalter
Disallow: /edit-alter
Disallow: /mood
Disallow: /inner-world 
Disallow: /rules
Disallow: /reset
Disallow: /forgot-password
Disallow: /del-mood
Disallow: /journal
Disallow: /comm
Disallow: /profile
Disallow: /users
Disallow: /forum
Allow: /
Allow: /signup
Allow: /login
Allow: /about
Allow: /glossary
Allow: /tutorial
Crawl-delay: 10
Sitemap: www.writelighthouse.com/sitemap.xml
		`);
	 });
// DEV MODE PAGES
if (process.env["environment"]== "dev"){
	app.get("/dev-test", function (req, res){
		res.send("Congrats! You found a dev-only page.")
	})
	app.get('/inbox/:alt', async function(req, res){
		if (!checkUUID(req.params.alt)) return;
		if (isLoggedIn(req)){
			// Get Alter.
			const altInfo= await db.query(client, "SELECT alters.*, systems.* from alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alt_id=$1", [`${req.params.alt}`], res, req);
			var selectedAlt= altInfo[0];
	
			// console.log(selectedAlt)
			// Before going any further-- Check that the alter's user ID and the actual requester's user ID matches.
			if (!idCheck(req, selectedAlt.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
	
			req.session.chosenAlt= selectedAlt;
			const msg= await db.query(client, "SELECT * FROM messages WHERE sender = $1 OR recipient = $1;", [`${req.params.alt}`], res, req);
			const messages = new Array();
			msg.forEach((m)=>{
				messages.push({
					id: m.id,
					sender: m.sender,
					recipient: m.recipient,
					created_on: m.created_on,
					is_read: m.is_read,
					title: m.title
				})
			})
	
			res.render(`pages/messages`, { session: req.session, splash:splash, cookies:req.cookies, alter:selectedAlt, messages: messages });
		} else {
			forbidUser(res, req)
		}
	  });
	  app.get('/inbox/messages/:id', async function(req, res){
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			// Before going any further-- Check that the alter's user ID and the actual requester's user ID matches.		
			const msgTest= await db.query(client, "SELECT DISTINCT alters.alt_id, systems.user_id FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id INNER JOIN messages ON messages.recipient = alters.alt_id OR messages.sender = alters.alt_id WHERE messages.id=$1", [`${req.params.id}`], res, req);
			if (!idCheck(req, msgTest[0].user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies }); // Fake 404 so people think it's just a mistake.
	
			// Message Info
			const messageInf= await db.query(client, "SELECT * FROM messages WHERE id=$1", [`${req.params.id}`], res, req);
			const message={
				id: messageInf[0].id,
				sender: messageInf[0].sender,
				recipient: messageInf[0].recipient,
				body: messageInf[0].msg,
				title: messageInf[0].title,
				created_on: messageInf[0].created_on
			}
	
			const senderInf= await db.query(client, "SELECT alters.*, systems.* FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE alt_id=$1", [`${message.sender}`], res, req);
			const sender= senderInf[0];
	
			const recInf= await db.query(client, "SELECT alters.*, systems.* FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE alt_id=$1", [`${message.recipient}`], res, req);
			const recipient= recInf[0];
	
			// Mark as read if the recipient opens it!
			// if (message.recipient == )
	
			res.render(`pages/message`, { session: req.session, splash:splash, cookies:req.cookies, message: message, sender: sender, recipient: recipient});
		} else {
			forbidUser(res, req)
		}
	  });
	  app.get('/inbox/:alt/create', async function(req, res){
		if (!checkUUID(req.params.alt)) return;
		if (isLoggedIn(req)){
			// Get Alter.
			const altInfo= await db.query(client, "SELECT alters.*, systems.* from alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alt_id=$1", [`${req.params.alt}`], res, req);
			var selectedAlt= altInfo[0];
	
			// console.log(selectedAlt)
			// Before going any further-- Check that the alter's user ID and the actual requester's user ID matches.
			if (!idCheck(req, selectedAlt.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
	
			res.render(`pages/create_message`, { session: req.session, splash:splash, cookies:req.cookies, alter:selectedAlt });
		} else {
			forbidUser(res, req)
		}
	  })

	app.post('/inbox/:alt/create', async function(req, res){
		if (!checkUUID(req.params.alt)) return;
		if (isLoggedIn(req)){
			// Get Alter.
			const altInfo= await db.query(client, "SELECT alters.*, systems.* from alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alt_id=$1", [`${req.params.alt}`], res, req);
			var selectedAlt= altInfo[0];
			// Before going any further-- Check that the alter's user ID and the actual requester's user ID matches.
			if (!idCheck(req, selectedAlt.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });

			await db.query(client, "INSERT INTO messages (sender, recipient, title, msg) VALUES ($1, $2, $3, $4)", [
				`${req.params.alt}`,
				`${req.body.recipient}`,
				`${encryptWithAES(req.body.fTitle)}`,
				`${encryptWithAES(req.body.msgBody)}`
			], res, req);
	
			res.redirect(`/inbox/${req.params.alt}`)
		} else {
			forbidUser(res, req)
		}
	  })
}
  // ERROR ROUTES. DO NOT PUT NEW PAGES BENEATH THESE.

  app.use(function (err, req, res, next) {
	if (err) {
	  console.error(err.stack);
	  res.status(500).render('pages/error', { session: req.session, code:"General Error", cookies:req.cookies });
	} else if (!res.headersSent) { // Check if response headers are already sent
	  next(err); // Pass on other errors, including 404
	}
  });

	app.use(function(req,res){
			res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });
	});

	
  // End pages.
  app.listen(PORT, async function(res, req){
	let rn= await db.query(client, "SELECT NOW();", [], res, req);
	console.log(`⚓ Docked at Port ${ PORT }. The time is ${(rn[0].now).toLocaleString('en-GB', { timeZone: 'EST' })}`)
});

