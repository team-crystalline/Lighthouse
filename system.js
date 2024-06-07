// System Router
const express = require('express');
const router = express.Router();
const db = require('./db');
const client= db.client;
const crypto= require('crypto');
const CryptoJS = require("crypto-js");
var strings= require("./lang/en.json");

const {
isLoggedIn,
  getCookies,
  encryptWithAES,
  forbidUser,
  lostPage,
  idCheck,
  paginate,
  checkUUID,
  base64encode} = require("./funcs.js")


// Refactoring
router.get('/', async function(req, res) {
    if (isLoggedIn(req)){
		const innerWorlds= await db.query(client, "SELECT inner_worlds from USERS WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.innerworld = innerWorlds[0].inner_worlds || false;
		const worksheets= await db.query(client, "SELECT worksheets_enabled from USERS WHERE id=$1;", [getCookies(req)['u_id']], res, req);
		req.session.worksheets_enabled = worksheets[0].worksheets_enabled || false;

		const systemData = await db.query(client, "SELECT * FROM systems WHERE user_id=$1", [getCookies(req)['u_id']], res, req);

		const alterData= await db.query(client, "SELECT alters.name, systems.sys_id FROM alters INNER JOIN systems ON alters.sys_id = systems.sys_id WHERE systems.user_id = $1;", [getCookies(req)['u_id']], res, req);

		let systemMap = new Array();
		systemData.forEach((sys)=>{
			systemMap.push({
				id: sys.sys_id,
				alias: sys.sys_alias,
				icon: sys.icon,
				parent: sys.subsys_id,
				description: sys.description
			})
		})
		  
		  
		res.status(200).render('pages/system',{ session: req.session, cookies:req.cookies, system: systemMap, alters: alterData});
    } else {
        forbidUser(res, req);
    }
  });


  router.get("/communal-journal", async function(req, res){
    // If there's an id provided, it's a system communal journal. Grab based on user id AND sys_id
    // If no id provided, just grab from their user id.
    if (isLoggedIn(req)){
        let commJournInfo;
        let pinnedComm;
        let sysChoice= req.query.sys || null; 
        let pageNumber = req.query.pg || 1;
        if (!sysChoice){
          // This is the regular communal journal. 
          commJournInfo = await db.query(client, "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=false AND system_id IS NULL ORDER BY created_on DESC;", [getCookies(req)['u_id']], res, req);

          pinnedComm = await db.query(client, "SELECT * FROM comm_posts WHERE u_id=$1 AND is_pinned=true AND system_id IS NULL ORDER BY created_on DESC;", [getCookies(req)['u_id']], res, req);

        } else {
          // This is a system journal-- Do ID checks before we grab posts.
          const sysCheck = await db.query(client, "SELECT sys_id FROM systems WHERE user_id=$1", [getCookies(req)['u_id']], res, req);
          const sysList = sysCheck.map(obj => obj.sys_id);
          if (!(sysList.includes(sysChoice))) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies }); 

          // Grab posts.
          commJournInfo = await db.query(client, "SELECT * FROM comm_posts WHERE system_id=$1 AND is_pinned=false ORDER BY created_on DESC;", [`${sysChoice}`], res, req); // non-pinned posts
          pinnedComm = await db.query(client, "SELECT * FROM comm_posts WHERE system_id=$1 AND is_pinned=true ORDER BY created_on DESC;", [`${sysChoice}`], res, req); // pinned posts.

          // Grab system information.
          const sysInfo = await db.query(client, "SELECT * FROM systems WHERE sys_id=$1", [`${sysChoice}`], res, req);
          req.session.chosenSystem= sysInfo[0]
        }
        let entries = paginate(commJournInfo, 25)
        let finalPage= entries.length;
        // Now... Is the requested page higher than the final page?
        if (pageNumber > finalPage) pageNumber= finalPage;
        res.status(200).render(`pages/commjourn`, { session: req.session, cookies: req.cookies, posts: entries, pinned:pinnedComm, pageNum: pageNumber, sysChoice:sysChoice, finalPage: finalPage });
        // res.send("<h1>Communal Journal</h1>")

    } else {
        forbidUser(res, req);
    }
})

