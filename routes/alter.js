// Alters Router
const express = require("express");
const router = express.Router();
const db = require("../db.js");
const tuning = require("../js/genVars.js");
const alterTypes = tuning.alterTypes;
const client = db.client;
const CryptoJS = require("crypto-js");

const {
  isLoggedIn,
  getCookies,
  encryptWithAES,
  decryptWithAES,
  lostPage,
  idCheck,
  checkUUID,
  base64encode,
  getSystems,
  authUser,
  validateParam,
} = require("../funcs.js");

// #region GET routes

router.get("/alter/:id", authUser, validateParam("id"),
  async function (req, res) {
    // Get Alter.
    const altInfo = await db.query(
      client,
      `SELECT alter_moods.*, alters.*, systems.sys_alias, systems.user_id, systems.subsys_id AS "parentsys" FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1`,
      [`${req.params.id}`],
      res,
      req,
      true
    );
    if (!altInfo) return;
    var selectedAlt = altInfo[0];
    // Before going any further-- Check that the alter's user ID and the actual requester's user ID matches.
    if (!idCheck(req, selectedAlt.user_id))
      return res
        .status(404)
        .render(`pages/404`, {
          session: req.session,
          code: "Not Found",
          cookies: req.cookies,
        });

    req.session.chosenAlt = selectedAlt;

    // If they have a mood reason, decrypt that now.
    try {
      if (selectedAlt.reason) {
        selectedAlt.reason = `${decryptWithAES(selectedAlt.reason)}`;
      }
    } catch (e) {
      // No mood.
    }

    // Grab journal info.
    const journQuer = await db.query(
      client,
      "SELECT * FROM journals WHERE alt_id=$1;",
      [`${req.params.id}`],
      res,
      req
    );
    var altJournal = journQuer[0];
    // If we have none, make a placeholder.
    let skin;
    if (!altJournal) {
      skin = {
        val: "1",
        c: "Red",
        group: 1,
        ext: "png",
      };
    } else {
      skin = tuning.journals.filter(
        (jn) => jn.val == altJournal.skin.replace(/'/g, "")
      );
    }
    // Grab all systems.
    req.session.sysList = await db.query(
      client,
      "SELECT * FROM systems WHERE user_id=$1;",
      [`${getCookies(req)["u_id"]}`],
      res,
      req
    );

    if (selectedAlt.is_archived == true) {
      // This alter is archived.
      var archivedPosts = new Array();
      try {
        // This is in the try/catch because altJournal.j_id won't always exist.
        const postQuer = await db.query(
          client,
          "SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;",
          [`${altJournal.j_id}`],
          res,
          req
        );
        postQuer.forEach((post) => {
          archivedPosts.push({
            id: post.p_id,
            title: decryptWithAES(post.title),
            body: decryptWithAES(post.body),
            created_on: post.created_on,
          });
        });
      } catch (e) {
        // Keep archivedPosts empty.
      }
      res.render(`pages/archived-alter`, {
        session: req.session,
        cookies: req.cookies,
        alterTypes: alterTypes,
        alterInfo: selectedAlt,
        altJournal: altJournal,
        archivedPosts: archivedPosts,
      });
    } else {
      // Just render alter ejs.
      res.render(`pages/alter`, {
        session: req.session,
        cookies: req.cookies,
        alterTypes: alterTypes,
        alterInfo: selectedAlt,
        altJournal: altJournal,
        skin: skin[0],
      });
    }
  }
);

router.get("/alter/edit-journal/:id", authUser, validateParam("id"),
  async (req, res) => {
    let journCheck = await db.query(
      client,
      "SELECT systems.user_id FROM systems INNER JOIN journals ON journals.sys_id = systems.sys_id WHERE journals.alt_id = $1;",
      [`${req.params.id}`],
      res,
      req,
      true
    );
    if (!journCheck) return;
    if (!idCheck(req, journCheck[0].user_id)) return lostPage(res, req);

    let journalInfo = await db.query(
      client,
      "SELECT journals.*, alters.*, systems.* FROM journals INNER JOIN alters ON journals.alt_id = alters.alt_id INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE journals.alt_id=$1",
      [`${req.params.id}`],
      res,
      req
    );

    res.render(`pages/edit-journal`, {
      session: req.session,
      journal: journalInfo[0],
      cookies: req.cookies,
    });
  }
);

router.get("/archive-alter/:id", authUser, validateParam("id"),
  async (req, res, next) => {
    const altInfo = await db.query(
      client,
      "SELECT alters.* FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",
      [`${req.params.id}`],
      res,
      req,
      true
    );
    if (!altInfo) return;
    res.render(`pages/archive-alter`, {
      session: req.session,
      cookies: req.cookies,
      alterTypes: alterTypes,
      chosenAlter: altInfo[0],
    });
  }
);

router.get("/edit-alter/:id", authUser, validateParam("id"),
  async function (req, res) {
    let sysInfo = await getSystems(getCookies(req)["u_id"], res, req);
    let altInfo = await db.query(
      client,
      "SELECT alters.*, systems.sys_alias, systems.user_id FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",
      [`${req.params.id}`],
      res,
      req,
      true
    );
    if (!altInfo) return;
    let chosenAlter = altInfo[0];
    if (!idCheck(req, chosenAlter.user_id))
      return res
        .status(404)
        .render(`pages/404`, {
          session: req.session,
          code: "Not Found",
          cookies: req.cookies,
        });
    res.render(`pages/edit_alter`, {
      session: req.session,
      cookies: req.cookies,
      alterTypes: alterTypes,
      chosenAlter: chosenAlter,
      sysInfo: sysInfo,
    });
  }
);

router.get("/mood/:id", authUser, validateParam("id"),
  async (req, res) => {
    const moodInfo = await db.query(
      client,
      "SELECT alters.name, alters.alt_id, alters.sys_id, alter_moods.* FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1",
      [`${req.params.id}`],
      res,
      req,
      false
    );
    let chosenAlter = moodInfo[0];
    if (chosenAlter.reason) {
      chosenAlter.reason = `${decryptWithAES(moodInfo[0].reason)}`;
    }
    res.render(`pages/set_mood`, {
      session: req.session,
      cookies: req.cookies,
      alterTypes: alterTypes,
      chosenAlter: chosenAlter,
    });
  }
);

router.get("/del-mood/:id", authUser, validateParam("id"),
  async (req, res) => {
    client.query(
      {
        text: "DELETE FROM alter_moods WHERE alt_id=$1;",
        values: [`${req.params.id}`],
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
          // Redirect to the alter's page!
          res.redirect(`/alter/${req.params.id}`);
        }
      }
    );
  }
);

