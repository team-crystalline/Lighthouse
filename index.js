const express = require('express');
var bodyParser=require("body-parser");
var cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const PORT = process.env.PORT || 5000;
const { Pool, Client,pg } = require('pg');
const bcrypt = require("bcrypt");
const CryptoJS = require("crypto-js");
const request = require('request');
const PKAPI = require("pkapi.js");
const fs = require('fs');
var pdf = require("html-pdf");
const nodemailer = require('nodemailer');
const ejs = require('ejs');
var pluralize = require('pluralize');
var pjson = require('./package.json');
var flash = require('express-flash');
console.log( `Lighthouse v${pjson.version}`);

const tuning= require('./js/genVars.js');
const strings= require("./lang/en.json")

require('dotenv').config();

function getKeyByValue(object, value) {
	return Object.keys(object).find(key => object[key] === value);
  }

  /**
 * @param query- What you're fetching info on: Alters, Systems, Groups, etc.
 * @param id- The id of the information you're fetching. Usually a system id or alter id 
 */
  async function getPK(query, id){
	// Go grab pluralkit
	var fetchURL;
	switch (query){
		case "alter":
			fetchURL= `https://api.pluralkit.me/v2/members/${id}`;
			break;
		default:
			// Members in a system is default.
			fetchURL= `https://api.pluralkit.me/v2/systems/${id}/members`;
			break;
	}
	let response = await fetch(fetchURL, { 
		headers: {
			"User-Agent": "Lighthouse/Web App (www.writelighthouse.com, dee_deyes@writelighthouse.com, put here for contact if PK devs need to)" 
		} 
	});
	// return await JSON.parse(response.text());
	return await response.text();
}
 

const getCookies = (req) => {
 // We extract the raw cookies from the request headers
 if (!req.headers.cookie) return 'undefined';
 const rawCookies = req.headers.cookie.split('; ');
 // rawCookies = ['myapp=secretcookie, 'analytics_cookie=beacon;']

 const parsedCookies = {};
 rawCookies.forEach(rawCookie=>{
 const parsedCookie = rawCookie.split('=');
 // parsedCookie = ['myapp', 'secretcookie'], ['analytics_cookie', 'beacon']
  parsedCookies[parsedCookie[0]] = parsedCookie[1];
 });
 return parsedCookies;
};

var alterTypes=["Apparently Normal Part", "Emotional/Traumatised Part", "Younger Part", "Older Part",  "Introject (Factual)", "Introject (Fictional)", "Non-human", "Robot", "Animal", "Fragment", "Introject (Mixed)"]

const api = new PKAPI({
	base_url: "https://api.pluralkit.me", // base api url
	version: 1, // api version
	token: undefined // for authing requests. only set if you're using this for a single system!
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  auth: {
    user: 'dee_deyes@writelighthouse.com',
    pass: process.env.gmail_pass,
  },
});

function getRandomInt(min, max){
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isLoggedIn(req){
  return req.cookies.loggedin == 'true';
}

function idCheck(req){
	return getCookies(req)['u_id']== req.session.u_id;
}


var splash;
// function randomise(arr){
//       return arr[Math.floor(Math.random()*arr.length)];
// }


function apiEyesOnly(req) {
	if (req.headers['api-lh-call']) {
	   // custom header exists, then call next() to pass to the next function
	//    console.log("This is the API.")
	   return true;
	} else {
	  return false;     
	}
  }
if (process.env['environment']== "dev"){
	console.log("Starting Lighthouse in SANDBOX mode.");
	var client = new Client({
		user: "postgres",
		host: "localhost",
		database: "Sandbox",
		password: "",
		port: 5432
	  });
} else {
	console.log("Starting Lighthouse in PRODUCTION mode.");
	var client = new Client({
		user: process.env.DB_USER,
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		password: process.env.DB_PASS,
		port: process.env.DB_PORT,
		ssl: { rejectUnauthorized: false }
	  });
	
}


client.connect();


var app = express();
app.use(flash());
  app.use('/', express.static(__dirname + '/public'))
  app.use(session({
	secret: process.env.sec,
	resave: true,
	saveUninitialized: true
    }));
app.use(bodyParser.json()).use(bodyParser.urlencoded({extended: true}));

  app.use(cookieParser());
  app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
	});
app.locals.editorColours=[
	{color: 'red',label: 'Red'},
	{color: '#ff691f',label: 'Orange'},
	{ color: '#ffc20a',label: 'Yellow'},
	{color: 'green',label: 'Green'},
	{color: 'teal',label: 'Teal'},
	{color: 'blue',label: 'Blue'},
	{color: 'purple',label: 'Purple'},
	{color: '#ff0f83',label: 'Pink'},
	{color:'#663c28', label: 'Brown'}, 
	{color: 'lightgray', label: 'Silver'}, 
	{color: 'gray', label: 'Stone'}, 
	{color: 'black', label: 'Black'}, 
	{color: 'white', label: "White"}
]
app.locals.journalArr= [
	{val: '1', c: "Red"}, 
	{val: '2', c: "Orange"}, 
	{val: '3', c: "Yellow"}, 
	{val: '4', c: "Green"}, 
	{val: '5', c: "Teal"}, 
	{val: '6', c: "Blue"}, 
	{val: '7', c: "Purple"}, 
	{val: '8', c: "Pink"}, 
	{val: '9', c: "White"}, 
	{val: '10', c: "Black"}, 
	{val: '11', c: "Rainbow"}, 
	{val: '12', c: "Ocean"}, 
	{val: '13', c: "Space"}, 
	{val: '14', c: "Winter"}, 
	{val: '15', c: "Autumn"}, 
	{val: '16', c: "Spring"}, 
	{val: '17', c: "Summer"}, 
	{val: '18', c: "Flowers"},  // 19 is skipped bc that's the legacy journal.
	{val: '20', c: "Witchy"},
	{val: '21', c: "Spraypaint"},
	{val: '22', c: "Princess"},
]
app.locals.strings=strings;

