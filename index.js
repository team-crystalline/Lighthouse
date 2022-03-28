const express = require('express');
var bodyParser=require("body-parser");
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

require('dotenv').config();

const getCookies = (req) => {
 // We extract the raw cookies from the request headers
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
	if (req.session.loggedin == true || getCookies(req)['loggedin'] == 'true'){
		return true;
	} else {
		return false;
	}
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

function randomise(arr){
      return arr[Math.floor(Math.random()*arr.length)];
}

const encryptWithAES = (text) => {
  const passphrase = process.env.cryptkey;
  return CryptoJS.AES.encrypt(text, passphrase).toString();
};

const decryptWithAES = (ciphertext) => {
  const passphrase = process.env.cryptkey;
  const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  return originalText;
};

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
  app.use('/', express.static(__dirname + '/public'))
  app.use(session({
	secret: process.env.sec,
	resave: true,
	saveUninitialized: true
    }));
	app.use(bodyParser.urlencoded({extended:true}));

  app.set('views', path.join(__dirname, 'views'))
  app.set('view engine', 'ejs')

  // PAGES- GET REQUEST
  app.get('/', (req, res) => {
	  client.query({text: "SELECT COUNT(id) FROM users;",values: []}, (err, result) => {
		  if (err) {
			console.log(err.stack);
			res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:getCookies(req) });
		} else {
			var userCount= result.rows[0].count;
			res.render(`pages/index`, { session: req.session, splash:splash, userCount:userCount, cookies:getCookies(req) });
	        splash=null;
		}
	});
  });

  // app.get('/p/:tagId', function(req, res) {
  //   res.send("tagId is set to " + req.params.tagId);
  // });

  app.get('/about', (req, res, next) => {
      res.render(`pages/about`, { session: req.session, splash:splash, cookies:getCookies(req) });
      splash=null;
  });
  app.get('/todos', (req, res, next) => {
      res.render(`pages/todos`, { session: req.session, splash:splash,cookies:getCookies(req) });
      splash=null;
  });
  app.get('/crisis', (req, res, next) => {
      res.render(`pages/crisis`, { session: req.session, splash:splash,cookies:getCookies(req) });
      splash=null;
  });
  app.get('/signup', (req, res, next) => {
      res.render(`pages/signup`, { session: req.session, splash:splash,cookies:getCookies(req) });
      splash=null;
  });

  app.get('/login', (req, res, next) => {
      res.render(`pages/login`, { session: req.session, splash:splash,cookies:getCookies(req) });
      splash=null;
  });
  app.get('/cookies', (req, res, next) => {
      res.render(`pages/cookies`, { session: req.session, splash:splash,cookies:getCookies(req) });
      splash=null;
  });

  app.get('/forgot-password', (req, res, next) => {
      res.render(`pages/forgot_pass`, { session: req.session, splash:splash,cookies:getCookies(req) });
      splash=null;
  });

  app.get('/logout', (req, res)=>{
     splash= `See you soon, ${req.session.username || randomise(['friend.', 'buddy.', "okay?", "now. Don't be a stranger."])}`;
	 req.session.destroy();
	 res.clearCookie('loggedin');
	 res.clearCookie('username');
	 res.clearCookie('u_id');
	 res.clearCookie('cookie1');
	 res.clearCookie('cookie2');
     res.redirect("/");
  });

  app.get('/reset/:id', (req, res)=>{
     res.render("pages/new_pass", {session: req.session, splash:splash, cookies:getCookies(req)});
		 splash=null;
  });

	app.get('/inner-world', (req, res, next) => {
		if (isLoggedIn(req)){
			client.query({text:'SELECT * FROM inner_worlds WHERE u_id=$1', values: [getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
				} else {
					req.session.innerWorld= result.rows;
				}
				res.render(`pages/innerworld`, { session: req.session, splash:splash,cookies:getCookies(req) });
				splash=null;
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });}
	});

	app.get('/rules', (req, res, next) => {
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM sys_rules WHERE u_id=$1;", values:[getCookies(req)['u_id']]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
				} else {
					req.session.sys_rules=result.rows;
				}
				res.render(`pages/sys_rules`, { session: req.session, splash:splash,cookies:getCookies(req) });
				splash=null;
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });}
	});

	app.get('rules/delete/:id', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM sys_rules WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			} else {
				req.session.sys_rules= null;
			}
			res.redirect("/rules");
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });}
	});

	app.get('/inner-world/delete/:id', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM inner_worlds WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			} else {
				req.session.sys_rules= null;
			}
			res.redirect("/inner-world");
			});
		} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });}
	});

  app.get('/editsys/:alt', (req, res, next)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM systems WHERE sys_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			} else {
				req.session.chosenSys= result.rows[0];
				client.query({text: "SELECT alters.name, alters.alt_id, alters.sys_id, systems.sys_alias FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
					if (err) {
	  				console.log(err.stack);
	  				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
				} else {
					// console.table(result.rows);
					req.session.alters = result.rows;
					// console.table(req.session.alters);
					// req.session.alters = [];
  	              // for (i in (result.rows)){
  	              //     // (req.session.sys).push(Buffer.from(result.rows[i].sys_alias, 'base64').toString())
  	              //     (req.session.alters).push({name: Buffer.from(result.rows[i].name, 'base64').toString(), id: result.rows[i].sys_id, sys_name: Buffer.from(result.rows[i].sys_alias, 'base64').toString()})
  	              // }
				  res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys, alters: result.rows,cookies:getCookies(req) });
				}
				});
			}
			// res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys });
		  });
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });}
	  // res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.params.alt });
  });

  app.get('/deletesys/:alt', (req, res)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM systems WHERE sys_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			} else {
				req.session.chosenSys= result.rows[0];
			}
			res.render(`pages/delete_sys`, { session: req.session, splash:splash, alt:req.session.chosenSys,cookies:getCookies(req) });
		  });
	  } else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });}
	  // res.render(`pages/edit_sys`, { session: req.session, splash:splash, alt:req.params.alt });
  });

  app.get('/clearalter', (req, res, next)=>{
	  req.session.journalUser= null;
		res.redirect('/system');
  });

