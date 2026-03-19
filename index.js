// #region Import Packages, Variables, Files -----------------------------------
// NPM and external packages.
const express = require('express');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const session = require('cookie-session');
const path = require('path');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const flash = require('express-flash');
const fileUpload = require('express-fileupload');
const methodOverride = require('method-override');
const axios = require('axios');
const pjson = require('./package.json');

// Local files below
const { isLoggedIn, getCookies, encryptWithAES, decryptWithAES, lostPage, truncate, validateParam, randomise, getRandomInt, base64encode, errorPage, createPassword } = require("./funcs")
const locals = require("./config/locals")
let strings = require("./lang/en.json");
const db = require("./db");

const { client } = db;

const apiRouter = require('./routes/api');
const systemRouter = require('./routes/system');
const systemDataRouter = require('./routes/systemdata');
const alterRouter = require('./routes/alter');
const staticRouter = require('./routes/staticpages');
const wsRouter = require('./routes/worksheets');
const botRouter = require('./routes/bots');
const forumRouter = require('./routes/forums');
const messagesRouter = require('./routes/messages');
const journalRouter = require('./routes/journals');
const userRouter = require('./routes/users');

const twoWeeks = 1000 * 60 * 60 * 24 * 7 * 2;

require('dotenv').config();

const { PORT } = process.env;

// #endregion ------------------------------------------------------------------


const hasMailConfig = Boolean(process.env.gmail_pass);
const transporter = hasMailConfig
	? nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 465,
		secure: true,
		auth: {
			user: 'dee_deyes@writelighthouse.com',
			pass: process.env.gmail_pass,
		},
	})
	: null; // Not letting just anyone send emails through this account. Sorry!


console.log(`${"-".repeat(10)}\n
 _^_
 |@|
=====
 #::
 #::
 #::
╦  ┬┌─┐┬ ┬┌┬┐┬ ┬┌─┐┬ ┬┌─┐┌─┐
║  ││ ┬├─┤ │ ├─┤│ ││ │└─┐├┤ 
╩═╝┴└─┘┴ ┴ ┴ ┴ ┴└─┘└─┘└─┘└─┘ v${pjson.version}\n${"-".repeat(10)}
𝑀𝒶𝒹𝑒 𝒷𝓎 𝒯𝒽𝑒 𝐿𝒾𝑔𝒽𝓉𝒽𝑜𝓊𝓈𝑒 𝒮𝓎𝓈𝓉𝑒𝓂
`);

const app = express();
Object.assign(app.locals, locals);

// #region App Middleware ------------------------------------------------------
app.use('/', express.static(`${__dirname}/public`))
app.use(session({
	name: "session",
	secure: true,
	secret: process.env.sec,
	resave: true,
	saveUninitialized: true,
}));
app.use(flash());
app.use(bodyParser.json()).use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload());
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
});
app.use(express.static(path.join(__dirname, "node_modules/tabulator-tables/dist/css")));
app.use(express.static(path.join(__dirname, "node_modules/tabulator-tables/dist/js")));
app.use(methodOverride('_method'))

// Middleware...?
app.use(async (req, res) => {
	// Loads before all other routes.
	if (isLoggedIn(req)) {
		// Let's only grab the database if we need to.
		const userData = await db.query(client, "SELECT * FROM users WHERE id=$1;", [getCookies(req).u_id], res, req);
		const results = userData[0];
		try {
			req.session.u_id = results.id;
			req.session.is_legacy = results.is_legacy;
			req.session.username = results.username;
			req.session.email = results.email;
			req.session.skin = results.skin;
			req.session.system_term = truncate(results.system_term || getCookies(req).system_term || "system", 16);
			req.session.alter_term = truncate(results.alter_term || getCookies(req).alter_term || "alter", 16);
			req.session.subsystem_term = truncate(results.subsystem_term || getCookies(req).subsystem_term || "subsystem", 16);
			req.session.inner_worlds = results.inner_worlds || false;
			req.session.innerworld_term = truncate(results.innerworld_term || getCookies(req).innerworld_term || "inner world", 16);
			req.session.plural_term = truncate(results.plural_term || getCookies(req).plural_term || "plural", 16);
			req.session.language = results.language || "en";
			req.session.is_dev = Boolean(
				results.id &&
				[process.env.dev1, process.env.dev2, process.env.dev3].includes(results.id)
			); // <-- So if ID is not defined, they can't access dev features. Hoo boy that's a scary hole.
			req.session.textsize = results.textsize;
			req.session.worksheets_enabled = results.worksheets_enabled;
			req.session.font = results.font;
			req.session.glossary_enabled = results.glossary_enabled;

			// Now update strings to let it be what their language is.
			strings = require(`./lang/${req.session.language}.json`);
			app.locals.strings = strings;
		} catch (e) {
			// They're likely logged out.
			// console.error(e)
		}


	} else {
		req.session.alter_term = "alter";
		req.session.system_term = "system";
		req.session.subsystem_term = "subsystem";
		req.session.innerworld_term = "inner world";
		req.session.plural_term = "plural";
		req.session.font = "Lexend";
		try {
			strings = require(`./lang/${req.headers["accept-language"].split("-")[0]}.json`);

		} catch (e) {
			strings = require(`./lang/en.json`);
		}
		app.locals.strings = strings;

	}
	req.next();
});

