// System Router
const express = require("express");
const router = express.Router();
const db = require("../db.js");
const config = require("../config/config.js");
const site_config = require("../config/site_config.js")
const client = db.client;
const {
  isLoggedIn,
  getCookies,
  apiEyesOnly,
  lostPage,
  randomise,
  getRandomInt,
  createPassword,
  sendEmail
} = require("../funcs.js");

const strings = require("../lang/en.json");
const ejs = require("ejs");
const twoWeeks = 1000 * 60 * 60 * 24 * 14;
const path = require("path");
const nodemailer = require("nodemailer");
const hasMailConfig = Boolean(config.GMAIL_PASS);
const transporter = hasMailConfig
  ? nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: config.ADMIN_EMAIL,
      pass: config.GMAIL_PASS,
    },
  })
  : null;
router.get("/users", (req, res, next) => {
  if (apiEyesOnly(req)) {
    // No browser peeking!! Only Lighthouse's API can see this!
    // ${Buffer.from(req.body.email).toString('base64')}
    if (req.headers.email) {
      // Look for an email.
      client.query(
        {
          text: "SELECT id FROM users WHERE email=$1;",
          values: [`'${Buffer.from(req.headers.email).toString("base64")}'`],
        },
        (err, result) => {
          if (err) {
            console.log(err.stack);
            res.status(400);
          } else {
            if (result.rows.length == 0) {
              return res.json({ code: 200, taken: false });
            } else {
              return res.json({ code: 200, taken: true });
            }
          }
        }
      );
    } else if (req.headers.username) {
      // Look for username
      client.query(
        {
          text: "SELECT * FROM users WHERE username=$1;",
          values: [`'${Buffer.from(req.headers.username).toString("base64")}'`],
        },
        (err, result) => {
          if (err) {
            console.log(err.stack);
            res.status(400);
          } else {
            if (result.rows.length == 0) {
              return res.json({ code: 200, taken: false });
            } else {
              return res.json({ code: 200, taken: true });
            }
          }
        }
      );
    } else {
      return res.json({ code: 422 });
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

router.get("/profile", (req, res) => {
  if (isLoggedIn(req)) {
    client.query(
      {
        text: "SELECT * FROM users WHERE id=$1;",
        values: [getCookies(req)["u_id"]],
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
          req.session.alter_term = result.rows[0].alter_term;
          req.session.system_term = result.rows[0].system_term;
          req.session.plural_term = result.rows[0].plural_term;
          req.session.innerworld_term = result.rows[0].innerworld_term;
          req.session.worksheets_enabled = result.rows[0].worksheets_enabled;
          var theirEmail = Buffer.from(
            result.rows[0].email,
            "base64"
          ).toString();
          var theirName = Buffer.from(
            result.rows[0].username,
            "base64"
          ).toString();
          var numUp = result.rows[0].altupnum;
        }
        res.render(`pages/profile`, {
          session: req.session,
          cookies: req.cookies,
          theirEmail: theirEmail,
          theirName: theirName,
          numUp: numUp,
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

router.get("/profile/tokens", async function (req, res) {
  if (isLoggedIn(req)) {
    let tokens = await db.query(
      client,
      "SELECT * FROM tokens WHERE u_id=$1 ORDER BY name ASC;",
      [getCookies(req)["u_id"]],
      res,
      req
    );
    res.render(`pages/tokens`, {
      session: req.session,
      cookies: req.cookies,
      tokens: tokens,
      config: site_config,
    });
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

router.post("/profile", function (req, res) {
  // console.table(req.body);
  client.query(
    {
      text: "SELECT * FROM users WHERE id=$1",
      values: [getCookies(req)["u_id"]],
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
      if (req.body.deleteAcc) {
        if (getCookies(req)["u_id"] == result.rows[0].id) {
          // Logged account matches searched account.
          if (req.body.deleteAcc) {
            ejs.renderFile(
              path.join(__dirname, '..', 'views', 'pages', "email-goodbye.ejs"),
              {
                alias:
                  Buffer.from(result.rows[0].username, "base64").toString() ||
                  randomise(["Buddy", "Friend", "Pal"]),
              },
              (err, data) => {
                if (err) {
                  console.log(err);
                } else {
                  var mailOptions = {
                    from: `"Lighthouse" <${config.ADMIN_EMAIL}>`,
                    to: Buffer.from(result.rows[0].email, "base64").toString(),
                    subject: `Farewell, ${Buffer.from(
                      result.rows[0].username,
                      "base64"
                    ).toString()}.`,
                    html: data,
                  };

                  sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
                }
              }
            );
            client.query(
              {
                text: "DELETE FROM inner_worlds WHERE u_id=$1;",
                values: [getCookies(req)["u_id"]],
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
                client.query(
                  {
                    text: "DELETE FROM sys_rules WHERE u_id=$1;",
                    values: [getCookies(req)["u_id"]],
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

                    // Deleting from users will cascade to systems will cascade to alters will cascade to journals will cascade to posts. Hopefully.
                    client.query(
                      {
                        text: "DELETE FROM users WHERE id=$1;",
                        values: [getCookies(req)["u_id"]],
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
                        // Clear all cookies/session data.

                        req.flash("flash", strings.account.deleted);
                        try {
                          req.session.destroy();
                        } catch (e) {
                          console.log(
                            "Tried destroying the session, but it seems that wasn't doable!"
                          );
                        }
                        res.clearCookie("loggedin");
                        res.clearCookie("username");
                        res.clearCookie("u_id");
                        res.redirect("/");
                      }
                    );
                  }
                );
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
      } else {
        if (req.body.skinSel) {
          // Changing Lighthouse's skin.
          client.query(
            {
              text: "UPDATE users SET skin=$1 WHERE id=$2",
              values: [req.body.skinSel, getCookies(req)["u_id"]],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.skin);
              }
            }
          );
        }
        if (req.body.altTerm) {
          // Updating alter term
          client.query(
            {
              text: "UPDATE users SET alter_term=$1 WHERE id=$2",
              values: [req.body.altTerm.toLowerCase(), getCookies(req)["u_id"]],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
                req.session.alter_term = req.body.altTerm.toLowerCase();
              }
            }
          );
        }
        if (req.body.sysTerm) {
          // Updating alter term
          client.query(
            {
              text: "UPDATE users SET system_term=$1 WHERE id=$2",
              values: [req.body.sysTerm.toLowerCase(), getCookies(req)["u_id"]],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
                req.session.system_term = req.body.sysTerm.toLowerCase();
              }
            }
          );
        }
        if (req.body.subTerm) {
          // Updating alter term
          client.query(
            {
              text: "UPDATE users SET subsystem_term=$1 WHERE id=$2",
              values: [req.body.subTerm.toLowerCase(), getCookies(req)["u_id"]],
            },
            (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
                req.session.subsystem_term = req.body.subTerm.toLowerCase();
              }
            }
          );
        }
        if (req.body.iwTerm) {
          // Updating inner world term
          client.query(
            {
              text: "UPDATE users SET innerworld_term=$1 WHERE id=$2",
              values: [req.body.iwTerm.toLowerCase(), getCookies(req)["u_id"]],
            },
            (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
                req.session.innerworld_term = req.body.iwTerm.toLowerCase();
              }
            }
          );
        }
        if (req.body.plurTerm) {
          // Updating inner world term
          client.query(
            {
              text: "UPDATE users SET plural_term=$1 WHERE id=$2",
              values: [
                req.body.plurTerm.toLowerCase(),
                getCookies(req)["u_id"],
              ],
            },
            (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
                req.session.plural_term = req.body.plurTerm.toLowerCase();
              }
            }
          );
        }
        if (req.body.newEmail) {
          // Updating email
          client.query(
            {
              text: "UPDATE users SET email=$1 WHERE id=$2",
              values: [
                `'${Buffer.from(req.body.newEmail).toString("base64")}'`,
                getCookies(req)["u_id"],
              ],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
                req.session.email = req.body.newEmail;
              }
            }
          );
        }
        if (req.body.newName) {
          // Updating username
          client.query(
            {
              text: "UPDATE users SET username=$1 WHERE id=$2",
              values: [
                `'${Buffer.from(req.body.newName).toString("base64")}'`,
                getCookies(req)["u_id"],
              ],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
                req.session.username = req.body.newName;
              }
            }
          );
        }
        if (req.body.changePass) {
          let { hash: newpass, salt: newsalt } = createPassword(
            req.body.newPass1
          );
          client.query(
            {
              text: "UPDATE users SET pass=$1, salt=$2 WHERE id=$3",
              values: [newpass, newsalt, getCookies(req)["u_id"]],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", "Password Updated!");
              }
            }
          );
        }
        if (req.body.innerworld) {
          client.query(
            {
              text: "UPDATE users SET inner_worlds= $2 WHERE id=$1",
              values: [getCookies(req)["u_id"], req.body.innerworld],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.session.inner_worlds = req.session.inner_worlds;
                req.flash("flash", strings.account.updated);
              }
            }
          );
        }
        if (req.body.userlang) {
          // Update user language
          client.query(
            {
              text: "UPDATE users SET language= $2 WHERE id=$1",
              values: [getCookies(req)["u_id"], req.body.userlang],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.session.language = req.body.userlang;
                req.flash("flash", strings.account.updated);
              }
            }
          );
        }
        if (req.body.textsize) {
          // Update user text size
          client.query(
            {
              text: "UPDATE users SET textsize= $2 WHERE id=$1",
              values: [getCookies(req)["u_id"], req.body.textsize],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.session.textsize = req.body.textsize;
                req.flash("flash", strings.account.updated);
              }
            }
          );
        }
        if (req.body.ws) {
          // Toggle worksheets
          client.query(
            {
              text: "UPDATE users SET worksheets_enabled= $2 WHERE id=$1",
              values: [getCookies(req)["u_id"], req.body.ws],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.session.worksheets_enabled = req.body.ws;
                req.flash("flash", strings.account.updated);
              }
            }
          );
        }
        if (req.body.font) {
          // Change fonts
          client.query(
            {
              text: "UPDATE users SET font= $2 WHERE id=$1",
              values: [getCookies(req)["u_id"], req.body.font],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.session.font = req.body.font;
                req.flash("flash", strings.account.updated);
              }
            }
          );
        }
        if (req.body.gloss) {
          // Change fonts
          client.query(
            {
              text: "UPDATE users SET glossary_enabled= $2 WHERE id=$1",
              values: [getCookies(req)["u_id"], req.body.gloss],
            },
            async (err, result) => {
              if (err) {
                res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.session.glossary_enabled = req.body.gloss;
                req.flash("flash", strings.account.updated);
              }
            }
          );
        }
        if (req.body.numUp) {
          let numUp = Number(req.body.numUp);
          client.query(
            {
              text: "UPDATE users SET altUpNum=$2 WHERE id=$1",
              values: [getCookies(req)["u_id"], numUp],
            },
            async (err, result) => {
              if (err) {
                return res
                  .status(400)
                  .render("pages/400", {
                    session: req.session,
                    code: "Bad Request",
                    cookies: req.cookies,
                  });
              } else {
                req.flash("flash", strings.account.updated);
              }
            }
          );
        }
        // After all those changes.
        // res.cookie('subsystem_term', req.body.subTerm,{ maxAge: twoWeeks, httpOnly: true });
        res
          .cookie(
            "username",
            req.body.newName ||
            Buffer.from(req.session.username, "base64").toString(),
            { maxAge: twoWeeks, httpOnly: true }
          )
          .cookie("email", req.body.newEmail || req.session.email, {
            maxAge: twoWeeks,
            httpOnly: true,
          })
          .cookie("alter_term", req.body.altTerm || req.session.alter_term, {
            maxAge: twoWeeks,
            httpOnly: true,
          })
          .cookie("system_term", req.body.sysTerm || req.session.system_term, {
            maxAge: twoWeeks,
            httpOnly: true,
          })
          .cookie(
            "subsystem_term",
            req.body.subTerm || req.session.subsystem_term,
            { maxAge: twoWeeks, httpOnly: true }
          )
          .cookie(
            "innerworld_term",
            req.body.iwTerm || req.session.innerworld_term,
            { maxAge: twoWeeks, httpOnly: true }
          )
          .cookie("plural_term", req.body.plurTerm || req.session.plural_term, {
            maxAge: twoWeeks,
            httpOnly: true,
          })
          .cookie("skin", req.body.skinSel || req.session.skin, {
            maxAge: twoWeeks,
            httpOnly: true,
          })
          .cookie(
            "worksheets_enabled",
            req.body.ws || req.session.worksheets_enabled,
            { maxAge: twoWeeks, httpOnly: true }
          )
          .cookie("textsize", req.body.textsize || req.session.textsize || 1, {
            maxAge: twoWeeks,
            httpOnly: true,
          })
          .redirect(302, "/profile");
      }
    }
  );
});

router.post("/reset/:id", async (req, res) => {
  const userInfo = await db.query(
    client,
    "SELECT id, email_pin, email, username, email_link FROM users WHERE email_link=$1",
    [`'${req.params.id}'`],
    res,
    req
  );
  if (userInfo.length == 0) return lostPage(res, req);

  if (userInfo[0].email_pin == req.body.pin) {
    // Pin matches! Let them reset their password.
    let { hash: newpass, salt: newsalt } = createPassword(req.body.newpass);
    await db.query(
      client,
      "UPDATE users SET pass=$1, salt=$2 WHERE id=$3;",
      [newpass, newsalt, userInfo[0].id],
      res,
      req
    );
    res.redirect("/login");
    return;
  } else {
    console.log("Pin doesn't match!");
    console.log(
      `User entered: ${req.body.pin} | Actual pin: ${userInfo[0].email_pin}`
    );
    res.render("pages/new_pass", {
      session: req.session,
      code: "Forbidden",
      cookies: req.cookies,
    });
  }
});

router.post("/forgot-password", (req, res) => {
  client.query(
    {
      text: "SELECT username, email, email_link, email_pin FROM users WHERE email=$1 ",
      values: [`'${Buffer.from(req.body.email).toString("base64")}'`],
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
        if (result.rows.length == 0) {
          // User doesn't exist.
          res.render(`pages/forgot_pass`, {
            session: req.session,
            cookies: req.cookies,
          });
        } else {
          req.session.user = result.rows[0];
          req.session.user.email_pin = getRandomInt(1111, 9999);
          client.query(
            {
              text: "UPDATE users set email_pin=$1 WHERE email=$2 ",
              values: [
                `${req.session.user.email_pin}`,
                `'${Buffer.from(req.body.email).toString("base64")}'`,
              ],
            },
            (err, result) => {
              res.render(`pages/forgot_pass2`, {
                session: req.session,
                cookies: req.cookies,
              });
              ejs.renderFile(
                path.join(__dirname, '..', 'views', 'pages', 'email-forgotpass.ejs'),
                {
                  alias:
                    Buffer.from(
                      req.session.user.username,
                      "base64"
                    ).toString() || randomise(["Buddy", "Friend", "Pal"]),
                  userPin: req.session.user.email_pin,
                  resetLink: req.session.user.email_link.replace(/'/gi, ""),
                },
                (err, data) => {
                  if (err) {
                    console.log(err);
                  } else {
                    var mailOptions = {
                      from: `"Lighthouse" <${config.ADMIN_EMAIL}>`,
                      to: req.body.email,
                      subject: `Forgot your password, ${Buffer.from(
                        req.session.user.username,
                        "base64"
                      ).toString()}?`,
                      html: data,
                    };

                    sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
                  }
                }
              );
            }
          );
        }
      }
    }
  );
});

console.log("Users Router Loaded.");
module.exports = router;