var sysArr;
  app.get('/system', (req, res, next) => {
    if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM systems WHERE user_id=$1",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
	            if (err) {
	              console.log(err.stack);
	              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
	          } else {
	              req.session.sys = [];

	              for (i in (result.rows)){
	                  // (req.session.sys).push(Buffer.from(result.rows[i].sys_alias, 'base64').toString())
	                  (req.session.sys).push({name: Buffer.from(result.rows[i].sys_alias, 'base64').toString(), id: result.rows[i].sys_id})
	              }
	          }
				  client.query({text: "SELECT * FROM comm_posts WHERE u_id=$1 ORDER BY created_on DESC;",values: [`${getCookies(req)['u_id']}`]}, (err, cresult) => {
	  	            if (err) {
	  	              console.log(err.stack);
	  	              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
	  	          } else {
	  	              req.session.cPosts = [];
	  	              for (i in (cresult.rows)){
	  	                  // (req.session.cPosts).push({name: Buffer.from(cresult.rows[i].sys_alias, 'base64').toString(), id: cresult.rows[i].sys_id})
						  (req.session.cPosts).push({date: cresult.rows[i].created_on, title: decryptWithAES(cresult.rows[i].title), body: decryptWithAES(cresult.rows[i].body), id: cresult.rows[i].id});
	  	              }
					  res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys, lang:req.acceptsLanguages()[0],cookies:getCookies(req) });
	  	          }
	  			  // console.table(req.session.sys);

	  	        });

	        });

    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
    }
    splash=null;
  });

	var alterArr;
  app.get('/system/:id', (req, res, next) => {
    if (isLoggedIn(req)){
		client.query({text: "SELECT systems.sys_id, systems.user_id, systems.sys_alias, alters.alt_id FROM systems LEFT JOIN alters ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1",values: [`${req.params.id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
		  } else {
			  req.session.chosenSys= result.rows[0];
			  // chosenSys.sys_id, chosenSys.user_id, chosenSys.sys_alias
		  }
		});
			client.query({text: "SELECT * FROM alters WHERE sys_id=$1",values: [`${req.params.id}`]}, (err, result) => {
	            if (err) {
	              console.log(err.stack);
	              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
	          } else {
	              req.session.alters = [];
	              for (i in (result.rows)){
	                  // (req.session.sys).push(Buffer.from(result.rows[i].sys_alias, 'base64').toString())
	                  (req.session.alters).push({name: Buffer.from(result.rows[i].name, 'base64').toString(), id: result.rows[i].sys_id, a_id: result.rows[i].alt_id})
	              }
	          }
			  // console.table(req.session.sys);
	          res.render(`pages/sys_info`, { session: req.session, splash:splash, alterArr: req.session.alters,cookies:getCookies(req) });
	        });

    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
    }
    splash=null;
  });

  app.get("/alter/:id", (req, res, next)=>{

	 if (isLoggedIn(req)){
		 client.query({text: "SELECT alters.name, alters.alt_id, alters.sys_id, systems.sys_alias FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
			   console.log(err.stack);
			   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
		   } else {
			   req.session.chosenAlter = result.rows[0];
		   }
		   client.query({text: "SELECT * FROM journals WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, nresult) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			  } else {
				  req.session.altJournal = nresult.rows;
			  }

				client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${getCookies(req)['u_id']}`]}, (err, result) => {
	 			 if (err) {
	 			   console.log(err.stack);
	 			   res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
	 		   } else {
	 			   req.session.sysList = result.rows;
	 		   }
				  res.render(`pages/alter`, { session: req.session, splash:splash,cookies:getCookies(req) });
			 });
		   });
		 });
	 } else {
		 res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
	 }
  });

  app.get('/journal/:id', (req, res)=>{
	 if (isLoggedIn(req)){
		 if (req.session.chosenAlter.alt_id == req.params.id){
			// grab their journal.
			client.query({text: "SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;",values: [`${req.session.altJournal[0].j_id}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
 			  } else {
 				  req.session.journalPosts = result.rows;
				  for (i in req.session.journalPosts){
					  req.session.journalPosts[i].body= decryptWithAES(req.session.journalPosts[i].body);
					  req.session.journalPosts[i].title= decryptWithAES(req.session.journalPosts[i].title);
				  }
				  res.render(`pages/journal`, { session: req.session, splash:splash, lang:req.acceptsLanguages()[0],cookies:getCookies(req) });

 			  }
		  });
		} else {
			res.redirect("/system");
		}
		// res.render(`pages/journal`, { session: req.session, splash:splash });

		splash=null;
	 } else {
		 res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
	 }
  });

  app.get('/journal/:id/delete', (req, res)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM posts WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			} else {
				// console.log(result.rows[0]);
				req.session.jPost= result.rows[0];
				req.session.jPost.body= decryptWithAES(req.session.jPost.body);
				req.session.jPost.title= decryptWithAES(req.session.jPost.title);
				// console.log(req.session.jPost);
				res.render(`pages/delete_post`, { session: req.session, splash:splash,cookies:getCookies(req) });
			}
		});
	  } else {
		  res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
	  }

  });

  app.get('/journal/:id/edit', (req, res)=>{
	  if (isLoggedIn(req)){
		  client.query({text: "SELECT * FROM posts WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
			 if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			} else {
				// console.log(result.rows[0]);
				req.session.jPost= result.rows[0];
				req.session.jPost.body= decryptWithAES(req.session.jPost.body);
				req.session.jPost.title= decryptWithAES(req.session.jPost.title);
				// console.log(req.session.jPost);
				res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:getCookies(req) });
			}
		});
	  } else {
		  res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
	  }


  });

  app.get('/comm/:id/edit', (req, res)=>{
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM comm_posts WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
		   if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
		  } else {
			  // console.log(result.rows[0]);
			  req.session.jPost= result.rows[0];
			  req.session.jPost.body= decryptWithAES(req.session.jPost.body);
			  req.session.jPost.title= decryptWithAES(req.session.jPost.title);
			  // console.log(req.session.jPost);
			  res.render(`pages/edit_post`, { session: req.session, splash:splash,cookies:getCookies(req) });
		  }
	  });
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
	}


  });

  app.get('/comm/:id/delete', (req, res)=>{
	if (isLoggedIn(req)){
		client.query({text: "SELECT * FROM comm_posts WHERE id=$1;",values: [`${req.params.id}`]}, (err, result) => {
		   if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
		  } else {
			  // console.log(result.rows[0]);
			  req.session.jPost= result.rows[0];
			  req.session.jPost.body= decryptWithAES(req.session.jPost.body);
			  req.session.jPost.title= decryptWithAES(req.session.jPost.title);
			  // console.log(req.session.jPost);
			  res.render(`pages/delete_post`, { session: req.session, splash:splash, cookies:getCookies(req) });
		  }
	  });
	} else {
		res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
	}

  });

	app.get('/alter/:id/delete', (req, res)=>{
		req.session.chosenAlter= null;
		if (isLoggedIn(req)){
			client.query({text: "SELECT * FROM alters WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
				 if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
				} else {
					req.session.chosenAlter= result.rows[0];
				}
				// console.table(req.session.chosenAlter);
				res.render(`pages/delete_alter`, { session: req.session, splash:splash});
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}

	});

	/*



			---		POST REQUEST PAGES		---



	*/
	app.post('/reset/:id', (req, res)=>{
		// Reset password
		client.query({text: 'SELECT * FROM users WHERE email_link=$1', values: [`'${req.params.id}'`]}, (err, result)=>{
		  if (err) {
		    res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
		  } else {
		     // Does the PIN match the one in the DB?
				 console.log(result.rows[0].email_pin, req.body.pin);
				 if (result.rows[0].email_pin == req.body.pin){
					 client.query({text: 'UPDATE users SET pass=$1 WHERE email_link=$2', values: [`'${CryptoJS.SHA3(req.body.newpass)}'`,`'${req.params.id}'`]}, (err, result)=>{
					   if (err) {
							 console.log(err.stack);
					     res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
					   } else {
					      // Code here
								splash="Updated your password. You can now log in!";
								res.redirect("/login");
					   }
					 });

				 } else {
					 res.render('pages/new_pass',{ session: req.session, code:"Forbidden", splash:"That PIN doesn't match.",cookies:getCookies(req) });
				 }
		  }
		});
	});

	app.post('/forgot-password', (req, res)=>{
		client.query({text: 'SELECT username, email, email_link, email_pin FROM users WHERE email=$1 ', values:[`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result)=>{
			if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
			} else {
				if ((result.rows).length == 0){
					// User doesn't exist.
					splash= "That email isn't in use, actually. Did you mean to sign up?";
					res.render(`pages/forgot_pass`, { session: req.session, splash:splash,cookies:getCookies(req)});
				} else {
					req.session.user= result.rows[0];
					req.session.user.email_pin= getRandomInt(1111,9999);
					// console.log(req.session.user.email_pin);
					client.query({text: 'UPDATE users set email_pin=$1 WHERE email=$2 ', values:[`${req.session.user.email_pin}`,`'${Buffer.from(req.body.email).toString('base64')}'`]}, (err, result)=>{
						res.render(`pages/forgot_pass2`, { session: req.session, splash:splash,cookies:getCookies(req)});
						transporter.sendMail({
							from: '"Dee Deyes" <dee_deyes@writelighthouse.com>', // sender
							to: Buffer.from(req.session.user.email, 'base64').toString(),
							subject: "Forgot your password?", // Subject line
							text: "Hey, " + Buffer.from(req.session.user.username, 'base64').toString() + ". Did you forget your password to Lighthouse? No worries. Follow the link provided and don't forget the PIN in this email! www.writelighthouse.com/reset/" + (req.session.user.email_link).replace(/'/gi, '') + " . PIN: " + req.session.user.email_pin + ". If you didn't request this password change, disregard this email. The PIN will be required to change the password. Thanks! -Dee", // plain text body
							html: "<p>Hey, <b>" + Buffer.from(req.session.user.username, 'base64').toString() + "</b>. Did you forget your password to Lighthouse? No worries.</p><p>Follow the link provided and don't forget the PIN in this email!</p><p><a href= \"www.writelighthouse.com/reset/" + (req.session.user.email_link).replace(/'/gi, '') + "\">www.writelighthouse.com/reset/" + (req.session.user.email_link).replace(/'/gi, '') + "</a></p><p>PIN: <b>" + req.session.user.email_pin + "</b>.</p><p>If you didn't request this password change, disregard this email. The PIN will be required to change the password. Thanks! -Dee</p>", // html body
						}).then(info => {
							// console.log({info});
						}).catch(console.error);
						// console.log((req.session.user.email_link).replace(/'/gi, ''));
					});
				}

			}
		});
	});

	app.post('/rules', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text:`INSERT INTO sys_rules (u_id, rule) VALUES ($1, $2)`, values:[getCookies(req)['u_id'], `'${Buffer.from(req.body.rule).toString('base64')}'`]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash, cookies:getCookies(req) });;
				} else {
					res.redirect("/rules");
				}
			});
		} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash, cookies:getCookies(req) });
		}
	});

	app.post('/alter/:id/delete', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
				 if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
				} else {
					client.query({text: "DELETE FROM journals WHERE alt_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
						 if (err) {
							console.log(err.stack);
							res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
						} else {
							client.query({text: "DELETE FROM alters WHERE alt_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
								 if (err) {
									console.log(err.stack);
									res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
								} else {
									splash=`${Buffer.from(req.session.chosenAlter.name, 'base64').toString()} deleted.`;
									req.session.chosenAlter= null;
									res.redirect(`/system`);
								}
							});
						}
					});
				}
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}
	});

	app.post('/comm/:id/delete', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM comm_posts WHERE id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			  } else {
				  req.session.jPost= null;
				  res.redirect(`/system`);
			  }
		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}
	});

	app.post('/comm/:id/edit', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "UPDATE comm_posts SET title=$1, body=$2 WHERE id=$3; ",values: [`${encryptWithAES(req.body.jTitle)}`, `${encryptWithAES(req.body.jBody)}`, `${req.params.id}`]}, (err, result) => {
			   if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			  } else {
				  req.session.jPost= null;
				  res.redirect(`/system`);
			  }

		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}
	});

	app.post('/journal/:id/delete', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
 			  } else {
				  req.session.jPost= null;
				  res.redirect(`/journal/${req.session.chosenAlter.alt_id}`);
			  }
		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}
	});

	app.post('/journal/:id/edit', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text: "UPDATE posts SET title=$1, body=$2 WHERE p_id=$3; ",values: [`${encryptWithAES(req.body.jTitle)}`, `${encryptWithAES(req.body.jBody)}`, `${req.params.id}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
 			  } else {
				  req.session.jPost= null;
				  res.redirect(`/journal/${req.session.chosenAlter.alt_id}`);
 			  }

		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}
	});

	app.post("/journal/:id", (req, res)=>{
		if (isLoggedIn(req)){
			// session.altJournal[0].j_id
			client.query({text: "INSERT INTO posts (j_id, created_on, body, title) VALUES ($1, $2, $3, $4);",values: [`${req.session.altJournal[0].j_id}`, `${new Date().toLocaleString("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`, `${encryptWithAES(req.body.j_body)}`, `${encryptWithAES(req.body.j_title)}`]}, (err, result) => {
 			   if (err) {
 				  console.log(err.stack);
 				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash });
 			  } else {
				  res.redirect(`/journal/${req.params.id}`);
 			  }

		  });
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}
	});

	app.post("/alter/:id", function(req, res){
			/*
				{
				  journ: '7',
				  priv: 'true',
				  jPass: 't',
				  create: "Create A's Journal"
				}
			 */
			let pass= req.body.jPass || null;
			if (isLoggedIn(req)){
				if (req.body.create){
					// Create
					client.query({text: "INSERT INTO journals (alt_id, password, is_private, skin, sys_id) VALUES ($1, $2, $3, $4, $5)",values: [`${req.params.id}`, `'${CryptoJS.SHA3(req.body.jPass)}'`, `${req.body.priv}`, `'${req.body.journ}'`, `${req.session.chosenAlter.sys_id}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash });
					  } else {
						  splash=`<strong>All set!</strong> Journal made.`;
						  res.redirect(`/alter/${req.params.id}`);
					  }
				  });
			  } else if (req.body.modify){
					// Edit alter.
						client.query({text: "UPDATE alters SET sys_id=$1, name=$2 WHERE alt_id=$3;",values: [req.body.alterSys, `'${Buffer.from(req.body.altname).toString('base64')}'`, req.params.id]}, (err, result) => {
							if (err) {
							  console.log(err.stack);
							  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
						  } else {
							  splash=`<strong>All set!</strong> ${req.body.altname} has been moved.`;
							  res.redirect(`/alter/${req.params.id}`);
						  }
					  });
				} else {
				  // Login
				  client.query({text: "SELECT password FROM journals WHERE alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
					  if (err) {
						console.log(err.stack);
						res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
					} else {
						// splash=`<strong>All set!</strong> Journal made.`;
						// res.redirect(`/alter/${req.params.id}`);
					if (result.rows[0].password == `'${CryptoJS.SHA3(req.body.logPass)}'`){
						req.session.journalUser= req.params.id;
						res.redirect(`/journal/${req.params.id}`);
					} else {
						splash=`<strong>No, not quite...</strong> That's not the right password.`;
						res.redirect(`/alter/${req.params.id}`);
					}
					}
				});

			  }
			} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
			}
	});

	app.post("/system/:alt", function(req, res){
			if (isLoggedIn(req)){
				client.query({text: "INSERT INTO alters (sys_id, name) VALUES ($1, $2)",values: [`${req.session.chosenSys.sys_id}`, `'${Buffer.from(req.body.altname).toString('base64')}'`]}, (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
				  } else {
					  res.redirect(`/system/${req.session.chosenSys.sys_id}`);
				  }
			  });

			} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
			}
	});

	app.post('/inner-world', (req, res)=>{
		if (isLoggedIn(req)){
			client.query({text:'INSERT INTO inner_worlds (u_id, key, value) VALUES ($1,$2,$3);', values: [`${getCookies(req)['u_id']}`, `${Buffer.from(req.body.key).toString('base64')}`,`${Buffer.from(req.body.value).toString('base64')}`]}, (err, result)=>{
				if (err){
					console.log(err.stack);
					res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
				}
				res.redirect('/inner-world');
			});
		} else {
			res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
		}
	});

  app.post('/system', function (req, res){
	  console.log(req.body);
	  // console.log(Object.keys(req.body)[0]);
	  if (req.body.sysname){
		  client.query({text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			  } else {
				  // console.table(result.rows);
				  if ((result.rows).length == 0){
					  client.query({text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${getCookies(req)['u_id']}`]}, (err, result) => {
					      if (err) {
					        console.log(err.stack);
					        res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
					      } else {
					          splash=`Added ${req.body.sysname}.`;
							  // res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys });
							  res.redirect("/system");
					      }
					  });
				  } else {
					// res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys });
					splash=`You already have a system with the alias "${req.body.sysname}". Please use a unique name. Sorry!`;
					res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys,cookies:getCookies(req) });
				  }
			  }
		  });
	  } else {
		  // Comm journal.
		  // id | u_id | created_on | title | body
		  client.query({text: "INSERT INTO comm_posts (u_id, created_on, title, body) VALUES ($1, $2, $3, $4)",values: [`${getCookies(req)['u_id']}`, `${new Date().toLocaleString("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`, `${encryptWithAES(req.body.cTitle)}`, `${encryptWithAES(req.body.cBody)}`]}, (err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
			} else {
				res.redirect("/system");
			}
		});
	  }
  });

	app.post('/deletesys/:alt', function(req, res){
		// console.table(req.session.chosenSys);
		client.query({text: "SELECT * FROM systems WHERE sys_id=$1",values: [`${req.params.alt}`]}, (err, result) => {
			if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
		  } else {
			  console.table(result.rows[0]);
			  if (getCookies(req)['u_id']= result.rows[0].user_id){
				  // DELETE FROM alters WHERE sys_id=$1;
				  // posts, journals, alters, system
				  client.query({text: "DELETE FROM journals WHERE sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
					  if (err){
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
					  } else {
							  client.query({text: "DELETE FROM alters WHERE sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
								  if (err){
									  console.log(err.stack);
									  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
								  }
								  client.query({text: "DELETE FROM systems WHERE sys_id=$1;",values: [`${req.params.alt}`]}, (err, result) => {
									  if (err){
										  console.log(err.stack);
										  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
									  }
									  splash=`${Buffer.from(req.session.chosenSys.sys_alias, 'base64').toString()} has been permanently deleted.`;
									  req.session.chosenSys= null;
									  res.redirect("/system");
								  });
							  });

					  }
				  });
			  } else {
					// Not their system.
					res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
			  }

		  }
		});
	});

	app.post('/editsys/:alt', function(req, res){
		// console.table(req.session.chosenSys);
		client.query({text: "SELECT * FROM systems WHERE user_id=$1;",values: [`${req.session.chosenSys.user_id}`]}, (err, result) => {
			if (err) {
			  console.log(err.stack);
			  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
		  } else {
			  if (getCookies(req)['u_id']= result.rows[0].user_id){
				  client.query({text: "UPDATE systems SET sys_alias=$1 WHERE sys_id=$2;",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${req.session.chosenSys.sys_id}`]}, (err, result) => {
					  if (err){
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
					  } else {
						  splash=`${Buffer.from(req.session.chosenSys.sys_alias, 'base64').toString()} has been permanently deleted.`;
						  req.session.chosenSys= null;
						  res.redirect("/system");
					  }
				  });
			  } else {
					// Not their system.
					res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash,cookies:getCookies(req) });
			  }

		  }
		});
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
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
          } else {
            // console.log(res.rows)
            if (result.rows.length > 0){
                console.log("Already exists.");
                splash="<strong>Uh oh!</strong> That username or password is already in use. <a href='/login'>Do you need to log in instead?</a>";
                res.render(`pages/signup`, { session: req.session, splash:splash,cookies:getCookies(req) });
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
                      res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });
                  } else {
					  transporter.sendMail({
						  from: '"Dee Deyes" <dee_deyes@writelighthouse.com>', // sender address
						  // to: "dannyisyelling@gmail.com, dekuelegy@gmail.com", // list of receivers
						  to: req.body.email,
						  subject: "Welcome to Lighthouse!", // Subject line
						  text: "Hi there, " + req.body.username + ". Thanks for signing up to Lighthouse, a journal app designed for systems! I hope it can help you internally communicate effectively. Check out the information page to get started! If you lose your password and the feature to reset it hasn't been implemented yet, send an email to this address and I will fix for you as soon as possible! If this account was made in error, reply to this email and the account will be deleted shortly. Thanks! -Dee", // plain text body
						  html: "<p>Hi there, <b>" + req.body.username + "</b>. Thanks for signing up to Lighthouse, a journal app! I hope it can help you internally communicate effectively. Check out the information page to get started!</p> <p>If you lose your password and the feature to reset it hasn't been implemented yet, send an email to this address and I will fix for you as soon as possible! If this account was made in error, reply to this email and the account will be deleted shortly. Thanks!</p> <p>-Dee</p>", // html body
						}).then(info => {
						  console.log({info});
						}).catch(console.error);
                      res.render(`pages/registered`, { session: req.session, splash:splash,cookies:getCookies(req) });
                  }
              });
            }
          }
        });

  });

 app.post('/login', function(req, res) {
     var query = {
       text: "SELECT * FROM users WHERE email=$1 AND pass=$2;",
       values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${CryptoJS.SHA3(req.body.password)}'`]
     }
     client.query(query, (err, result) => {
         if (err) {
           console.log(err.stack);
           res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", splash:splash,cookies:getCookies(req) });;
       } else {
		   if (result.rows.length == 0){
			   splash= "Wrong credentials.";
			   res.redirect('/login');
		   } else {
			   req.session.loggedin = true;
			   req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
         getCookies(req)['u_id']= result.rows[0].id;
				 // Add to cookies
				 res.cookie('loggedin', true).cookie('username',  Buffer.from(result.rows[0].username, 'base64').toString()).cookie('u_id', result.rows[0].id);
				// console.log(typeof(getCookies(req)['loggedin']));
				 // Redirect to index.
					res.redirect(302, '/');
		   }
       }
   });
 });

  // ERROR ROUTES. DO NOT PUT NEW PAGES BENEATH THESE.
	app.use(function(req,res){
			res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", splash:splash,cookies:getCookies(req) });
	});
  // End pages.
  app.listen(PORT, () => console.log(`Listening on ${ PORT }`));


    client.query('SELECT NOW()', (err, res) => {
    // console.log(err, res)
    console.log(`App started on ${(res.rows[0].now).toLocaleString()}`);
    // client.end()
;
});
