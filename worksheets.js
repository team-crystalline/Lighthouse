// Worksheets Router
const express = require('express');
const router = express.Router();
const db = require('./db');
const client= db.client;
const crypto= require('crypto');
const CryptoJS = require("crypto-js");
var strings= require("./lang/en.json");
const ejs = require('ejs');
const path = require('path');
const PORT = process.env.PORT || 5000;
const fs = require('fs');
var pdf = require("html-pdf");


const { isLoggedIn, getCookies, apiEyesOnly, encryptWithAES, decryptWithAES, forbidUser, 
lostPage, checkUUID } = require("./funcs.js")



// Refactored!
router.get('/worksheets', async function (req, res){
		if (isLoggedIn(req)){
			if (!req.session.worksheets_enabled){
			// Make sure they have worksheets enabled.
			const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
			req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
			if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
		}
		res.render(`pages/worksheets`, { session: req.session, cookies:req.cookies });	
		} else {forbidUser(res,req)}
		
	});

// Refactored!
router.get('/safety-plan', async function(req, res){
if (isLoggedIn(req)){
	console.log(apiEyesOnly(req))
	if(apiEyesOnly(req)){
		const safetyPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
		var user={
					id: safetyPlan[0].user,
					name: getCookies(req)['username'],
					symptoms: decryptWithAES(safetyPlan[0].symptoms),
					safepeople: decryptWithAES(safetyPlan[0].safepeople),
					distractions: decryptWithAES(safetyPlan[0].distractions),
					keepsafe: decryptWithAES(safetyPlan[0].keepsafe),
					gethelp: decryptWithAES(safetyPlan[0].gethelp),
					grounding: decryptWithAES(safetyPlan[0].grounding)
				}
		// Read HTML Template
		let pdfType= req.headers.colour == "colour" ? "safetyplan-pdf-col.ejs" : "safetyplan-pdf-bw.ejs";
		ejs.renderFile(path.join(__dirname, './views/pages/', pdfType), {user: user}, (err, data) => {
			if (err) {
					return res.json({code: 404, msg: `Render File: ${err}`});
			} else {
				let dimensions= (req.headers.dimensions).split(",")
				let options = {
					childProcessOptions: {
						env: {
							OPENSSL_CONF: '/dev/null',
						},
						},
					"height": dimensions[0],
					"width": dimensions[1],
				};
				pdf.create(data, options).toFile(path.join(__dirname, './public/pdfs', `${req.headers.user}.pdf`), function (err, data) {
					if (err) {
						return res.json({code: 404, msg: `Generating: ${err}`});
					} else {
						return res.json({code: 200, download: `${req.headers.user}.pdf`});
					}
				});
			}
		});
		
	} else {
		if (!req.session.worksheets_enabled){
			// Make sure they have worksheets enabled.
			const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
			req.session.worksheets_enabled= wsEn[0].worksheets_enabled;
			if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
		}
			var plans;

			const safetyPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
			if (safetyPlan.length != 0){
				// Plan found
				try{
						plans= {
						symptoms: decryptWithAES(safetyPlan[0].symptoms),
						safepeople: decryptWithAES(safetyPlan[0].safepeople),
						distractions: decryptWithAES(safetyPlan[0].distractions),
						keepsafe: decryptWithAES(safetyPlan[0].keepsafe),
						gethelp: decryptWithAES(safetyPlan[0].gethelp),
						grounding: decryptWithAES(safetyPlan[0].grounding)
					}
				} catch (e){
					plans= null;
				}
			} else {
				// No plan. Make a plan.
				const planMake= await db.query(client, "INSERT INTO safetyplans (u_id) VALUES ($1);", [getCookies(req)['u_id']], res, req);
				plans=null;
			}
			res.render(`pages/safetyplan`, { session: req.session, cookies:req.cookies, safetyplan: plans});
		}	
} else {forbidUser(res,req)}

});

