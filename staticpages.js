// Static Pages Router
const express = require('express');
const router = express.Router();
const db = require('./db');
const client= db.client;
const crypto= require('crypto');
const CryptoJS = require("crypto-js");
var strings= require("./lang/en.json");
const {errorPage} = require("./funcs.js");

  router.get('/philosophy', (req, res, next) => { res.render(`pages/phil`, { session: req.session, cookies:req.cookies })});
  

  router.get('/about', (req, res, next) => {
        res.render(`pages/about`, { session: req.session, cookies:req.cookies });
    });
  
    router.get('/tos', (req, res) => {
      res.render(`pages/tos`, { session: req.session, cookies:req.cookies });
  });
  
  router.get('/privacypolicy', (req, res) => {
      res.render(`pages/privacypolicy`, { session: req.session, cookies:req.cookies });
  });
  
    router.get('/todos', (req, res, next) => {
        res.render(`pages/todos`, { session: req.session, cookies:req.cookies });
        
    });
    router.get('/crisis', (req, res, next) => {
        res.render(`pages/crisis`, { session: req.session, cookies:req.cookies });
        
    });
    router.get('/signup', (req, res, next) => {
      res.render(`pages/signup`, { session: req.session, cookies:req.cookies });
      // res.render(`pages/signup-disabled`, { session: req.session, cookies:req.cookies });
    });
    router.get('/login', (req, res) => {
        // Bookmark: login page
          res.render(`pages/login`, { session: req.session, cookies:req.cookies });
    
      });
      router.get('/cookies', (req, res, next) => {
          res.render(`pages/cookies`, { session: req.session, cookies:req.cookies });
          
      });
    
      router.get('/forgot-password', (req, res, next) => {
          res.render(`pages/forgot_pass`, { session: req.session, cookies:req.cookies });
          
      });

      // Refactored!
  router.get('/', async function (req, res){
	// client, customQuery, customValues, res, req
	const count= await db.query(client, "SELECT COUNT(id) FROM users;", [], res, req);
	const donators= await db.query(client,"SELECT * FROM donators;", [], res, req);
	res.render(`pages/index`, { session: req.session, userCount:count[0].count, cookies:req.cookies, donators:donators });
  });

 // No need to refactor
 router.get('/tutorial', (req, res) => {
  res.render(`pages/tutorial`, { session: req.session, cookies:req.cookies});
});

router.get("/lighthouse-system", (req, res)=>{
  res.render("pages/lighthouse-sys", { session: req.session, cookies:req.cookies})
});

/**
 * GET /combine/item
 * Moved here until the combine function is expanded.
 */
app.get('/combine/:item', (req, res) => {
  if (isLoggedIn(req)) {
    res.render(`pages/combine-alters`, { session: req.session, cookies: req.cookies });
  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }
});

app.get('/simply-plural', (req, res) => {
	if (isLoggedIn(req)) {
		res.render(`pages/sp-import`, { session: req.session, cookies: req.cookies });
	} else { forbidUser(res, req) }
});

app.get("/pluralkit", (req, res) => {
	if (isLoggedIn(req)) {
		res.render(`pages/pluralkit`, { session: req.session, cookies: req.cookies, lang: req.acceptsLanguages()[0] });
	}
});

app.get('/reset/:id', (req, res) => {
	res.render("pages/new_pass", { session: req.session, cookies: req.cookies });
});


  console.log(`Static Page Router Loaded.`);
  module.exports = router;