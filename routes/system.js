// System Router
const express = require("express");

const router = express.Router();
const db = require("../db");

const { client } = db;
const strings = require("../lang/en.json");
const {
  isLoggedIn,
  getCookies,
  encryptWithAES,
  decryptWithAES,
  forbidUser,
  lostPage,
  idCheck,
  paginate,
  getKeyByValue,
  base64encode,
  base64decode,
  authUser,
  validateParam,
} = require("../funcs.js");
const config = require("../config/config.js");

router.get('/inner-world/:id', (req, res) => {
  // if (!checkUUID(req.params.id)) return lostPage(res, req);
  if (isLoggedIn(req)) {
    client.query({ text: "SELECT * FROM inner_worlds WHERE u_id=$1 AND id=$2;", values: [getCookies(req)['u_id'], req.params.id] }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      } else {
        res.render(`pages/edit_innerworld`, {
          session: req.session, cookies: req.cookies, iw: {
            id: result.rows[0].id,
            title: Buffer.from(result.rows[0].key, "base64").toString(),
            body: Buffer.from(result.rows[0].value, "base64").toString()
          }
        });
      }
    });

  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }

});

router.get('/inner-world', (req, res, next) => {
  if (isLoggedIn(req)) {
    client.query({ text: 'SELECT * FROM inner_worlds WHERE u_id=$1', values: [getCookies(req)['u_id']] }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      } else {
        req.session.innerworld_rows = result.rows;
        client.query({ text: 'SELECT * FROM users WHERE id=$1', values: [getCookies(req)['u_id']] }, (err, bresult) => {
          if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
          } else {
            req.session.innerworld = bresult.rows[0].inner_worlds || false;
            res.render(`pages/innerworld`, { session: req.session, cookies: req.cookies });
          }

        });
      }

    });
  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }
});

router.get('/inner-world/delete/:id', (req, res) => {
  // if (!checkUUID(req.params.id)) return lostPage(res, req);
  if (isLoggedIn(req)) {
    client.query({ text: "DELETE FROM inner_worlds WHERE id=$1;", values: [`${req.params.id}`] }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      } else {
        req.session.sys_rules = null;
      }
      res.redirect("/system/inner-world");
    });
  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }
});

router.post('/inner-world/:id', (req, res) => {
  // if (!checkUUID(req.params.id)) return lostPage(res, req);
  if (isLoggedIn(req)) {
    client.query({
      text: "UPDATE inner_worlds SET key=$3, value=$4 WHERE u_id=$1 AND id=$2;",
      values: [
        getCookies(req)['u_id'],
        req.params.id,
        `'${Buffer.from(req.body.keytitle).toString("base64")}`,
        `'${Buffer.from(req.body.valuebody).toString("base64")}`,
      ]
    }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      } else {
        req.flash("flash", "Inner world updated!")
        res.redirect("/system/inner-world")
      }
    });
  } else {
    res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
  }
});

router.post('/inner-world', (req, res) => {
  if (isLoggedIn(req)) {
    if (req.body.create) {
      client.query({ text: 'INSERT INTO inner_worlds (u_id, key, value) VALUES ($1,$2,$3);', values: [`${getCookies(req)['u_id']}`, `${Buffer.from(req.body.key).toString('base64')}`, `${Buffer.from(req.body.value).toString('base64')}`] }, (err, result) => {
        if (err) {
          console.log(err.stack);
          res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        }
      });
    } else {
      // Deleting.
      client.query({ text: "DELETE FROM inner_worlds WHERE id=$1;", values: [getKeyByValue(req.body, "Remove")] }, (err, result) => {
        if (err) {
          console.log(err.stack);
          res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        } else {
          req.session.sys_rules = null;
        }
      });
    }
    res.redirect(req.get('referrer'));
  } else {
    res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
  }
});

