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
const nodemailer = require('nodemailer');
const ejs = require('ejs');
var pluralize = require('pluralize');
var pjson = require('./package.json');
var flash = require('express-flash');
console.log( `Lighthouse v${pjson.version}`);

const tuning= require('./js/genVars.js');

require('dotenv').config();

function getKeyByValue(object, value) {
	return Object.keys(object).find(key => object[key] === value);
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

// // sendEmail(res, receiver, subject, content, webpage, username)
// const sendEmail = (res, receiver, subject, content, webpage, username) => {
// 	res.render(`pages/email-goodbye`, { session: req.session, splash:splash, cookies:req.cookies, alias: username || randomise(["Buddy", "Friend", "Pal"]) }, (err, data) => {
// 		if (err) {
// 		  console.log(err);
// 		} else {
// 		  var mailOptions = {
// 			from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
// 			to: receiver,
// 			subject: subject,
// 			html: data
// 		  };
	
// 		  transporter.sendMail(mailOptions, (error, info) => {
// 			if (error) {
// 			  return console.log(error);
// 			}
// 			// console.log('Message sent: %s', info.messageId);
// 		  });
// 		}
// 	  });
// 	// ejs.renderFile(__dirname + '/' + webpage +'.ejs', { receiver, content }, (err, data) => {
// 	//   if (err) {
// 	// 	console.log(err);
// 	//   } else {
// 	// 	var mailOptions = {
// 	// 	  from: 'email_username',
// 	// 	  to: receiver,
// 	// 	  subject: subject,
// 	// 	  html: data
// 	// 	};
  
// 	// 	transport.sendMail(mailOptions, (error, info) => {
// 	// 	  if (error) {
// 	// 		return console.log(error);
// 	// 	  }
// 	// 	  console.log('Message sent: %s', info.messageId);
// 	// 	});
// 	//   }
// 	// });
//   };

function getRandomInt(min, max){
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isLoggedIn(req){
  return req.cookies.loggedin == 'true';
}

function idCheck(req, str){
	// does str argument match getCookies(req)['u_id']?
	// Use this to check before POST requests that affect systems.
	return getCookies(req)['u_id']== str;
}

async function pkFetch (i){
    // pkFetch("mikfh").then((value) => console.log(value));
    // return api.getSystem({id: i, token:t});
    return await api.getMember({member: i});
};

function fetchPKAlters(id){
    request(`https://api.pluralkit.me/v2/systems/${id}/members`, function (
      error,
      response,
      body
    ) {
      var data= JSON.parse(body);
      // console.log(data);
      for (i in data){
        console.log(data[i].name);
      }
    });
}
var splash;
// fetchPKAlters("exmpl");

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

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

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
	// app.use(bodyParser.urlencoded({
	// 	extended: true
	// }));
	// app.use(express.json());
  app.use(cookieParser());
//   app.locals({
//     site: {
//         title: 'Lighthouse',
//         description: 'A compartmentalised journalling app designed by a plural person, for plural people.'
//     },
//     author: {
//         name: 'The Lighthouse System',
//         contact: 'dee_deyes@writelighthouse.com'
//     },
// 	capitalise: function(s){
// 		return s[0].toUpperCase() + s.slice(1);
// 	}
// });
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
	{val: '18', c: "Flowers"}, 
]

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
    {name: "Serene", positive: true, emoji: "☺"}, // 7
    {name: "Awestruck", positive: true, emoji: "🤩"}, // 8
    {name: "Sleepy", positive: true, emoji: "😴"}, // 9
    {name: "Afraid", positive: false, emoji: "😨"}, // 10
    {name: "Frustrated", positive: false, emoji: "😖"}, // 11
    {name: "Overwhelmed", positive: false, emoji: "😖"}, // 12
    {name: "Dazed", positive: false, emoji: "😵"}, // 13
    {name: "Confused", positive: false, emoji: "😵"}, // 14
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
]
app.locals.randomise= function (arr){
	return arr[Math.floor(Math.random()*arr.length)];
}
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
	res.locals.messages = req.flash();
	if (isLoggedIn(req)){
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
					  }
					  if (result.rows.length==0){
						// No match.
						req.session.alter_term= "alter";
					  } else {
						req.session.alter_term= result.rows[0].alter_term;
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
			res.render(`pages/index`, { session: req.session, splash:splash, userCount:userCount, cookies:req.cookies, version: pjson.version });
	        splash=null;
		}
	});
  });

  app.get('/worksheets', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/worksheets`, { session: req.session, splash:splash, cookies:req.cookies });
	splash=null;
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
		splash=null; 
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
      splash=null;
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
     splash= req.flash("flash",`See you soon, ${req.session.username || "friend"}`);
	 req.session.destroy();
	 res.clearCookie('loggedin');
	 res.clearCookie('username');
	 res.clearCookie('u_id');
	 res.clearCookie('cookie1');
	 res.clearCookie('cookie2');
	 res.clearCookie('system_term');
	 res.clearCookie('alter_term');
	 res.clearCookie('is_legacy');
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
			splash=req.flash("flash","Wish granted!");
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
			splash=req.flash("flash","Wish deleted!");
			
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

var sysArr;
  app.get('/system', (req, res, next) => {
    if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM systems WHERE user_id=$1",values: [`${req.cookies.u_id}`]}, (err, result) => {
	            if (err) {
	              console.log(err.stack);
	              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
	          } else {
	              req.session.sys = [];

	              for (i in (result.rows)){
	                  (req.session.sys).push({name: Buffer.from(result.rows[i].sys_alias, 'base64').toString(), id: result.rows[i].sys_id, icon: result.rows[i].icon})
	              }
	          }
				  client.query({text: "SELECT * FROM comm_posts WHERE u_id=$1 ORDER BY created_on DESC;",values: [`${getCookies(req)['u_id']}`]}, (err, cresult) => {
	  	            if (err) {
	  	              console.log(err.stack);
	  	              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
	  	          } else {
	  	              req.session.cPosts = [];
	  	              for (i in (cresult.rows)){
	  	                  // (req.session.cPosts).push({name: Buffer.from(cresult.rows[i].sys_alias, 'base64').toString(), id: cresult.rows[i].sys_id})
						  (req.session.cPosts).push({date: cresult.rows[i].created_on, title: decryptWithAES(cresult.rows[i].title), body: decryptWithAES(cresult.rows[i].body), id: cresult.rows[i].id});
	  	              }
					  res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys, lang:req.acceptsLanguages()[0],cookies:req.cookies });
	  	          }
	  			  // console.table(req.session.sys);

	  	        });

	        });

    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies });
    }
    splash=null;
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
	          }
			  // console.table(req.session.sys);
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
			   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
		   } else {
			   req.session.chosenAlter = result.rows[0];
			   if (req.session.chosenAlter.reason){
				req.session.chosenAlter.reason = `${decryptWithAES(result.rows[0].reason)}`;
			   }
			   
		   }
		   client.query({text: "SELECT * FROM journals WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, nresult) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  } else {
				  req.session.altJournal = nresult.rows;
			  }

				client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
	 			 if (err) {
	 			   console.log(err.stack);
	 			   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
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
		client.query({text: "SELECT alters.pronouns, alters.name, alters.alt_id, alters.sys_id, systems.sys_alias,alters.triggers_pos, alters.triggers_neg, alters.age,alters.likes,alters.dislikes,alters.job,alters.safe_place,alters.wants,alters.acc,alters.notes,alters.type,alters.img_url FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
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
				// console.log(req.session.jPost);
				res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:req.cookies });
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
		
	})
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
						splash=req.flash("flash","Mood updated!");
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
						res.locals.messages=req.flash("flash","Mood updated!");
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
					//    transporter.sendMail({
					// 			  from: '"Lighthouse" <dee_deyes@writelighthouse.com>', // sender
					// 			  to: Buffer.from(result.rows[0].email, 'base64').toString(),
					// 			  subject: "Account Deletion on Lighthouse", // Subject line
					// 			  text: "Hey, " + Buffer.from(result.rows[0].username, 'base64').toString() + ". This is just a heads up email that you opted to delete your account from Lighthouse. This is an irreversible action. Sorry to see you go! -Dee", // plain text body
					// 			  html: "<p>Hey, <b>" + Buffer.from(result.rows[0].username, 'base64').toString() + "</b>. This is just a heads up email that you opted to delete your account from Lighthouse. This is an <strong>irreversible</strong> action. Sorry to see you go! -Dee", // html body
					// 		  }).then(info => {
					// 			  // console.log({info});
					// 		  }).catch(console.error);
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
							   
							   splash= req.flash("flash",`Sorry to see you go. You can remake your account at any time.`);
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
			console.log("Not a deletion.");
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
						splash=req.flash("flash","Profile Updated!");
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
						splash=req.flash("flash","Profile Updated!");
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
			// res.status(200).redirect(req.get('referer'));
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
						// transporter.sendMail({
						// 	from: '"Lighthouse" <dee_deyes@writelighthouse.com>', // sender
						// 	to: Buffer.from(req.session.user.email, 'base64').toString(),
						// 	subject: "Forgot your password?", // Subject line
						// 	text: "Hey, " + Buffer.from(req.session.user.username, 'base64').toString() + ". Did you forget your password to Lighthouse? No worries. Follow the link provided and don't forget the PIN in this email! www.writelighthouse.com/reset/" + (req.session.user.email_link).replace(/'/gi, '') + " . PIN: " + req.session.user.email_pin + ". If you didn't request this password change, disregard this email. The PIN will be required to change the password. Thanks! -Dee", // plain text body
						// 	html: "<p>Hey, <b>" + Buffer.from(req.session.user.username, 'base64').toString() + "</b>. Did you forget your password to Lighthouse? No worries.</p><p>Follow the link provided and don't forget the PIN in this email!</p><p><a href= \"www.writelighthouse.com/reset/" + (req.session.user.email_link).replace(/'/gi, '') + "\">www.writelighthouse.com/reset/" + (req.session.user.email_link).replace(/'/gi, '') + "</a></p><p>PIN: <b>" + req.session.user.email_pin + "</b>.</p><p>If you didn't request this password change, disregard this email. The PIN will be required to change the password. Thanks! -Dee</p>", // html body
						// }).then(info => {
						// 	// console.log({info});
						// }).catch(console.error);
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
		// `'${Buffer.from(req.body.altname).toString('base64')}'`

		// Awful execution but oh well.
		// res.render('pages/loading');
		if (req.body.pronouns){
			client.query({text: "UPDATE alters SET pronouns=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.pronouns).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.age){
			client.query({text: "UPDATE alters SET age=$1 WHERE alt_id=$2",values: [req.body.age,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.type){
			client.query({text: "UPDATE alters SET type=$1 WHERE alt_id=$2",values: [req.body.type,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.postr){
			client.query({text: "UPDATE alters SET triggers_pos=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.postr).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.negtr){
			client.query({text: "UPDATE alters SET triggers_neg=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.negtr).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.likes){
			client.query({text: "UPDATE alters SET likes=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.likes).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.dislikes){
			client.query({text: "UPDATE alters SET dislikes=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.dislikes).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.internalJob){
			client.query({text: "UPDATE alters SET job=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.internalJob).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.safety){
			client.query({text: "UPDATE alters SET safe_place=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.safety).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.wish){
			client.query({text: "UPDATE alters SET wants=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.wish).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.acc){
			client.query({text: "UPDATE alters SET acc=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.acc).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.notes){
			client.query({text: "UPDATE alters SET notes=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.notes).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		if (req.body.imgurl){
			client.query({text: "UPDATE alters SET img_url=$1 WHERE alt_id=$2",values: [`'${Buffer.from(req.body.imgurl).toString('base64')}'`,`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
			  }
			});
		}
		splash= req.flash("flash","Page updated!");
		res.redirect(`/alter/${req.params.id}`);
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
				}
				if (req.body.submit){
					client.query({text: "INSERT INTO alters (sys_id, name) VALUES ($1, $2)",values: [`${req.session.chosenSys.sys_id}`, `'${Buffer.from(req.body.altname).toString('base64')}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
					  }
				  });
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
	  // console.log(Object.keys(req.body)[0]);
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
									  splash= req.flash("flash",`${Buffer.from(req.session.chosenSys.sys_alias, 'base64').toString()} has been permanently deleted.`);
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
						  splash= req.flash("flash",`${Buffer.from(req.session.chosenSys.sys_alias, 'base64').toString()} has been permanently deleted.`);
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
					splash= req.flash("flash","Added your wish to the list!");
					res.redirect(req.get('referer'));
						splash=null;
				  }
				});
			}
			
		} else { res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:req.cookies })}
	});

	app.post('/pluralkit', (req, res)=> {
		if (isLoggedIn(req)){
			// req.body.altArr. Split by --,--
			var splitList= (JSON.parse(req.body.altArr));

			client.query({text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from("Imported from Pluralkit").toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
				} else {
					// Grab its ID.
					client.query({text: "SELECT sys_id FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from("Imported from Pluralkit").toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
						} else {
							let newSysID= result.rows[0].sys_id;
							// Insert each alter into this new system.
							for (i in splitList){
								// console.log(splitList[i].img);
								if (splitList[i].img){
									client.query({text: "INSERT INTO alters (name, sys_id, img_url) VALUES($1, $2, $3);",values: [`'${Buffer.from(splitList[i].name).toString('base64')}'`, result.rows[0].sys_id, `'${Buffer.from(splitList[i].img).toString('base64')}'`]}, (err, result) => {
										if (err) {
										  console.log(err.stack);
										  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
										}
									});
								} else {
									client.query({text: "INSERT INTO alters (name, sys_id) VALUES($1, $2);",values: [`'${Buffer.from(splitList[i].name).toString('base64')}'`, result.rows[0].sys_id]}, (err, result) => {
										if (err) {
										  console.log(err.stack);
										  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:req.cookies });
										}
									});
								}
								
							}
							splash= req.flash("flash","System Added.");
							res.redirect("/system");
						}
					});
				}
			});
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
					splash= req.flash("flash","Wrong credentials.");
					res.redirect(req.get('referer'));
				} else {
					 req.session.alter_term= result.rows[0].alter_term;
					 req.session.system_term= result.rows[0].system_term;
					req.session.loggedin = true;
					req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
					req.session.is_legacy= result.rows[0].is_legacy;
			  // getCookies(req)['u_id']= result.rows[0].id;
					  // Add to cookies
			  if (req.body.remember){
				res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
			  } else {
				// console.log("Let cookies expire at end of session.");
				res.cookie('loggedin', true, {httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{httpOnly: true }).cookie('u_id', result.rows[0].id,{httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{httpOnly: true }).cookie('system_term', result.rows[0].system_term,{httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{httpOnly: true });
			  }
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
			   splash= req.flash("flash","Wrong credentials.");
			   res.redirect('/login');
		   } else {
				req.session.alter_term= result.rows[0].alter_term;
				req.session.system_term= result.rows[0].system_term;
			   req.session.loggedin = true;
			   req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
			   req.session.is_legacy= result.rows[0].is_legacy;
         // getCookies(req)['u_id']= result.rows[0].id;
				 // Add to cookies
         if (req.body.remember){
           res.cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('u_id', result.rows[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('system_term', result.rows[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
         } else {
           // console.log("Let cookies expire at end of session.");
           res.cookie('loggedin', true, {httpOnly: true }).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{httpOnly: true }).cookie('u_id', result.rows[0].id,{httpOnly: true }).cookie('alter_term', result.rows[0].alter_term,{httpOnly: true }).cookie('system_term', result.rows[0].system_term,{httpOnly: true }).cookie('is_legacy', result.rows[0].is_legacy,{httpOnly: true });
         }
					res.redirect(302, '/');
		   }
       }
   });
 });

 /*

 			OTHER ROUTES (Delete, Put)

 */

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
