// #region Import Packages, Variables, Files -----------------------------------
// NPM and external packages.
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
const fileUpload = require('express-fileupload');
const methodOverride = require('method-override');

// Local files below
const { isLoggedIn, getCookies, apiEyesOnly, encryptWithAES, decryptWithAES, forbidUser, 
		lostPage, idCheck, paginate, checkUUID, truncate, capitalise, 
		getKeyByValue, splitByGroup, randomise, getRandomInt, generateToken, 
		stripHTML, distill, getOrdinal, base64encode, base64decode, 
		truncateAndStringify, renderNestedList, errorPage } = require("./funcs.js")
const tuning= require('./js/genVars.js');
var strings= require("./lang/en.json");
const langVar= require("./js/languages.js");
const db= require("./db");
const client = db.client;


const alterTypes= tuning.alterTypes;
const dayNames= tuning.dayNames;
const monthNames= tuning.monthNames;

const apiRouter = require('./api');
const systemRouter = require('./system');
const alterRouter = require('./alter');
const staticRouter = require('./staticpages');
const wsRouter = require('./worksheets');
const botRouter = require('./bots');
const forumRouter = require('./forums');
const messagesRouter = require('./messages');

const twoWeeks = 1000 * 60 * 60 * 24 * 7 * 2;

// const { start } = require('repl');

require('dotenv').config();

// #endregion ------------------------------------------------------------------

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'dee_deyes@writelighthouse.com',
    pass: process.env.gmail_pass,
  },
});


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

var app = express();

// #region App Middleware ------------------------------------------------------
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
	app.use(methodOverride('_method'))
	


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
  app.locals.pad = function(number, digits) {
    return String(number).padStart(digits, '0');
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

// Middleware...?
app.use(async function (req, res){
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
				// console.error(e)
			}
			

	} else {
		req.session.alter_term= "alter";
		req.session.system_term= "system";
		req.session.subsystem_term="subsystem";
		req.session.innerworld_term= "inner world";
		req.session.plural_term= "plural";
		req.session.font="Lexend";
		try{
			strings= require(`./lang/${req.headers["accept-language"].split("-")[0]}.json`);

		} catch(e){
			strings= require(`./lang/en.json`);
		}
		app.locals.strings= strings;
		
	}
	req.next();
  });

// Other routes 
app.use('/api', apiRouter); // For the Public API
app.use("/system", systemRouter); // For the /system stuff (WIP)
app.use("", alterRouter); // For the /alter stuff (WIP)
app.use("", staticRouter); // For pages that require almost no extra checks beforehand. Think the about page, philosophy etc. 
app.use("", wsRouter); // For worksheet routes. 
app.use("", botRouter); // For the web crawling routes. 
app.use("", forumRouter); // For the forums routes. 
app.use("/inbox", messagesRouter); // For the messages routes. 
  
// ------ //
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs');

 if (process.env.maintenance== "true"){
	// Maintenance mode on.
	app.use(function(req,res){
		return res.render(`pages/maintenance`, { session: req.session, cookies:req.cookies });
});
	
 }
// #endregion

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
		.cookie('loggedin', true, { maxAge: twoWeeks, httpOnly: true })
		.cookie('username',  Buffer.from(userData[0].username, 'base64').toString(),{ maxAge: twoWeeks, httpOnly: true })
		.cookie('u_id', userData[0].id,{ maxAge: twoWeeks, httpOnly: true })
		.cookie('alter_term', userData[0].alter_term,{ maxAge: twoWeeks, httpOnly: true })
		.cookie('system_term', userData[0].system_term,{ maxAge: twoWeeks, httpOnly: true })
		.cookie('subsystem_term', userData[0].subsystem_term,{ maxAge: twoWeeks, httpOnly: true })
		.cookie('is_legacy', userData[0].is_legacy,{ maxAge: twoWeeks, httpOnly: true })
		.cookie('skin', userData[0].skin,{ maxAge: twoWeeks, httpOnly: true });

		if (userData[0].verified == false){
			console.log("They aren't verified. Fixing this now.");
			const updateAcc=  query(client, "UPDATE users SET verified=true WHERE id=$1", [userData[0].id], res, req);
			updateAcc.then(response=>{
				res.render('pages/verify',{ session: req.session,cookies:req.cookies });
			})
			
		} else {
			req.flash("flash", strings.account.alreadyVerified);
			res.redirect("/")
		}
  });







	// No need to refactor
