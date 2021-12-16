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

require('dotenv').config();

const api = new PKAPI({
	base_url: "https://api.pluralkit.me", // base api url
	version: 1, // api version
	token: undefined // for authing requests. only set if you're using this for a single system!
})

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
      var imgFolder= path.join(__dirname, 'public/img')
      res.render(`pages/index`, { session: req.session, splash:splash });
      splash=null;
  });
  app.get('/about', (req, res, next) => {
      res.render(`pages/about`, { session: req.session, splash:splash });
      splash=null;
  });
  app.get('/todos', (req, res, next) => {
      res.render(`pages/todos`, { session: req.session, splash:splash });
      splash=null;
  });
  app.get('/crisis', (req, res, next) => {
      res.render(`pages/crisis`, { session: req.session, splash:splash });
      splash=null;
  });
  app.get('/signup', (req, res, next) => {
      res.render(`pages/signup`, { session: req.session, splash:splash });
      splash=null;
  });

  app.get('/login', (req, res, next) => {
      res.render(`pages/login`, { session: req.session, splash:splash });
      splash=null;
  });

  app.get('/logout', (req, res)=>{
     splash= `See you soon, ${req.session.username}.`;
     req.session.username= null;
     req.session.loggedin=false;
     res.redirect("/");
  });
var sysArr;
  app.get('/system', (req, res, next) => {
    if (req.session.loggedin== true){
        client.query({text: "SELECT * FROM systems WHERE user_id=$1",values: [`${req.session.u_id}`]}, (err, result) => {
            if (err) {
              console.log(err.stack);
              console.log("Oops.")
          } else {
              req.session.sys = [];
              for (i in (result.rows)){
                  (req.session.sys).push(Buffer.from(result.rows[i].alias, 'base64').toString())
              }
          }
          res.render(`pages/system`, { session: req.session, splash:splash, sysArr: req.session.sys });
        });
    } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", splash:splash });
    }
    // splash=null;
  });

  // // PAGES- POST REQUEST

  app.post('/system', function (req, res){
      client.query({text: "INSERT INTO systems (alias, user_id) VALUES ($1, $2)",values: [`'${Buffer.from(req.body.sysname).toString('base64')}'`, `${req.session.u_id}`]}, (err, result) => {
          if (err) {
            console.log(err.stack);
            console.log("Oops.")
          } else {
              res.render(`pages/system`, { session: req.session, splash:splash });
              splash=`Added ${req.body.sysname}.`;
          }
      });
  });

  app.post('/signup', function(req, res) {
      // console.log(`${req.body.email}`);
      var splash;
      var query = {
        text: "SELECT * FROM users WHERE email=$1 OR username=$2",
        values: [`'${Buffer.from(req.body.email).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`]
      }
      client.query(query, (err, result) => {
          if (err) {
            console.log(err.stack);
            console.log("Oops.")
          } else {
            // console.log(res.rows)
            if (result.rows.length > 0){
                console.log("Already exists.");
                splash="<strong>Uh oh!</strong> That username or password is already in use. <a href='/login'>Do you need to log in instead?</a>";
                res.render(`pages/signup`, { session: req.session, splash:splash });
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
                      console.log("Oops.")
                  } else {
                      res.render(`pages/registered`, { session: req.session, splash:splash });
                  }
              });
            }
          }
        });

  });

 app.post('/login', function(req, res) {
     var query = {
       text: "SELECT * FROM users WHERE email=$1;",
       values: [`'${Buffer.from(req.body.email).toString('base64')}'`]
     }
     client.query(query, (err, result) => {
         if (err) {
           console.log(err.stack);
           console.log("Oops.");
       } else {
           // console.log(res.rows[0]);
           req.session.loggedin = true;
		   req.session.username = Buffer.from(result.rows[0].username, 'base64').toString();
           req.session.u_id= result.rows[0].id;
           // console.table(result.rows[0])
           res.redirect('/');
       }
   });
 });

  // ERROR ROUTES. DO NOT PUT NEW PAGES BENEATH THESE.
  app.get('*', function(req, res){
     // res.send(404);
     res.render(`pages/404`, { session: req.session, code:"Not Found", splash:splash });
     splash=null;
});
  // End pages.
  app.listen(PORT, () => console.log(`Listening on ${ PORT }`));


    client.query('SELECT NOW()', (err, res) => {
    // console.log(err, res)
    console.log(`App started on ${(res.rows[0].now).toLocaleString()}`);
    // client.end()
});