router.get('/wish', (req, res) => {
  const filledWishes = [];
  const wishArr = [];
  if (isLoggedIn(req)) {
    client.query({ text: 'SELECT * FROM wishlist WHERE user_id=$1 AND is_filled=false;', values: [getCookies(req).u_id] }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      }
      for (i in result.rows) {
        wishArr.push({ text: decryptWithAES(result.rows[i].wish), checked: result.rows[i].is_filled, uuid: result.rows[i].uuid });
      }

      client.query({ text: 'SELECT * FROM wishlist WHERE user_id=$1 AND is_filled=true;', values: [getCookies(req).u_id] }, (err, result) => {
        if (err) {
          console.log(err.stack);
          res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        }
        for (i in result.rows) {
          filledWishes.push({ text: decryptWithAES(result.rows[i].wish), checked: result.rows[i].is_filled, uuid: result.rows[i].uuid });
        }
        res.render(`pages/wishlist`, { session: req.session, cookies: req.cookies, wishArr, filledWishes });

      });

    });

  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }
});

router.get('/wish/:id', validateParam("id"), (req, res) => {
  if (isLoggedIn(req)) {
    client.query({ text: 'UPDATE wishlist SET is_filled=true WHERE uuid=$1', values: [`${req.params.id}`] }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      }
      res.redirect("/wish");
    });

  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }
});

router.get('/wish-d/:id', validateParam("id"), (req, res) => {
  if (isLoggedIn(req)) {
    client.query({ text: 'DELETE FROM wishlist WHERE uuid=$1', values: [`${req.params.id}`] }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      }
    });
    res.redirect("/system/wish");

  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }
});

router.post('/wish', (req, res) => {
  if (isLoggedIn(req)) {
    if (req.body.createWish) {
      client.query({ text: "INSERT INTO wishlist (user_id, wish) VALUES ($1, $2);", values: [getCookies(req).u_id, `${encryptWithAES(req.body.wish)}`] }, (err, result) => {
        if (err) {
          console.log(err.stack);
          res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        } else {
          res.redirect(req.get('referer'));
        }
      });
    }

  } else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }) }
});

router.get("/rules", (req, res, next) => {
  if (isLoggedIn(req)) {
    client.query(
      {
        text: "SELECT * FROM sys_rules WHERE u_id=$1 ORDER BY created DESC;",
        values: [getCookies(req).u_id],
      },
      (err, result) => {
        if (err) {
          console.log(err.stack);
          res
            .status(400)
            .render("pages/400", {
              session: req.session,
              code: "Bad Request",
              cookies: req.cookies,
            });
        } else {
          req.session.sys_rules = result.rows;
        }
        res.render(`pages/sys_rules`, {
          session: req.session,
          cookies: req.cookies,
        });
      }
    );
  } else {
    res
      .status(403)
      .render("pages/403", {
        session: req.session,
        code: "Forbidden",
        cookies: req.cookies,
      });
  }
});

router.post('/rules', async (req, res) => {
  if (isLoggedIn(req)) {
    if (req.body.create) {
      // Create rule.
      client.query({ text: `INSERT INTO sys_rules (u_id, rule) VALUES ($1, $2)`, values: [getCookies(req).u_id, `'${Buffer.from(req.body.rule).toString('base64')}'`] }, (err, result) => {
        if (err) {
          console.log(err.stack);
          res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        }
      });
    } else if (req.body.edit) {
      await db.query(client, "UPDATE sys_rules SET rule=$1 WHERE id=$2 AND u_id=$3", [`'${Buffer.from(req.body.edit).toString('base64')}'`, req.body.ruleid, getCookies(req).u_id], res, req);
    } else {
      // Delete Rule
      client.query({ text: `DELETE FROM sys_rules WHERE id=$1;`, values: [getKeyByValue(req.body, "Remove")] }, (err, result) => {
        if (err) {
          console.log(err.stack);
          res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        }
      });
    }
    res.redirect(req.get('referer'));

  } else {
    res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
  }
});