router.get("/alter/:id/delete", authUser, validateParam("id"),
  async (req, res) => {
    let alterInfo = await db.query(
      client,
      "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1",
      [`${req.params.id}`],
      res,
      req,
      true
    );
    if (!alterInfo) return;
    if (!idCheck(req, alterInfo[0].user_id)) return lostPage(res, req);

    res.render(`pages/delete_alter`, {
      session: req.session,
      cookies: req.cookies,
      chosenAlter: alterInfo[0],
    });
  }
);

// #endregion

// #region POST routes

router.post("/alter/edit-journal/:id", authUser, validateParam("id"),
  async (req, res) => {
    // Is this their alter/their journal?
    let journCheck = await db.query(
      client,
      "SELECT systems.user_id FROM systems INNER JOIN journals ON journals.sys_id = systems.sys_id WHERE journals.alt_id = $1;",
      [`${req.params.id}`],
      res,
      req,
      true
    );
    if (!journCheck) return;
    if (!idCheck(req, journCheck[0].user_id)) return lostPage(res, req);

    let isPixel = req.body.ispixel ? true : false;
    if (req.files) {
      // They uploaded something-- This is the uploaded skin!
      await db.query(
        client,
        "UPDATE journals SET skin_blob=$2, skin_mimetype=$3, img_url=null, skin=1, is_pixelart=$4 WHERE alt_id=$1",
        [
          `${req.params.id}`,
          req.files.imgupload.data,
          req.files.imgupload.mimetype,
          isPixel,
        ],
        res,
        req
      );
    } else if (req.body.imgurl) {
      // They put in a URL
      await db.query(
        client,
        "UPDATE journals SET skin_blob=null, skin_mimetype=null, img_url=$2, skin=1, is_pixelart=$3 WHERE alt_id=$1",
        [`${req.params.id}`, `${encryptWithAES(req.body.imgurl)}`, isPixel],
        res,
        req
      );
    } else if (req.body.journ) {
      // They picked a preset.
      await db.query(
        client,
        "UPDATE journals SET skin_blob=null, skin_mimetype=null, img_url=null, skin=$2, is_pixelart=true WHERE alt_id=$1",
        [`${req.params.id}`, `${req.body.journ}`],
        res,
        req
      );
    }

    return res.redirect(`/alter/${req.params.id}`);
  }
);

