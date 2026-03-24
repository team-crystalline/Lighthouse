// System Router
const express = require("express");
const router = express.Router();
const db = require("../db.js");
const client = db.client;
const crypto = require("crypto");
const CryptoJS = require("crypto-js");
var strings = require("../lang/en.json");
const {
    isLoggedIn,
    getCookies,
    apiEyesOnly,
    encryptWithAES,
    decryptWithAES,
    getRandomInt,
    base64decode,
} = require("../funcs.js");


/**
 * I'm throwing rocks at past us for making this a swiss army knife of a route.
 * Almost 300 lINES HERE
 */
router.get("/system-data", async function (req, res, next) {
	if (isLoggedIn(req)) {
	  if (apiEyesOnly(req)) {
		if (req.headers.grab == "comm-posts") {
		  // Communal Journal Posts.
  
		  const sysInfo = await db.query(
			client,
			"SELECT * FROM systems WHERE user_id=$1",
			[`${getCookies(req)["u_id"]}`],
			res,
			req,
			false
		  );
		  const nonPinInfo = await db.query(
			client,
			"SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false ORDER BY created_on DESC;",
			[`${getCookies(req)["u_id"]}`],
			res,
			req
		  );
		  const pinInfo = await db.query(
			client,
			"SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false ORDER BY created_on DESC;",
			[`${getCookies(req)["u_id"]}`],
			res,
			req
		  );
  
		  let sysArr = sysInfo.map((system) => {
			return {
			  sys_id: system.sys_id,
			  alias: base64decode(system.sys_alias),
			  icon: system.icon,
			  subsys: system.subsys_id,
			};
		  });
  
		  let nonPinned = nonPinInfo.map((post) => {
			return {
			  title: decryptWithAES(post.title),
			  body: decryptWithAES(post.body),
			  created_on: post.created_on,
			  id: post.id,
			};
		  });
		  let isPinned = pinInfo.map((post) => {
			return {
			  title: decryptWithAES(post.title),
			  body: decryptWithAES(post.body),
			  created_on: post.created_on,
			  id: post.id,
			};
		  });
		  console.log(sysInfo);
  
		  res.json({
			code: 200,
			sysArr: sysArr,
			nonPinned: nonPinned,
			isPinned: isPinned,
		  });
		} else if (req.headers.grab == "alters") {
		  // Fetch alters
		  let altInfo = await db.query(
			client,
			"SELECT * FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id=$1;",
			[`${getCookies(req)["u_id"]}`],
			res,
			req
		  );
		  let resArr = new Array();
		  altInfo.forEach((alt) => {
			resArr.push({
			  alt_id: alt.alt_id,
			  sys_id: alt.sys_id,
			  name:
				alt.name != null
				  ? Buffer.from(alt.name, "base64").toString()
				  : null,
			  acc:
				alt.acc != null
				  ? Buffer.from(alt.acc, "base64").toString()
				  : null,
			  agetext:
				alt.agetext != null
				  ? Buffer.from(alt.agetext, "base64").toString()
				  : null,
			  birthday:
				alt.birthday != null
				  ? Buffer.from(alt.birthday, "base64").toString()
				  : null,
			  dislikes:
				alt.dislikes != null
				  ? Buffer.from(alt.dislikes, "base64").toString()
				  : null,
			  first_noted:
				alt.first_noted != null
				  ? Buffer.from(alt.first_noted, "base64").toString()
				  : null,
			  fronttells:
				alt.fronttells != null
				  ? Buffer.from(alt.fronttells, "base64").toString()
				  : null,
			  gender:
				alt.gender != null
				  ? Buffer.from(alt.gender, "base64").toString()
				  : null,
			  img_url:
				alt.img_url != null
				  ? Buffer.from(alt.img_url, "base64").toString()
				  : null,
			  job:
				alt.job != null
				  ? Buffer.from(alt.job, "base64").toString()
				  : null,
			  likes:
				alt.likes != null
				  ? Buffer.from(alt.likes, "base64").toString()
				  : null,
			  sexuality:
				alt.sexuality != null
				  ? Buffer.from(alt.sexuality, "base64").toString()
				  : null,
			  source:
				alt.source != null
				  ? Buffer.from(alt.source, "base64").toString()
				  : null,
			  sys_alias: Buffer.from(alt.sys_alias, "base64").toString(),
			  triggers_neg:
				alt.triggers_neg != null
				  ? Buffer.from(alt.triggers_neg, "base64").toString()
				  : null,
			  triggers_pos:
				alt.triggers_pos != null
				  ? Buffer.from(alt.triggers_pos, "base64").toString()
				  : null,
			  type: alt.type,
			  wants:
				alt.wants != null
				  ? Buffer.from(alt.wants, "base64").toString()
				  : null,
			  pronouns:
				alt.pronouns != null
				  ? Buffer.from(alt.pronouns, "base64").toString()
				  : null,
			  relationships:
				alt.relationships != null
				  ? Buffer.from(alt.relationships, "base64").toString()
				  : null,
			  notes:
				alt.notes != null
				  ? Buffer.from(alt.notes, "base64").toString()
				  : null,
			  safe_place:
				alt.safe_place != null
				  ? Buffer.from(alt.safe_place, "base64").toString()
				  : null,
			  is_archived: alt.is_archived,
			  img_blob:
				alt.img_blob != null
				  ? Buffer.from(alt.img_blob).toString("base64")
				  : null,
			  blob_mimetype: alt.blob_mimetype,
			});
		  });
		  res.status(200).json({ code: 200, search: resArr });
		} else if (req.headers.grab == "journals") {
		  client.query(
			{
			  text: "SELECT systems.sys_id, alters.name, alters.is_archived, journals.j_id FROM alters INNER JOIN systems ON systems.sys_id= alters.sys_id INNER JOIN journals ON journals.alt_id = alters.alt_id WHERE systems.user_id=$1;",
			  values: [`${getCookies(req)["u_id"]}`],
			},
			(err, aresult) => {
			  if (err) {
				console.log(err.stack);
				req.flash("Our database hit an error.");
				res.status(400).json({ code: 400 });
			  } else {
				let journalArr = new Array();
				for (i in aresult.rows) {
				  journalArr.push({
					j_id: aresult.rows[i].j_id,
					sys_id: aresult.rows[i].sys_id,
					name: Buffer.from(aresult.rows[i].name, "base64").toString(),
					is_archived: aresult.rows[i].is_archived,
				  });
				}
				res.status(200).json({ code: 200, search: journalArr });
			  }
			}
		  );
		} else if (req.headers.grab == "journalPosts") {
		  const journalPostInfo = await db.query(
			client,
			"SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;",
			[`${req.headers.uuid}`],
			res,
			req,
			false
		  );
		  let journalPosts = {
			pinned: [],
			nonpin: [],
		  };
  
		  journalPosts.pinned = journalPostInfo
			.map((post) => {
			  if (post.is_pinned == true) {
				return {
				  title: post.title ? decryptWithAES(post.title) : "",
				  body: post.body ? decryptWithAES(post.body) : "",
				  createdon: post.created_on,
				  id: post.p_id,
				  feeling: post.feeling ? decryptWithAES(post.feeling) : "",
				};
			  }
			})
			.filter(Boolean);
  
		  journalPosts.nonpin = journalPostInfo
			.map((post) => {
			  if (post.is_pinned == false) {
				return {
				  title: post.title ? decryptWithAES(post.title) : "",
				  body: post.body ? decryptWithAES(post.body) : "",
				  createdon: post.created_on,
				  id: post.p_id,
				  feeling: post.feeling ? decryptWithAES(post.feeling) : "",
				};
			  }
			})
			.filter(Boolean);
  
		  journalPosts.pinned = journalPosts.pinned.filter(Boolean); // Remove undefined.
		  journalPosts.nonpin = journalPosts.nonpin.filter(Boolean); // Remove undefined.
  
		  res.status(200).json({ code: 200, search: journalPosts });
		} else if (req.headers.grab == "subsystems") {
		  client.query(
			{
			  text: "SELECT * FROM systems WHERE user_id=$1 AND subsys_id= $2;",
			  values: [`${getCookies(req)["u_id"]}`, `${req.headers.sysid}`],
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
				let subArr = new Array();
				for (i in result.rows) {
				  subArr.push({
					name: Buffer.from(
					  result.rows[i].sys_alias,
					  "base64"
					).toString(),
					icon: result.rows[i].icon,
					sys_id: result.rows[i].sys_id,
				  });
				}
				res.status(200).json({ code: 200, systems: subArr });
			  }
			}
		  );
		} else if (req.headers.grab == "systems") {
		  client.query(
			{
			  text: "SELECT * FROM systems WHERE user_id=$1;",
			  values: [`${getCookies(req)["u_id"]}`],
			},
			(err, result) => {
			  if (err) {
				console.log(err.stack);
				req.flash("Our database hit an error.");
				res.status(400).json({ code: 400 });
			  } else {
				var sysArr = new Array();
				for (i in result.rows) {
				  sysArr.push({
					sys_id: result.rows[i].sys_id,
					alias: Buffer.from(
					  result.rows[i].sys_alias,
					  "base64"
					).toString(),
					icon: result.rows[i].icon,
					subsys: result.rows[i].subsys_id,
				  });
				}
				res.status(200).json({ code: 200, systems: sysArr });
			  }
			}
		  );
		} else {
		  res
			.status(406)
			.json({
			  code: 406,
			  msg: "Not Acceptable. (Check grab headers on front and back ends.)",
			});
		}
	  } else return res.status(403);
	} else return res.status(403);
  });

  router.put("/system-data", async function (req, res) {
	if (isLoggedIn(req)) {
	  if (apiEyesOnly(req)) {
		let editMode = req.body.edit;
		if (editMode == "pin") {
		  let postID = req.body.postID;
		  await db.query(
			client,
			"UPDATE comm_posts SET is_pinned = NOT is_pinned WHERE id=$1;",
			[postID],
			res,
			req
		  );
		  return res.status(200).json({ code: 200 });
		} else if (editMode == "journalPin") {
		  let postID = req.body.postID;
		  await db.query(
			client,
			"UPDATE posts SET is_pinned = NOT is_pinned WHERE p_id=$1;",
			[postID],
			res,
			req
		  );
		  return res.status(200).json({ code: 200 });
		} else if (editMode == "pluralkit-system") {
		  // Create a new system if user requests in Pluralkit import
		  var newSys = "Imported from Pluralkit";
		  client.query(
			{
			  text: "SELECT sys_id FROM systems WHERE sys_alias=$1 AND user_id=$2;",
			  values: [
				`'${Buffer.from(newSys).toString("base64")}'`,
				`${getCookies(req)["u_id"]}`,
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
				if (result.rows.length > 0) {
				  newSys += ` ${getRandomInt(111, 999)}`;
				}
				// Create a new system
				client.query(
				  {
					text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",
					values: [
					  `'${Buffer.from(newSys).toString("base64")}'`,
					  `${getCookies(req)["u_id"]}`,
					],
				  },
				  (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400);
					} else {
					  // Grab its ID.
					  client.query(
						{
						  text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2;",
						  values: [
							`'${Buffer.from(newSys).toString("base64")}'`,
							`${getCookies(req)["u_id"]}`,
						  ],
						},
						(err, fresult) => {
						  if (err) {
							console.log(err.stack);
							res.status(400);
						  } else {
							res
							  .status(200)
							  .json({
								code: 200,
								sys_id: fresult.rows[0].sys_id,
							  });
						  }
						}
					  );
					}
				  }
				);
			  }
			}
		  );
		} else if (editMode == "pluralkit-alter") {
		  // Place selected alters in database.
		  let altName =
			req.body.name == null
			  ? `'${Buffer.from("New alter").toString("base64")}'`
			  : `'${Buffer.from(req.body.name).toString("base64")}'`;
		  let altPro =
			req.body.pronouns == null
			  ? null
			  : `'${Buffer.from(req.body.pronouns).toString("base64")}'`;
		  let altBirth =
			req.body.birthday == null
			  ? null
			  : `'${Buffer.from(req.body.birthday).toString("base64")}'`;
		  let altAva =
			req.body.avatar == null
			  ? `'${Buffer.from(
				  "https://www.writelighthouse.com/img/avatar-default.jpg"
				).toString("base64")}'`
			  : `'${Buffer.from(req.body.avatar).toString("base64")}'`;
		  let altpk =
			req.body.avatar == null ? null : `${encryptWithAES(req.body.pk_id)}`;
		  client.query(
			{
			  text: "INSERT INTO alters (name, sys_id, pronouns, birthday, img_url, pk_id) VALUES($1, $2, $3, $4, $5, $6);",
			  values: [altName, req.body.sysId, altPro, altBirth, altAva, altpk],
			},
			(err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400);
			  } else {
				res.status(200).json({ code: 200 });
			  }
			}
		  );
		} else if (editMode == "sp-system") {
		  // Create a new system if user requests in Pluralkit import
		  var newSys = "Imported from Simply Plural";
		  client.query(
			{
			  text: "SELECT sys_id FROM systems WHERE sys_alias=$1 AND user_id=$2;",
			  values: [
				`'${Buffer.from(newSys).toString("base64")}'`,
				`${getCookies(req)["u_id"]}`,
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
				if (result.rows.length > 0) {
				  newSys += ` ${getRandomInt(111, 999)}`;
				}
				// Create a new system
				client.query(
				  {
					text: "INSERT INTO systems (sys_alias, user_id) VALUES ($1, $2)",
					values: [
					  `'${Buffer.from(newSys).toString("base64")}'`,
					  `${getCookies(req)["u_id"]}`,
					],
				  },
				  (err, result) => {
					if (err) {
					  console.log(err.stack);
					  res.status(400);
					} else {
					  // Grab its ID.
					  client.query(
						{
						  text: "SELECT * FROM systems WHERE sys_alias=$1 AND user_id=$2;",
						  values: [
							`'${Buffer.from(newSys).toString("base64")}'`,
							`${getCookies(req)["u_id"]}`,
						  ],
						},
						(err, fresult) => {
						  if (err) {
							console.log(err.stack);
							res.status(400);
						  } else {
							res
							  .status(200)
							  .json({
								code: 200,
								sys_id: fresult.rows[0].sys_id,
							  });
						  }
						}
					  );
					}
				  }
				);
			  }
			}
		  );
		} else if (editMode == "sp-alter") {
		  // Place selected alters in database.
		  let altName =
			req.body.name == null
			  ? `'${Buffer.from("New alter").toString("base64")}'`
			  : `'${Buffer.from(req.body.name).toString("base64")}'`;
		  let altPro =
			req.body.pronouns == null
			  ? null
			  : `'${Buffer.from(req.body.pronouns).toString("base64")}'`;
		  let altBirth =
			req.body.birthday == null
			  ? null
			  : `'${Buffer.from(req.body.birthday).toString("base64")}'`;
		  let altAva =
			req.body.avatar == null
			  ? `'${Buffer.from(
				  "https://www.writelighthouse.com/img/avatar-default.jpg"
				).toString("base64")}'`
			  : `'${Buffer.from(req.body.avatar).toString("base64")}'`;
		  let altNotes =
			req.body.notes == null
			  ? null
			  : `'${Buffer.from(req.body.notes).toString("base64")}'`;
		  client.query(
			{
			  text: "INSERT INTO alters (name, sys_id, pronouns, img_url, colour, notes) VALUES($1, $2, $3, $4, $5, $6);",
			  values: [
				altName,
				req.body.sysId,
				altPro,
				altAva,
				req.body.colour,
				altNotes,
			  ],
			},
			(err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400);
			  } else {
				res.status(200).json({ code: 200 });
			  }
			}
		  );
		} else if (editMode == "add-ph-alter") {
		  // Place placeholder alters in database.
		  let iconNo =
			"https://www.writelighthouse.com/img/" + getRandomInt(1, 42) + ".png";
		  client.query(
			{
			  text: "INSERT INTO alters (name, sys_id, img_url, gender) VALUES($1, $2, $3, $4);",
			  values: [
				`'${Buffer.from(req.body.altName).toString("base64")}'`,
				req.body.sysid,
				`'${Buffer.from(iconNo).toString("base64")}'`,
				`'${Buffer.from(req.body.gender).toString("base64")}'`,
			  ],
			},
			(err, result) => {
			  if (err) {
				console.log(err.stack);
				res.status(400);
			  } else {
				res.status(200).json({ code: 200 });
			  }
			}
		  );
		} else if (editMode == "add-comb-alter") {
		  // Place fused alter into database.
		  /*
					  "sys_id": $("#sysLoc").val(),
					  "name": $("#newname").val(),
					  "pronouns": $("#newpro").val() == "" ? "" : $("#newpro").val(),
					  "type": $("#newtype").val() == "" ? "" : $("#newtype").val(),
					  "alts": aArr,
					  "method": method,
					  "names": fusedNames
					  */
		  var listOfAlts = `Data combined from ${req.body.names}.`;
		  const altId = await db.query(
			client,
			'SELECT uuid_generate_v4() AS "newid"',
			[],
			res,
			req
		  );
		  const sysId = req.body.sys_id;
		  const newId = altId[0].newid;
		  const newAlt = await db.query(
			client,
			"INSERT INTO alters (alt_id, name, sys_id, pronouns, type, notes) VALUES ($1, $2, $3, $4, $5, $6)",
			[
			  newId,
			  `'${Buffer.from(req.body.name).toString("base64")}'`,
			  sysId,
			  `'${Buffer.from(req.body.pronouns).toString("base64")}'`,
			  req.body.type,
			  `'${Buffer.from(listOfAlts).toString("base64")}'`,
			],
			res,
			req
		  );
  
		  // Now what did the user want us to do with the other alts?
		  for (i in req.body.alts) {
			if (req.body.method == "archive") {
			  // Archive the alter.
			  await db.query(
				client,
				"UPDATE alters SET is_archived=true WHERE alt_id=$1",
				[req.body.alts[i]],
				res,
				req
			  );
			} else if (req.body.method == "delete") {
			  // Delete the alter.
			  await db.query(
				client,
				"DELETE FROM alters WHERE alt_id=$1",
				[req.body.alts[i]],
				res,
				req
			  );
			} else if (req.body.method == "combine-del") {
			  // Combine and delete the alters.
  
			  try {
				// Get the old alt's id
				var oldJournQ = await db.query(
				  client,
				  "SELECT j_id FROM journals WHERE alt_id=$1",
				  [req.body.alts[i]],
				  res,
				  req
				);
				var oldJourn = oldJournQ[0].j_id;
  
				// Make this new alt a journal.
				await db.query(
				  client,
				  "INSERT INTO journals(alt_id, skin, sys_id) VALUES($1, $2, $3)",
				  [newId, "1", sysId],
				  res,
				  req
				);
				var newJourn = await db.query(
				  client,
				  "SELECT j_id FROM journals WHERE alt_id=$1;",
				  [newId],
				  res,
				  req
				);
				var journId = newJourn[0].j_id;
  
				await db.query(
				  client,
				  "UPDATE posts SET j_id=$1 WHERE j_id=$2;",
				  [journId, oldJourn],
				  res,
				  req
				);
			  } catch (e) {
				// console.log(e)
			  }
			  // Let's set data to the new alter.
			  await db.query(
				client,
				"UPDATE threads SET alt_id=$1 WHERE alt_id=$2;",
				[newId, req.body.alts[i]],
				res,
				req
			  );
			  await db.query(
				client,
				"UPDATE thread_posts SET alt_id=$1 WHERE alt_id=$2;",
				[newId, req.body.alts[i]],
				res,
				req
			  );
			  // Now delete the alter.
			  await db.query(
				client,
				"DELETE FROM alters WHERE alt_id=$1",
				[req.body.alts[i]],
				res,
				req
			  );
			} else if (req.body.method == "combine-arch") {
			  // Combine and archive.
			  try {
				// Get the old alt's id
				var oldJournQ = await db.query(
				  client,
				  "SELECT j_id FROM journals WHERE alt_id=$1",
				  [req.body.alts[i]],
				  res,
				  req
				);
				var oldJourn = oldJournQ[0].j_id;
  
				// Make this new alt a journal.
				await db.query(
				  client,
				  "INSERT INTO journals(alt_id, skin, sys_id) VALUES($1, $2, $3)",
				  [newId, "1", sysId],
				  res,
				  req
				);
				var newJourn = await db.query(
				  client,
				  "SELECT j_id FROM journals WHERE alt_id=$1",
				  [newId],
				  res,
				  req
				);
				var journId = newJourn[0].j_id;
				await db.query(
				  client,
				  "UPDATE posts SET j_id=$1 WHERE j_id=$2;",
				  [journId, oldJourn],
				  res,
				  req
				);
			  } catch (e) {
				// console.log(e)
			  }
			  // Let's set data to the new alter.
			  await db.query(
				client,
				"UPDATE threads SET alt_id=$1 WHERE alt_id=$2;",
				[newId, req.body.alts[i]],
				res,
				req
			  );
			  await db.query(
				client,
				"UPDATE thread_posts SET alt_id=$1 WHERE alt_id=$2;",
				[newId, req.body.alts[i]],
				res,
				req
			  );
  
			  // Now archive the alter.
			  await db.query(
				client,
				"UPDATE alters SET is_archived=true WHERE alt_id=$1",
				[req.body.alts[i]],
				res,
				req
			  );
			} else if (req.body.method == "combine-noth") {
			  // Combine only, nothing else.
			  try {
				// Get the old alt's id
				var oldJournQ = await db.query(
				  client,
				  "SELECT j_id FROM journals WHERE alt_id=$1",
				  [req.body.alts[i]],
				  res,
				  req
				);
				var oldJourn = oldJournQ[0].j_id;
  
				// Make this new alt a journal.
				await db.query(
				  client,
				  "INSERT INTO journals(alt_id, skin, sys_id) VALUES($1, $2, $3)",
				  [newId, "1", sysId],
				  res,
				  req
				);
				var newJourn = await db.query(
				  client,
				  "SELECT j_id FROM journals WHERE alt_id=$1",
				  [newId],
				  res,
				  req
				);
				var journId = newJourn[0].j_id;
				await db.query(
				  client,
				  "UPDATE posts SET j_id=$1 WHERE j_id=$2;",
				  [journId, oldJourn],
				  res,
				  req
				);
			  } catch (e) {
				// console.log(e)
			  }
			  // Let's set data to the new alter.
			  await db.query(
				client,
				"UPDATE threads SET alt_id=$1 WHERE alt_id=$2;",
				[newId, req.body.alts[i]],
				res,
				req
			  );
			  await db.query(
				client,
				"UPDATE thread_posts SET alt_id=$1 WHERE alt_id=$2;",
				[newId, req.body.alts[i]],
				res,
				req
			  );
			} else {
			  // Do nothing
			}
		  }
		  return res.status(200).json({ code: 200 });
		}
	  } else {
		return res.status(403).json({ code: 403 });
	  }
	} else {
	  return res.status(403).json({ code: 403 });
	}
  });

  console.log("The Worst Router Of This App loaded (System Data)");
  module.exports = router;