// Other routes 
app.use('/api', apiRouter); // For the Public API
app.use("/system", systemRouter); // For the /system stuff (WIP)
app.use("", systemDataRouter); // For THE NIGHTMARE SYSTEM DATA ROUTES OMFG
app.use("", alterRouter); // For the /alter stuff (WIP)
app.use("", staticRouter); // For pages that require almost no extra checks beforehand. Think the about page, philosophy etc. 
app.use("", wsRouter); // For worksheet routes. 
app.use("", botRouter); // For the web crawling routes. 
app.use("", forumRouter); // For the forums routes. 
app.use("", journalRouter); // For the journal routes. 
app.use("", userRouter); // For the journal routes. 
app.use("/inbox", messagesRouter); // For the messages routes. 

// ------ //
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs');

if (process.env.maintenance === "true") {
	// Maintenance mode on.
	app.use((req, res) => res.render(`pages/maintenance`, { session: req.session, cookies: req.cookies }));

}

app.get('/search', (req, res) => {
	if (isLoggedIn(req)) {
		res.render(`pages/search`, { session: req.session, cookies: req.cookies });

	} else { res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies }); }

});

app.get('/mod', (req, res) => {
	// console.log(req.socket.remoteAddress);
	if (isLoggedIn(req)) {
		if ([process.env.dev1, process.env.dev2, process.env.dev3].includes(getCookies(req).u_id)) {
			res.render(`pages/mod-panel`, { session: req.session, cookies: req.cookies });
		} else {
			const mailOptions = {
				from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
				to: 'dee_deyes@writelighthouse.com',
				subject: `Unauthorised attempt to access mod panel.`,
				html: `<p>A user has attempted to enter the mod panel!</p><p>User: ID: ${getCookies(req).u_id || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
			};

			if (transporter) {
				transporter.sendMail(mailOptions, (error) => {
					if (error) {
						return console.log(error);
					}
				});
			} else {
				console.log("Email skipped: gmail_pass is not configured.");
			}
			console.log(`An attempt to enter the mod panel was made.\n Attempt made by: ${getCookies(req).u_id || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"}. IP Address: ${req.socket.remoteAddress}`);
			res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
		}
	} else {
		const mailOptions = {
			from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
			to: 'dee_deyes@writelighthouse.com',
			subject: `Unauthorised attempt to access mod panel.`,
			html: `<p>A user has attempted to enter the mod panel!</p><p>User: ID: ${getCookies(req).u_id || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
		};

		if (transporter) {
			transporter.sendMail(mailOptions, (error) => {
				if (error) {
					return console.log(error);
				}
			});
		} else {
			console.log("Email skipped: gmail_pass is not configured.");
		}
		console.log(`An attempt to enter the mod panel was made.\n Attempt made by: ${getCookies(req).u_id || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"}. IP Address: ${req.socket.remoteAddress}`);
		res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
	}

});

app.get('/changelog', (req, res) => {
	client.query({ text: "SELECT * FROM changelog ORDER BY date DESC LIMIT 50", values: [] }, (err, result) => {
		if (err) {
			console.log(err.stack);
			res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
		} else {
			res.render(`pages/changelog`, { session: req.session, cookies: req.cookies, changes: result.rows, lang: req.acceptsLanguages()[0] });
		}
	});

});

app.post('/mod', (req, res) => {
	if (isLoggedIn(req)) {
		if ([process.env.dev1, process.env.dev2, process.env.dev3].includes(getCookies(req).u_id)) {
			// This is a developer account; let them in.
			if (req.body.donor) {
				// Add a donor!
				client.query({ text: "INSERT INTO donators (nickname) VALUES ($1)", values: [req.body.donor] }, (err) => {
					if (err) {
						console.log(err.stack);
						res.status(400).json({ code: 400, message: err.stack });
					} else {
						return res.status(200).render(`pages/mod-panel`, { session: req.session, cookies: req.cookies });
					}
				});
			}
			if (req.body.pbody) {
				// Add a donor!
				client.query({ text: "INSERT INTO changelog (title, body) VALUES ($1, $2)", values: [req.body.ptitle, req.body.pbody] }, (err) => {
					if (err) {
						console.log(err.stack);
						res.status(400).json({ code: 400, message: err.stack });
					} else {
						req.flash("flash", "Added changelog entry!")
						return res.status(200).render(`pages/mod-panel`, { session: req.session, cookies: req.cookies });
					}
				});
			}
		} else {
			const mailOptions = {
				from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
				to: 'dee_deyes@writelighthouse.com',
				subject: `Unauthorised attempt to POST to mod panel.`,
				html: `<p>A user has attempted to POST to the mod panel!</p><p>User: ID: ${getCookies(req).u_id || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
			};

			if (transporter) {
				transporter.sendMail(mailOptions, (error) => {
					if (error) {
						return console.log(error);
					}
				});
			} else {
				console.log("Email skipped: gmail_pass is not configured.");
			}
			console.log(`An attempt to POST to the mod panel was made.\n Attempt made by: ${getCookies(req).u_id || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"} | IP Address: ${req.socket.remoteAddress}`);
			res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
		}

	} else {
		const mailOptions = {
			from: '"Lighthouse" <dee_deyes@writelighthouse.com>',
			to: 'dee_deyes@writelighthouse.com',
			subject: `Unauthorised attempt to POST to mod panel.`,
			html: `<p>A user has attempted to POST to the mod panel!</p><p>User: ID: ${getCookies(req).u_id || "Guest/Logged Out User"}</p><p>Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"}</p><p>IP Address: ${req.socket.remoteAddress}</p>`
		};

		if (transporter) {
			transporter.sendMail(mailOptions, (error) => {
				if (error) {
					return console.log(error);
				}
			});
		} else {
			console.log("Email skipped: gmail_pass is not configured.");
		}
		console.log(`An attempt to POST to the mod panel was made.\n Attempt made by: ${getCookies(req).u_id || "Guest/Logged Out User"} | Email: ${Buffer.from(getCookies(req).email, "base64").toString() || "N/A"} | IP Address: ${req.socket.remoteAddress}`);
		res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });
	}
});

// Refactored!
app.get('/glossary', async (req, res) => {
	const terms = await db.query(client, "SELECT * FROM glossary ORDER BY term ASC;", [], res, req);

	if (isLoggedIn(req)) {
		const glossEn = await db.query(client, "SELECT glossary_enabled FROM users WHERE id=$1;", [getCookies(req).u_id], res, req);

		if (glossEn[0].glossary_enabled == false) {
			// Show the disabled page.
			return res.render(`pages/glossary-disabled`, { session: req.session, cookies: req.cookies, });
		}
	}
	res.render(`pages/glossary`, { session: req.session, cookies: req.cookies, terms, lang: req.acceptsLanguages()[0] });
});

app.get('/logout', (req, res) => {
	req.session = null;

	// Delete *all* cookies.
	Object.keys(req.cookies).forEach(cookie => res.clearCookie(cookie));

	res.redirect("/");
});

app.post('/pluralkit', (req, res) => {
	if (isLoggedIn(req)) {
		let splitList = new Array();
		if (typeof req.body.alterChoice === "string") {
			splitList = [JSON.parse(req.body.alterChoice)];
			if (splitList[0].img == null) splitList[0].img = 'https://www.writelighthouse.com/img/avatar-default.jpg';
			if (splitList[0].pronouns == null) splitList[0].pronouns = '';
			if (splitList[0].birthday == null) splitList[0].birthday = '';
		} else if (typeof req.body.alterChoice === "undefined") {
			req.flash("flash", strings.import.PK.failure.noCheck);
			return res.redirect("/pluralkit");
		} else {
				/* Issue */ for (i in req.body.alterChoice) {
				splitList.push(JSON.parse(req.body.alterChoice[i]));
				if (splitList[i].img == null) splitList[i].img = 'https://www.writelighthouse.com/img/avatar-default.jpg';
				if (splitList[i].pronouns == null) splitList[i].pronouns = null;
				if (splitList[i].birthday == null) splitList[i].birthday = '';
			}
		}
		let newSys = "Imported from Pluralkit";
		if (req.body.sysLoc == "new") {
			// Check for an existing "Imported from Pluralkit" system
			client.query({ text: "SELECT sys_id FROM systems WHERE sys_alias=$1 AND user_id=$2;", values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req).u_id}`] }, (err, result) => {
				if (err) {
					console.log(err.stack);
					res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
				} else {
					if (result.rows.length > 0) {
						newSys += ` ${result.rows.length + 1}`;
					}
					// Create a new system
					client.query({ text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)", values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req).u_id}`] }, (err, result) => {
						if (err) {
							console.log(err.stack);
							res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
						} else {
							// Grab its ID.
							client.query({ text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2;", values: [`'${Buffer.from(newSys).toString('base64')}'`, `${getCookies(req).u_id}`] }, (err, result) => {
								if (err) {
									console.log(err.stack);
									res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
								} else {
									req.session.sys = new Array();
									// Add this system to the session.
									req.session.sys.push({ name: Buffer.from(result.rows[0].sys_alias, "base64").toString(), id: result.rows[0].sys_id, icon: null })
									const newSysID = result.rows[0].sys_id;
									// Insert each alter into this new system.
									for (i in splitList) {
										// console.log(splitList[i].img);
										client.query({ text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url) VALUES($1, $2, $3, $4, $5);", values: [`'${Buffer.from((splitList[i].name).replace(/⠀/g, " ")).toString('base64')}'`, newSysID, `'${Buffer.from(splitList[i].pronouns).toString('base64')}'`, `'${Buffer.from(splitList[i].birthday).toString('base64')}'`, `'${Buffer.from(splitList[i].img).toString('base64')}'`] }, (err, result) => {
											if (err) {
												console.log(err.stack);
												res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
											}
										});

									}
									req.flash("flash", strings.system.created);
									delete req.session.sys;
								}
							});
						}
					});
				}
			})

		} else {
			// Add to a system.
			for (i in splitList) {
				// console.log(splitList[i].img);
				client.query({ text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url) VALUES($1, $2, $3, $4, $5);", values: [`'${Buffer.from((splitList[i].name).replace(/⠀/g, " ")).toString('base64') || ''}'`, req.body.sysLoc, `'${Buffer.from(splitList[i].pronouns).toString('base64') || null}'`, `'${Buffer.from(splitList[i].birthday).toString('base64') || ''}'`, `'${Buffer.from(splitList[i].img).toString('base64') || 'aHR0cHM6Ly9pLmliYi5jby92a3dtV2pGL2F2YXRhci1kZWZhdWx0LmpwZw=='}'`] }, (err, result) => {
					if (err) {
						console.log(err.stack);
						res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
					}
				});

			}
			req.flash("flash", strings.system.updated);
		}
		return res.redirect(307, "/system");

	}
	res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies })

});

