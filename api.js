// API routes.
const express = require('express');
const router = express.Router();
const db = require('./db');
const client= db.client;
const crypto= require('crypto');
const CryptoJS = require("crypto-js");


function checkUUID(str){
	let uuidRegex= /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
	return uuidRegex.test(str);
}
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

/**
 * Checks if the request is specifically an internal API call, or a browser making a request.
 * @param {object} req ExpressJS API request. 
 * @returns {boolean} true or false
 */
function apiEyesOnly(req) {
	if (req.headers['referer']) {
    // This is a browser.
	   return true;
	} else {
	  return false;     
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
/*

   ____      _     ____                            _       
  / ___| ___| |_  |  _ \ ___  __ _ _   _  ___  ___| |_ ___ 
 | |  _ / _ \ __| | |_) / _ \/ _` | | | |/ _ \/ __| __/ __|
 | |_| |  __/ |_  |  _ <  __/ (_| | |_| |  __/\__ \ |_\__ \
  \____|\___|\__| |_| \_\___|\__, |\__,_|\___||___/\__|___/
                                |_|                        

*/
router.get("/test", async function(req, res){
    return res.status(200).render('pages/apitest',{ session: req.session, cookies:req.cookies });
});

// Grab user's members by user ID and token. If the token is not provided, reject them. The token should not be in the URL
router.get('/members/:id', async function (req, res){
    if (!checkUUID(req.params.id)) return res.status(400).send("Bad Request");
      let userCheck= await db.query(client, "SELECT users.id, tokens.* FROM users INNER JOIN tokens ON users.id= tokens.u_id WHERE users.id=$1;", [req.params.id], res, req);
      let matched= false;
      // Using a for loop bc I can easily break out of it.
      for (i in userCheck){
        let compareTok= decryptWithAES(userCheck[i].name);
        if (compareTok == req.headers.usertoken){
          // Matches. Read and Alter perms?
          if (userCheck[i].read == false || userCheck[i].alters == false) return res.status(401).send("Not Authorised")
          matched= true;
          break;
        }
      }
      if (matched == true){
        let alters= await db.query(client, "SELECT alters.*, systems.sys_id, systems.sys_alias FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id=$1", [req.params.id], res, req);
        let altArr= new Array();
        alters.forEach((alter)=>{
          altArr.push({
            id: alter.alt_id,
            sys_id: alter.sys_id,
            sys_alias: alter.sys_alias != null ? Buffer.from(alter.sys_alias, "base64").toString() : "",
            name: alter.name != null ? Buffer.from(alter.name, "base64").toString() : "",
            pronouns: alter.pronouns != null ? Buffer.from(alter.pronouns, "base64").toString() : "",
            age: alter.agetext != null ? Buffer.from(alter.agetext, "base64").toString() : "",
            positiveTriggers: alter.triggers_pos != null ? Buffer.from(alter.triggers_pos, "base64").toString() : "",
            negativeTriggers: alter.triggers_neg != null ? Buffer.from(alter.triggers_neg, "base64").toString() : "",
            likes: alter.likes != null ? Buffer.from(alter.likes, "base64").toString() : "",
            dislikes: alter.dislikes != null ? Buffer.from(alter.dislikes, "base64").toString() : "",
            job: alter.job != null ? Buffer.from(alter.job, "base64").toString() : "",
            safePlace: alter.safe_place != null ? Buffer.from(alter.safe_place, "base64").toString() : "",
            wants: alter.wants != null ? Buffer.from(alter.wants, "base64").toString() : "",
            accommodation: alter.acc != null ? Buffer.from(alter.acc, "base64").toString() : "",
            notes: alter.notes != null ? Buffer.from(alter.notes, "base64").toString() : "",
            imgUrl: alter.img_url != null ? Buffer.from(alter.img_url, "base64").toString() : "",
            type: alter.type,
            birthday: alter.birthday != null ? Buffer.from(alter.birthday, "base64").toString() : "",
            firstNoted: alter.first_noted != null ? Buffer.from(alter.first_noted, "base64").toString() : "",
            gender: alter.gender != null ? Buffer.from(alter.gender, "base64").toString() : "",
            sexuality: alter.sexuality != null ? Buffer.from(alter.sexuality, "base64").toString() : "",
            source: alter.source != null ? Buffer.from(alter.source, "base64").toString() : "",
            frontTells: alter.fronttells != null ? Buffer.from(alter.fronttells, "base64").toString() : "",
            relationships: alter.relationships != null ? Buffer.from(alter.relationships, "base64").toString() : "",
            hobbies: alter.hobbies != null ? Buffer.from(alter.hobbies, "base64").toString() : "",
            appearance: alter.appearance != null ? Buffer.from(alter.appearance, "base64").toString() : "",
            colour: alter.colour,
            outline: alter.outline,
            isArchived: alter.is_archived
          });
          
        });
        return res.status(200).json(altArr);
      } else {
        return res.status(401).send("Not Authorised")
      }
  });
// Grab user's systems by user ID and token. If the token is not provided, reject them. The token should not be in the URL
router.get('/systems/:id', async function (req, res){
  if (!checkUUID(req.params.id)) return res.status(400).send("Bad Request");

    let userCheck= await db.query(client, "SELECT users.id, tokens.* FROM users INNER JOIN tokens ON users.id= tokens.u_id WHERE users.id=$1;", [req.params.id], res, req);
    let matched= false;
    // Using a for loop bc I can easily break out of it.
    for (i in userCheck){
      let compareTok= decryptWithAES(userCheck[i].name);
      if (compareTok == req.headers.usertoken){
        // Matches. Read and Alter perms?
        if (userCheck[i].read == false || userCheck[i].systems == false) return res.status(401).send("Not Authorised")
        matched= true;
        break;
      }
    }
    if (matched == true){
      let systems= await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [req.params.id], res, req);
      let sysArr= new Array();
      systems.forEach((system)=>{
        sysArr.push({
          id: system.sys_id,
          name: Buffer.from(system.sys_alias, "base64").toString(),
          icon: system.icon,
          parent_sys: system.subsys_id
        })
      })
      return res.status(200).json(sysArr);
    } else {
      return res.status(401).send("Not Authorised")
    }
  
});

// Grab user's systems by user ID and token. If the token is not provided, reject them. The token should not be in the URL
router.get('/journals/:id', async function (req, res){
  if (!checkUUID(req.params.id)) return res.status(400).send("Bad Request");

    let userCheck= await db.query(client, "SELECT users.id, tokens.* FROM users INNER JOIN tokens ON users.id= tokens.u_id WHERE users.id=$1;", [req.params.id], res, req);
    let matched= false;
    // Using a for loop bc I can easily break out of it.
    for (i in userCheck){
      let compareTok= decryptWithAES(userCheck[i].name);
      if (compareTok == req.headers.usertoken){
        // Matches. Read and Alter perms?
        if (userCheck[i].read == false || userCheck[i].journals == false) return res.status(401).send("Not Authorised")
        matched= true;
        break;
      }
    }
    if (matched == true){
      let journals= await db.query(client, "SELECT journals.*, posts.* FROM journals INNER JOIN systems ON systems.sys_id= journals.sys_id INNER JOIN posts ON posts.j_id= journals.j_id WHERE user_id=$1", [req.params.id], res, req);
      let jArr= new Array();
      journals.forEach((j)=>{
        jArr.push({
          id: j.j_id,
          alt_id: j.alt_id,
          private_journal: j.is_private,
          is_pinned: j.is_pinned,
          skin: j.skin,
          sys_id: j.sys_id,
          created_on: j.created_on,
          title: j.title != null ? decryptWithAES(j.title) : "",
          body: j.body != null ? decryptWithAES(j.body) : ""
        })
      })
      return res.status(200).json(jArr);
    } else {
      return res.status(401).send("Not Authorised")
    }

});


  router.get("/user/auth", async function(req, res){
    // Grab user info. This is for logging in.
    let userCheck = await db.query(client, "SELECT * FROM users WHERE email=$1 OR username=$3 AND pass=$2;", [`'${Buffer.from((req.headers.email).toLowerCase()).toString('base64')}'`, `'${CryptoJS.SHA3(req.headers.tok)}'`, `'${Buffer.from((req.headers.email)).toString('base64')}'`], res, req);
    if (userCheck.length > 0){
      req.session.alter_term= userCheck[0].alter_term;
      req.session.system_term= userCheck[0].system_term;
      req.session.subsystem_term= userCheck[0].subsystem_term;
      req.session.innerworld_term= userCheck[0].innerworld_term;
      req.session.plural_term= userCheck[0].plural_term;
      req.session.loggedin = true;
      req.session.u_id= userCheck[0].id;
      req.session.username = Buffer.from(userCheck[0].username, 'base64').toString();
      req.session.is_legacy= userCheck[0].is_legacy;
      req.session.textsize= userCheck[0].textsize;
      req.session.worksheets_enabled= userCheck[0].worksheets_enabled;

      // Cookies.
      res
      .cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('username',  Buffer.from(userCheck[0].username, 'base64').toString(),{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('u_id', userCheck[0].id,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('alter_term', userCheck[0].alter_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('system_term', userCheck[0].system_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('is_legacy', userCheck[0].is_legacy,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('skin', userCheck[0].skin,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('subsystem_term', userCheck[0].subsystem_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('innerworld_term', userCheck[0].innerworld_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('plural_term', userCheck[0].plural_term,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('textsize', userCheck[0].textsize,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
      .cookie('worksheets_enabled', userCheck[0].worksheets_enabled,{ maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
      return res.status(200).json({
        name: Buffer.from(userCheck[0].username, 'base64').toString()
      });
    }  else {
      return res.status(401).send("???");
    }
  })

/*
  ____        _     ____                            _       
 |  _ \ _   _| |_  |  _ \ ___  __ _ _   _  ___  ___| |_ ___ 
 | |_) | | | | __| | |_) / _ \/ _` | | | |/ _ \/ __| __/ __|
 |  __/| |_| | |_  |  _ <  __/ (_| | |_| |  __/\__ \ |_\__ \
 |_|    \__,_|\__| |_| \_\___|\__, |\__,_|\___||___/\__|___/
                                 |_|                        
*/

router.put("/tokens", async function (req, res){
  if (apiEyesOnly(req)){
    // Do not let the program take a template literal. Could become an SQL injection.
    // return console.log(req.body)
    let request= req.body;
    let userToks= await db.query(client, "SELECT * FROM tokens WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
    userToks.every(async function(token){
      if (decryptWithAES(token.name) == request.tok){
        // Matched.
        switch(request.mode){
          case "read":
            await db.query(client, "UPDATE tokens SET read=$1 WHERE name=$2 AND u_id=$3;", [request.enable, token.name, getCookies(req)['u_id']], res, req);
            break;
          case "write":
            await db.query(client, "UPDATE tokens SET write=$1 WHERE name=$2 AND u_id=$3;", [request.enable, token.name, getCookies(req)['u_id']], res, req);
            break;
          case "alters":
            await db.query(client, "UPDATE tokens SET alters=$1 WHERE name=$2 AND u_id=$3;", [request.enable, token.name, getCookies(req)['u_id']], res, req);
            break;
          case "systems":
            await db.query(client, "UPDATE tokens SET systems=$1 WHERE name=$2 AND u_id=$3;", [request.enable, token.name, getCookies(req)['u_id']], res, req);
            break;
          default: 
          await db.query(client, "UPDATE tokens SET journals=$1 WHERE name=$2 AND u_id=$3;", [request.enable, token.name, getCookies(req)['u_id']], res, req);
            break;
        }
        res.status(200).send("!");
        return true;
      }
    });
    
  } else {
    res.status(404).render('pages/404',{ session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
  }
});


/*
  ____       _      _         ____                            _       
 |  _ \  ___| | ___| |_ ___  |  _ \ ___  __ _ _   _  ___  ___| |_ ___ 
 | | | |/ _ \ |/ _ \ __/ _ \ | |_) / _ \/ _` | | | |/ _ \/ __| __/ __|
 | |_| |  __/ |  __/ ||  __/ |  _ <  __/ (_| | |_| |  __/\__ \ |_\__ \
 |____/ \___|_|\___|\__\___| |_| \_\___|\__, |\__,_|\___||___/\__|___/
                                           |_|                        
*/

router.delete("/tokens", async function(req, res){
  if (apiEyesOnly(req)){
    let userToks= await db.query(client, "SELECT * FROM tokens WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
    const selectedTok = (userToks.filter(result => decryptWithAES(result.name) === req.headers.tok))[0];
    await db.query(client, "DELETE FROM tokens WHERE name=$1 AND u_id=$2;", [selectedTok.name, getCookies(req)['u_id']], res, req);
    return res.status(200).send("!")
  } else {
    res.status(404).render('pages/404',{ session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
  }
})

/*
  ____           _     ____                            _       
 |  _ \ ___  ___| |_  |  _ \ ___  __ _ _   _  ___  ___| |_ ___ 
 | |_) / _ \/ __| __| | |_) / _ \/ _` | | | |/ _ \/ __| __/ __|
 |  __/ (_) \__ \ |_  |  _ <  __/ (_| | |_| |  __/\__ \ |_\__ \
 |_|   \___/|___/\__| |_| \_\___|\__, |\__,_|\___||___/\__|___/
                                    |_|                        
*/
router.post('/generate-token', async function (req, res){
    if (apiEyesOnly(req)){
      let tok= generateToken(10);
      const addTok= await db.query(client, "INSERT INTO tokens (u_id, name) VALUES ($1, $2);", [req.body.id, encryptWithAES(tok)], res, req);
      let userToks= await db.query(client, "SELECT * FROM tokens WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
      const selectedTok = (userToks.filter(result => decryptWithAES(result.name) === tok))[0];
      // console.log(selectedTok);
      return res.status(200).json({
        name: decryptWithAES(selectedTok.name),
        read: selectedTok.read,
        write: selectedTok.write,
        alters: selectedTok.alters,
        systems: selectedTok.systems,
        journals: selectedTok.journals
      });
    } else {
      res.status(404).render('pages/404',{ session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
    }
});

router.post("/user/create", async function(req, res){
    // Sign a user up.
    if (apiEyesOnly(req)){
      
    } else {
      res.status(404).render('pages/404',{ session: req.session, code:"Not Found", splash:splash,cookies:req.cookies });
    }
});

console.log(`Public API Router Loaded.`);
module.exports = router;