app.locals.legacyJournal= {val: '19', c: "Legacy"};
app.locals.moods=[
    // Positive
    {name: "Joyous", positive: true, emoji: "😄"}, // 0
    {name: "Loved", positive: true, emoji: "🤗"}, // 1
    {name: "Satisfied", positive: true, emoji: "🙂"}, // 2
    {name: "Content", positive: true, emoji: "😌"}, // 3
    {name: "Interested", positive: true, emoji: "😮"}, //4
    {name: "Amused", positive: true, emoji: "😆"}, // 5
    {name: "Happy", positive: true, emoji: "😀"}, // 6
    {name: "Serene", positive: true, emoji: "😊"}, // 7
    {name: "Awestruck", positive: true, emoji: "🤩"}, // 8
    {name: "Sleepy", positive: true, emoji: "😴"}, // 9
    {name: "Afraid", positive: false, emoji: "😨"}, // 10
    {name: "Frustrated", positive: false, emoji: "😖"}, // 11
    {name: "Overwhelmed", positive: false, emoji: "😖"}, // 12
    {name: "Dazed", positive: false, emoji: "😵"}, // 13
    {name: "Confused", positive: false, emoji: "🤨"}, // 14
    {name: "Angry", positive: false, emoji: "😡"}, // 15
    {name: "Enraged", positive: false, emoji: "🤬"}, // 16
    {name: "Disgusted", positive: false, emoji: "🤢"}, // 17
    {name: "Sad", positive: false, emoji: "🙁"}, // 18
    {name: "Lonely", positive: false, emoji: "😢"}, // 19
    {name: "Upset", positive: false, emoji: "😭"}, // 20
    {name: "Melancholy", positive: false, emoji: "😔"}, // 21
    {name: "Annoyed", positive: false, emoji: "😒"}, // 22
    {name: "Tired", positive: false, emoji: "🥱"}, // 23
    {name: "Stressed", positive: false, emoji: "😖"}, // 24
	{name: "Dissociated", positive: false, emoji: `😵`},
	{name: "Blank", positive: false, emoji: "😐"},
	{name: "Unsure", positive: false, emoji: "❓"},
	{name: "Unwell", positive: false, emoji: "😷"},
	{name: "Hurt", postive: false, emoji: "😢"},
	{name: "Affectionate", positive: true, emoji: "💖"},
	{name: "Unreal", positive: false, emoji: "😶‍🌫️"},
	{name: "Distressed", positive: false, emoji: "😫"}
]
app.locals.randomise= function (arr){
	return arr[Math.floor(Math.random()*arr.length)];
}

app.locals.truncate= function(str, n){
  return (str.length > n) ? str.slice(0, n-1) + '...' : str;
};