router.post("/alter/:id/delete", authUser, validateParam("id"),
  async function (req, res) {
    let chosenAlt = await db.query(
      client,
      "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1",
      [req.params.id],
      res,
      req,
      true
    );
    if (!chosenAlt) return;
    if (!idCheck(req, chosenAlt[0].user_id))
      return res.status(404).send("Not found");

    // Can't remember if we set these keys as On Delete Cascade. So just in case, manually cascade.
    await db.query(
      client,
      "DELETE FROM posts WHERE p_id=$1",
      [`${req.params.id}`],
      res,
      req
    );
    await db.query(
      client,
      "DELETE FROM journals WHERE alt_id=$1;",
      [`${req.params.id}`],
      res,
      req
    );
    await db.query(
      client,
      "DELETE FROM alters WHERE alt_id=$1;",
      [`${req.params.id}`],
      res,
      req
    );

    res.redirect(`/system/${req.body.sysid}`);
  }
);

router.post("/alter/:id", authUser, validateParam("id"),
  async function (req, res) {
    if (!checkUUID(req.params.id)) return lostPage(res, req);
    let pass = req.body.jPass || null;

    let chosenAlt = await db.query(
      client,
      "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1",
      [req.params.id],
      res,
      req
    );
    if (!idCheck(req, chosenAlt[0].user_id))
      return res.status(404).send("Not found");

    if (req.body.create) {
      // Create
      await db.query(
        client,
        "INSERT INTO journals (alt_id, password, is_private, skin, sys_id) VALUES ($1, $2, $3, $4, $5)",
        [
          `${req.params.id}`,
          `'${CryptoJS.SHA3(req.body.jPass)}'`,
          `${req.body.priv}`,
          `'${req.body.journ}'`,
          `${req.body.sys_id}`,
        ],
        res,
        req
      );
      res.redirect(`/alter/${req.params.id}`);
    } else if (req.body.modify) {
      // Edit alter.
      if (req.body.altname) {
        await db.query(
          client,
          "UPDATE alters SET sys_id=$1, name=$2 WHERE alt_id=$3",
          [
            req.body.alterSys,
            `'${base64encode(req.body.altname)}'`,
            req.params.id,
          ],
          res,
          req
        );
      } else {
        await db.query(
          client,
          "UPDATE alters SET sys_id=$1 WHERE alt_id=$2",
          [req.body.alterSys, req.params.id],
          res,
          req
        );
      }
      res.redirect(`/alter/${req.params.id}`);
    } else if (req.body.changePass) {
      // Change alter password.
      client.query(
        {
          text: "UPDATE journals SET password=$1 WHERE alt_id=$2;",
          values: [`'${CryptoJS.SHA3(req.body.jPassNew)}'`, req.params.id],
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
            res.redirect(`/alter/${req.params.id}`);
          }
        }
      );
    } else if (req.body.newjournalSkin) {
      // Change journal skin.
      let newskin = req.body.skin.split(",");
      client.query(
        {
          text: "UPDATE journals SET skin=$1 WHERE alt_id=$2;",
          values: [newskin[0], req.params.id],
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
            res.redirect(`/alter/${req.params.id}`);
          }
        }
      );
    } else if (req.body.unlock) {
      client.query(
        {
          text: "UPDATE journals SET is_private=false WHERE alt_id=$1;",
          values: [req.params.id],
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
            res.redirect(`/alter/${req.params.id}`);
          }
        }
      );
    } else if (req.body.lockJournal) {
      client.query(
        {
          text: "UPDATE journals SET password=$2, is_private=true WHERE alt_id=$1;",
          values: [
            req.params.id,
            `'${CryptoJS.SHA3(req.body.journalPassword)}'`,
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
            res.redirect(`/alter/${req.params.id}`);
          }
        }
      );
    } else {
      // Login
      client.query(
        {
          text: "SELECT password FROM journals WHERE alt_id=$1",
          values: [`${req.params.id}`],
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
            // res.redirect(`/alter/${req.params.id}`);
            if (
              result.rows[0].password == `'${CryptoJS.SHA3(req.body.logPass)}'`
            ) {
              req.session.journalUser = req.params.id;
              res.redirect(`/journal/${req.params.id}`);
            } else {
              res.redirect(`/alter/${req.params.id}`);
            }
          }
        }
      );
    }
  }
);