router.get("/editsys/:alt", validateParam("alt"), (req, res, next) => {
  if (isLoggedIn(req)) {
    client.query(
      { text: "SELECT * FROM systems WHERE sys_id=$1", values: [`${req.params.alt}`] },
      (err, result) => {
        if (err) {
          console.log(err.stack);
          res
            .status(400)
            .render("pages/400", {
              session: req.session,
              code: "Bad Request",
              cookies: req.cookies,
            });
        } else {
          req.session.chosenSys = result.rows[0];
          client.query(
            {
              text: "SELECT alters.name, alters.alt_id, alters.sys_id, systems.sys_alias FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1;",
              values: [`${req.params.alt}`],
            },
            (err, result) => {
              if (err) {
                console.log(err.stack);
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                // console.table(result.rows);
                req.session.alters = result.rows;
                res.render(`pages/edit_sys`, {
                  session: req.session,
                  alt: req.session.chosenSys,
                  alters: result.rows,
                  cookies: req.cookies,
                });
              }
            }
          );
        }
        // res.render(`pages/edit_sys`, { session: req.session, alt:req.session.chosenSys });
      }
    );
  } else {
    res
      .status(403)
      .render("pages/403", {
        session: req.session,
        code: "Forbidden",
        cookies: req.cookies,
      });
  }
  // res.render(`pages/edit_sys`, { session: req.session, alt:req.params.alt });
});

router.get("/deletesys/:alt", validateParam("alt"), async (req, res) => {
  if (isLoggedIn(req)) {
    try {
      const systemDat = await db.query(
        client,
        "SELECT * FROM systems WHERE sys_id=$1 AND user_id=$2",
        [`${req.params.alt}`, getCookies(req).u_id],
        res,
        req
      );
      req.session.chosenSys = systemDat[0];
      res.render(`pages/delete_sys`, {
        session: req.session,
        alt: req.session.chosenSys,
        cookies: req.cookies,
      });
    } catch (e) {
      lostPage(res, req);
    }
  } else {
    res
      .status(403)
      .render("pages/403", {
        session: req.session,
        code: "Forbidden",
        cookies: req.cookies,
      });
  }
  // res.render(`pages/edit_sys`, { session: req.session, alt:req.params.alt });
});

router.post("/deletesys/:alt", validateParam("alt"), async (req, res) => {
  const sysData = await db.query(
    client,
    "SELECT * FROM systems WHERE sys_id=$1",
    [`${req.params.alt}`],
    res,
    req
  );
  if (sysData.length == 0) return lostPage(res, req);
  if (getCookies(req).u_id == sysData[0].user_id) {
    await db.query(
      client,
      "DELETE FROM systems WHERE sys_id=$1",
      [`${req.params.alt}`],
      res,
      req
    );
    await db.query(
      client,
      "DELETE FROM systems WHERE subsys_id=$1",
      [`${req.params.alt}`],
      res,
      req
    );
    req.session.chosenSys = null;
    res.redirect("/system");
  } else {
    forbidUser(res, req);
  }
});

router.post("/editsys/:alt", validateParam("alt"), (req, res) => {
  client.query(
    {
      text: "UPDATE systems SET sys_alias=$1, description=$3 WHERE sys_id=$2;",
      values: [
        `'${base64encode(req.body.sysname)}'`,
        `${req.params.alt}`,
        `${encryptWithAES(req.body.sysdesc)}`,
      ],
    },
    (err, result) => {
      if (err) {
        console.log(err.stack);
        res
          .status(400)
          .render("pages/400", {
            session: req.session,
            code: "Bad Request",
            cookies: req.cookies,
          });
      } else {
        req.flash("flash", strings.system.updated);
        res.redirect(`/system/${req.params.alt}`);
      }
    }
  );
});

// Refactoring
router.get("/", authUser, async (req, res) => {
  // If they have inner worlds enabled or not.
  const innerWorlds = await db.query(client, "SELECT inner_worlds from USERS WHERE id=$1;", [getCookies(req).u_id], res, req);
  req.session.innerworld = innerWorlds[0].inner_worlds || false;

  // If they have worksheets enabled or not
  const worksheets = await db.query(client, "SELECT worksheets_enabled from USERS WHERE id=$1;", [getCookies(req).u_id], res, req);
  req.session.worksheets_enabled = worksheets[0].worksheets_enabled || false;

  const systemData = await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [getCookies(req).u_id], res, req);

  const alterData = await db.query(
    client,
    "SELECT alters.name, systems.sys_id FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id = $1;",
    [getCookies(req).u_id],
    res,
    req
  );

  const systemMap = new Array();
  systemData.forEach((sys) => {
    systemMap.push({
      id: sys.sys_id,
      alias: base64decode(sys.sys_alias),
      icon: sys.icon,
      parent: sys.subsys_id,
      description: sys.description,
    });
  });
  systemMap.sort((a, b) => a.alias.localeCompare(b.alias));

  res
    .status(200)
    .render("pages/system", {
      session: req.session,
      cookies: req.cookies,
      system: systemMap,
      alters: alterData,
    });
});

