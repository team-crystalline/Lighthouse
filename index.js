const express = require('express');
var bodyParser=require("body-parser");
var cookieParser = require('cookie-parser');
const session = require('cookie-session');
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
const strings= require("./lang/en.json");
const langVar= require("./js/languages.js");

require('dotenv').config();

function getKeyByValue(object, value) {
	return Object.keys(object).find(key => object[key] === value);
  }

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
  if (!req.cookies.u_id){
	return false;
  } else {
	return true;
  }
}

function idCheck(req){
	return getCookies(req)['u_id']== req.session.u_id;
}


var splash;


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
	name: "session",
	secure: true,
	secret: process.env.sec,
	resave: true,
	saveUninitialized: true,
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

	app.use(express.static(path.join(__dirname, "node_modules/tabulator-tables/dist/css")));
	app.use(express.static(path.join(__dirname, "node_modules/tabulator-tables/dist/js")));


// App Local Variables
app.locals.siteLanguage= langVar.siteLanguage;
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
app.locals.apiKey= process.env.apiKey;
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
app.locals.isLoggedIn = function (cookies){
	if (!cookies.u_id){
		return false;
	  } else {
		return true;
	  }
  }
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

// Back end Functions
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
  
app.locals.capitalise= function(s){
		return s[0].toUpperCase() + s.slice(1);
	}