/*
  _____          _     _____                            _       
 |  __ \        | |   |  __ \                          | |      
 | |__) |__  ___| |_  | |__) |___  __ _ _   _  ___  ___| |_ ___ 
 |  ___/ _ \/ __| __| |  _  // _ \/ _` | | | |/ _ \/ __| __/ __|
 | |  | (_) \__ \ |_  | | \ \  __/ (_| | |_| |  __/\__ \ |_\__ \
 |_|   \___/|___/\__| |_|  \_\___|\__, |\__,_|\___||___/\__|___/
                                     | |                        
                                     |_|                        
  Keywords (for easy searching): post requests, post, requests
*/


router.post("/communal-journal", async function(req, res){
  let sysChoice= req.query.sys;
  let isPinned = req.body.ispinned == 'on' ? true : false;
  if (!sysChoice){
    // Standard Communal Journal post.
    await db.query(client, "INSERT INTO comm_posts (u_id, title, body, is_pinned) VALUES ($1, $2, $3, $4);", [getCookies(req)['u_id'], `${encryptWithAES(req.body.title)}`, `${encryptWithAES(req.body.body)}`, `${isPinned}`], res, req);
    res.status(304).redirect("/system/communal-journal");
  } else {
    // ID check.
    const sysInfo = await db.query(client, "SELECT sys_id FROM systems WHERE user_id=$1", [getCookies(req)['u_id']], res, req);
    const sysList = sysInfo.map(obj => obj.sys_id);
    if (!(sysList.includes(sysChoice))) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found",cookies:req.cookies }); 

    // Passed the check, so proceed to enter the data.
    await db.query(client, "INSERT INTO comm_posts (u_id, title, body, is_pinned, system_id) VALUES ($1, $2, $3, $4, $5);", [getCookies(req)['u_id'], `${encryptWithAES(req.body.title)}`, `${encryptWithAES(req.body.body)}`, `${isPinned}`, `${req.body.sysid}`], res, req);
    res.status(304).redirect(`/system/communal-journal?sys=${sysChoice}`);
  }
  
});