app.post('/signup', async (req, res) => {
	// Bookmarks: signup post, post signup
	const secretKey = process.env.environment == "dev" ? "1x0000000000000000000000000000000AA" : process.env.cloudflareKey;

	const response = req.body['cf-turnstile-response'];
	if (req.body.mjl2fbbz8s) return res.send("(:"); // It's a bot. Do not let them load anything.

	try {
		const verificationResponse = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			secret: secretKey,
			response,
		});
		if (!verificationResponse.data.success) {
			// The Turnstile verification was successful
			req.flash("flash", "CAPTCHA	verification unsuccessful.");
			return res.render(`pages/signup`, { session: req.session, cookies: req.cookies });
		}
	} catch (error) {
		console.error('Error verifying Turnstile:', error);
		res.status(500).send('An error occurred while verifying Turnstile.');
	}

	const email = (req.body.email).toLowerCase();

	const userCheck = await db.query(client, "SELECT * FROM users WHERE email=$1 OR username=$2;", [`'${Buffer.from((email).toLowerCase()).toString('base64')}'`, `'${Buffer.from(req.body.username).toString('base64')}'`], res, req);


	if (userCheck.length > 0) {
		req.flash("flash", strings.account.alreadyExists);
		return res.render(`pages/signup`, { session: req.session, cookies: req.cookies });
	}
	// Write to the db
	const { hash: newpass, salt: newsalt } = createPassword(req.body.password);
	await db.query(
		client,
		"INSERT INTO users (email, username, pass, email_link, worksheets_enabled, system_term, alter_term, email_pin, salt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
		[
			`'${base64encode(email)}'`,
			`'${base64encode(req.body.username)}'`,
			newpass, // Hash password with salt
			`'${Math.random().toString(36).substr(2, 16)}'`,
			req.body.ws || true,
			req.body.system_term || "system",
			req.body.alter_term || "alter",
			getRandomInt(1111, 9999),
			newsalt
		],
		res,
		req
	);

	const userDat = await db.query(client, "SELECT * FROM users WHERE email=$1;", [`'${base64encode(email)}'`], res, req);

	ejs.renderFile(`${__dirname}/views/pages/email-welcome.ejs`, { alias: req.body.username || randomise(["Buddy", "Friend", "Pal"]), userid: userDat[0].id }, (err, data) => {
		if (err) {
			console.log(err);
		} else {
			const mailOptions = { from: '"Lighthouse" <dee_deyes@writelighthouse.com>', to: req.body.email, subject: `Welcome to Lighthouse, ${req.body.username}!`, html: data };
			if (transporter) {
				transporter.sendMail(mailOptions, (error) => {
					if (error) {
						return console.log(error);
					}
				});
			} else {
				console.log("Email skipped: gmail_pass is not configured.");
			}
		}
	});

	req.session.alter_term = userDat[0].alter_term;
	req.session.system_term = userDat[0].system_term;
	req.session.subsystem_term = userDat[0].subsystem_term;
	req.session.innerworld_term = userDat[0].innerworld_term;
	req.session.plural_term = userDat[0].plural_term;
	req.session.loggedin = true;
	req.session.u_id = userDat[0].id;
	req.session.username = Buffer.from(userDat[0].username, 'base64').toString();
	req.session.is_legacy = userDat[0].is_legacy;
	req.session.font = userDat[0].font;

	res
		.cookie('loggedin', true, { maxAge: twoWeeks, httpOnly: true })
		.cookie('username', Buffer.from(userDat[0].username, 'base64').toString(), { maxAge: twoWeeks, httpOnly: true })
		.cookie('u_id', userDat[0].id, { maxAge: twoWeeks, httpOnly: true })
		.cookie('alter_term', userDat[0].alter_term, { maxAge: twoWeeks, httpOnly: true })
		.cookie('system_term', userDat[0].system_term, { maxAge: twoWeeks, httpOnly: true })
		.cookie('subsystem_term', userDat[0].subsystem_term, { maxAge: twoWeeks, httpOnly: true })
		.cookie('innerworld_term', userDat[0].innerworld_term, { maxAge: twoWeeks, httpOnly: true })
		.cookie('plural_term', userDat[0].plural_term, { maxAge: twoWeeks, httpOnly: true })
		.cookie('is_legacy', userDat[0].is_legacy, { maxAge: twoWeeks, httpOnly: true })
		.cookie('skin', userDat[0].skin, { maxAge: twoWeeks, httpOnly: true })
		.redirect("/tutorial");


});

// DEV MODE PAGES
if (process.env.environment == "dev") {
	app.get("/dev-test", (req, res) => {
		res.send("Congrats! You found a dev-only page.")
	})

}

app.use((err, req, res, next) => {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	errorPage(500, res, req, res.locals.error);
	next(err)
});

app.use((req, res) => {
	res.status(404).render(`pages/404`, { session: req.session, code: "Not Found", cookies: req.cookies });
});

// End pages.
app.listen(PORT, async (res, req) => {
	const rn = await db.query(client, "SELECT NOW();", [], res, req);
	console.log(`⚓ Docked at Port ${PORT}. The time is ${(rn[0].now).toLocaleString('en-GB', { timeZone: 'EST' })}\nOpen in browser: http://localhost:${PORT}/`)
});