router.get("/communal-journal", authUser, async (req, res) => {
  // If there's an id provided, it's a system communal journal. Grab based on user id AND sys_id
  // If no id provided, just grab from their user id.
  let commJournInfo;
  let pinnedComm;
  const sysChoice = req.query.sys || null;
  let pageNumber = req.query.pg || 1;
  if (!sysChoice) {
    // This is the regular communal journal.
    commJournInfo = await db.query(
      client,
      "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false AND system_id IS NULL ORDER BY created_on DESC;",
      [getCookies(req).u_id],
      res,
      req
    );

    pinnedComm = await db.query(
      client,
      "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=true AND system_id IS NULL ORDER BY created_on DESC;",
      [getCookies(req).u_id],
      res,
      req
    );
  } else {
    // This is a system journal-- Do ID checks before we grab posts.
    const sysCheck = await db.query(
      client,
      "SELECT sys_id FROM systems WHERE user_id=$1",
      [getCookies(req).u_id],
      res,
      req
    );
    const sysList = sysCheck.map((obj) => obj.sys_id);
    if (!sysList.includes(sysChoice))
      return res
        .status(404)
        .render(`pages/404`, {
          session: req.session,
          code: "Not Found",
          cookies: req.cookies,
        });

    // Grab posts.
    commJournInfo = await db.query(
      client,
      "SELECT * FROM comm_posts WHERE system_id=$1 AND is_pinned=false ORDER BY created_on DESC;",
      [`${sysChoice}`],
      res,
      req
    ); // non-pinned posts
    pinnedComm = await db.query(
      client,
      "SELECT * FROM comm_posts WHERE system_id=$1 AND is_pinned=true ORDER BY created_on DESC;",
      [`${sysChoice}`],
      res,
      req
    ); // pinned posts.

    // Grab system information.
    const sysInfo = await db.query(
      client,
      "SELECT * FROM systems WHERE sys_id=$1",
      [`${sysChoice}`],
      res,
      req
    );
    req.session.chosenSystem = sysInfo[0];
  }
  const entries = paginate(commJournInfo, 25);
  const finalPage = entries.length;
  // Now... Is the requested page higher than the final page?
  if (pageNumber > finalPage) pageNumber = finalPage;
  res
    .status(200)
    .render(`pages/commjourn`, {
      session: req.session,
      cookies: req.cookies,
      posts: entries,
      pinned: pinnedComm,
      pageNum: pageNumber,
      sysChoice,
      finalPage,
    });
  // res.send("<h1>Communal Journal</h1>")
});

router.post("/communal-journal", authUser, async (req, res) => {
  const sysChoice = req.query.sys;
  const isPinned = req.body.ispinned == "on";
  const postFeeling = req.body.feeling ? encryptWithAES(req.body.feeling) : "";
  if (!sysChoice) {
    // Standard Communal Journal post.
    await db.query(
      client,
      "INSERT INTO comm_posts (u_id, title, body, is_pinned, feeling) VALUES ($1, $2, $3, $4, $5);",
      [
        getCookies(req).u_id,
        `${encryptWithAES(req.body.title)}`,
        `${encryptWithAES(req.body.body)}`,
        `${isPinned}`,
        `${postFeeling}`,
      ],
      res,
      req
    );
    res.status(304).redirect("/system/communal-journal");
  } else {
    // ID check.
    const sysInfo = await db.query(
      client,
      "SELECT sys_id FROM systems WHERE user_id=$1",
      [getCookies(req).u_id],
      res,
      req
    );
    const sysList = sysInfo.map((obj) => obj.sys_id);
    if (!sysList.includes(sysChoice))
      return res
        .status(404)
        .render(`pages/404`, {
          session: req.session,
          code: "Not Found",
          cookies: req.cookies,
        });

    // Passed the check, so proceed to enter the data.
    await db.query(
      client,
      "INSERT INTO comm_posts (u_id, title, body, is_pinned, system_id, feeling) VALUES ($1, $2, $3, $4, $5, $6);",
      [
        getCookies(req).u_id,
        `${encryptWithAES(req.body.title)}`,
        `${encryptWithAES(req.body.body)}`,
        `${isPinned}`,
        `${req.body.sysid}`,
        `${postFeeling}`,
      ],
      res,
      req
    );
    res.status(304).redirect(`/system/communal-journal?sys=${sysChoice}`);
  }
});