router.post("/edit-alter/:id", authUser, validateParam("id"),
  async (req, res) => {
    // Is this their alter tho?
    let altInf = await db.query(
      client,
      "SELECT systems.user_id FROM systems INNER JOIN alters ON alters.sys_id = systems.sys_id WHERE alters.alt_id = $1;",
      [`${req.params.id}`],
      res,
      req
    );
    if (!idCheck(req, altInf[0].user_id)) return lostPage(res, req);

    // Ok, this is their alter. Proceed. Let's handle some logic first.
    let pkId = req.body.pkid ? `${encryptWithAES(req.body.pkid)}` : null;
    let spId = req.body.spid ? `${encryptWithAES(req.body.spid)}` : null;
    let colourEn = req.body.colourenabled == "on" ? true : false;
    let outlineEn = req.body.outlineenabled == "on" ? true : false;
    const maxBytes = 524288;
    // First-- Let's handle files.
    if (req.files) {
      if (req.files.imgupload) {
        // This is for the icons!
        const uploadedFile = req.files.imgupload;
        // console.log("Icon upload:", uploadedFile.size, "Max size:", maxBytes, "| In compliance:", uploadedFile.size < maxBytes);
        if (uploadedFile.size > maxBytes) {
          // Bookmark
          req.flash(
            "flash",
            `File size must be under ${maxBytes / 1024 / 1024}MB`
          );

          let sysInfo = await getSystems(getCookies(req)["u_id"], res, req);
          let altInfo = await db.query(
            client,
            "SELECT alters.*, systems.sys_alias, systems.user_id FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",
            [`${req.params.id}`],
            res,
            req,
            true
          );
          if (!altInfo) return;
          let chosenAlter = altInfo[0];
          if (!idCheck(req, chosenAlter.user_id))
            return res
              .status(404)
              .render(`pages/404`, {
                session: req.session,
                code: "Not Found",
                cookies: req.cookies,
              });
          res.render(`pages/edit_alter`, {
            session: req.session,
            cookies: req.cookies,
            alterTypes: alterTypes,
            chosenAlter: chosenAlter,
            sysInfo: sysInfo,
          });
          return;
        } else {
          await db.query(
            client,
            "UPDATE alters SET img_blob=$2, blob_mimetype=$3 WHERE alt_id=$1",
            [
              `${req.params.id}`,
              req.body.clear ? null : req.files.imgupload.data,
              req.body.clear ? null : req.files.imgupload.mimetype,
            ],
            res,
            req
          );
          await db.query(
            client,
            "UPDATE alters SET img_url=null WHERE alt_id=$1",
            [`${req.params.id}`],
            res,
            req
          );
        }
      }

      if (req.files.headeralt) {
        // This is for the header!
        const uploadedHeader = req.files.headeralt;
        if (uploadedHeader.size > maxBytes) {
          // Bookmark
          req.flash(
            "flash",
            `File size must be under ${maxBytes / 1024 / 1024}MB`
          );

          let sysInfo = await getSystems(getCookies(req)["u_id"], res, req);
          let altInfo = await db.query(
            client,
            "SELECT alters.*, systems.sys_alias, systems.user_id FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",
            [`${req.params.id}`],
            res,
            req,
            true
          );
          if (!altInfo) return;
          let chosenAlter = altInfo[0];
          if (!idCheck(req, chosenAlter.user_id))
            return res
              .status(404)
              .render(`pages/404`, {
                session: req.session,
                code: "Not Found",
                cookies: req.cookies,
              });
          res.render(`pages/edit_alter`, {
            session: req.session,
            cookies: req.cookies,
            alterTypes: alterTypes,
            chosenAlter: chosenAlter,
            sysInfo: sysInfo,
          });
        } else {
          await db.query(
            client,
            "UPDATE alters SET header_blob=$2, header_mimetype=$3 WHERE alt_id=$1",
            [
              `${req.params.id}`,
              req.files.headeralt.data,
              req.files.headeralt.mimetype,
            ],
            res,
            req
          );
        }
      }
    }

    const alterData = await db.query(
      client,
      "SELECT * FROM alters WHERE alt_id=$1",
      [`${req.params.id}`],
      res,
      req
    );
    let alterName;
    if (!req.body.name) {
      alterName = alterData[0].name;
    } else {
      alterName = `'${base64encode(req.body.name)}'`;
    }
    await db.query(
      client,
      "UPDATE alters SET name=$2, triggers_pos=$3, triggers_neg= $4, agetext=$5, likes=$6, dislikes=$7, job=$8, safe_place=$9, wants=$10, acc=$11, notes=$12, img_url=$13, type=$14, pronouns=$15, birthday=$16, first_noted=$17, gender=$18, sexuality=$19, source=$20, fronttells=$21, relationships=$22, hobbies=$23, appearance=$24, colour=$25, nickname=$26, species=$27, pk_id=$28, sp_id=$29, colour_enabled=$30, outline_enabled=$31, outline=$32 WHERE alt_id=$1",
      [
        `${req.params.id}`,
        alterName,
        `'${base64encode(req.body.postr)}'`,
        `'${base64encode(req.body.negtr)}'`,
        `'${base64encode(req.body.age)}'`,
        `'${base64encode(req.body.likes)}'`,
        `'${base64encode(req.body.dislikes)}'`,
        `'${base64encode(req.body.internalJob)}'`,
        `'${base64encode(req.body.safety)}'`,
        `'${base64encode(req.body.wish)}'`,
        `'${base64encode(req.body.acc)}'`,
        `'${base64encode(req.body.notes)}'`,
        `'${base64encode(req.body.imgurl)}'`,
        req.body.type,
        `'${base64encode(req.body.pronouns)}'`,
        `'${base64encode(req.body.birthday)}'`,
        `'${base64encode(req.body.firstnoted)}'`,
        `'${base64encode(req.body.gender)}'`,
        `'${base64encode(req.body.sexuality)}'`,
        `'${base64encode(req.body.source)}'`,
        `'${base64encode(req.body.fronttells)}'`,
        `'${base64encode(req.body.relationships)}'`,
        `'${base64encode(req.body.hobbies)}'`,
        `'${base64encode(req.body.appearance)}'`,
        req.body.colour,
        `'${base64encode(req.body.nickname)}'`,
        `'${base64encode(req.body.species)}'`,
        pkId,
        spId,
        colourEn,
        outlineEn,
        req.body.outline,
      ],
      res,
      req
    );
    if (req.body.clear) {
      await db.query(
        client,
        "UPDATE alters SET  img_blob=null, blob_mimetype=null WHERE alt_id=$1",
        [`${req.params.id}`],
        res,
        req
      );
    }
    if (req.body.headersclear) {
      await db.query(
        client,
        "UPDATE alters SET  header_blob=null, header_mimetype=null WHERE alt_id=$1",
        [`${req.params.id}`],
        res,
        req
      );
    }

    let otherSystems;
    if (typeof req.body.othersys == "string") {
      // Make an array
      otherSystems = new Array(req.body.othersys);
    } else if (typeof req.body.othersys == "undefined") {
      otherSystems = new Array(5).fill(null);
    } else {
      otherSystems = req.body.othersys;
    }
    try {
      let totalLength = otherSystems.length <= 6 ? otherSystems.length : 6;
      const finalSystem = otherSystems
        .slice(0, 6)
        .concat(Array(6 - totalLength).fill(null));

      // Let's update their systems if need be
      for (let i = 1; i < 6; i++) {
        await db.query(
          client,
          `UPDATE alters SET subsys_id${i}=$2 WHERE alt_id=$1`,
          [`${req.params.id}`, finalSystem[i - 1]],
          res,
          req
        );
      }
    } catch (e) {
      console.log(e);
    }

    req.flash("flash", "Page updated!");
    res.redirect(`/alter/${req.params.id}`);
  }
);