app.locals.pluralize= pluralize;

  app.set('views', path.join(__dirname, 'views'))
  app.set('view engine', 'ejs');

  app.all('*', (req, res) => {
	// Loads before all other routes.
	if (isLoggedIn(req)){
			// Grab their IDs real quick.
		client.query({text: "SELECT * FROM users WHERE id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
			if (err) {
			console.log(err.stack);
			res.redirect("/");
			req.flash("flash", strings.account.sessionExpired);
			} else{
				// Let's grab IDs while we're at it.
				try{
					req.session.u_id= result.rows[0].id;
					req.session.is_legacy= result.rows[0].is_legacy;
					req.session.username= result.rows[0].username;
					req.session.email= result.rows[0].email;
					req.session.skin= result.rows[0].skin;
					req.session.system_term= truncate(result.rows[0].system_term || getCookies(req)['system_term'] || "system",16);
					req.session.alter_term= truncate(result.rows[0].alter_term || getCookies(req)['alter_term'] || "alter",16);
					req.session.subsystem_term= truncate(result.rows[0].subsystem_term || getCookies(req)['subsystem_term'] || "subsystem",16);
					req.session.inner_worlds = result.rows[0].inner_worlds;
					req.session.innerworld_term= result.rows[0].innerworld_term;
					req.session.plural_term= result.rows[0].plural_term;
					req.session.language= result.rows[0].language;
					// res
					// .cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true, secure: true })
					// .cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					// .cookie('alter_term', truncate(result.rows[0].alter_term || "alter", 16),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true, secure: true })
					// .cookie('system_term', truncate(result.rows[0].system_term|| "system", 16),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					// .cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					// .cookie('skin', result.rows[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
					// .cookie('subsystem_term', truncate(result.rows[0].subsystem_term || "subsystem", 16),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
					// Is this a developer account?
					req.session.is_dev=([process.env.dev1, process.env.dev2,process.env.dev3].includes(result.rows[0].id));
				} catch (e){
					// They logged out!
					console.log(`Caught error, skipped setting session. User ID might not exist.`)
				}

			}
		});
		

	} else {
		req.session.alter_term= "alter";
		req.session.system_term= "system";
		req.session.subsystem_term="subsystem";
	}
	/* Issue */  req.next();
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

app.get('/tutorial', (req, res) => {
		res.render(`pages/tutorial`, { session: req.session, splash:splash, cookies:req.cookies});
	
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

  app.get('/forum', (req, res) => {
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM categories WHERE u_id=$1 ORDER BY created_on ASC;",values: [getCookies(req)['u_id']]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			let categories= new Array();
			for (i in result.rows){
				categories.push({name: decryptWithAES(result.rows[i].name), desc: decryptWithAES(result.rows[i].description), icon: result.rows[i].icon, id: result.rows[i].id});
			}
			client.query({text: "SELECT * FROM forums WHERE u_id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				let forums= new Array();
				for (i in result.rows){
					forums.push({name: decryptWithAES(result.rows[i].topic), desc: decryptWithAES(result.rows[i].description), cat_id: result.rows[i].cat_id, id: result.rows[i].id});
				}
				res.render(`pages/forum`, { session: req.session, splash:splash, cookies:req.cookies, categories:categories, forums: forums });
			  }
			});
			
		  }
		});
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });
  app.get('/topic/:id', (req, res)=>{
	if (isLoggedIn(req)){
		client.query({text: "SELECT threads.*, forums.topic FROM threads INNER JOIN forums ON threads.topic_id= forums.id WHERE threads.u_id=$1 AND threads.id=$2;",values: [getCookies(req)['u_id'], req.params.id]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else { 
			// Here's the OP post
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
				client.query({text: "SELECT * FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, bresult) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
				  } else { 
					// Get alters
					let alterArr = new Array();
					for (i in bresult.rows){
						alterArr.push({
								id: bresult.rows[i].alt_id,
								name: Buffer.from(bresult.rows[i].name, "base64").toString(),
								pronouns: bresult.rows[i].pronouns?  Buffer.from(bresult.rows[i].pronouns, "base64").toString() : null,
								type: bresult.rows[i].type,
								avatar: Buffer.from(bresult.rows[i].img_url, "base64").toString() || "",
								sys_alias: Buffer.from(bresult.rows[i].sys_alias, "base64").toString() || ""
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
						res.render(`pages/thread`, { session: req.session, splash:splash, cookies:req.cookies, originalPost: originalPost, replyArr: replyArr, alterArr:alterArr, forumArr: forumArr});					
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

  app.get('/reply/:id', (req, res) => {
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM thread_posts WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			res.render(`pages/edit_reply`, { session: req.session, splash:splash, cookies:req.cookies, chosenReply: {id: result.rows[0].id, body: decryptWithAES(result.rows[0].body), alt_id: result.rows[0].alt_id, thread_id: result.rows[0].thread_id}});	
		  }
		});
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });
  
  app.get('/forum/:id', (req, res) => {
	if (isLoggedIn(req)){
		// Get Forum Name
		client.query({text: "SELECT * FROM forums WHERE u_id=$1 AND id=$2;",values: [getCookies(req)['u_id'], req.params.id]}, (err, aresult) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else { 
			// Grab Topics.
			client.query({text: `SELECT threads.*, alters.name AS "alt_name" FROM threads INNER JOIN alters ON alters.alt_id = threads.alt_id WHERE threads.u_id=$1 AND topic_id=$2  ORDER BY created_on DESC;`,values: [getCookies(req)['u_id'], req.params.id]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			  } else {
				let topics= new Array();
				for (i in result.rows){
					topics.push({name: decryptWithAES(result.rows[i].title), preview: decryptWithAES(result.rows[i].body), alt_id: result.rows[i].alt_id, is_sticky: result.rows[i].is_sticky, is_locked: result.rows[i].is_locked, is_popular: result.rows[i].is_popular, created_on: result.rows[i].created_on, id: result.rows[i].id, alter: Buffer.from(result.rows[i].alt_name, "base64").toString()});
				}
				client.query({text: `SELECT * FROM categories WHERE u_id=$1;`,values: [getCookies(req)['u_id']]}, (err, bresult) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
				  } else {
					let catArr= new Array();
					for (i in bresult.rows){
						catArr.push({id: bresult.rows[i].id, name: decryptWithAES(bresult.rows[i].name)})
					}
				res.render(`pages/topics`, { session: req.session, splash:splash, cookies:req.cookies, topics:topics, forumName: decryptWithAES(aresult.rows[0].topic), forumid: aresult.rows[0].id, catArr: catArr });
				  }
				})
			  }
			});
		  }
		});
		
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
	
  });
  app.get('/mod', (req, res) => {
	if (isLoggedIn(req)){
		if ([process.env.dev1, process.env.dev2, process.env.dev3].includes(getCookies(req)['u_id'])){
			res.render(`pages/mod-panel`, { session: req.session, splash:splash, cookies:req.cookies });
		}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });}
		
	} else {
		console.log(`An attempt to enter the mod panel was made.\n Attempt made by: ${getCookies(req)['u_id'] || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req)['email'], "base64").toString() || "N/A"}`);
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies 
	});}
	
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
	res.redirect("/lighthouse-system")
});
app.get('/lighthouse-system', (req, res, next) => {
	let alterCount= new Number();
		// Dev environment
		client.query({text: "SELECT count(alters.alt_id) FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id INNER JOIN users ON users.id= systems.user_id WHERE users.id=$1;",values: [`${process.env.environment== "dev" ? process.env.dev3 : process.env.dev2}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
		  } else {
			res.render(`pages/lighthouse-system`, { session: req.session, splash:splash, cookies:req.cookies, alterCount: result.rows[0].count });
		  }
		});
	
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
     
	 try{
		req.flash("flash", strings.account.loggedout);
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
					let innerWorld= result.rows;
					client.query({text:'SELECT * FROM users WHERE id=$1', values: [getCookies(req)['u_id']]}, (err, bresult)=>{
						if (err){
							console.log(err.stack);
							res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							let innerWorldEnabled= bresult.rows[0].inner_worlds;
							res.render(`pages/innerworld`, { session: req.session, splash:splash,cookies:req.cookies, innerWorld:innerWorld, innerWorldEnabled:innerWorldEnabled });
						}
						
					});
				}
				
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
				// In case: "AND subsys_id IS NULL"
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
  app.get('/system', (req, res, next) => {
    if (isLoggedIn(req)){
		client.query({text: "SELECT inner_worlds from USERS WHERE id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  let innerWorldEnabled= result.rows[0].inner_worlds;
			  res.status(200).render('pages/system',{ session: req.session, splash:splash,cookies:req.cookies, innerWorldEnabled:innerWorldEnabled });
		  }
		});
		
    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
    }
  });

	var alterArr;
  app.get('/system/:id', (req, res, next) => {
    if (isLoggedIn(req)){
		client.query({text: "SELECT systems.sys_id, systems.subsys_id, systems.user_id, systems.sys_alias, alters.alt_id, systems.icon FROM systems LEFT JOIN alters ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1 ORDER BY alters.name ASC;",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		  } else {
			  req.session.chosenSys= result.rows[0];
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
				  try {
					(req.session.alters).sort((a, b) => a.name.localeCompare(b.name))
				  } catch (e){
					// Weird.
				  }
	          }
			  // console.table(req.session.sys);
			  (req.session.alters).sort((a, b) => a.distance - b.distance)
	          res.render(`pages/sys_info`, { session: req.session, splash:splash, alterArr: req.session.alters,cookies:req.cookies, sys_id: req.params.id});
	        });

    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
    }
    splash=null;
  });

  app.get("/alter/:id", (req, res, next)=>{
	 if (isLoggedIn(req)){
		// Grab alters, moods, and the system alias from this alter's id.
		 client.query({text: "SELECT alter_moods.*, alters.*, systems.sys_alias FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
			   console.log(err.stack);
			   return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		   } else {
			// This is our selected alter.
			var alterInfo= result.rows[0];
			try{
				
			   if (alterInfo.reason){
				alterInfo.reason = `${decryptWithAES(result.rows[0].reason)}`;
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
				  var altJournal = nresult.rows;
			  }

				client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
	 			 if (err) {
	 			   console.log(err.stack);
				   console.log("Error with alter's system query.");
	 			  return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
	 		   } else {
	 			   req.session.sysList = result.rows;
	 		   }
				  res.render(`pages/alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes, alterInfo:alterInfo, altJournal:altJournal });
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
			  let chosenAlter = result.rows[0];
			  res.render(`pages/edit_alter`, { session: req.session, splash:splash,cookies:req.cookies, alterTypes:alterTypes,chosenAlter:chosenAlter });
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

  app.get('/journal/:id', (req, res)=>{
	 if (isLoggedIn(req)){
		client.query({text: "SELECT journals.*, alters.*, systems.sys_alias FROM journals INNER JOIN alters ON journals.alt_id= alters.alt_id INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			   console.log(err.stack);
			   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		   } else {
				let alterInfo= {
					alt_id: result.rows[0].alt_id,
					name: Buffer.from(result.rows[0].name, "base64").toString(),
					sys_alias: Buffer.from(result.rows[0].sys_alias, "base64").toString(),
					sys_id: result.rows[0].sys_id,
					journId: result.rows[0].j_id
				}
				res.render('pages/journal',{ session: req.session, splash:splash,cookies:req.cookies, alterInfo:alterInfo })
		   }
		});

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
				res.render(`pages/delete_post`, { session: req.session, splash:splash,cookies:req.cookies });
			}
		});
	  } else {
		  res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	  }

  });

  app.get('/journal/:id/edit', (req, res)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT posts.*, journals.alt_id FROM posts INNER JOIN journals ON posts.j_id= journals.j_id WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			} else {
				res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:req.cookies, cJourn: {id: result.rows[0].p_id, body: decryptWithAES(result.rows[0].body), title: decryptWithAES(result.rows[0].title), is_comm: false}, journalID: result.rows[0].j_id, alt_id:result.rows[0].alt_id});
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
			  res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:req.cookies, cJourn: {id: result.rows[0].id, body: decryptWithAES(result.rows[0].body), title: decryptWithAES(result.rows[0].title), is_comm: true} });
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
			  res.render(`pages/delete_post`, { session: req.session, splash:splash, cookies:req.cookies });
		  }
	  });
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	}

  });

	app.get('/alter/:id/delete', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM alters WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				 if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					let chosenAlter= result.rows[0];
					res.render(`pages/delete_alter`, { session: req.session, splash:splash, cookies:req.cookies,chosenAlter: chosenAlter});
				}
				
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
	app.post('/reply/:id', (req, res) => {
		if (isLoggedIn(req)){
			client.query({text: "UPDATE thread_posts SET body=$2, alt_id=$3 WHERE id=$1;",values: [`${req.params.id}`, `${encryptWithAES(req.body.editor3)}`, req.body.replyauthor]}, (err, result) => {
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

	app.post('/topic/:id', (req, res)=>{
		if (req.body.newtop){
			client.query({text: "INSERT INTO thread_posts (alt_id, body, thread_id) VALUES ($1, $2, $3)",values: [req.body.replyauthor, `${encryptWithAES(req.body.reply)}`, req.params.id]}, (err, result) => {
				if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:req.cookies });
			} else { 
				req.flash("flash", "Reply posted!");
				res.redirect(301, `/topic/${req.params.id}`);
			}
			})	
		} else if (req.body.editop){
			client.query({text: "UPDATE threads SET title=$3, body=$4, topic_id=$5, alt_id=$6 WHERE u_id=$1 AND id=$2",values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.newtitle)}`, `${encryptWithAES(req.body.newbody)}`, req.body.topicforum, req.body.author]}, (err, result) => {
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
				client.query({text: "UPDATE forums SET cat_id=$4, topic=$3 WHERE id=$2 AND u_id=$1",values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.newName)}`, req.body.newcat]}, (err, result) => {
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
					client.query({text: 'UPDATE users SET alter_term=$1 WHERE id=$2', values: [req.body.altTerm, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.alter_term= req.body.altTerm;
						}
					});
				}
				if (req.body.sysTerm){
					// Updating alter term
					client.query({text: 'UPDATE users SET system_term=$1 WHERE id=$2', values: [req.body.sysTerm, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.system_term= req.body.sysTerm;
						}
					});
				}
				if (req.body.subTerm){
					// Updating alter term
					 client.query({text: 'UPDATE users SET subsystem_term=$1 WHERE id=$2', values: [req.body.subTerm, getCookies(req)['u_id']]}, (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.subsystem_term= req.body.subTerm;
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
				// After all those changes.
				// res.cookie('subsystem_term', req.body.subTerm,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
				res.cookie('username', req.body.newName || Buffer.from(req.session.username, "base64").toString() ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('email', req.body.newEmail || req.session.email ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', req.body.altTerm || req.session.alter_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', req.body.sysTerm || req.session.system_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('subsystem_term', req.body.subTerm || req.session.subsystem_term ,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('skin', req.body.skinSel || req.session.skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).redirect(302, "/profile");
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
									splash=req.flash("flash",`${getCookies(req)['alter_term']} deleted.`);
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

	// app.post('/journal/:id/delete', (req, res)=>{
	// 	console.log("Deleting post!")
	// 	if (isLoggedIn(req)){
	// 		client.query({text: "SELECT * FROM posts WHERE p_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
 	// 		   if (err) {
 	// 			  console.log(err.stack);
 	// 			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
 	// 		  } else {
	// 			var chosenAlter= result.rows[0].j_id
	// 			  client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
	// 					if (err) {
	// 						console.log(err.stack);
	// 						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
	// 					} else {
	// 						req.session.jPost= null;
	// 						req.flash("flash", "Post deleted.");
	// 						res.redirect(301, `/journal/${chosenAlter}`);
	// 					}
	// 				})
	// 			}
	// 	  });

	// 		;
	// 	} else {
	// 		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
	// 	}
	// });

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

	app.post("/alter/:id", function(req, res){
			let pass= req.body.jPass || null;
			if (isLoggedIn(req)){
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
					client.query({text: "UPDATE journals SET skin=$1 WHERE alt_id=$2;",values: [req.body.skin, req.params.id]}, (err, result) => {
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
	app.post("/edit-alter/:id", (req, res, next)=>{
		// Make sure to base64 all information!

		if (isLoggedIn(req)){
			// return console.log(`'${Buffer.from(req.body.pronouns).toString('base64')}'`);
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
				res.redirect(`/system/${req.params.alt}`);
				

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
			/* Issue */ 
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
				
                var query = {
                  text: "INSERT INTO users (email, username, pass, email_link) VALUES ($1, $2, $3, $4)",
                  values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`, `'${CryptoJS.SHA3(req.body.password)}'`, `'${Math.random().toString(36).substr(2, 16)}'`]
                }
                client.query(query, (err, result) => {
                    if (err) {
                      console.log(err.stack);
                      res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
                  } else {
					console.log(`Welcome to Lighthouse, ${req.body.username}.`);
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
						req.session.subsystem_term= result.rows[0].subsystem_term;
					   req.session.loggedin = true;
					   req.session.u_id= result.rows[0].id;
					   req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
					   req.session.is_legacy= result.rows[0].is_legacy;
					   req.flash("flash", strings.account.created);
					   res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('subsystem_term', result.rows[0].subsystem_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('skin', result.rows[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).redirect("/tutorial");
					   
					  }
					});

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
					 req.session.subsystem_term= result.rows[0].subsystem_term;
					req.session.loggedin = true;
					req.session.u_id= result.rows[0].id;
					req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
					req.session.is_legacy= result.rows[0].is_legacy;
			  // getCookies(req)['u_id']= result.rows[0].id;
					  // Add to cookies
					  res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('skin', result.rows[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('subsystem_term', result.rows[0].subsystem_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
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
				req.session.subsystem_term= result.rows[0].subsystem_term;
			   req.session.loggedin = true;
			   req.session.u_id= result.rows[0].id;
			   req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
			   req.session.is_legacy= result.rows[0].is_legacy;
			   
         // getCookies(req)['u_id']= result.rows[0].id;
				 // Add to cookies
				 res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('subsystem_term', result.rows[0].subsystem_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('skin', result.rows[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
					res.redirect(302, '/');
		   }
       }
   });
 });

 /*

 			OTHER ROUTES (Delete, Put)
			

 */
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

	app.put('/system-data', (req, res)=>{
		if (isLoggedIn(req)){
			if (apiEyesOnly(req)){
				let editMode= req.body.edit;
				if (editMode=="pin"){
					let postID= req.body.postID;
					client.query({text: "UPDATE comm_posts SET is_pinned = NOT is_pinned WHERE id=$1;",values: [postID]}, (err, result) => {
						if (err) {
							console.log(err.stack);
							res.status(400).json({code: 400, message: err.stack});
						} else {
						 res.status(200).json({code:200});
						}
						});
				} else if (editMode== "journalPin"){
					let postID= req.body.postID;
					client.query({text: "UPDATE posts SET is_pinned = NOT is_pinned WHERE p_id=$1;",values: [postID]}, (err, result) => {
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