app.locals.distill= function(str){
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

app.locals.getOrdinal= function (n) {
	let ord = 'th';
  
	if (n % 10 == 1 && n % 100 != 11)
	{
	  ord = 'st';
	}
	else if (n % 10 == 2 && n % 100 != 12)
	{
	  ord = 'nd';
	}
	else if (n % 10 == 3 && n % 100 != 13)
	{
	  ord = 'rd';
	}
  
	return ord;
  }
app.locals.monthNames= ["January","February","March","April","May","June","July",
"August","September","October","November","December"];
app.locals.dayNames= ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


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
  
app.locals.capitalise= function(s){
		return s[0].toUpperCase() + s.slice(1);
	}
app.locals.pluralize= pluralize;

  app.set('views', path.join(__dirname, 'views'))
  app.set('view engine', 'ejs');

  app.all('*', (req, res) => {
	// Loads before all other routes.
	if (isLoggedIn(req)){
		if (!req.session.u_id){
			// Grab their IDs real quick.
		client.query({text: "SELECT * FROM users WHERE id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
			if (err) {
			console.log(err.stack);
			res.redirect("/");
			req.flash("flash", strings.account.sessionExpired);
			} else{
				// Let's grab IDs while we're at it.
				req.session.u_id= result.rows[0].id;
			}
		});
		}
		// Is this a developer account?
		if (req.session.u_id == process.env.dev1 || req.session.u_id == process.env.dev2){
			req.session.is_dev=true;
		}
		
		if (!req.session.system_term){
			// Is it in their cookies?
			if (getCookies(req)['system_term']){
				req.session.system_term=getCookies(req)['system_term'];
			} else {
				// Can We grab it?
					client.query({text: "SELECT * FROM users WHERE id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  req.session.system_term="system";
					  }
					  if (result.rows.length==0){
						// No match.
						req.session.system_term= "system";
					  } else {
						req.session.system_term= result.rows[0].system_term;
					  }
					});
			}
		}
		if (!req.session.alter_term){
			// Is it in their cookies?
			if (getCookies(req)['alter_term']){
				req.session.alter_term=getCookies(req)['alter_term'];
			} else {
				// Can We grab it?
					client.query({text: "SELECT * FROM users WHERE id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  req.session.alter_term="alter";
					  } else{
						if (result.rows.length==0){
							// No match.
							req.session.alter_term= "alter";
						} else {
							req.session.alter_term= result.rows[0].alter_term;
						}
						// Let's grab IDs while we're at it.
						req.session.id= result.rows[0].id;
					  }

					});
			}
		}
	}

	req.next();
  });

 if (process.env.maintenance== "true"){
	// Maintenance mode on.
	app.use(function(req,res){
		return res.render(`pages/maintenance`, { session: req.session, splash:splash, cookies:req.cookies });
});
	
 }
  // PAGES- GET REQUEST
  app.get('/', (req, res) => {
	  client.query({text: "SELECT COUNT(id) FROM users;",values: []}, (err, result) => {
		  if (err) {
			console.log(err.stack);
			res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		} else {
			var userCount= result.rows[0].count;
			client.query({text: "SELECT * FROM donators;",values: []}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				var donators= result.rows;
				res.render(`pages/index`, { session: req.session, splash:splash, userCount:userCount, cookies:req.cookies, version: pjson.version, donators:donators });
	        splash=null;
			  }
			});
			
		}
	});
  });
  app.get('/safety-plan', (req, res) => {
	if (isLoggedIn(req)){
		if(apiEyesOnly(req)){
			client.query({text:'SELECT * FROM safetyplans WHERE u_id=$1;', values: [getCookies(req)['u_id']]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				var user={
					id: req.headers.user,
					name: getCookies(req)['username'],
					symptoms: decryptWithAES(result.rows[0].symptoms),
					safepeople: decryptWithAES(result.rows[0].safepeople),
					distractions: decryptWithAES(result.rows[0].distractions),
					keepsafe: decryptWithAES(result.rows[0].keepsafe),
					gethelp: decryptWithAES(result.rows[0].gethelp),
					grounding: decryptWithAES(result.rows[0].grounding)
				}
				// Read HTML Template
				ejs.renderFile(path.join(__dirname, './views/pages/', "safetyplan-pdf.ejs"), {user: user}, (err, data) => {
					if (err) {
						  return res.json({code: 404, msg: `Render File: ${err}`});
					} else {
						let options = {
							childProcessOptions: {
								env: {
								  OPENSSL_CONF: '/dev/null',
								},
							  },
							"height": "11in",
							"width": "8.5in",
							"header": {
								"height": "0in"
							},
							"footer": {
								"height": "0in",
							},
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
			  }
			  
			});
			
			
		} else {

			var plans;

			client.query({text:'SELECT * FROM safetyplans WHERE u_id=$1;', values: [getCookies(req)['u_id']]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				if (result.rows.length > 0){
					// Plan found
					try{
							plans= {
							symptoms: decryptWithAES(result.rows[0].symptoms),
							safepeople: decryptWithAES(result.rows[0].safepeople),
							distractions: decryptWithAES(result.rows[0].distractions),
							keepsafe: decryptWithAES(result.rows[0].keepsafe),
							gethelp: decryptWithAES(result.rows[0].gethelp),
							grounding: decryptWithAES(result.rows[0].grounding)
						}
					} catch (e){
						plans= null;
					}
					
					
				} else {
					// No plan. Make plan.
					client.query({text:'INSERT INTO safetyplans (u_id) VALUES ($1);', values: [getCookies(req)['u_id']]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
					  } else {
						plans = null;
					  }
					});
				}
				
			  }
			  res.render(`pages/safetyplan`, { session: req.session, splash:splash, cookies:req.cookies, safetyplan: plans});
			});
		}
		
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
});
app.get('/safety-plan/edit', (req, res) => {
	if (isLoggedIn(req)){
		client.query({text:'SELECT * FROM safetyplans WHERE u_id=$1;', values: [getCookies(req)['u_id']]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			
			if (result.rows.length== 0){
				// Uh oh! Create a plan.
				client.query({text:'INSERT INTO safetyplans (u_id) VALUES($1);', values: [getCookies(req)['u_id']]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
				  } else {
					 //Select again.
					 client.query({text:'SELECT * FROM safetyplans WHERE u_id=$1;', values: [getCookies(req)['u_id']]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
					  } else {
						var plans= {
							symptoms: decryptWithAES(result.rows[0].symptoms),
							safepeople: decryptWithAES(result.rows[0].safepeople),
							distractions: decryptWithAES(result.rows[0].distractions),
							keepsafe: decryptWithAES(result.rows[0].keepsafe),
							gethelp: decryptWithAES(result.rows[0].gethelp),
							grounding: decryptWithAES(result.rows[0].grounding)
						}
					  }
					});
				  }
				});
			} else {
				try{
							var plans= {
							symptoms: decryptWithAES(result.rows[0].symptoms),
							safepeople: decryptWithAES(result.rows[0].safepeople),
							distractions: decryptWithAES(result.rows[0].distractions),
							keepsafe: decryptWithAES(result.rows[0].keepsafe),
							gethelp: decryptWithAES(result.rows[0].gethelp),
							grounding: decryptWithAES(result.rows[0].grounding)
						}
				} catch (e){
					var plans= {
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
		  }
		});
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
});
  app.get('/DES', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/des`, { session: req.session, splash:splash, cookies:req.cookies});
	splash=null;
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
});

  app.get('/worksheets', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/worksheets`, { session: req.session, splash:splash, cookies:req.cookies });
	splash=null;
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });

  app.get('/search', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/search`, { session: req.session, splash:splash, cookies:req.cookies });
	splash=null;
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });

  app.get('/mod', (req, res) => {
	if (isLoggedIn(req)){
		if (req.session.is_dev){
			res.render(`pages/mod-panel`, { session: req.session, splash:splash, cookies:req.cookies });
		}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });
  app.get('/bda', (req, res) => {
	if (isLoggedIn(req)){
		if (apiEyesOnly(req)){
			// This is an API Call.
			client.query({text: "SELECT * FROM bda_plans WHERE u_id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				let bdaArr= new Array();
				// Object { id: "sdfsdf", before: "sdfsdf", during: "sdfsdf", after: "sdfsdf", is_active: true, alias: "adasd", timestamp: "2023-06-03T23:36:59.412Z" }
				for (i in result.rows){
					bdaArr.push({id: result.rows[i].id, before: decryptWithAES(result.rows[i].before), during: decryptWithAES(result.rows[i].during), after: decryptWithAES(result.rows[i].after), is_active:result.rows[i].is_active, alias: decryptWithAES(result.rows[i].alias), timestamp: result.rows[i].timestamp})
				}
				  return res.status(200).json({code:200, body: bdaArr})
			  }
		  });
		} else {
			res.render(`pages/bda`, { session: req.session, splash:splash, cookies:req.cookies });
		}
		
	splash=null;
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });

  app.get('/bda/edit/:id', (req, res) => {
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
	
	client.query({text: "SELECT * FROM changelog ORDER BY log_id DESC LIMIT 50",values: []}, (err, result) => {
		if (err) {
		  console.log(err.stack);
		  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
	  } else {
		res.render(`pages/changelog`, { session: req.session, splash:splash, cookies:req.cookies, changes:result.rows, lang:req.acceptsLanguages()[0] });
	  }
  });

});
app.get('/glossary', (req, res, next) => {
	
	client.query({text: "SELECT * FROM glossary ORDER BY term ASC;",values: []}, (err, result) => {
		if (err) {
		  console.log(err.stack);
		  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
	  } else {
		var terms= result.rows;
		client.query({text: "SELECT * FROM glossary WHERE essential= true ORDER BY term ASC;",values: []}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			res.render(`pages/glossary`, { session: req.session, splash:splash, cookies:req.cookies, terms:terms, important:result.rows, lang:req.acceptsLanguages()[0] });
			splash=null; 
		  }
	  });
	  }
  });

});
app.get('/thank-you', (req, res, next) => {
	res.render(`pages/thankyou`, { session: req.session, splash:splash, cookies:req.cookies });
	splash=null;
});

  app.get('/about', (req, res, next) => {
      res.render(`pages/about`, { session: req.session, splash:splash, cookies:req.cookies });
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
      splash=null;
  });

  app.get('/login', (req, res, next) => {
      res.render(`pages/login`, { session: req.session, splash:splash,cookies:req.cookies });
      splash=null;
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
     req.flash("flash", strings.account.loggedout);
	 req.session.destroy();
	 res.clearCookie('loggedin');
	 res.clearCookie('username');
	 res.clearCookie('u_id');
	 res.clearCookie('cookie1');
	 res.clearCookie('cookie2');
	 res.clearCookie('system_term');
	 res.clearCookie('alter_term');
	 res.clearCookie('is_legacy');
	 res.clearCookie('skin');
     res.redirect("/");
  });


  app.get('/reset/:id', (req, res)=>{
     res.render("pages/new_pass", {session: req.session, splash:splash, cookies:req.cookies});
		 splash=null;
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
	if (isLoggedIn(req)){
		client.query({text:'UPDATE wishlist SET is_filled=true WHERE uuid=$1', values: [`${req.params.id}`]}, (err, result)=>{
			if (err){
				console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			}
			req.flash("flash", strings.wish.granted);
			res.redirect("/wish");
		});
		
	}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
});

app.get('/wish-d/:id', (req, res) => {
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
					req.session.innerWorld= result.rows;
				}
				res.render(`pages/innerworld`, { session: req.session, splash:splash,cookies:req.cookies });
				splash=null;
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	});

	app.get('/rules', (req, res, next) => {
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM sys_rules WHERE u_id=$1;", values:[getCookies(req)['u_id']]}, (err, result)=>{
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
					// console.table(req.session.alters);
					// req.session.alters = [];
  	              // for (i in (result.rows)){
  	              //     // (req.session.sys).push(Buffer.from(result.rows[i].sys_alias, 'base64').toString())
  	              //     (req.session.alters).push({name: Buffer.from(result.rows[i].name, 'base64').toString(), id: result.rows[i].sys_id, sys_name: Buffer.from(result.rows[i].sys_alias, 'base64').toString()})
  	              // }
				  res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys, alters: result.rows,cookies:req.cookies });
				}
				});
			}
			// res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys });
		  });
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	  // res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.params.alt });
  });

  app.get('/deletesys/:alt', (req, res)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM systems WHERE sys_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				req.session.chosenSys= result.rows[0];
			}
			res.render(`pages/delete_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys,cookies:req.cookies });
		  });
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	  // res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.params.alt });
  });

  app.get('/clearalter', (req, res, next)=>{
	  req.session.journalUser= null;
		res.redirect('/system');
  });

  app.get('/system-data', (req, res, next) => {
	if (isLoggedIn(req)){
		if (apiEyesOnly(req)){
			if (req.headers.grab== "comm-posts"){
				// Communal Journal Posts.
				client.query({text: "SELECT * FROM systems WHERE user_id=$1",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  req.flash("Our database hit an error.");
					  res.status(400).json({code: 400});
				  } else {
					var sysArr = new Array();
					for (i in result.rows){
						sysArr.push({ sys_id: result.rows[i].sys_id, alias: Buffer.from(result.rows[i].sys_alias, "base64").toString(), icon:result.rows[i].icon})
					}
					client.query({text: "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false ORDER BY created_on DESC;",values: [`${getCookies(req)['u_id']}`]}, (err, cresult) => {
						if (err) {
						  console.log(err.stack);
						  req.flash("Our database hit an error.");
						  res.status(400).json({code: 400});
					  } else {
						var nonPinned= new Array();
						for (i in cresult.rows){
							nonPinned.push({ title: decryptWithAES(cresult.rows[i].title), body: decryptWithAES(cresult.rows[i].body),  created_on: cresult.rows[i].created_on, id: cresult.rows[i].id})
						}
						client.query({text: "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=true ORDER BY created_on DESC;",values: [`${getCookies(req)['u_id']}`]}, (err, dresult) => {
							if (err) {
							  console.log(err.stack);
							  req.flash("Our database hit an error.");
							  res.status(400).json({code: 400});
						  } else {
							var isPinned= new Array();
						for (i in dresult.rows){
							isPinned.push({ title: decryptWithAES(dresult.rows[i].title), body: decryptWithAES(dresult.rows[i].body),  created_on: dresult.rows[i].created_on, id: dresult.rows[i].id})
						}
							res.json({code: 200, sysArr: sysArr, nonPinned: nonPinned, isPinned: isPinned});
						  }
						});
					  }
					});
				  }
				});
			} else if (req.headers.grab == "alters"){
				// Fetch alters
				client.query({text: "SELECT * FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  req.flash("Our database hit an error.");
					  res.status(400).json({code: 400});
				  } else {
					var resArr= new Array();
					for (i in result.rows){
						//        alt_id: "b439e292-e7a4-4faf-a337-359f1cf619d4", sys_id: "ae81f836-a17c-484b-a664-65a6557c9ad9", name: "'QWx0ZXIgMg=='", acc: null,age: "0",agetext: null,alt_id: "b439e292-e7a4-4faf-a337-359f1cf619d4",birthday: null,dislikes: null,first_noted: null,fronttells: null,gender: null,icon: null,img_url: "aHR0cHM6Ly93d3cud3JpdGVsaWdodGhvdXNlLmNvbS9pbWcvYXZhdGFyLWRlZmF1bHQuanBn",job: null,likes: null,name: "'QWx0ZXIgMg=='",notes: null,pronouns: null,relationships: null,safe_place: null,sexuality: null,source: null,sys_alias: "'TmV3IFN5cw=='",sys_id: "ae81f836-a17c-484b-a664-65a6557c9ad9",triggers_neg: null,triggers_pos: null,type: null,"type-OLD": null,user_id: "233f526a-bec6-44e9-9da5-3c6f60601a47",wants: null

						resArr.push({
							alt_id: result.rows[i].alt_id, 
							sys_id: result.rows[i].sys_id, 
							name: (result.rows[i].name != null ? Buffer.from(result.rows[i].name, "base64").toString() : null), 
							acc: (result.rows[i].acc != null ? Buffer.from(result.rows[i].acc, "base64").toString() : null), 
							agetext: (result.rows[i].agetext != null ? Buffer.from(result.rows[i].agetext, "base64").toString() : null), 
							birthday: (result.rows[i].birthday != null ? Buffer.from(result.rows[i].birthday, "base64").toString() : null), 
							dislikes: (result.rows[i].dislikes != null ? Buffer.from(result.rows[i].dislikes, "base64").toString() : null), 
							first_noted: (result.rows[i].first_noted != null ? Buffer.from(result.rows[i].first_noted, "base64").toString() : null), 
							fronttells: (result.rows[i].fronttells != null ? Buffer.from(result.rows[i].fronttells, "base64").toString() : null), 
							gender:(result.rows[i].gender != null ? Buffer.from(result.rows[i].gender, "base64").toString() : null), 
							img_url: (result.rows[i].img_url != null ? Buffer.from(result.rows[i].img_url, "base64").toString() : null), 
							job: (result.rows[i].job != null ? Buffer.from(result.rows[i].job, "base64").toString() : null), 
							likes: (result.rows[i].likes != null ? Buffer.from(result.rows[i].likes, "base64").toString() : null), 
							sexuality:(result.rows[i].sexuality != null ? Buffer.from(result.rows[i].sexuality, "base64").toString() : null), 
							source: (result.rows[i].source != null ? Buffer.from(result.rows[i].source, "base64").toString() : null), 
							sys_alias: Buffer.from(result.rows[i].sys_alias, "base64").toString(), 
							triggers_neg: (result.rows[i].triggers_neg != null ? Buffer.from(result.rows[i].triggers_neg, "base64").toString() : null), 
							triggers_pos: (result.rows[i].triggers_pos != null ? Buffer.from(result.rows[i].triggers_pos, "base64").toString() : null), 
							type: result.rows[i].type, 
							wants: (result.rows[i].wants != null ? Buffer.from(result.rows[i].wants, "base64").toString() : null), 
							pronouns: (result.rows[i].pronouns != null ? Buffer.from(result.rows[i].pronouns,"base64").toString() : null),
							relationships: (result.rows[i].relationships != null ? Buffer.from(result.rows[i].relationships,"base64").toString() : null),
							notes: (result.rows[i].notes != null ? Buffer.from(result.rows[i].notes,"base64").toString() : null),
							safe_place: (result.rows[i].safe_place != null ? Buffer.from(result.rows[i].safe_place,"base64").toString() : null),
						});
					}
					res.status(200).json({code: 200, search: resArr});
				  }
				});
			} else if (req.headers.grab== "journals"){
				client.query({text: "SELECT systems.sys_id, alters.name, journals.j_id FROM alters INNER JOIN systems ON systems.sys_id= alters.sys_id INNER JOIN journals ON journals.alt_id = alters.alt_id WHERE systems.user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, aresult) => {
					if (err) {
					  console.log(err.stack);
					  req.flash("Our database hit an error.");
					  res.status(400).json({code: 400});
				  } else {
					let journalArr= new Array();
					for (i in aresult.rows){
						journalArr.push({j_id: aresult.rows[i].j_id, sys_id: aresult.rows[i].sys_id, name: Buffer.from(aresult.rows[i].name, "base64").toString()})
					}
					res.status(200).json({code: 200, search: journalArr});
				  }
				});
			}
			
		} else return res.status(403);
	} else return res.status(403);
  
});
  app.get('/system', (req, res, next) => {
    if (isLoggedIn(req)){
		res.status(200).render('pages/system',{ session: req.session, splash:splash,cookies:req.cookies });
    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
    }
  });

	var alterArr;
  app.get('/system/:id', (req, res, next) => {
    if (isLoggedIn(req)){
		client.query({text: "SELECT systems.sys_id, systems.user_id, systems.sys_alias, alters.alt_id, systems.icon FROM systems LEFT JOIN alters ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1 ORDER BY alters.name ASC;",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  req.session.chosenSys= result.rows[0];
			  // chosenSys.sys_id, chosenSys.user_id, chosenSys.sys_alias
		  }
		});
			client.query({text: "SELECT alters.alt_id, alters.sys_id, alters.name, alters.pronouns, alter_moods.mood FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.sys_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
	            if (err) {
	              console.log(err.stack);
	              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
	          } else {
	              req.session.alters = [];
	              for (i in (result.rows)){
	                //   console.table(result.rows[i]);
	                  (req.session.alters).push({name: Buffer.from(result.rows[i].name, 'base64').toString(), id: result.rows[i].sys_id, a_id: result.rows[i].alt_id, mood: result.rows[i].mood, pronouns: result.rows[i].pronouns})
	              }
				  (req.session.alters).sort((a, b) => a.name.localeCompare(b.name))
	          }
			  // console.table(req.session.sys);
			  (req.session.alters).sort((a, b) => a.distance - b.distance)
	          res.render(`pages/sys_info`, { session: req.session, splash:splash, alterArr: req.session.alters,cookies:req.cookies});
	        });

    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
    }
    splash=null;
  });

  app.get("/alter/:id", (req, res, next)=>{
	 if (isLoggedIn(req)){
		 client.query({text: "SELECT alter_moods.*, alters.*, systems.sys_alias FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
			   console.log(err.stack);
			   console.log("Error with alter moods query.");
			   return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		   } else {
			try{
				req.session.chosenAlter = result.rows[0];
			   if (req.session.chosenAlter.reason){
				req.session.chosenAlter.reason = `${decryptWithAES(result.rows[0].reason)}`;
			   }
			} catch (e){
				console.log("No mood.")
			}
			   
		   }
		   client.query({text: "SELECT * FROM journals WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, nresult) => {
			   if (err) {
				  console.log(err.stack);
				  console.log("Error with alter journals query.");
				 return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  req.session.altJournal = nresult.rows;
			  }

				client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
	 			 if (err) {
	 			   console.log(err.stack);
				   console.log("Error with alter's system query.");
	 			  return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
	 		   } else {
	 			   req.session.sysList = result.rows;
	 		   }
				  res.render(`pages/alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes });
			 });
		   });
		 });
	 } else {
		 res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	 }
  });

  app.get("/edit-alter/:id", (req, res, next)=>{

	if (isLoggedIn(req)){
		client.query({text: "SELECT alters.* FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  req.session.chosenAlter = result.rows[0];
			  res.render(`pages/edit_alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes });
		  }
		});
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}
 });
 app.get("/mood/:id", (req, res, next)=>{

	if (isLoggedIn(req)){
		client.query({text: "SELECT alters.name, alters.alt_id, alters.sys_id, alter_moods.* FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  req.session.chosenAlter = result.rows[0];
			  if (req.session.chosenAlter.reason){
				req.session.chosenAlter.reason = `${decryptWithAES(result.rows[0].reason)}`;
			  }
			  res.render(`pages/set_mood`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes });
		  }
		});
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}
 });
 app.get("/del-mood/:id", (req, res, next)=>{

	if (isLoggedIn(req)){
		client.query({text: "DELETE FROM alter_moods WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  req.session.chosenAlter = result.rows[0];
			  // Redirect to the alter's page!
			  res.redirect(`/alter/${req.params.id}`);
		  }
		});
	}
});

  app.get('/journal/:id', (req, res)=>{
	 if (isLoggedIn(req)){
		 if (req.session.chosenAlter.alt_id == req.params.id){
			// grab their journal.
			client.query({text: "SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;",values: [`${req.session.altJournal[0].j_id}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
 			  } else {
 				  req.session.journalPosts = result.rows;
				  for (i in req.session.journalPosts){
					  req.session.journalPosts[i].body= decryptWithAES(req.session.journalPosts[i].body);
					  req.session.journalPosts[i].title= decryptWithAES(req.session.journalPosts[i].title);
				  }
				  res.render(`pages/journal`, { session: req.session, splash:splash, lang:req.acceptsLanguages()[0],cookies:req.cookies });

 			  }
		  });
		} else {
			res.redirect("/system");
		}
		// res.render(`pages/journal`, { session: req.session, splash:splash });

		splash=null;
	 } else {
		 res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	 }
  });

  app.get('/journal/:id/delete', (req, res)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM posts WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				// console.log(result.rows[0]);
				req.session.jPost= result.rows[0];
				req.session.jPost.body= decryptWithAES(req.session.jPost.body);
				req.session.jPost.title= decryptWithAES(req.session.jPost.title);
				// console.log(req.session.jPost);
				res.render(`pages/delete_post`, { session: req.session, splash:splash,cookies:req.cookies });
			}
		});
	  } else {
		  res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	  }

  });

  app.get('/journal/:id/edit', (req, res)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM posts WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				// console.log(result.rows[0]);
				req.session.jPost= result.rows[0];
				req.session.jPost.body= decryptWithAES(req.session.jPost.body);
				req.session.jPost.title= decryptWithAES(req.session.jPost.title);
				req.session.jPost.is_comm= false;
				res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:req.cookies});
			}
		});
	  } else {
		  res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	  }


  });

  app.get('/comm/:id/edit', (req, res)=>{
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM comm_posts WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
		   if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  // console.log(result.rows[0]);
			  req.session.jPost= result.rows[0];
			  req.session.jPost.body= decryptWithAES(req.session.jPost.body);
			  req.session.jPost.title= decryptWithAES(req.session.jPost.title);
			  req.session.jPost.is_comm= true;
			  // console.log(req.session.jPost);
			  res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:req.cookies });
		  }
	  });
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}


  });

  app.get('/comm/:id/delete', (req, res)=>{
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM comm_posts WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
		   if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  // console.log(result.rows[0]);
			  req.session.jPost= result.rows[0];
			  req.session.jPost.body= decryptWithAES(req.session.jPost.body);
			  req.session.jPost.title= decryptWithAES(req.session.jPost.title);
			  // console.log(req.session.jPost);
			  res.render(`pages/delete_post`, { session: req.session, splash:splash, cookies:req.cookies });
		  }
	  });
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}

  });

	app.get('/alter/:id/delete', (req, res)=>{
		req.session.chosenAlter= null;
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM alters WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				 if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					req.session.chosenAlter= result.rows[0];
				}
				// console.table(req.session.chosenAlter);
				res.render(`pages/delete_alter`, { session: req.session, splash:splash, cookies:req.cookies});
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}

	});
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
					var theirEmail = Buffer.from(result.rows[0].email, "base64").toString();
					var theirName = Buffer.from(result.rows[0].username, "base64").toString();
				}
				res.render(`pages/profile`, { session: req.session, splash:splash,cookies:req.cookies, theirEmail: theirEmail, theirName: theirName });
				splash=null;
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}

	});


	/*



			---		POST REQUEST PAGES		---



	*/
	app.post('/mod', (req, res) => {
		if (isLoggedIn(req)){
			if (req.session.is_dev){
				
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

			}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
			
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
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
		// console.table(req.session.chosenSys);
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
					req.session.chosenAlter.mood= req.body.mood;
					req.session.chosenAlter.reason=req.body.reason;
						req.flash("flash",(strings.mood.updated));
						res.redirect(302,`/alter/${req.params.alt}`);
					});
			} else {
				client.query({text: "UPDATE alter_moods SET mood=$2, reason=$3, timestamp=$4 WHERE alt_id=$1;",values: [`${req.params.alt}`, req.body.mood, `${encryptWithAES(req.body.reason)}`, `${now.getUTCFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}+${now.getTimezoneOffset()}`]}, (err, result) => {
					if (err) {
						console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					}
					// Might as well change session vars here??? idk
					req.session.chosenAlter.mood= req.body.mood;
					req.session.chosenAlter.reason=req.body.reason;
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
					console.log("Found a match.");
					if (req.body.deleteAcc){
					   console.log("User is deleting."); 
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
							   req.session.destroy();
							   res.clearCookie('loggedin');
							   res.clearCookie('username');
							   res.clearCookie('u_id');
							   res.clearCookie('cookie1');
							   res.clearCookie('cookie2');
							   res.redirect("/");
							   
						});
							
						});
					});
			}
				  
				  
			  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}

		  } else {
			if (req.body.skinSel){
				// Changing Lighthouse's skin.
				client.query({text: 'UPDATE users SET skin=$1 WHERE id=$2', values: [req.body.skinSel, getCookies(req)['u_id']]}, (err, result)=>{
					if (err) {
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						req.flash("flash", strings.account.skin);
						res.status(200).cookie('skin',  req.body.skinSel,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).redirect(`/profile`);
					}
				});
			}
			if (req.body.altTerm){
				// Updating alter term
				client.query({text: 'UPDATE users SET alter_term=$1 WHERE id=$2', values: [req.body.altTerm, getCookies(req)['u_id']]}, (err, result)=>{
					if (err) {
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						req.session.alter_term= req.body.altTerm;
					}
				});
			}
			if (req.body.sysTerm){
				// Updating alter term
				client.query({text: 'UPDATE users SET system_term=$1 WHERE id=$2', values: [req.body.sysTerm, getCookies(req)['u_id']]}, (err, result)=>{
					if (err) {
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						req.session.system_term= req.body.sysTerm;
					}
				});
			}
			if (req.body.newEmail){
				// Updating email
				client.query({text: 'UPDATE users SET email=$1 WHERE id=$2', values: [`'${Buffer.from(req.body.newEmail).toString('base64')}'`, getCookies(req)['u_id']]}, (err, result)=>{
					if (err) {
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						// req.session.email= req.body.newEmail;
						req.flash("flash", strings.account.updated);
						req.session.email= req.body.newEmail;
						res.status(200).cookie('email',  req.body.newEmail,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).render(`pages/profile`, { session: req.session, splash:splash,cookies:req.cookies, theirEmail: req.body.newEmail, theirName: req.session.username });
					}
				});
			}
			if (req.body.newName){
				// Updating username
				client.query({text: 'UPDATE users SET username=$1 WHERE id=$2', values: [`'${Buffer.from(req.body.newName).toString('base64')}'`, getCookies(req)['u_id']]}, (err, result)=>{
					if (err) {
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						req.flash("flash", strings.account.updated);
						req.session.username= req.body.newName;
						res.status(200).cookie('username',  req.body.newName,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).render(`pages/profile`, { session: req.session, splash:splash,cookies:req.cookies, theirEmail: req.session.email, theirName: req.body.newName });
					}
				});
			}
			if (req.body.changePass){
				// Updating password
				// client.query({text: 'UPDATE users SET pass=$1 WHERE email_link=$2', values: [`'${CryptoJS.SHA3(req.body.newpass)}'`,`'${req.params.id}'`]}, (err, result)=>{
				client.query({text: 'UPDATE users SET pass=$1 WHERE id=$2', values: [`'${CryptoJS.SHA3(req.body.newPass1)}'`, getCookies(req)['u_id']]}, (err, result)=>{
					if (err) {
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					} else {
						splash=req.flash("flash","Password Updated!");
						res.status(200).render(`pages/profile`, { session: req.session, splash:splash,cookies:req.cookies, theirEmail: req.session.email, theirName: req.session.username });
					}
				});
			}
		  }
		});
	});
	
	app.post('/reset/:id', (req, res)=>{
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
								splash= req.flash("flash","Updated your password. You can now log in!");
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
					// console.log(req.session.user.email_pin);
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

	app.post('/rules', (req, res)=>{
		if (isLoggedIn(req)){
			if (req.body.create){
				// Create rule.
				client.query({text:`INSERT INTO sys_rules (u_id, rule) VALUES ($1, $2)`, values:[getCookies(req)['u_id'], `'${Buffer.from(req.body.rule).toString('base64')}'`]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
					}
				});
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

	app.post('/alter/:id/delete', (req, res)=>{
		if (isLoggedIn(req)){
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
									splash=req.flash("flash",`${Buffer.from(req.session.chosenAlter.name, 'base64').toString()} deleted.`);
									req.session.chosenAlter= null;
									res.redirect(`/system`);
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
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM comm_posts WHERE id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  req.session.jPost= null;
				  res.redirect(`/system`);
			  }
		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post('/comm/:id/edit', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "UPDATE comm_posts SET title=$1, body=$2 WHERE id=$3; ",values: [`${encryptWithAES(req.body.jTitle)}`, `${encryptWithAES(req.body.jBody)}`, `${req.params.id}`]}, (err, result) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  req.session.jPost= null;
				  res.redirect(`/system`);
			  }

		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post('/journal/:id/delete', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
 			  } else {
				  req.session.jPost= null;
				  res.redirect(`/journal/${req.session.chosenAlter.alt_id}`);
			  }
		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post('/journal/:id/edit', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "UPDATE posts SET title=$1, body=$2 WHERE p_id=$3; ",values: [`${encryptWithAES(req.body.jTitle)}`, `${encryptWithAES(req.body.jBody)}`, `${req.params.id}`]}, (err, result) => {
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
						client.query({text: "UPDATE posts SET j_id =$2 WHERE p_id=$1;",values: [`${req.params.id}`, `${req.body.author}`]}, (err, result) => {
							if (err) {
							   console.log(err.stack);
							   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						   }
						});
					}
					req.session.jPost= null;
					req.flash("flash", strings.posts.moved);
					return res.redirect(`/system`);
				}
				  req.session.jPost= null;
				  res.redirect(`/journal/${req.session.chosenAlter.alt_id}`);
 			  }

		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post("/journal/:id", (req, res)=>{
		if (isLoggedIn(req)){
			if (req.body.submit){
			// session.altJournal[0].j_id
			client.query({text: "INSERT INTO posts (j_id, created_on, body, title) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4);",values: [`${req.session.altJournal[0].j_id}`, `${Date.now()}`, `${encryptWithAES(req.body.j_body)}`, `${encryptWithAES(req.body.j_title)}`]}, (err, result) => {
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
				  res.redirect(`/journal/${req.session.chosenAlter.alt_id}`);
			  }
		  });
			}
			
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}
	});

	app.post("/alter/:id", function(req, res){
			let pass= req.body.jPass || null;
			if (isLoggedIn(req)){
				if (req.body.create){
					// Create
					client.query({text: "INSERT INTO journals (alt_id, password, is_private, skin, sys_id) VALUES ($1, $2, $3, $4, $5)",values: [`${req.params.id}`, `'${CryptoJS.SHA3(req.body.jPass)}'`, `${req.body.priv}`, `'${req.body.journ}'`, `${req.session.chosenAlter.sys_id}`]}, (err, result) => {
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
					client.query({text: "UPDATE journals SET skin=$1 WHERE alt_id=$2;",values: [req.body.skin, req.params.id]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
						  splash= req.flash("flash",`<strong>All set!</strong> Journal skin updated.`);
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
	app.post("/edit-alter/:id", (req, res, next)=>{
		// Make sure to base64 all information!

		if (isLoggedIn(req)){
			client.query({text: "UPDATE alters SET name=$2, triggers_pos=$3, triggers_neg= $4, agetext=$5, likes=$6, dislikes=$7, job=$8, safe_place=$9, wants=$10, acc=$11, notes=$12, img_url=$13, type=$14, pronouns=$15, birthday=$16, first_noted=$17, gender=$18, sexuality=$19, source=$20, fronttells=$21, relationships=$22 WHERE alt_id=$1",values: [
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
			]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				splash= req.flash("flash","Page updated!");
		res.redirect(`/alter/${req.params.id}`);
			  }
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
		}

		
	});

	app.post("/system/:alt", function(req, res){
			if (isLoggedIn(req)){
				if (req.body.journ){
					client.query({text: "UPDATE systems SET icon=$2 WHERE sys_id=$1",values: [`${req.session.chosenSys.sys_id}`, `${req.body.journ}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  }
					  
				  });
				  req.flash("flash",strings.system.updated);
				}
				if (req.body.submit){
					client.query({text: "INSERT INTO alters (sys_id, name) VALUES ($1, $2)",values: [`${req.session.chosenSys.sys_id}`, `'${Buffer.from(req.body.altname).toString('base64')}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  }
				  });
				  req.flash("flash",strings.alter.created);
				}
				res.redirect(`/system/${req.session.chosenSys.sys_id}`);
				

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
		  client.query({text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${req.cookies.u_id}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  // console.table(result.rows);
				  if ((result.rows).length == 0){
					  client.query({text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
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
		console.log("Deleting.")
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

	app.post('/deletesys/:alt', function(req, res){
		// console.table(req.session.chosenSys);
		client.query({text: "SELECT * FROM systems WHERE sys_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			//   console.table(result.rows[0]);
			  if (getCookies(req)['u_id']= result.rows[0].user_id){
				  // DELETE FROM alters WHERE sys_id=$1;
				  // posts, journals, alters, system
				  client.query({text: "DELETE FROM journals WHERE sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
					  if (err){
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
							  client.query({text: "DELETE FROM alters WHERE sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
								  if (err){
									  console.log(err.stack);
									  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
								  }
								  client.query({text: "DELETE FROM systems WHERE sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
									  if (err){
										  console.log(err.stack);
										  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
									  }
									  
									  req.session.chosenSys= null;
									  res.redirect("/system");
								  });
							  });

					  }
				  });
			  } else {
					// Not their system.
					res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
			  }

		  }
		});
	});

	app.post('/editsys/:alt', function(req, res){
		// console.table(req.session.chosenSys);
		client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${req.session.chosenSys.user_id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  if (getCookies(req)['u_id']= result.rows[0].user_id){
				  client.query({text: "UPDATE systems SET sys_alias=$1 WHERE sys_id=$2;",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${req.session.chosenSys.sys_id}`]}, (err, result) => {
					  if (err){
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  } else {
						//   splash= req.flash("flash",`${Buffer.from(req.session.chosenSys.sys_alias, 'base64').toString()} has been permanently deleted.`);
						  req.flash("flash", strings.system.updated);
						  req.session.chosenSys= null;
						  res.redirect("/system");
					  }
				  });
			  } else {
					// Not their system.
					res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
			  }

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
				for (i in req.body.alterChoice){
					splitList.push(JSON.parse(req.body.alterChoice[i]));
					if (splitList[i].img== null) splitList[i].img = 'https://www.writelighthouse.com/img/avatar-default.jpg';
					if (splitList[i].pronouns== null) splitList[i].pronouns = '';
					if (splitList[i].birthday== null) splitList[i].birthday = '';
				}	
			}
			var newSys= "Imported from Pluralkit";
			/*

			    {
				name: 'Imported from Pluralkit 194',
				id: 'c2fcef33-3710-43fc-bc08-20776eb25cf0',
				icon: null
				}


			*/
			
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
					client.query({text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url) VALUES($1, $2, $3, $4, $5);",values: [`'${Buffer.from((splitList[i].name).replace(/⠀/g, " ")).toString('base64') || ''}'`, req.body.sysLoc,`'${Buffer.from(splitList[i].pronouns).toString('base64') || ''}'`,`'${Buffer.from(splitList[i].birthday).toString('base64') || ''}'`,`'${Buffer.from(splitList[i].img).toString('base64') || 'aHR0cHM6Ly9pLmliYi5jby92a3dtV2pGL2F2YXRhci1kZWZhdWx0LmpwZw=='}'`]}, (err, result) => {
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

  app.post('/signup', function(req, res) {
      // console.log(`${req.body.email}`);
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
                req.flash("flash", strings.account.alreadyExists);
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
						req.session.u_id= result.rows[0].id;
						req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
						
					  }
					});
					// req.flash("flash",`Welcome to Lighthouse, ${req.body.username}! You are now logged in.`);
					req.flash("flash", strings.account.created)
						res.redirect("/");
                  }
              });
            }
          }
        });

  });

  app.post('/', function(req, res) {
	if (req.body.loggingin){
		var query = {
			text: "SELECT * FROM users WHERE email=$1 AND pass=$2;",
			values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${CryptoJS.SHA3(req.body.password)}'`]
		  }
		  client.query(query, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				if (result.rows.length == 0){
					req.flash("flash", strings.account.incorrect);
					res.redirect(req.get('referer'));
				} else {
					 req.session.alter_term= result.rows[0].alter_term;
					 req.session.system_term= result.rows[0].system_term;
					req.session.loggedin = true;
					req.session.u_id= result.rows[0].id;
					req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
					req.session.is_legacy= result.rows[0].is_legacy;
			  // getCookies(req)['u_id']= result.rows[0].id;
					  // Add to cookies
			  if (req.body.remember){
				res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('skin', result.rows[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
			  } else {
				// console.log("Let cookies expire at end of session.");
				res.cookie('loggedin', true, {httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{httpOnly: true }).cookie('u_id', result.rows[0].id,{httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{httpOnly: true }).cookie('system_term', result.rows[0].system_term,{httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{httpOnly: true }).cookie('skin', result.rows[0].skin,{httpOnly: true });
			  }
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

 app.post('/login', function(req, res) {
     var query = {
       text: "SELECT * FROM users WHERE email=$1 AND pass=$2;",
       values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${CryptoJS.SHA3(req.body.password)}'`]
     }
     client.query(query, (err, result) => {
         if (err) {
           console.log(err.stack);
           res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
       } else {
		   if (result.rows.length == 0){
			   req.flash("flash", strings.account.incorrect);
			   res.redirect('/login');
		   } else {
				req.session.alter_term= result.rows[0].alter_term;
				req.session.system_term= result.rows[0].system_term;
			   req.session.loggedin = true;
			   req.session.u_id= result.rows[0].id;
			   req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
			   req.session.is_legacy= result.rows[0].is_legacy;
			   
         // getCookies(req)['u_id']= result.rows[0].id;
				 // Add to cookies
         if (req.body.remember){
           res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('skin', result.rows[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
         } else {
           // console.log("Let cookies expire at end of session.");
           res.cookie('loggedin', true, {httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{httpOnly: true }).cookie('u_id', result.rows[0].id,{httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{httpOnly: true }).cookie('system_term', result.rows[0].system_term,{httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{httpOnly: true }).cookie('skin', result.rows[0].skin,{httpOnly: true });
         }
					res.redirect(302, '/');
		   }
       }
   });
 });

 /*

 			OTHER ROUTES (Delete, Put)
			

 */

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

	app.put('/system-data', (req, res)=>{
		if (isLoggedIn(req)){
			if (apiEyesOnly(req)){
				let editMode= req.body.edit;
				if (editMode="pin"){
					let postID= req.body.postID;
					client.query({text: "UPDATE comm_posts SET is_pinned = NOT is_pinned WHERE id=$1;",values: [req.body.postID]}, (err, result) => {
						if (err) {
							console.log(err.stack);
							res.status(400).json({code: 400, message: err.stack});
						} else {
						 res.status(200).json({code:200});
						}
						});
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


</urlset>
		`);
	 })
	 app.get("/robots.txt", function(req, res) {
		res.setHeader('content-type', 'text/plain');
		res.send(`
User-agent: CCBot
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
Allow: /
Allow: /signup
Allow: /login
Allow: /about
Allow: /glossary
Crawl-delay: 10
Sitemap: www.writelighthouse.com/sitemap.xml
		`);
	 });
  // ERROR ROUTES. DO NOT PUT NEW PAGES BENEATH THESE.
	app.use(function(req,res){
			res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
	});
  // End pages.
  app.listen(PORT, () => console.log(`Listening on ${ PORT }`));


    client.query('SELECT NOW()', (err, res) => {
    // console.log(err, res)
    console.log(`App started on ${(res.rows[0].now).toLocaleString()}`);
    // client.end()
;
});