router.get('/:id/:pg?', async function(req, res, next){
	if (!checkUUID(req.params.id)) return lostPage(res, req);
    if (isLoggedIn(req)){
		if (!req.session.worksheets_enabled){
			// Quick, add that.
			const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
			req.session.worksheets_enabled= wsEn[0].worksheets_enabled;
		}
		const sysMap= await db.query(client, "SELECT systems.sys_id, systems.subsys_id, systems.user_id, systems.sys_alias, alters.alt_id, systems.icon, systems.description FROM systems LEFT JOIN alters ON systems.sys_id = alters.sys_id WHERE systems.sys_id=$1 ORDER BY alters.name ASC", [`${req.params.id}`], res, req);
		if (!idCheck(req, sysMap[0].user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });
		req.session.chosenSys= sysMap[0];
		if (req.session.chosenSys.subsys_id != null){
			// There's a subsystem.
			const subsysInf= await db.query(client, "SELECT sys_alias FROM systems WHERE sys_id=$1", [`${req.session.chosenSys.subsys_id}`], res, req);
			req.session.chosenSys.subsys_alias= subsysInf[0].sys_alias || getCookies(req)['system_term'];
		}
			const numUp= await db.query(client, "SELECT altupnum FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);

			const alters = await db.query(client, "SELECT alters.alt_id, alters.img_url, alters.sys_id, alters.name, alters.pronouns, alter_moods.mood, alters.is_archived, alters.img_blob, alters.blob_mimetype, alters.colour FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.sys_id = $1 OR (alters.subsys_id1 = $1::text OR alters.subsys_id2 = $1::text OR alters.subsys_id3 = $1::text OR alters.subsys_id4 = $1::text OR alters.subsys_id5 = $1::text) ORDER BY alters.name ASC;", [`${req.params.id}`], res, req);
			req.session.alters=[]
			alters.forEach((alter) =>{
				req.session.alters.push({
					name: Buffer.from(alter.name, 'base64').toString(), 
						id: alter.sys_id, 
						a_id: alter.alt_id, 
						mood: alter.mood, 
						pronouns: alter.pronouns, 
						is_archived: alter.is_archived, 
						icon: alter.img_url || "aHR0cHM6Ly93d3cud3JpdGVsaWdodGhvdXNlLmNvbS9pbWcvYXZhdGFyLWRlZmF1bHQuanBn",
						img_blob: alter.img_blob,
						mimetype: alter.blob_mimetype,
						colour: alter.colour
				})
			});
			let altCount= req.session.alters.length;
			(req.session.alters).sort((a, b) => a.name.localeCompare(b.name))
			req.session.alters= paginate(req.session.alters, Number(numUp[0].altupnum))
			res.render(`pages/sys_info`, { session: req.session,  alterArr: req.session.alters[req.params.pg -1 || 0],cookies:req.cookies, sys_id: req.params.id, pgCount: req.session.alters.length, altCount: altCount, curPage: req.params.pg || 1, numup: Number(numUp[0].altupnum), currentSys: req.params.id});

    } else {
		forbidUser(res, req)
    }
    
  });


	router.post("/:alt/:pg?", function(req, res){
		if (!checkUUID(req.params.alt)) return;
		// Post system
			if (isLoggedIn(req)){
				if (req.body.sysid){
					let sysId= req.body.sysid == "none" ? null : req.body.sysid;
					// Setting this in case they want to release a subsystem into a normal system.
					client.query({text: "UPDATE systems SET subsys_id=$2 WHERE sys_id=$1",values: [`${req.params.alt}`, sysId]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					  }
					  
				  });
				  req.flash("flash",strings.system.updated);
				}
				if (req.body.journ){
					client.query({text: "UPDATE systems SET icon=$2 WHERE sys_id=$1",values: [`${req.params.alt}`, `${req.body.journ}`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					  }
					  
				  });
				  req.flash("flash",strings.system.updated);
				}
				if (req.body.submit){
					client.query({text: "INSERT INTO alters (sys_id, name) VALUES ($1, $2)",values: [`${req.params.alt}`, `'${Buffer.from(req.body.altname).toString('base64')}'`]}, (err, result) => {
						if (err) {
						  console.log(err.stack);
						  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
					  }
					  
				  });
				  req.flash("flash",strings.alter.created);
				}
				res.redirect(`/system/${req.params.alt}/`);
				

			} else {
				res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
			}
	});


	router.post('/', async function (req, res){

		if (req.body.sysname){

		  let subsysID= req.body.subsys == "None" ? null : req.body.subsys;
		  await db.query(client, "INSERT INTO systems (sys_alias, user_id, subsys_id, description) VALUES ($1, $2, $3, $4)", [`'${base64encode(req.body.sysname)}'`, `${getCookies(req)['u_id']}`, subsysID, `${encryptWithAES(req.body.sysdesc)}`], res, req);
			return res.redirect(`/system`);

		} else if (req.body.post) {
			// Comm journal.
			// id | u_id | created_on | title | body
			client.query({text: "INSERT INTO comm_posts (u_id, created_on, title, body) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4)",values: [`${getCookies(req)['u_id']}`, `${Date.now()}`, `${encryptWithAES(req.body.cTitle)}`, `${encryptWithAES(req.body.cBody)}`]}, (err, result) => {
				if (err) {
				  console.log(err.stack);
				  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			  } else {
				  res.redirect("/system");
			  }
		  });
		} else {
		  // Deleting.
		  client.query({text: "DELETE FROM comm_posts WHERE id=$1; ",values: [getKeyByValue(req.body,"Remove")]}, (err, result) => {
			  if (err) {
				 console.log(err.stack);
				 res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			 } else {
				 req.session.jPost= null;
				 res.redirect(`/system`);
			 }
		 });
		}
	});
  


console.log(`System Router Loaded.`);
module.exports = router;