app.get('/simply-plural', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/sp-import`, { session: req.session, cookies:req.cookies });
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
		res.render(`pages/combine-${page}`, { session: req.session, cookies:req.cookies });
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	});




  
  app.get('/inner-world/:id', (req, res) => {
	// if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM inner_worlds WHERE u_id=$1 AND id=$2;",values: [getCookies(req)['u_id'], req.params.id]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
		  } else {
			res.render(`pages/edit_innerworld`, { session: req.session, cookies:req.cookies,  iw: {
				id: result.rows[0].id,
				title: Buffer.from(result.rows[0].key, "base64").toString(),
				body: Buffer.from(result.rows[0].value, "base64").toString()
			  } });
		  }
		});
		
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	
  });

  app.get('/search', (req, res) => {
	if (isLoggedIn(req)){
		res.render(`pages/search`, { session: req.session, cookies:req.cookies });
	
	} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	
  });



  app.get('/mod', (req, res) => {
	// console.log(req.socket.remoteAddress);
	if (isLoggedIn(req)){
		if ([process.env.dev1, process.env.dev2, process.env.dev3].includes(getCookies(req)['u_id'])){
			res.render(`pages/mod-panel`, { session: req.session, cookies:req.cookies });
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
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
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
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
	}
	
  });


  app.get("/pluralkit", (req, res)=> {
	if (isLoggedIn(req)){
		res.render(`pages/pluralkit`, { session: req.session, cookies:req.cookies, lang:req.acceptsLanguages()[0] });
	}
  });


  app.get('/changelog', (req, res) => {
	client.query({text: "SELECT * FROM changelog ORDER BY date DESC LIMIT 50",values: []}, (err, result) => {
		if (err) {
		  console.log(err.stack);
		  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
	  } else {
		res.render(`pages/changelog`, { session: req.session, cookies:req.cookies, changes:result.rows, lang:req.acceptsLanguages()[0] });
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
			return res.render(`pages/glossary-disabled`, { session: req.session, cookies:req.cookies, });
		}
	}
	res.render(`pages/glossary`, { session: req.session, cookies:req.cookies, terms:terms, lang:req.acceptsLanguages()[0] });
}); 





  app.get('/logout', (req, res)=>{
     
	 try{
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
	// if (!checkUUID(req.params.id)) return lostPage(res, req);
     res.render("pages/new_pass", {session: req.session, cookies:req.cookies});

  });

  app.get('/wish', (req, res) => {
	var filledWishes= [];
	var wishArr= [];
	if (isLoggedIn(req)){
		client.query({text:'SELECT * FROM wishlist WHERE user_id=$1 AND is_filled=false;', values: [getCookies(req)['u_id']]}, (err, result)=>{
			if (err){
				console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			}
			for (i in result.rows){
				wishArr.push({text: decryptWithAES(result.rows[i].wish), checked:result.rows[i].is_filled, uuid: result.rows[i].uuid});
			}

			client.query({text:'SELECT * FROM wishlist WHERE user_id=$1 AND is_filled=true;', values: [getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
				}
				for (i in result.rows){
					filledWishes.push({text: decryptWithAES(result.rows[i].wish), checked:result.rows[i].is_filled, uuid: result.rows[i].uuid});
				}	
				res.render(`pages/wishlist`, { session: req.session, cookies:req.cookies, wishArr:wishArr, filledWishes:filledWishes });
				
			});
			
		});
		
	}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
});

app.get('/wish/:id', (req, res) => {
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text:'UPDATE wishlist SET is_filled=true WHERE uuid=$1', values: [`${req.params.id}`]}, (err, result)=>{
			if (err){
				console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			}
			res.redirect("/wish");
		});
		
	}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
});

app.get('/wish-d/:id', (req, res) => {
	if (!checkUUID(req.params.id)) return lostPage(res, req);
	if (isLoggedIn(req)){
		client.query({text:'DELETE FROM wishlist WHERE uuid=$1', values: [`${req.params.id}`]}, (err, result)=>{
			if (err){
				console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			}			
		});
		res.redirect("/wish");
		
	}else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
});

	app.get('/inner-world', (req, res, next) => {
		if (isLoggedIn(req)){
			client.query({text:'SELECT * FROM inner_worlds WHERE u_id=$1', values: [getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
				} else {
					req.session.innerworld_rows = result.rows;
					client.query({text:'SELECT * FROM users WHERE id=$1', values: [getCookies(req)['u_id']]}, (err, bresult)=>{
						if (err){
							console.log(err.stack);
							res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						} else {
							req.session.innerworld = bresult.rows[0].inner_worlds || false;
							res.render(`pages/innerworld`, { session: req.session, cookies:req.cookies});
						}
						
					});
				}
				
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	});

	app.get('/rules', (req, res, next) => {
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM sys_rules WHERE u_id=$1 ORDER BY created DESC;", values:[getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
				} else {
					req.session.sys_rules=result.rows;
				}
				res.render(`pages/sys_rules`, { session: req.session, cookies:req.cookies });
				
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	});

	
	app.get('/inner-world/delete/:id', (req, res)=>{
		// if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM inner_worlds WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			} else {
				req.session.sys_rules= null;
			}
			res.redirect("/inner-world");
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	});

  app.get('/editsys/:alt', (req, res, next)=>{
	if (!checkUUID(req.params.alt)) return;
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM systems WHERE sys_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			} else {
				req.session.chosenSys= result.rows[0];
				client.query({text: "SELECT alters.name, alters.alt_id, alters.sys_id, systems.sys_alias FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
					if (err) {
	  				console.log(err.stack);
	  				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
				} else {
					// console.table(result.rows);
					req.session.alters = result.rows;
				  res.render(`pages/edit_sys`, { session: req.session, alt:req.session.chosenSys, alters: result.rows,cookies:req.cookies });
				}
				});
			}
			// res.render(`pages/edit_sys`, { session: req.session, alt:req.session.chosenSys });
		  });
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	  // res.render(`pages/edit_sys`, { session: req.session, alt:req.params.alt });
  });

  app.get('/deletesys/:alt', async (req, res)=>{
	// if (!checkUUID(req.params.alt)) return;
	  if (isLoggedIn(req)){
		try{
			const systemDat = await db.query(client, "SELECT * FROM systems WHERE sys_id=$1 AND user_id=$2", [`${req.params.alt}`, getCookies(req)['u_id']], res, req);
			req.session.chosenSys = systemDat[0];
			res.render(`pages/delete_sys`, { session: req.session, alt:req.session.chosenSys,cookies:req.cookies });
		} catch(e){
			lostPage(res, req)
		}
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	  // res.render(`pages/edit_sys`, { session: req.session, alt:req.params.alt });
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

				const sysInfo = await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [`${getCookies(req)['u_id']}`], res, req, false);
				const nonPinInfo = await db.query(client, "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false ORDER BY created_on DESC;", [`${getCookies(req)['u_id']}`], res, req);
				const pinInfo = await db.query(client, "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false ORDER BY created_on DESC;", [`${getCookies(req)['u_id']}`], res, req);

				let sysArr = sysInfo.map((system)=>{
					return {
						sys_id: system.sys_id, 
						alias: base64decode(system.sys_alias), 
						icon:system.icon, 
						subsys: system.subsys_id
					}
				});

				let nonPinned = nonPinInfo.map((post)=>{
					return {
						title: decryptWithAES(post.title), 
						body: decryptWithAES(post.body),  
						created_on: post.created_on, 
						id: post.id
					}
				})
				let isPinned = pinInfo.map((post)=>{
					return {
						title: decryptWithAES(post.title), 
						body: decryptWithAES(post.body),  
						created_on: post.created_on, 
						id: post.id
					}
				})
				console.log(sysInfo)

				res.json({code: 200, sysArr: sysArr, nonPinned: nonPinned, isPinned: isPinned});

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

				const journalPostInfo = await db.query(client, "SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;", [`${req.headers.uuid}`], res, req, false);
				let journalPosts = {
					pinned:[],
					nonpin:[]
				}

				journalPosts.pinned = journalPostInfo.map((post)=>{
					if (post.is_pinned == true){
					  return {
						title: post.title ? decryptWithAES(post.title) : "", 
						body: post.body ? decryptWithAES(post.body): "", 
						createdon: post.created_on, 
						id: post.p_id,
						feeling: post.feeling ? decryptWithAES(post.feeling): ""
					  }
					}
				  }).filter(Boolean);
				  
				  journalPosts.nonpin = journalPostInfo.map((post)=>{
					if (post.is_pinned == false){
					  return {
						title: post.title ? decryptWithAES(post.title) : "", 
						body: post.body ? decryptWithAES(post.body): "", 
						createdon: post.created_on, 
						id: post.p_id,
						feeling: post.feeling ? decryptWithAES(post.feeling): ""
					  }
					}
				  }).filter(Boolean);
				  
				journalPosts.pinned = journalPosts.pinned.filter(Boolean); // Remove undefined.
				journalPosts.nonpin = journalPosts.nonpin.filter(Boolean); // Remove undefined.

				res.status(200).json({code: 200, search: journalPosts});

			} else if (req.headers.grab=="subsystems"){
				client.query({text: "SELECT * FROM systems WHERE user_id=$1 AND subsys_id= $2;",values: [`${getCookies(req)['u_id']}`, `${req.headers.sysid}` ]}, (err, result) => {
					if (err) {
					   console.log(err.stack);
					   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
		  } else {
			const sysCheck = await db.query(client, "SELECT id FROM comm_posts WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
			const sysList = sysCheck.map(obj => obj.id);
			if (!(sysList.includes(req.params.id))) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });

			  // console.log(result.rows[0]);
			  req.session.jPost= result.rows[0];
			  req.session.jPost.body= decryptWithAES(req.session.jPost.body);
			  req.session.jPost.title= decryptWithAES(req.session.jPost.title);
			  let sysid= result.rows[0].system_id;
			  res.render(`pages/delete_post`, { session: req.session, cookies:req.cookies, sysid: sysid });
		  }
	  });
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
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
			

		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	});
		app.get('/profile', (req, res) => {
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM users WHERE id=$1;", values:[getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
				res.render(`pages/profile`, { session: req.session, cookies:req.cookies, theirEmail: theirEmail, theirName: theirName, numUp: numUp });
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}

	});
	app.get("/profile/tokens", async function (req, res){
		if (isLoggedIn(req)){
			let tokens= await db.query(client, "SELECT * FROM tokens WHERE u_id=$1 ORDER BY name ASC;", [getCookies(req)['u_id']], res, req);
			res.render(`pages/tokens`, { session: req.session, cookies:req.cookies, tokens: tokens });
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
	});
	

	/*



			---		POST REQUEST PAGES		---



	*/
	

	app.post('/inner-world/:id', (req, res) => {
		// if (!checkUUID(req.params.id)) return lostPage(res, req);
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
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			  } else {
				req.flash("flash", "Inner world updated!")
				res.redirect("/inner-world")
			  }
			});
		}else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
		}
	});
	app.post("/archive-alter/:id", (req, res, next)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "UPDATE alters SET is_archived= NOT is_archived WHERE alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
		}
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
						return res.status(200).render(`pages/mod-panel`, { session: req.session, cookies:req.cookies });
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
						return res.status(200).render(`pages/mod-panel`, { session: req.session, cookies:req.cookies });
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
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies});
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
	res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies});
		}
	});
	

	app.post('/mood/:alt', function(req, res){
		if (!checkUUID(req.params.alt)) return lostPage(res, req);
		var now = new Date();
		client.query({text: "SELECT * FROM alter_moods WHERE alt_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
		  } else {
			if (result.rows.length==0){
				// Woops. Add new mood!
				// `${encryptWithAES(req.body.jTitle)}`
				client.query({text: "INSERT INTO alter_moods (alt_id, mood, reason, timestamp) VALUES ($1, $2, $3, $4);",values: [`${req.params.alt}`, req.body.mood, `${encryptWithAES(req.body.reason)}`, `${now.getUTCFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}+${now.getTimezoneOffset()}`]}, (err, result) => {
					if (err) {
						console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					}
						req.flash("flash",(strings.mood.updated));
						res.redirect(302,`/alter/${req.params.alt}`);
					});
			} else {
				client.query({text: "UPDATE alter_moods SET mood=$2, reason=$3, timestamp=$4 WHERE alt_id=$1;",values: [`${req.params.alt}`, req.body.mood, `${encryptWithAES(req.body.reason)}`, `${now.getUTCFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}+${now.getTimezoneOffset()}`]}, (err, result) => {
					if (err) {
						console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
							res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						}
							client.query({text: "DELETE FROM sys_rules WHERE u_id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
							if (err){
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
							}
							
							// Deleting from users will cascade to systems will cascade to alters will cascade to journals will cascade to posts. Hopefully.
							client.query({text: "DELETE FROM users WHERE id=$1;",values: [getCookies(req)['u_id']]}, (err, result) => {
							if (err){
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
				  
				  
			  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}

		  } else {
				if (req.body.skinSel){
					// Changing Lighthouse's skin.
					client.query({text: 'UPDATE users SET skin=$1 WHERE id=$2', values: [req.body.skinSel, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						} else {
							
							req.flash("flash", strings.account.skin);
						}
					});
				}
				if (req.body.altTerm){
					// Updating alter term
					client.query({text: 'UPDATE users SET alter_term=$1 WHERE id=$2', values: [req.body.altTerm.toLowerCase(), getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
							req.session.username= req.body.newName;
						}
					});
				}
				if (req.body.changePass){
					client.query({text: 'UPDATE users SET pass=$1 WHERE id=$2', values: [`'${CryptoJS.SHA3(req.body.newPass1)}'`, getCookies(req)['u_id']]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						} else {
							req.flash("flash","Password Updated!");
						}
					});
				}
				if (req.body.innerworld){
					client.query({text: 'UPDATE users SET inner_worlds= $2 WHERE id=$1', values: [getCookies(req)['u_id'], req.body.innerworld]}, async (err, result)=>{
						if (err) {
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						} else {
							req.flash("flash", strings.account.updated);
						}
					});
				}
				// After all those changes.
				// res.cookie('subsystem_term', req.body.subTerm,{ maxAge: twoWeeks, httpOnly: true });
				res
				.cookie('username', req.body.newName || Buffer.from(req.session.username, "base64").toString() ,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('email', req.body.newEmail || req.session.email ,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('alter_term', req.body.altTerm || req.session.alter_term ,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('system_term', req.body.sysTerm || req.session.system_term ,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('subsystem_term', req.body.subTerm || req.session.subsystem_term ,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('innerworld_term', req.body.iwTerm || req.session.innerworld_term ,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('plural_term', req.body.plurTerm || req.session.plural_term ,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('skin', req.body.skinSel || req.session.skin,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('worksheets_enabled', req.body.ws || req.session.worksheets_enabled,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('textsize', req.body.textsize || req.session.textsize || 1,{ maxAge: twoWeeks, httpOnly: true })
				.redirect(302, "/profile");
			}
		});
	});
	
	app.post('/reset/:id', (req, res)=>{
		// if (!checkUUID(req.params.id)) return lostPage(res, req);
		// Reset password
		client.query({text: 'SELECT * FROM users WHERE email_link=$1', values: [`'${req.params.id}'`]}, (err, result)=>{
		  if (err) {
		    res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
		  } else {
		     // Does the PIN match the one in the DB?
				 if (result.rows[0].email_pin == req.body.pin){
					 client.query({text: 'UPDATE users SET pass=$1 WHERE email_link=$2', values: [`'${CryptoJS.SHA3(req.body.newpass)}'`,`'${req.params.id}'`]}, (err, result)=>{
					   if (err) {
							 console.log(err.stack);
					     res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					   } else {
					      // Code here
								req.flash("flash","Updated your password. You can now log in!");
								res.redirect("/login");
					   }
					 });

				 } else {
					 res.render('pages/new_pass',{ session: req.session, code:"Forbidden",cookies:req.cookies });
				 }
		  }
		});
	});

	app.post('/forgot-password', (req, res)=>{
		client.query({text: 'SELECT username, email, email_link, email_pin FROM users WHERE email=$1 ', values:[`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result)=>{
			if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			} else {
				if ((result.rows).length == 0){
					// User doesn't exist.
					res.render(`pages/forgot_pass`, { session: req.session, cookies:req.cookies});
				} else {
					req.session.user= result.rows[0];
					req.session.user.email_pin= getRandomInt(1111,9999);
					client.query({text: 'UPDATE users set email_pin=$1 WHERE email=$2 ', values:[`${req.session.user.email_pin}`,`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result)=>{
						res.render(`pages/forgot_pass2`, { session: req.session, cookies:req.cookies});
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
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					}
				});
			} else if(req.body.edit){
				await db.query(client, "UPDATE sys_rules SET rule=$1 WHERE id=$2 AND u_id=$3", [`'${Buffer.from(req.body.edit).toString('base64')}'`, req.body.ruleid, getCookies(req)['u_id']], res, req);
			} else {
				// Delete Rule
				client.query({text:`DELETE FROM sys_rules WHERE id=$1;`, values:[getKeyByValue(req.body,"Remove")]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					}
				});
			}
			res.redirect(req.get('referer'));
			
		} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
		}
	});



	app.post('/comm/:id/delete', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM comm_posts WHERE id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
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
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
		}
	});

	app.post('/journal/:id/edit', (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);

		if (isLoggedIn(req)){
			client.query({text: "UPDATE posts SET title=$1, body=$2, created_on=$4, feeling=$5 WHERE p_id=$3; ",values: [`${encryptWithAES(req.body.jTitle)}`, `${encryptWithAES(req.body.jBody)}`, `${req.params.id}`, `${req.body.jDate || new Date().toISOString()}`, `${encryptWithAES(req.body.feeling)}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
							   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						   }
						   // No go redirect appropriately.
							client.query({text: "SELECT alters.alt_id FROM alters INNER JOIN journals ON journals.alt_id = alters.alt_id WHERE journals.j_id=$1;",values: [`${req.body.author}`]}, (err, cresult) => {
								if (err) {
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
		}
	});

	app.post("/journal/:id", (req, res)=>{
		if (!checkUUID(req.params.id)) return lostPage(res, req);
		if (isLoggedIn(req)){
			if (req.body.submit){
			client.query({text: "INSERT INTO posts (j_id, created_on, body, title, feeling) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4, $5);",values: [`${req.body.j_id}`, `${Date.now()}`, `${encryptWithAES(req.body.j_body)}`, `${encryptWithAES(req.body.j_title)}`, `${encryptWithAES(req.body.feeling)}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies});
 			  } else {
				  res.redirect(`/journal/${req.params.id}`);
 			  }

		  });	
			} else {
			client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [getKeyByValue(req.body,"Remove")]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
 			  } else {
				  req.session.jPost= null;
				  res.redirect(`/journal/${req.params.id}`);
			  }
		  });
			}
			
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
		}
	});



	app.post('/inner-world', (req, res)=>{
		if (isLoggedIn(req)){
			if (req.body.create){
				client.query({text:'INSERT INTO inner_worlds (u_id, key, value) VALUES ($1,$2,$3);', values: [`${getCookies(req)['u_id']}`, `${Buffer.from(req.body.key).toString('base64')}`,`${Buffer.from(req.body.value).toString('base64')}`]}, (err, result)=>{
					if (err){
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					}
				});
			} else {
				// Deleting.
				client.query({text: "DELETE FROM inner_worlds WHERE id=$1;",values: [getKeyByValue(req.body,"Remove")]}, (err, result) => {
					if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
				} else {
					req.session.sys_rules= null;
				}
				});
			}
			res.redirect(req.get('referrer'));
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
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
		client.query({text: "UPDATE systems SET sys_alias=$1, description=$3 WHERE sys_id=$2;",values: [`'${base64encode(req.body.sysname)}'`, `${req.params.alt}`, `${encryptWithAES(req.body.sysdesc)}`]}, (err, result) => {
			if (err){
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
				  } else {
					res.redirect(req.get('referer'));
				  }
				});
			}
			
		} else { res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies })}
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
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					} else {
						if (result.rows.length > 0){
							newSys+= ` ${getRandomInt(111,999)}`;
						}
						// Create a new system
					client.query({text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
						if (err) {
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						} else {
							// Grab its ID.
							client.query({text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2;",values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
								if (err) {
								console.log(err.stack);
								res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
											res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
						}
					});
					
				}
				req.flash("flash", strings.system.updated);
			}
			return res.redirect(307,"/system");

		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies })
		}
	});

	app.post('/signup', async function(req, res) {
		// Bookmarks: signup post, post signup
	
		if (req.body.mjl2fbbz8s) return res.send("(:"); // It's a bot. Do not let them load anything.
	
		let email= (req.body.email).toLowerCase();
	
		const userCheck = await db.query(client, "SELECT * FROM users WHERE email=$1 OR username=$2;", [`'${Buffer.from((email).toLowerCase()).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`], res, req);
	
	
		if (userCheck.length > 0){
			req.flash("flash", strings.account.alreadyExists);
			return res.render(`pages/signup`, { session: req.session, cookies:req.cookies });
		} 
			// Write to the db
			await db.query(client, "INSERT INTO users (email, username, pass, email_link, worksheets_enabled, system_term, alter_term, email_pin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [`'${base64encode(email)}'`,`'${Buffer.from(req.body.username).toString('base64')}'`,`'${CryptoJS.SHA3(req.body.password)}'`,`'${Math.random().toString(36).substr(2, 16)}'`,req.body.ws || true,req.body.system_term || "system",req.body.alter_term || "alter",getRandomInt(1111,9999)], res, req);
	
			const userDat = await db.query(client, "SELECT * FROM users WHERE email=$1;", [`'${base64encode(email)}'`], res, req);
	
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
				.cookie('loggedin', true, { maxAge: twoWeeks, httpOnly: true })
				.cookie('username',  Buffer.from(userDat[0].username, 'base64').toString(),{ maxAge: twoWeeks, httpOnly: true })
				.cookie('u_id', userDat[0].id,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('alter_term', userDat[0].alter_term,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('system_term', userDat[0].system_term,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('subsystem_term', userDat[0].subsystem_term,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('innerworld_term', userDat[0].innerworld_term,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('plural_term', userDat[0].plural_term,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('is_legacy', userDat[0].is_legacy,{ maxAge: twoWeeks, httpOnly: true })
				.cookie('skin', userDat[0].skin,{ maxAge: twoWeeks, httpOnly: true })
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
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
					  res.cookie('loggedin', true, { maxAge: twoWeeks, httpOnly: true })
					  .cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString(),{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('u_id', result.rows[0].id,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('alter_term', result.rows[0].alter_term,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('system_term', result.rows[0].system_term,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('is_legacy', result.rows[0].is_legacy,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('skin', result.rows[0].skin,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('subsystem_term', result.rows[0].subsystem_term,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('innerworld_term', result.rows[0].innerworld_term,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('plural_term', result.rows[0].plural_term,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('textsize', result.rows[0].textsize,{ maxAge: twoWeeks, httpOnly: true })
					  .cookie('worksheets_enabled', result.rows[0].worksheets_enabled,{ maxAge: twoWeeks, httpOnly: true });
			  		req.flash("flash", strings.account.loggedin);
				 	res.redirect(302, '/');
				}
			}
		});
	} else if (req.body.signingup) {
		
      var query = {
        text: "SELECT * FROM users WHERE email=$1 OR username=$2;",
        values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`]
      }
      client.query(query, (err, result) => {
          if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
          } else {
            // console.log(res.rows)
            if (result.rows.length > 0){
                console.log("Already exists.");
                res.render(`pages/signup`, { session: req.session, cookies:req.cookies });
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
                      res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
                    //   res.render(`pages/registered`, { session: req.session, cookies:req.cookies });
					client.query({text: "SELECT * FROM users WHERE email=$1;", values: [`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					  } else {
						req.session.alter_term= result.rows[0].alter_term;
						req.session.system_term= result.rows[0].system_term;
						req.session.loggedin = true;
						req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
						
					  }
					});
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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
					let altpk= req.body.avatar == null ? null: `${encryptWithAES(req.body.pk_id)}`;
					client.query({text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url, pk_id) VALUES($1, $2, $3, $4, $5, $6);",values: [
						altName, 
						req.body.sysId,
						altPro,
						altBirth,
						altAva,
						altpk 
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
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
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



// DEV MODE PAGES
if (process.env["environment"]== "dev"){
	app.get("/dev-test", function (req, res){
		res.send("Congrats! You found a dev-only page.")
	})
	
}

app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
  
	// render the error page
	res.status(err.status || 500);
	errorPage(500, res,req, res.locals.error);
	next(err)
  });


	app.use(function(req,res){
			res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });
	});

	
  // End pages.
  app.listen(PORT, async function(res, req){
	let rn= await db.query(client, "SELECT NOW();", [], res, req);
	console.log(`⚓ Docked at Port ${ PORT }. The time is ${(rn[0].now).toLocaleString('en-GB', { timeZone: 'EST' })}`)
});