router.post("/", authUser, async (req, res) => {
  if (req.body.sysname) {
    const subsysID = req.body.subsys == "None" ? null : req.body.subsys;
    await db.query(
      client,
      "INSERT INTO systems (sys_alias, user_id, subsys_id, description) VALUES ($1, $2, $3, $4)",
      [
        `'${base64encode(req.body.sysname)}'`,
        `${getCookies(req).u_id}`,
        subsysID,
        `${encryptWithAES(req.body.sysdesc)}`,
      ],
      res,
      req
    );
    return res.redirect(`/system`);
  } if (req.body.post) {
    // Comm journal.
    // id | u_id | created_on | title | body
    client.query(
      {
        text: "INSERT INTO comm_posts (u_id, created_on, title, body) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4)",
        values: [
          `${getCookies(req).u_id}`,
          `${Date.now()}`,
          `${encryptWithAES(req.body.cTitle)}`,
          `${encryptWithAES(req.body.cBody)}`,
        ],
      },
      (err, result) => {
        if (err) {
          console.log(err.stack);
          res
            .status(400)
            .render("pages/400", {
              session: req.session,
              code: "Bad Request",
              cookies: req.cookies,
            });
        } else {
          res.redirect("/system");
        }
      }
    );
  } else {
    // Deleting.
    client.query(
      {
        text: "DELETE FROM comm_posts WHERE id=$1; ",
        values: [getKeyByValue(req.body, "Remove")],
      },
      (err, result) => {
        if (err) {
          console.log(err.stack);
          res
            .status(400)
            .render("pages/400", {
              session: req.session,
              code: "Bad Request",
              cookies: req.cookies,
            });
        } else {
          req.session.jPost = null;
          res.redirect(`/system`);
        }
      }
    );
  }
});