// Refactored!
router.get('/safety-plan/edit', async function (req, res){
if (isLoggedIn(req)){
	let plans;
	// Grab their safety plan
	const safetyPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
	
	if (safetyPlan.length ==0){
		// No plan. Make plan.
		const makePlan= await db.query(client, "INSERT INTO safetyplans (u_id) VALUES($1);", [getCookies(req)['u_id']], res, req);

		// Now grab the new one. This will execute AFTER the insert statement.
		const newPlan= await db.query(client, "SELECT * FROM safetyplans WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
		// Generate the new plan.
		plans= {
			symptoms: decryptWithAES(newPlan[0].symptoms),
			safepeople: decryptWithAES(newPlan[0].safepeople),
			distractions: decryptWithAES(newPlan[0].distractions),
			keepsafe: decryptWithAES(newPlan[0].keepsafe),
			gethelp: decryptWithAES(newPlan[0].gethelp),
			grounding: decryptWithAES(newPlan[0].grounding)
		}
	} else {
		// They got a plan!
		try{
			plans= {
			symptoms: decryptWithAES(safetyPlan[0].symptoms),
			safepeople: decryptWithAES(safetyPlan[0].safepeople),
			distractions: decryptWithAES(safetyPlan[0].distractions),
			keepsafe: decryptWithAES(safetyPlan[0].keepsafe),
			gethelp: decryptWithAES(safetyPlan[0].gethelp),
			grounding: decryptWithAES(safetyPlan[0].grounding)
		}
		} catch (e){
			// If for WHATEVER reason we can't generate a plan.
			plans= {
				symptoms: "",
				safepeople: "",
				distractions: "",
				keepsafe: "",
				gethelp: "",
				grounding: ""
			}
		}
	}
	res.render(`pages/edit-safetyplan`, { session: req.session, cookies:req.cookies, safetyplan: plans});	
} else {forbidUser(res,req)}

});

// Refactored!
router.get('/then-and-now', async function (req, res){
if (isLoggedIn(req)){
if (!req.session.worksheets_enabled){
	// Make sure they have worksheets enabled.
	const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
	req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
	if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
}
res.render(`pages/thenandnow`, { session: req.session, cookies:req.cookies});
} else {forbidUser(res, req)}

});

// Refactored!
router.get('/DES', async function (req, res){
if (isLoggedIn(req)){
if (!req.session.worksheets_enabled){
	// Make sure they have worksheets enabled.
	const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
	req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
	if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
}
res.render(`pages/des`, { session: req.session, cookies:req.cookies});
} else {forbidUser(res, req)}

});

// Refactored!
router.get('/coaxing', async function (req, res){
if (isLoggedIn(req)){
	if (!req.session.worksheets_enabled){
	// Make sure they have worksheets enabled.
	const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
	req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
	if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
}
res.render(`pages/coax-alters`, { session: req.session, cookies:req.cookies });	
} else {forbidUser(res,req)}

})

// Refactored!
router.get('/bottle-letters',async function (req, res){
if (isLoggedIn(req)){
	if (!req.session.worksheets_enabled){
	// Make sure they have worksheets enabled.
	const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
	req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
	if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
}
res.render(`pages/void-letters`, { session: req.session, cookies:req.cookies });	
} else {forbidUser(res,req)}

})

// Refactored!
router.get('/54321', async function (req, res){
if (isLoggedIn(req)){
	if (!req.session.worksheets_enabled){
	// Make sure they have worksheets enabled.
	const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
	req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
	if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
}
res.render(`pages/54321`, { session: req.session, cookies:req.cookies });	
} else {forbidUser(res,req)}

})

router.get('/bda', async function (req, res){
if (isLoggedIn(req)){
	if (apiEyesOnly(req)){
		try{
			const bdaPlans= await db.query(client, "SELECT * FROM bda_plans WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
			const planArr= new Array();
			bdaPlans.forEach(element=>{
				planArr.push({id: element.id, before: decryptWithAES(element.before), during: decryptWithAES(element.during), after: decryptWithAES(element.after), is_active:element.is_active, alias: decryptWithAES(element.alias), timestamp: element.timestamp});
			});
			return res.status(200).json({code:200, body: planArr});
		} catch (e){
			console.log(e)
			return res.status(400).json({code:400})
		}
	} else {
		if (!req.session.worksheets_enabled){
				// Make sure they have worksheets enabled.
				const wsEn= await db.query(client, "SELECT worksheets_enabled FROM users WHERE id=$1;", [getCookies(req)['u_id']], res, req);
				req.session.worksheets_enabled = wsEn[0].worksheets_enabled;
				if (req.session.worksheets_enabled== false) return res.render(`pages/worksheetsdisabled`, { session: req.session, cookies:req.cookies });
			}
		res.render(`pages/bda`, { session: req.session, cookies:req.cookies });
		
	}
	
} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}

});

router.get('/bda/edit/:id', (req, res) => {
if (!checkUUID(req.params.id)) return lostPage(res, req);
if (isLoggedIn(req)){
	client.query({text: "SELECT * FROM bda_plans WHERE id=$1",values: [req.params.id]}, (err, result) => {
		if (err) {
			console.log(err.stack);
			res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
		} else {
		var plan= {
			id: result.rows[0].id,
			name: decryptWithAES(result.rows[0].alias),
			before: decryptWithAES(result.rows[0].before),
			during: decryptWithAES(result.rows[0].during),
			after: decryptWithAES(result.rows[0].after)
		}
		res.render(`pages/edit-bda`, { session: req.session, cookies:req.cookies, plan:plan });
		}
	});
} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
});


router.post('/safety-plan/edit', (req, res) => {
if (isLoggedIn(req)){
	var plans= {
		symptoms: encryptWithAES(req.body.warning),
		safepeople: encryptWithAES(req.body.friends),
		distractions: encryptWithAES(req.body.distract),
		keepsafe: encryptWithAES(req.body.keepsafe),
		gethelp: encryptWithAES(req.body.help),
		grounding: encryptWithAES(req.body.ground)
	};
	client.query({text:'UPDATE safetyplans SET symptoms=$2, safepeople=$3, distractions=$4, keepsafe= $5, gethelp=$6, grounding=$7 WHERE u_id=$1;', values: [getCookies(req)['u_id'], plans.symptoms, plans.safepeople, plans.distractions, plans.keepsafe, plans.gethelp, plans.grounding]}, (err, result) => {
		if (err) {
			console.log(err.stack);
			res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
		} else {
		res.redirect("/safety-plan");
		}
	});
	
} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}

});