router.post("/archive-alter/:id", authUser, validateParam("id"),
  (req, res, next) => {
    if (!checkUUID(req.params.id)) return lostPage(res, req);
    if (isLoggedIn(req)) {
      client.query({ text: "UPDATE alters SET is_archived= NOT is_archived WHERE alt_id=$1", values: [`${req.params.id}`] }, (err, result) => {
        if (err) {
          console.log(err.stack);
          res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        } else {
          if (req.body.archive) {
            req.flash("flash", "Archived.");
          } else {
            req.flash("flash", "Un-Archived");
          }

          res.redirect(`/alter/${req.params.id}`);
        }
      });
    } else {
      res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
    }
  }
);

router.post('/mood/:alt', authUser, validateParam("alt"),
  function (req, res) {
    if (!checkUUID(req.params.alt)) return lostPage(res, req);
    var now = new Date();
    client.query({ text: "SELECT * FROM alter_moods WHERE alt_id=$1", values: [`${req.params.alt}`] }, (err, result) => {
      if (err) {
        console.log(err.stack);
        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
      } else {
        if (result.rows.length == 0) {
          // Woops. Add new mood!
          // `${encryptWithAES(req.body.jTitle)}`
          client.query({ text: "INSERT INTO alter_moods (alt_id, mood, reason, timestamp) VALUES ($1, $2, $3, $4);", values: [`${req.params.alt}`, req.body.mood, `${encryptWithAES(req.body.reason)}`, `${now.getUTCFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}+${now.getTimezoneOffset()}`] }, (err, result) => {
            if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
            }
            req.flash("flash", (strings.mood.updated));
            res.redirect(302, `/alter/${req.params.alt}`);
          });
        } else {
          client.query({ text: "UPDATE alter_moods SET mood=$2, reason=$3, timestamp=$4 WHERE alt_id=$1;", values: [`${req.params.alt}`, req.body.mood, `${encryptWithAES(req.body.reason)}`, `${now.getUTCFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}+${now.getTimezoneOffset()}`] }, (err, result) => {
            if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
            }
            req.flash("flash", strings.mood.updated);
            res.redirect(302, `/alter/${req.params.alt}`);
          });
        }
      }
    });

  }
);

// #endregion

console.log(`Alters Router Loaded.`);
module.exports = router;