router.get("/:id/:pg?",
  authUser,
  validateParam("id"),
  async (req, res, next) => {
    if (!req.session.worksheets_enabled) {
      // Quick, add that.
      const wsEn = await db.query(
        client,
        "SELECT worksheets_enabled FROM users WHERE id=$1;",
        [getCookies(req).u_id],
        res,
        req
      );
      req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
    }
    const sysMap = await db.query(
      client,
      "SELECT systems.sys_id, systems.subsys_id, systems.user_id, systems.sys_alias, alters.alt_id, systems.icon, systems.description FROM systems LEFT JOIN alters ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1 ORDER BY alters.name ASC",
      [`${req.params.id}`],
      res,
      req
    );
    if (sysMap.length < 1) return lostPage(res, req);
    if (!idCheck(req, sysMap[0].user_id))
      return res
        .status(404)
        .render(`pages/404`, {
          session: req.session,
          code: "Not Found",
          cookies: req.cookies,
        });
    req.session.chosenSys = sysMap[0];

    if (req.session.chosenSys.subsys_id != null) {
      // There's a subsystem.
      const subsysInf = await db.query(
        client,
        "SELECT sys_alias FROM systems WHERE sys_id=$1",
        [`${req.session.chosenSys.subsys_id}`],
        res,
        req
      );
      if (subsysInf.length > 0) {
        req.session.chosenSys.subsys_alias =
          subsysInf[0].sys_alias || getCookies(req).system_term;
      }
    }

    const numUp = await db.query(
      client,
      "SELECT altupnum FROM users WHERE id=$1;",
      [getCookies(req).u_id],
      res,
      req
    );

    const alters = await db.query(
      client,
      "SELECT alters.alt_id, alters.img_url, alters.sys_id, alters.name, alters.pronouns, alter_moods.mood, alters.is_archived, alters.img_blob, alters.blob_mimetype, alters.colour, alters.colour_enabled, alters.outline_enabled, alters.outline FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.sys_id = $1 OR (alters.subsys_id1 = $1::text OR alters.subsys_id2 = $1::text OR alters.subsys_id3 = $1::text OR alters.subsys_id4 = $1::text OR alters.subsys_id5 = $1::text) ORDER BY alters.name ASC;",
      [`${req.params.id}`],
      res,
      req
    );
    req.session.alters = [];
    alters.forEach((alter) => {
      req.session.alters.push({
        name: Buffer.from(alter.name, "base64").toString(),
        id: alter.sys_id,
        a_id: alter.alt_id,
        mood: alter.mood,
        pronouns: alter.pronouns,
        is_archived: alter.is_archived,
        icon:
          alter.img_url ||
          "aHR0cHM6Ly93d3cud3JpdGVsaWdodGhvdXNlLmNvbS9pbWcvYXZhdGFyLWRlZmF1bHQuanBn",
        img_blob: alter.img_blob,
        mimetype: alter.blob_mimetype,
        colour: alter.colour,
        colourEnabled: alter.colour_enabled,
        outlineEnabled: alter.outline_enabled,
        outline: alter.outline,
      });
    });
    const altCount = req.session.alters.length;
    req.session.alters.sort((a, b) => a.name.localeCompare(b.name));
    req.session.alters = paginate(
      req.session.alters,
      Number(numUp[0].altupnum)
    );
    res.render(`pages/sys_info`, {
      session: req.session,
      alterArr: req.session.alters[req.params.pg - 1 || 0],
      cookies: req.cookies,
      sys_id: req.params.id,
      pgCount: req.session.alters.length,
      altCount,
      curPage: req.params.pg || 1,
      numup: Number(numUp[0].altupnum),
      currentSys: req.params.id,
      environment: config.ENVIRONMENT
    });
  }
);

router.post("/:alt/:pg?", authUser, validateParam("alt"), (req, res) => {
  // Post system
  if (isLoggedIn(req)) {
    if (req.body.sysid) {
      const sysId = req.body.sysid == "none" ? null : req.body.sysid;
      // Setting this in case they want to release a subsystem into a normal system.
      client.query(
        {
          text: "UPDATE systems SET subsys_id=$2 WHERE sys_id=$1",
          values: [`${req.params.alt}`, sysId],
        },
        (err, result) => {
          if (err) {
            console.log(err.stack);
            res
              .status(400)
              .render("pages/400", {
                session: req.session,
                code: "Bad Request",
                cookies: req.cookies,
              });
          }
        }
      );
      req.flash("flash", strings.system.updated);
    }
    if (req.body.journ) {
      client.query(
        {
          text: "UPDATE systems SET icon=$2 WHERE sys_id=$1",
          values: [`${req.params.alt}`, `${req.body.journ}`],
        },
        (err, result) => {
          if (err) {
            console.log(err.stack);
            res
              .status(400)
              .render("pages/400", {
                session: req.session,
                code: "Bad Request",
                cookies: req.cookies,
              });
          }
        }
      );
      req.flash("flash", strings.system.updated);
    }
    if (req.body.submit) {
      client.query(
        {
          text: "INSERT INTO alters (sys_id, name) VALUES ($1, $2)",
          values: [
            `${req.params.alt}`,
            `'${Buffer.from(req.body.altname).toString("base64")}'`,
          ],
        },
        (err, result) => {
          if (err) {
            console.log(err.stack);
            res
              .status(400)
              .render("pages/400", {
                session: req.session,
                code: "Bad Request",
                cookies: req.cookies,
              });
          }
        }
      );
      req.flash("flash", strings.alter.created);
    }
    res.redirect(`/system/${req.params.alt}/`);
  } else {
    res
      .status(403)
      .render("pages/403", {
        session: req.session,
        code: "Forbidden",
        cookies: req.cookies,
      });
  }
});

console.log(`System Router Loaded.`);
module.exports = router;
