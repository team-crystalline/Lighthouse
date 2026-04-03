// API routes.
const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config/config.js')
const client = db.client;
const crypto = require('crypto');
const CryptoJS = require("crypto-js");
var strings = require("../lang/en.json");
const archiver = require('archiver');
const { Readable } = require('stream');
const {
  getCookies,
  apiEyesOnly,
  encryptWithAES,
  decryptWithAES,
  checkUUID,
  generateToken,
  authUser,
  validateParam,
  createPassword
} = require('../funcs');

// #region POST routes
router.post('/generate-token', authUser,
  async function (req, res) {
    if (apiEyesOnly(req)) {
      let tok = generateToken(10);
      const addTok = await db.query(client, "INSERT INTO tokens (u_id, name) VALUES ($1, $2);", [req.body.id, encryptWithAES(tok)], res, req);
      let userToks = await db.query(client, "SELECT * FROM tokens WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
      const selectedTok = (userToks.filter(result => decryptWithAES(result.name) === tok))[0];
      return res.status(200).json({
        name: decryptWithAES(selectedTok.name),
        read: selectedTok.read,
        write: selectedTok.write,
        alters: selectedTok.alters,
        systems: selectedTok.systems,
        journals: selectedTok.journals
      });
    } else {
      res.status(404).render('pages/404', { session: req.session, code: "Not Found", splash: splash, cookies: req.cookies });
    }
  }
);

router.get("/user/export/:id", authUser, validateParam("id"),
  async function (req, res) {
    if (!checkUUID(req.params.id)) return res.status(400).send("Bad Request");
    /* Things to export:
      - User info (username, terms, settings)
      - Systems
      - Alters
      - Journals
      - Journal Posts
      - Worksheets
      - Threads
      - Thread Posts
      - Forum posts
      - BDA plan
      - Inner worlds
      - Rules
      - Wishlist
      - Communal Journal Entries
      Compile these into a zip and send to user?
    */
    if (apiEyesOnly(req)) {
      // Good lord. TODO: Make this not a fucking nightmare to read. ...Also is that like 13 queries at once? Might be ok if there's not many people online, but like... Woof.
      const userInfo = await db.query(client, "SELECT * FROM users WHERE id=$1;", [req.params.id], res, req);
      const systems = await db.query(client, "SELECT * FROM systems WHERE user_id=$1;", [req.params.id], res, req);
      const alters = await db.query(client, "SELECT * FROM alters WHERE sys_id IN (SELECT sys_id FROM systems WHERE user_id=$1);", [req.params.id], res, req);
      const journals = await db.query(client, "SELECT * FROM journals WHERE sys_id IN (SELECT sys_id FROM systems WHERE user_id=$1);", [req.params.id], res, req);
      const categories = await db.query(client, "SELECT * FROM categories WHERE u_id=$1;", [req.params.id], res, req);
      const threads = await db.query(client, "SELECT * FROM threads WHERE u_id=$1;", [req.params.id], res, req);
      const threadPosts = await db.query(client, "SELECT * FROM thread_posts WHERE thread_id IN (SELECT thread_id FROM threads WHERE u_id=$1);", [req.params.id], res, req);
      const posts = await db.query(client, "SELECT * FROM posts WHERE j_id IN (SELECT j_id FROM journals WHERE sys_id IN (SELECT sys_id FROM systems WHERE user_id=$1));", [req.params.id], res, req);
      const bdaPlan = await db.query(client, "SELECT * FROM bda_plans WHERE u_id=$1;", [req.params.id], res, req);
      const innerWorlds = await db.query(client, "SELECT * FROM inner_worlds WHERE u_id=$1;", [req.params.id], res, req);
      const rules = await db.query(client, "SELECT * FROM sys_rules WHERE u_id=$1;", [req.params.id], res, req);
      const wishlist = await db.query(client, "SELECT * FROM wishlist WHERE user_id=$1;", [req.params.id], res, req);
      const communalJournals = await db.query(client, "SELECT * FROM comm_posts WHERE u_id=$1;", [req.params.id], res, req);
      // Now to de-encode base64 fields.
      let exportData = {
        userInfo: {
          id: userInfo[0].id,
          username: Buffer.from(userInfo[0].username, "base64").toString(),
          alter_term: userInfo[0].alter_term,
          system_term: userInfo[0].system_term,
          subsystem_term: userInfo[0].subsystem_term,
          innerworld_term: userInfo[0].innerworld_term,
          plural_term: userInfo[0].plural_term,
          textsize: userInfo[0].textsize,
          worksheets_enabled: userInfo[0].worksheets_enabled
        },
        systems: systems.map(system => ({
          sys_id: system.sys_id,
          user_id: system.user_id,
          desc: decryptWithAES(system.desc),
          sys_alias: Buffer.from(system.sys_alias, "base64").toString(),
          icon: system.icon,
          subsys_id: system.subsys_id
        })),
        alters: alters.map(alter => ({
          alt_id: alter.alt_id,
          sys_id: alter.sys_id,
          name: alter.name != null ? Buffer.from(alter.name, "base64").toString() : "",
          pronouns: alter.pronouns != null ? Buffer.from(alter.pronouns, "base64").toString() : "",
          agetext: alter.agetext != null ? Buffer.from(alter.agetext, "base64").toString() : "",
          triggers_pos: alter.triggers_pos != null ? Buffer.from(alter.triggers_pos, "base64").toString() : "",
          triggers_neg: alter.triggers_neg != null ? Buffer.from(alter.triggers_neg, "base64").toString() : "",
          likes: alter.likes != null ? Buffer.from(alter.likes, "base64").toString() : "",
          dislikes: alter.dislikes != null ? Buffer.from(alter.dislikes, "base64").toString() : "",
          job: alter.job != null ? Buffer.from(alter.job, "base64").toString() : "",
          safe_place: alter.safe_place != null ? Buffer.from(alter.safe_place, "base64").toString() : "",
          wants: alter.wants != null ? Buffer.from(alter.wants, "base64").toString() : "",
          acc: alter.acc != null ? Buffer.from(alter.acc, "base64").toString() : "",
          notes: alter.notes != null ? Buffer.from(alter.notes, "base64").toString() : "",
          img_url: alter.img_url != null ? Buffer.from(alter.img_url, "base64").toString() : "",
          type: alter.type,
          birthday: alter.birthday != null ? Buffer.from(alter.birthday, "base64").toString() : "",
          first_noted: alter.first_noted != null ? Buffer.from(alter.first_noted, "base64").toString() : "",
          gender: alter.gender != null ? Buffer.from(alter.gender, "base64").toString() : "",
          sexuality: alter.sexuality != null ? Buffer.from(alter.sexuality, "base64").toString() : "",
          source: alter.source != null ? Buffer.from(alter.source, "base64").toString() : "",
          fronttells: alter.fronttells != null ? Buffer.from(alter.fronttells, "base64").toString() : "",
          relationships: alter.relationships != null ? Buffer.from(alter.relationships, "base64").toString() : "",
          hobbies: alter.hobbies != null ? Buffer.from(alter.hobbies, "base64").toString() : "",
          appearance: alter.appearance != null ? Buffer.from(alter.appearance, "base64").toString() : "",
          colour: alter.colour,
          outline: alter.outline,
          is_archived: alter.is_archived
        })),
        journals: journals.map(journal => ({
          j_id: journal.j_id,
          sys_id: journal.sys_id,
          alt_id: journal.alt_id,
          is_private: journal.is_private,
          is_pinned: journal.is_pinned,
          skin: journal.skin,
          created_on: journal.created_on,
          title: decryptWithAES(journal.title),
          body: decryptWithAES(journal.body)
        })),
        posts: posts.map(post => ({
          post_id: post.post_id,
          j_id: post.j_id,
          created_on: post.created_on,
          title: decryptWithAES(post.title),
          body: decryptWithAES(post.body)
        })),
        bdaPlan: bdaPlan.map(plan => ({
          id: plan.id,
          u_id: plan.u_id,
          before: decryptWithAES(plan.before),
          during: decryptWithAES(plan.during),
          after: decryptWithAES(plan.after),
          is_active: plan.is_active,
          alias: decryptWithAES(plan.alias),
          timestamp: plan.timestamp
        })),
        innerWorlds: innerWorlds.map(iw => ({
          id: iw.id,
          u_id: iw.u_id,
          key: Buffer.from(iw.key, "base64").toString(),
          value: Buffer.from(iw.value, "base64").toString()
        })),
        rules: rules.map(rule => ({
          id: rule.id,
          u_id: rule.u_id,
          rule: Buffer.from(rule.rule, "base64").toString(),
          created: rule.created
        })),
        wishlist: wishlist.map(item => ({
          id: item.uuid,
          user_id: item.user_id,
          wish: item.wish ? Buffer.from(item.wish, "base64").toString() : "",
          is_fulfilled: item.is_filled
        })),
        communalJournals: communalJournals.map(cj => ({
          id: cj.id,
          u_id: cj.u_id,
          created_on: cj.created_on,
          title: decryptWithAES(cj.title),
          body: decryptWithAES(cj.body),
          is_pinned: cj.is_pinned,
          system_id: cj.system_id,
          feeling: decryptWithAES(cj.feeling)
        })),
        categories: categories.map(cat => ({
          id: cat.id,
          u_id: cat.u_id,
          name: decryptWithAES(cat.name),
          description: decryptWithAES(cat.description),
          icon: cat.icon,
          last_post_id: cat.last_post_id,
          last_post_date: cat.last_post_date,
          created_on: cat.created_on,
          f_order: cat.f_order
        })),
        threads: threads.map(thread => ({
          id: thread.id,
          u_id: thread.u_id,
          alt_id: thread.alt_id,
          topic_id: thread.topic_id,
          title: decryptWithAES(thread.title),
          body: decryptWithAES(thread.body),
          created_on: thread.created_on,
          is_sticky: thread.is_sticky,
          is_locked: thread.is_locked,
          is_popular: thread.is_popular
        })),
        threadPosts: threadPosts.map(tpost => ({
          id: tpost.id,
          thread_id: tpost.thread_id,
          alt_id: tpost.alt_id,
          created_on: tpost.created_on,
          title: decryptWithAES(tpost.title),
          body: decryptWithAES(tpost.body)
        }))
      };
      // Make into a bunch of CSVs for each section. Zip and send.
      // Helper to convert array of objects to CSV string
      function arrayToCSV(arr) {
        if (!arr || arr.length === 0) return '';
        const keys = Object.keys(arr[0]);
        const escape = v => `"${String(v).replace(/"/g, '""')}"`;
        const header = keys.join(',');
        const rows = arr.map(obj => keys.map(k => escape(obj[k] ?? '')).join(','));
        return [header, ...rows].join('\n');
      }

      // Prepare CSVs
      const csvFiles = {
        userInfo: arrayToCSV([exportData.userInfo]),
        systems: arrayToCSV(exportData.systems),
        alters: arrayToCSV(exportData.alters),
        journals: arrayToCSV(exportData.journals),
        posts: arrayToCSV(exportData.posts),
        bdaPlan: arrayToCSV(exportData.bdaPlan),
        innerWorlds: arrayToCSV(exportData.innerWorlds),
        rules: arrayToCSV(exportData.rules),
        wishlist: arrayToCSV(exportData.wishlist),
        communalJournals: arrayToCSV(exportData.communalJournals),
        categories: arrayToCSV(exportData.categories),
        threads: arrayToCSV(exportData.threads),
        threadPosts: arrayToCSV(exportData.threadPosts)
      };

      // Set response headers for zip download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');

      // Create archive and pipe to response
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      // Append each CSV as a file
      for (const [name, csv] of Object.entries(csvFiles)) {
        archive.append(Readable.from([csv]), { name: `${name}.csv` });
      }

      archive.finalize();

    } else {
      return res.status(404).render('pages/404', { session: req.session, code: "Not Found", splash: splash, cookies: req.cookies });
    }
  }
);

// #endregion

// #region GET routes

router.get("/test", async function (req, res) {
  return res.status(200).render('pages/apitest', { session: req.session, cookies: req.cookies });
});

// Grab user's members by user ID and token. If the token is not provided, reject them. The token should not be in the URL
router.get('/members/:id', async function (req, res) {
  if (!checkUUID(req.params.id)) return res.status(400).send("Bad Request");
  let userCheck = await db.query(client, "SELECT users.id, tokens.* FROM users INNER JOIN tokens ON users.id= tokens.u_id WHERE users.id=$1;", [req.params.id], res, req);
  const matchedToken = userCheck.find(token => decryptWithAES(token.name) === req.headers.usertoken);

  if (matchedToken) {
    let alters = await db.query(client, "SELECT alters.*, systems.sys_id, systems.sys_alias FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id=$1", [req.params.id], res, req);

    const altArr = alters.map(alter => ({
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
    }));
    return res.status(200).json(altArr);
  } else {
    return res.status(401).send("Not Authorised")
  }
});
// Grab user's systems by user ID and token. If the token is not provided, reject them. The token should not be in the URL
router.get('/systems/:id', async function (req, res) {
  if (!checkUUID(req.params.id)) return res.status(400).send("Bad Request");

  let userCheck = await db.query(client, "SELECT users.id, tokens.* FROM users INNER JOIN tokens ON users.id= tokens.u_id WHERE users.id=$1;", [req.params.id], res, req);
  let matched = false;
  // Using a for loop bc I can easily break out of it.
  for (i in userCheck) {
    let compareTok = decryptWithAES(userCheck[i].name);
    if (compareTok == req.headers.usertoken) {
      // Matches. Read and Alter perms?
      if (userCheck[i].read == false || userCheck[i].systems == false) return res.status(401).send("Not Authorised")
      matched = true;
      break;
    }
  }
  if (matched == true) {
    let systems = await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [req.params.id], res, req);
    let sysArr = new Array();
    systems.forEach((system) => {
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
router.get('/journals/:id', async function (req, res) {
  if (!checkUUID(req.params.id)) return res.status(400).send("Bad Request");

  let userCheck = await db.query(client, "SELECT users.id, tokens.* FROM users INNER JOIN tokens ON users.id= tokens.u_id WHERE users.id=$1;", [req.params.id], res, req);
  let matched = false;
  // Using a for loop bc I can easily break out of it.
  for (i in userCheck) {
    let compareTok = decryptWithAES(userCheck[i].name);
    if (compareTok == req.headers.usertoken) {
      // Matches. Read and Alter perms?
      if (userCheck[i].read == false || userCheck[i].journals == false) return res.status(401).send("Not Authorised")
      matched = true;
      break;
    }
  }
  if (matched == true) {
    let journals = await db.query(client, "SELECT journals.*, posts.* FROM journals INNER JOIN systems ON systems.sys_id= journals.sys_id INNER JOIN posts ON posts.j_id= journals.j_id WHERE user_id=$1", [req.params.id], res, req);
    let jArr = new Array();
    journals.forEach((j) => {
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

router.get("/user/auth", async function (req, res) {
  // Grab user info. This is for logging in.
  let userCheck = await db.query(client,
    "SELECT * FROM users WHERE email=$1;",
    [`'${Buffer.from((req.headers.email).toLowerCase()).toString('base64')}'`], res, req);

  if (userCheck.length > 0) {
    let storedHash = userCheck[0].pass.replace(/'/g, ""); // <-- I was stupid and included single quotes in the hash when I first made it, so now I have to remove them every time I read it. Fun.
    let storedSalt;
    let inputHash;

    if (typeof userCheck[0].salt === 'string' && userCheck[0].salt.length > 0) {
      // Decrypt the stored salt and use to compare.
      try {
        let cleanSalt = userCheck[0].salt.replace(/'/g, "");
        storedSalt = decryptWithAES(cleanSalt, config.SALT_KEY);
        inputHash = CryptoJS.SHA3(req.headers.tok + storedSalt).toString();
      } catch (err) {
        console.error("Error decrypting salt: ", err);
        return res.status(500).send("Internal server error.");
      }
    } else {
      // Legacy: no salt, hash as before
      inputHash = CryptoJS.SHA3(req.headers.tok).toString();
    }

    if (inputHash === storedHash) {
      // Retroactively salt passwords that aren't salted.
      if (userCheck[0].salt == null) {
        let { hash: newpass, salt: newsalt } = createPassword(req.headers.tok);
        await db.query(client, "UPDATE users SET pass=$1, salt=$2 WHERE id=$3;", [newpass, newsalt, userCheck[0].id], res, req);
      }

      // #region set req.session and cookies.
      req.session.alter_term = userCheck[0].alter_term;
      req.session.system_term = userCheck[0].system_term;
      req.session.subsystem_term = userCheck[0].subsystem_term;
      req.session.innerworld_term = userCheck[0].innerworld_term;
      req.session.plural_term = userCheck[0].plural_term;
      req.session.loggedin = true;
      req.session.u_id = userCheck[0].id;
      req.session.username = Buffer.from(userCheck[0].username, 'base64').toString();
      req.session.is_legacy = userCheck[0].is_legacy;
      req.session.textsize = userCheck[0].textsize;
      req.session.worksheets_enabled = userCheck[0].worksheets_enabled;

      // Cookies.
      res
        .cookie('loggedin', true, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('username', Buffer.from(userCheck[0].username, 'base64').toString(), { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('u_id', userCheck[0].id, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('alter_term', userCheck[0].alter_term, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('system_term', userCheck[0].system_term, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('is_legacy', userCheck[0].is_legacy, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('skin', userCheck[0].skin, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('subsystem_term', userCheck[0].subsystem_term, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('innerworld_term', userCheck[0].innerworld_term, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('plural_term', userCheck[0].plural_term, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('textsize', userCheck[0].textsize, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true })
        .cookie('worksheets_enabled', userCheck[0].worksheets_enabled, { maxAge: 1000 * 60 * 60 * 24 * 7 * 2, httpOnly: true });
      // #endregion
      return res.status(200).json({
        name: Buffer.from(userCheck[0].username, 'base64').toString()
      });
    } else {
      // Not sending through response to prevent oracle attacks.
      return res.status(401).send("Incorrect credentials.");
    }
  } else {
    // Not sending through response to prevent oracle attacks.
    return res.status(401).send("Incorrect credentials.");
  }
})

// #endregion

// #region PUT routes

router.put("/tokens", async function (req, res) {
  if (apiEyesOnly(req)) {
    // Do not let the program take a template literal. Could become an SQL injection.
    let request = req.body;
    let userToks = await db.query(client, "SELECT * FROM tokens WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
    userToks.every(async function (token) {
      if (decryptWithAES(token.name) == request.tok) {
        // Matched.
        switch (request.mode) {
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
        res.status(200).send("Database updated.");
        return true;
      }
    });

  } else {
    res.status(404).render('pages/404', { session: req.session, code: "Not Found", splash: splash, cookies: req.cookies });
  }
});

// #endregion

// #region DELETE routes

router.delete("/tokens",
  async function (req, res) {
    if (apiEyesOnly(req)) {
      let userToks = await db.query(client, "SELECT * FROM tokens WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
      const selectedTok = (userToks.filter(result => decryptWithAES(result.name) === req.headers.tok))[0];
      await db.query(client, "DELETE FROM tokens WHERE name=$1 AND u_id=$2;", [selectedTok.name, getCookies(req)['u_id']], res, req);
      return res.status(200).send("Database updated.");
    } else {
      res.status(404).render('pages/404', { session: req.session, code: "Not Found", splash: splash, cookies: req.cookies });
    }
  }
);

// #endregion

console.log(`Public API Router Loaded.`);
module.exports = router;
