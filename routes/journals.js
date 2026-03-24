// Journals Router
const express = require("express");
const router = express.Router();
const db = require("../db.js");
const client = db.client;
const { getCookies, encryptWithAES, decryptWithAES, idCheck, authUser, validateParam, isLoggedIn } = require("../funcs.js");

/**
 * Updates a journal post. Note to self: This should be a router.patch().
 */
router.post("/journal/:id/edit", validateParam("id"), (req, res) => {

  if (isLoggedIn(req)) {
    client.query(
      {
        text: "UPDATE posts SET title=$1, body=$2, created_on=$4, feeling=$5 WHERE p_id=$3; ",
        values: [
          `${encryptWithAES(req.body.jTitle)}`,
          `${encryptWithAES(req.body.jBody)}`,
          `${req.params.id}`,
          `${req.body.jDate || new Date().toISOString()}`,
          `${encryptWithAES(req.body.feeling)}`,
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
          if (req.body.author && req.body.author !== "skip") {
            // New author specified.
            if (req.body.author == "move-to-comm") {
              // Turn it into a communal journal post. WIP.
            } else {
              // Make it an alter's post.
              client.query(
                {
                  text: "UPDATE posts SET j_id=$2 WHERE p_id=$1;",
                  values: [`${req.params.id}`, `${req.body.author}`],
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
                  // No go redirect appropriately.
                  client.query(
                    {
                      text: "SELECT alters.alt_id FROM alters INNER JOIN journals ON journals.alt_id = alters.alt_id WHERE journals.j_id=$1;",
                      values: [`${req.body.author}`],
                    },
                    (err, cresult) => {
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
                      req.session.jPost = null;
                      req.flash("flash", strings.posts.moved);
                      // Moving posts, so go to the journal for it
                      return res.redirect(`/journal/${cresult.rows[0].alt_id}`);
                    }
                  );
                }
              );
            }
          } else {
            res.redirect(`/journal/${req.body.alt_id}`);
          }
        }
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

/**
 * Adds a journal post.
 */
router.post("/journal/:id", validateParam("id"), (req, res) => {
  if (isLoggedIn(req)) {
    if (req.body.submit) {
      client.query(
        {
          text: "INSERT INTO posts (j_id, created_on, body, title, feeling) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4, $5);",
          values: [
            `${req.body.j_id}`,
            `${Date.now()}`,
            `${encryptWithAES(req.body.j_body)}`,
            `${encryptWithAES(req.body.j_title)}`,
            `${encryptWithAES(req.body.feeling)}`,
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
            res.redirect(`/journal/${req.params.id}`);
          }
        }
      );
    } else {
      client.query(
        {
          text: "DELETE FROM posts WHERE p_id=$1; ",
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
            res.redirect(`/journal/${req.params.id}`);
          }
        }
      );
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
});

/**
 * Gets a journal for a member.
 */
router.get("/journal/:id", authUser, validateParam("id"), async (req, res) => {
  const journalDat = await db.query(
    client,
    "SELECT journals.*, alters.*, systems.sys_alias, systems.user_id FROM journals INNER JOIN alters ON journals.alt_id= alters.alt_id INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1;",
    [`${req.params.id}`],
    res,
    req
  );
  if (
    journalDat.length < 1 ||
    journalDat[0].user_id !== getCookies(req)["u_id"]
  ) {
    return res
      .status(404)
      .render("pages/404", {
        session: req.session,
        code: "Not Found",
        cookies: req.cookies,
      });
  }
  let alterInfo = {
    alt_id: journalDat[0].alt_id,
    name: base64decode(journalDat[0].name),
    sys_alias: base64decode(journalDat[0].sys_alias),
    sys_id: journalDat[0].sys_id,
    journId: journalDat[0].j_id,
    feeling: journalDat[0].feeling,
  };
  res.render("pages/journal", {
    session: req.session,
    cookies: req.cookies,
    alterInfo: alterInfo,
  });
});

/**
 * Gets info to verify deletion of a post. <-- Make this a modal.
 */
router.get(
  "/journal/:id/delete",
  authUser,
  validateParam("id"),
  async (req, res) => {
    const journalInfo = await db.query(
      client,
      "SELECT posts.*, systems.user_id FROM posts INNER JOIN journals ON posts.j_id = journals.j_id INNER JOIN alters ON journals.alt_id = alters.alt_id INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE posts.p_id=$1;",
      [`${req.params.id}`],
      res,
      req,
      true
    );
    if (!journalInfo) return;
    if (!idCheck(req, journalInfo[0].user_id)) return lostPage(res, req);
    req.session.jPost = journalInfo[0];
    req.session.jPost.body = req.session.jPost.body
      ? decryptWithAES(req.session.jPost.body)
      : "Post Body Unavailable";
    req.session.jPost.title = req.session.jPost.title
      ? decryptWithAES(req.session.jPost.title)
      : "Untitled Post";
    res.render(`pages/delete_post`, {
      session: req.session,
      cookies: req.cookies,
    });
  }
);

/**
 * Gets the edit page for a journal post.
 */
router.get(
  "/journal/:id/edit",
  authUser,
  validateParam("id"),
  async (req, res) => {
    const journalInfo = await db.query(
      client,
      "SELECT posts.*, journals.alt_id, alters.sys_id, systems.user_id FROM posts INNER JOIN journals ON posts.j_id= journals.j_id INNER JOIN alters ON journals.alt_id = alters.alt_id INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE posts.p_id=$1;",
      [`${req.params.id}`],
      res,
      req
    );

    if (!journalInfo) return lostPage(res, req);

    if (!idCheck(req, journalInfo[0].user_id)) return lostPage(res, req);
    let feeling = journalInfo[0].feeling
      ? decryptWithAES(journalInfo[0].feeling)
      : "";
    return res.render(`pages/edit_post`, {
      session: req.session,
      cookies: req.cookies,
      cJourn: {
        id: journalInfo[0].p_id,
        body: decryptWithAES(journalInfo[0].body),
        title: decryptWithAES(journalInfo[0].title),
        is_comm: false,
        date: journalInfo[0].created_on,
        feeling: feeling,
      },
      journalID: journalInfo[0].j_id,
      alt_id: journalInfo[0].alt_id,
    });
  }
);

router.get('/clearalter', (req, res, next) => {
	req.session.journalUser = null;
	res.redirect('/system');
});

router.get('/comm/:id/edit', validateParam("id"), async function (req, res) {

	if (isLoggedIn(req)) {
		const sysCheck = await db.query(client, "SELECT id FROM comm_posts WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
		const sysList = sysCheck.map(obj => obj.id);
		if (!(sysList.includes(req.params.id))) return res.status(404).render(`pages/404`, { session: req.session, code: "Not Found", cookies: req.cookies });

		const postInfo = await db.query(client, "SELECT * FROM comm_posts WHERE id=$1", [`${req.params.id}`], res, req);
		res.render(`pages/edit_post`, { session: req.session, cookies: req.cookies, cJourn: { id: postInfo[0].id, body: decryptWithAES(postInfo[0].body), title: decryptWithAES(postInfo[0].title), is_comm: true, date: postInfo[0].created_on, sysid: postInfo[0].system_id, feeling: postInfo[0].feeling ? decryptWithAES(postInfo[0].feeling) : "" } });
	} else {
		forbidUser(res, req);
	}


});

router.get('/comm/:id/delete', validateParam("id"), async function (req, res) {
	if (isLoggedIn(req)) {
		client.query({ text: "SELECT * FROM comm_posts WHERE id=$1;", values: [`${req.params.id}`] }, async function (err, result) {
			if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
			} else {
				const sysCheck = await db.query(client, "SELECT id FROM comm_posts WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
				const sysList = sysCheck.map(obj => obj.id);
				if (!(sysList.includes(req.params.id))) return res.status(404).render(`pages/404`, { session: req.session, code: "Not Found", cookies: req.cookies });

				// console.log(result.rows[0]);
				req.session.jPost = result.rows[0];
				req.session.jPost.body = decryptWithAES(req.session.jPost.body);
				req.session.jPost.title = decryptWithAES(req.session.jPost.title);
				let sysid = result.rows[0].system_id;
				res.render(`pages/delete_post`, { session: req.session, cookies: req.cookies, sysid: sysid });
			}
		});
	} else {
		res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
	}

});

router.post('/comm/:id/delete', validateParam("id"), (req, res) => {
	if (isLoggedIn(req)) {
		client.query({ text: "DELETE FROM comm_posts WHERE id=$1; ", values: [`${req.params.id}`] }, (err, result) => {
			if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
			} else {
				req.session.jPost = null;
				//   res.redirect(`/system`);
				if (req.body.sysid) {
					res.redirect(`/system/communal-journal?sys=${req.body.sysid}`);
				} else {
					res.redirect(`/system/communal-journal`);
				}
			}
		});
	} else {
		res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
	}
});

router.post('/comm/:id/edit', validateParam("id"), (req, res) => {
	if (isLoggedIn(req)) {
		client.query({
			text: "UPDATE comm_posts SET title=$1, body=$2, created_on=$4 WHERE id=$3; ",
			values: [
				`${encryptWithAES(req.body.jTitle)}`,
				`${encryptWithAES(req.body.jBody)}`,
				`${req.params.id}`,
				`${req.body.jDate || new Date().toISOString()}`
			]
		}, (err, result) => {
			if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
			} else {
				req.session.jPost = null;
				if (req.body.sysid) {
					res.redirect(`/system/communal-journal?sys=${req.body.sysid}`);
				} else {
					res.redirect(`/system/communal-journal`);
				}
			}

		});
	} else {
		res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
	}
});

console.log(`Journals Router Loaded.`);
module.exports = router;