router.post('/bda', (req, res)=>{
if (apiEyesOnly(req)){
	if (req.body.create){
		client.query({text: "INSERT INTO bda_plans (u_id, before, during, after, alias, timestamp) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))",values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.before)}`, `${encryptWithAES(req.body.during)}`, `${encryptWithAES(req.body.after)}`, `${encryptWithAES(req.body.name)}`, `${Date.now()}`]}, (err, result) => {
			if (err) {
				console.log(err.stack);
				res.status(400).json({code: 400, message: err.stack});
			} else {
			return res.status(200).json({code:200});
			}
			});
	}
} else {
	return res.status(403).json({code:403})
}

});

router.post('/bda/edit/:id', (req, res) => {
if (!checkUUID(req.params.id)) return lostPage(res, req);
if (isLoggedIn(req)){
	if (req.body.planname){
		client.query({text: "UPDATE bda_plans SET alias=$2,before=$3,during=$4,after=$5 WHERE id=$1;",values: [`${req.params.id}`, `${encryptWithAES(req.body.planname)}`,`${encryptWithAES(req.body.planbefore)}`,`${encryptWithAES(req.body.planduring)}`,`${encryptWithAES(req.body.planafter)}`]}, (err, result) => {
			if (err) {
				console.log(err.stack);
				res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
			}
			});
	req.flash("flash", "Plan Updated!");
	res.redirect("/bda");		
	}			
} else {res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });}
});



router.delete('/safety-plan', (req, res)=>{
if (apiEyesOnly(req)){
	var filePath = `./public/pdfs/${req.headers.user}.pdf`; 
	fs.unlinkSync(filePath);
	return res.json({code:200});
}
});

router.delete('/bda', (req, res)=>{
// Delete this post
if (apiEyesOnly(req)){
	if (req.body.delete){
		client.query({text: "DELETE FROM bda_plans WHERE id=$2 AND u_id=$1;",values: [getCookies(req)['u_id'], req.body.id]}, (err, result) => {
			if (err) {
				console.log(err.stack);
				res.status(400).json({code: 400, message: err.stack});
			} else {
			return res.status(200).json({code:200});
			}
			});
	}
} else {
	return res.status(403).json({code:403})
}

});
console.log(`Worksheets Router Loaded.`);
module.exports = router;