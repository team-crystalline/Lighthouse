// Static Pages Router
const express = require('express');
const router = express.Router();
const db = require('./db');
const client= db.client;
const crypto= require('crypto');
const CryptoJS = require("crypto-js");

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
    });
    router.get('/login', (req, res) => {
        // Bookmark: login page
        // req.flash('info', 'Welcome');
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
  console.log(`Static Page Router Loaded.`);
  module.exports = router;