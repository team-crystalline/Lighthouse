// Static Pages Router
const express = require("express");
const router = express.Router();
const db = require("../db.js");
const config = require("../config/config.js");
const site_config = require("../config/site_config.js");

const client = db.client;
const {
  isLoggedIn,
  forbidUser,
} = require("../funcs.js");


router.get("/philosophy", (req, res, next) => {
  res.render(`pages/phil`, { session: req.session, cookies: req.cookies, config: site_config, });
});

router.get("/about", (req, res, next) => {
  res.render(`pages/about`, { session: req.session, cookies: req.cookies, config: site_config, });
});

router.get("/tos", (req, res) => {
  res.render(`pages/tos`, { session: req.session, cookies: req.cookies, config: site_config, });
});

router.get("/privacypolicy", (req, res) => {
  res.render(`pages/privacypolicy`, {
    session: req.session,
    cookies: req.cookies,
    config: site_config,
  });
});

router.get("/todos", (req, res, next) => {
  res.render(`pages/todos`, { session: req.session, cookies: req.cookies, config: site_config, });
});
router.get("/crisis", (req, res, next) => {
  res.render(`pages/crisis`, { session: req.session, cookies: req.cookies, config: site_config, });
});
router.get("/signup", (req, res, next) => {
  res.render(`pages/signup`, {
    session: req.session,
    cookies: req.cookies,
    config: site_config,
    cloudflare_key: config.CLOUDFLARE_KEY
  });
  // res.render(`pages/signup-disabled`, { session: req.session, cookies:req.cookies, config: site_config, });
});
router.get("/login", (req, res) => {
  // Bookmark: login page
  res.render(`pages/login`, { session: req.session, cookies: req.cookies, config: site_config, });
});
router.get("/cookies", (req, res, next) => {
  res.render(`pages/cookies`, { session: req.session, cookies: req.cookies, config: site_config, });
});

router.get("/forgot-password", (req, res, next) => {
  res.render(`pages/forgot_pass`, {
    session: req.session,
    cookies: req.cookies,
    config: site_config,
  });
});

// Refactored!
router.get("/", async function (req, res) {
  // client, customQuery, customValues, res, req
  const count = await db.query(
    client,
    "SELECT COUNT(id) FROM users;",
    [],
    res,
    req
  );
  const donators = await db.query(
    client,
    "SELECT * FROM donators;",
    [],
    res,
    req
  );
  res.render(`pages/index`, {
    session: req.session,
    userCount: count[0].count,
    cookies: req.cookies,
    donators: donators,
    config: site_config,
  });
});

// No need to refactor
router.get("/tutorial", (req, res) => {
  res.render(`pages/tutorial`, { session: req.session, cookies: req.cookies, config: site_config, });
});

router.get("/lighthouse-system", (req, res) => {
  res.render("pages/lighthouse-sys", {
    session: req.session,
    cookies: req.cookies,
    config: site_config,
  });
});

/**
 * GET /combine/item
 * Moved here until the combine function is expanded.
 */
router.get("/combine/:item", (req, res) => {
  if (isLoggedIn(req)) {
    res.render(`pages/combine-alts`, {
      session: req.session,
      cookies: req.cookies,
      config: site_config,
    });
  } else {
    res
      .status(403)
      .render("pages/403", {
        session: req.session,
        code: "Forbidden",
        cookies: req.cookies,
        config: site_config,
      });
  }
});

router.get("/simply-plural", (req, res) => {
  if (isLoggedIn(req)) {
    res.render(`pages/sp-import`, {
      session: req.session,
      cookies: req.cookies,
      config: site_config,
    });
  } else {
    forbidUser(res, req);
  }
});

router.get("/pluralkit", (req, res) => {
  if (isLoggedIn(req)) {
    res.render(`pages/pluralkit`, {
      session: req.session,
      cookies: req.cookies,
      config: site_config,
      lang: req.acceptsLanguages()[0],
    });
  }
});

router.get("/reset/:id", (req, res) => {
  res.render("pages/new_pass", { session: req.session, cookies: req.cookies, config: site_config, });
});

console.log(`Static Page Router Loaded.`);
module.exports = router;
