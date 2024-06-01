// Alters Router
const express = require('express');
const router = express.Router();
const db = require('./db');
const tuning= require('./js/genVars.js');
const alterTypes= tuning.alterTypes;
const dayNames= tuning.dayNames;
const monthNames= tuning.monthNames;
const client= db.client;
const crypto= require('crypto');
const CryptoJS = require("crypto-js");

const { isLoggedIn, getCookies, apiEyesOnly, encryptWithAES, decryptWithAES, forbidUser, 
  lostPage, idCheck, isNumberOrUuid, paginate, checkUUID, truncate, parseIp, capitalise, 
  getKeyByValue, compareByGroup, splitByGroup, randomise, getRandomInt, generateToken, 
  stripHTML, sortFunction, makeString, distill, getOrdinal, base64encode, base64decode, 
  truncateAndStringify, renderNestedList, getSystems } = require("./funcs.js");


router.get("/alter/edit-journal/:id", async (req, res)=>{
    if (isLoggedIn(req)){
      let journCheck = await db.query(client, "SELECT systems.user_id FROM systems INNER JOIN journals ON journals.sys_id = systems.sys_id WHERE journals.alt_id = $1;", [`${req.params.id}`], res, req);
      if (!idCheck(req, journCheck[0].user_id)) return lostPage(res, req);

      let journalInfo = await db.query(client, "SELECT journals.*, alters.*, systems.* FROM journals INNER JOIN alters ON journals.alt_id = alters.alt_id INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE journals.alt_id=$1", [`${req.params.id}`], res, req);
      

      res.render(`pages/edit-journal`, { session: req.session, journal:journalInfo[0], cookies:req.cookies });
    } else {
      forbidUser(res, req)
    }
});

router.post("/alter/edit-journal/:id", async (req, res)=>{
  if (isLoggedIn(req)){
    // Is this their alter/their journal?
    let journCheck = await db.query(client, "SELECT systems.user_id FROM systems INNER JOIN journals ON journals.sys_id = systems.sys_id WHERE journals.alt_id = $1;", [`${req.params.id}`], res, req);
    if (!idCheck(req, journCheck[0].user_id)) return lostPage(res, req);

    let isPixel = req.body.ispixel ? true : false;
    if (req.files){
      // They uploaded something-- This is the uploaded skin!
      await db.query(client, "UPDATE journals SET skin_blob=$2, skin_mimetype=$3, img_url=null, skin=1, is_pixelart=$4 WHERE alt_id=$1", [`${req.params.id}`, req.files.imgupload.data, req.files.imgupload.mimetype, isPixel], res, req);
    } else if (req.body.imgurl){
      // They put in a URL
      await db.query(client, "UPDATE journals SET skin_blob=null, skin_mimetype=null, img_url=$2, skin=1, is_pixelart=$3 WHERE alt_id=$1", [`${req.params.id}`, `${encryptWithAES(req.body.imgurl)}`, isPixel], res, req);
    } else if (req.body.journ) {
      // They picked a preset.
      await db.query(client, "UPDATE journals SET skin_blob=null, skin_mimetype=null, img_url=null, skin=$2, is_pixelart=true WHERE alt_id=$1", [`${req.params.id}`, `${req.body.journ}`], res, req);
    } 

    return res.redirect(`/alter/${req.params.id}`)

  } else {
    forbidUser(res, req);
  }
})

  // Refactored!
  router.get("/alter/:id", async function(req, res){
    if (!checkUUID(req.params.id)) return lostPage(res, req);
     if (isLoggedIn(req)){
      // Get Alter.
      const altInfo= await db.query(client, `SELECT alter_moods.*, alters.*, systems.sys_alias, systems.user_id, systems.subsys_id AS "parentsys" FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1`, [`${req.params.id}`], res, req);
      var selectedAlt= altInfo[0];
      // Before going any further-- Check that the alter's user ID and the actual requester's user ID matches.
      if (!idCheck(req, selectedAlt.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });
  
      req.session.chosenAlt= selectedAlt;
  
      // If they have a mood reason, decrypt that now.
      try{
        if (selectedAlt.reason){
          selectedAlt.reason = `${decryptWithAES(selectedAlt.reason)}`;
        }
      } catch (e){
        // No mood.
      }
      
      // Grab journal info.
      const journQuer= await db.query(client, "SELECT * FROM journals WHERE alt_id=$1;", [`${req.params.id}`], res, req);
      var altJournal= journQuer[0];
      // If we have none, make a placeholder.
      let skin;
      if (!altJournal){
          skin= {
             val: "1",
             c: "Red",
             group: 1,
             ext: "png"
          };
        } else {
          skin = (tuning.journals).filter(jn => jn.val == (altJournal.skin).replace(/'/g, ""));
  
        }
      // Grab all systems.
      req.session.sysList= await db.query(client, "SELECT * FROM systems WHERE user_id=$1;", [`${getCookies(req)['u_id']}`], res, req);
      
      if (selectedAlt.is_archived==true){
        // This alter is archived.
        var archivedPosts= new Array();
        try{
          // This is in the try/catch because altJournal.j_id won't always exist.
          const postQuer= await db.query(client, "SELECT * FROM posts WHERE j_id=$1 ORDER BY created_on DESC;", [`${altJournal.j_id}`], res, req);
          postQuer.forEach(post=>{
          archivedPosts.push({
            id: post.p_id,
            title: decryptWithAES(post.title),
            body: decryptWithAES(post.body),
            created_on: post.created_on
          })
        })
        } catch(e){
          // Keep archivedPosts empty.
        }
        res.render(`pages/archived-alter`, { session: req.session, cookies:req.cookies, alterTypes:alterTypes, alterInfo:selectedAlt, altJournal:altJournal, archivedPosts:archivedPosts });
      } else {
        // Just render alter ejs.
        res.render(`pages/alter`, { session: req.session, cookies:req.cookies, alterTypes:alterTypes, alterInfo:selectedAlt, altJournal:altJournal, skin: skin[0] });
      }
     } else {
      forbidUser(res, req);
     }
    });
    router.get("/archive-alter/:id", (req, res, next)=>{
      if (!checkUUID(req.params.id)) return lostPage(res, req);
      if (isLoggedIn(req)){
        client.query({text: "SELECT alters.* FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
          if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
          } else {
            let chosenAlter = result.rows[0];
            res.render(`pages/archive-alter`, { session: req.session, cookies:req.cookies, alterTypes:alterTypes,chosenAlter:chosenAlter });
          }
        });
      } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
      }
     });
    
      router.get("/edit-alter/:id", async function (req, res, next){
      if (!checkUUID(req.params.id)) return lostPage(res, req);
      if (isLoggedIn(req)){
        let sysInfo= await getSystems(getCookies(req)['u_id'], res, req)
        let altInfo= await db.query(client, "SELECT alters.*, systems.sys_alias, systems.user_id FROM alters INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1", [`${req.params.id}`], res, req);
        let chosenAlter= altInfo[0];
        if (!idCheck(req, chosenAlter.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });
        res.render(`pages/edit_alter`, { session: req.session, cookies:req.cookies, alterTypes:alterTypes,chosenAlter:chosenAlter, sysInfo: sysInfo });
    
      } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
      }
     });
     router.get("/mood/:id", (req, res, next)=>{
      if (!checkUUID(req.params.id)) return lostPage(res, req);
      if (isLoggedIn(req)){
        client.query({text: "SELECT alters.name, alters.alt_id, alters.sys_id, alter_moods.* FROM alters LEFT JOIN alter_moods ON alters.alt_id = alter_moods.alt_id WHERE alters.alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
          if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
          } else {
            let chosenAlter = result.rows[0];
            if (chosenAlter.reason){
            chosenAlter.reason = `${decryptWithAES(result.rows[0].reason)}`;
            }
            res.render(`pages/set_mood`, { session: req.session, cookies:req.cookies, alterTypes:alterTypes,chosenAlter:chosenAlter });
          }
        });
      } else {
        res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
      }
     });
     router.get("/del-mood/:id", (req, res, next)=>{
      if (!checkUUID(req.params.id)) return lostPage(res, req);
      if (isLoggedIn(req)){
        client.query({text: "DELETE FROM alter_moods WHERE alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
          if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
          } else {
            // Redirect to the alter's page!
            res.redirect(`/alter/${req.params.id}`);
          }
        });
      }
    });
    
      router.get('/journal/:id', async (req, res)=>{
      if (!checkUUID(req.params.id)) return lostPage(res, req);
       if (isLoggedIn(req)){
        const journalDat = await db.query(client, "SELECT journals.*, alters.*, systems.sys_alias, systems.user_id FROM journals INNER JOIN alters ON journals.alt_id= alters.alt_id INNER JOIN systems ON systems.sys_id = alters.sys_id WHERE alters.alt_id=$1;", [`${req.params.id}`], res, req);
        if ( journalDat.length < 1 || journalDat[0].user_id !== getCookies(req)['u_id'] ){
          return res.status(404).render('pages/404',{ session: req.session, code:"Not Found", cookies:req.cookies });
        }
        let alterInfo= {
          alt_id: journalDat[0].alt_id,
          name: base64decode(journalDat[0].name),
          sys_alias: base64decode(journalDat[0].sys_alias),
          sys_id: journalDat[0].sys_id,
          journId: journalDat[0].j_id
        }
        res.render('pages/journal',{ session: req.session, cookies:req.cookies, alterInfo:alterInfo })
       } else {
         res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
       }
      });
    
      router.get('/journal/:id/delete', (req, res)=>{
      if (!checkUUID(req.params.id)) return lostPage(res, req);
        if (isLoggedIn(req)){
          client.query({text: "SELECT * FROM posts WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
           if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
          } else {
            // console.log(result.rows[0]);
            // if (getCookies(req)['u_id'] !== result.rows[0].u_id) return res.status(404).render('pages/404',{ session: req.session, code:"Not Found", cookies:req.cookies }); //False 404 to avoid any further penetration attacks
            req.session.jPost= result.rows[0];
            req.session.jPost.body= decryptWithAES(req.session.jPost.body);
            req.session.jPost.title= decryptWithAES(req.session.jPost.title);
            res.render(`pages/delete_post`, { session: req.session, cookies:req.cookies });
          }
        });
        } else {
          res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
        }
    
      });
    
      router.get('/journal/:id/edit', (req, res)=>{
      if (!checkUUID(req.params.id)) return lostPage(res, req);
        if (isLoggedIn(req)){
          client.query({text: "SELECT posts.*, journals.alt_id FROM posts INNER JOIN journals ON posts.j_id= journals.j_id WHERE p_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
           if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
          } else {
            res.render(`pages/edit_post`, { session: req.session, cookies:req.cookies, cJourn: {id: result.rows[0].p_id, body: decryptWithAES(result.rows[0].body), title: decryptWithAES(result.rows[0].title), is_comm: false, date: result.rows[0].created_on}, journalID: result.rows[0].j_id, alt_id:result.rows[0].alt_id, });
          }
        });
        } else {
          res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
        }
    
    
      });
      
      router.get('/alter/:id/delete', (req, res)=>{
        if (!checkUUID(req.params.id)) return lostPage(res, req);
        if (isLoggedIn(req)){
          client.query({text: "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1;",values: [`${req.params.id}`]}, (err, result) => {
             if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
            } else {
              let chosenAlter= result.rows[0];
              if (!idCheck(req, chosenAlter.user_id)) return res.status(404).render(`pages/404`, { session: req.session, code:"Not Found", cookies:req.cookies });
              // No alter?
              if (!result.rows[0]) return res.status(400).render('pages/400',{ session: req.session, code:"Database Error", cookies:req.cookies });
              res.render(`pages/delete_alter`, { session: req.session, cookies:req.cookies,chosenAlter: chosenAlter});
            }
            
          });
        } else {
          res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
        }
    
      });

      router.post('/alter/:id/delete', async function (req, res){
        if (!checkUUID(req.params.id)) return lostPage(res, req);
        if (isLoggedIn(req)){
          let chosenAlt= await db.query(client, "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1", [req.params.id], res, req);
          if (!idCheck(req, chosenAlt[0].user_id)) return res.status(404).send("Not found");
    
          client.query({text: "DELETE FROM posts WHERE p_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
             if (err) {
              console.log(err.stack);
              res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
            } else {
              client.query({text: "DELETE FROM journals WHERE alt_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
                 if (err) {
                  console.log(err.stack);
                  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
                } else {
                  client.query({text: "DELETE FROM alters WHERE alt_id=$1; ",values: [`${req.params.id}`]}, (err, result) => {
                     if (err) {
                      console.log(err.stack);
                      res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
                    } else {
                      res.redirect(`/system/${req.body.sysid}`);
                    }
                  });
                }
              });
            }
          });
        } else {
          res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
        }
      });

      router.post("/alter/:id", async function(req, res){
        if (!checkUUID(req.params.id)) return lostPage(res, req);
          let pass= req.body.jPass || null;
          if (isLoggedIn(req)){
            let chosenAlt= await db.query(client, "SELECT alters.*, systems.sys_id, systems.user_id FROM alters INNER JOIN systems on alters.sys_id=systems.sys_id WHERE alters.alt_id=$1", [req.params.id], res, req);
            if (!idCheck(req, chosenAlt[0].user_id)) return res.status(404).send("Not found");
    
            if (req.body.create){
              // Create
              client.query({text: "INSERT INTO journals (alt_id, password, is_private, skin, sys_id) VALUES ($1, $2, $3, $4, $5)",values: [`${req.params.id}`, `'${CryptoJS.SHA3(req.body.jPass)}'`, `${req.body.priv}`, `'${req.body.journ}'`, `${req.body.sys_id}`]}, (err, result) => {
                if (err) {
                  console.log(err.stack);
                  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request"});
                } else {
                  res.redirect(`/alter/${req.params.id}`);
                }
              });
            } else if (req.body.modify){
              // Edit alter.
                client.query({text: "UPDATE alters SET sys_id=$1, name=$2 WHERE alt_id=$3;",values: [req.body.alterSys, `'${Buffer.from(req.body.altname).toString('base64')}'`, req.params.id]}, (err, result) => {
                  if (err) {
                    console.log(err.stack);
                    res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
                  } else {
                    res.redirect(`/alter/${req.params.id}`);
                  }
                });
            } else if (req.body.changePass){
              // Change alter password.
              client.query({text: "UPDATE journals SET password=$1 WHERE alt_id=$2;",values: [`'${CryptoJS.SHA3(req.body.jPassNew)}'`, req.params.id]}, (err, result) => {
                if (err) {
                  console.log(err.stack);
                  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
                } else {
                  res.redirect(`/alter/${req.params.id}`);
                }
              });
            } else if (req.body.newjournalSkin){
              // Change journal skin.
              let newskin= req.body.skin.split(",");
              client.query({text: "UPDATE journals SET skin=$1 WHERE alt_id=$2;",values: [newskin[0], req.params.id]}, (err, result) => {
                if (err) {
                  console.log(err.stack);
                  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
                } else {
                  res.redirect(`/alter/${req.params.id}`);
                }
              });
            } else if (req.body.unlock){
              client.query({text: "UPDATE journals SET is_private=false WHERE alt_id=$1;",values: [req.params.id]}, (err, result) => {
                if (err) {
                  console.log(err.stack);
                  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
                } else {
                  res.redirect(`/alter/${req.params.id}`);
                }
              });
            } else if(req.body.lockJournal){
              client.query({text: "UPDATE journals SET password=$2, is_private=true WHERE alt_id=$1;",values: [req.params.id, `'${CryptoJS.SHA3(req.body.journalPassword)}'`]}, (err, result) => {
                if (err) {
                  console.log(err.stack);
                  res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
                } else {
                  res.redirect(`/alter/${req.params.id}`);
                }
              });
            } else {
              // Login
              client.query({text: "SELECT password FROM journals WHERE alt_id=$1",values: [`${req.params.id}`]}, (err, result) => {
                if (err) {
                console.log(err.stack);
                res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
              } else {
                // res.redirect(`/alter/${req.params.id}`);
              if (result.rows[0].password == `'${CryptoJS.SHA3(req.body.logPass)}'`){
                req.session.journalUser= req.params.id;
                res.redirect(`/journal/${req.params.id}`);
              } else {
                res.redirect(`/alter/${req.params.id}`);
              }
              }
            });
    
            }
          } else {
            res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
          }
      });
      router.post("/edit-alter/:id", async (req, res, next)=>{
        if (!checkUUID(req.params.id)) return lostPage(res, req);
    
        if (isLoggedIn(req)){
          // Is this their alter tho?
          let altInf= await db.query(client, "SELECT systems.user_id FROM systems INNER JOIN alters ON alters.sys_id = systems.sys_id WHERE alters.alt_id = $1;", [`${req.params.id}`], res, req);
          if (!idCheck(req, altInf[0].user_id)) return lostPage(res, req);
    
          // Ok, this is their alter. Proceed.
          let pkId= req.body.pkid ? `${encryptWithAES(req.body.pkid)}` : null;
          let spId= req.body.spid ? `${encryptWithAES(req.body.spid)}` : null;
          if (req.files){
            
            if (req.files.imgupload){
              // This is for the icons!
              await db.query(client, "UPDATE alters SET img_blob=$2, blob_mimetype=$3, img_url=null WHERE alt_id=$1", [`${req.params.id}`,
              req.body.clear ? null : req.files.imgupload.data,
              req.body.clear ? null : req.files.imgupload.mimetype], 
              res, req);
            }
            
            if (req.files.headeralt){
              // This is for the header!
              await db.query(client, "UPDATE alters SET header_blob=$2, header_mimetype=$3 WHERE alt_id=$1", [`${req.params.id}`,
              req.files.headeralt.data,
              req.files.headeralt.mimetype], 
              res, req);
            }
          } 
            await db.query(client, "UPDATE alters SET name=$2, triggers_pos=$3, triggers_neg= $4, agetext=$5, likes=$6, dislikes=$7, job=$8, safe_place=$9, wants=$10, acc=$11, notes=$12, img_url=$13, type=$14, pronouns=$15, birthday=$16, first_noted=$17, gender=$18, sexuality=$19, source=$20, fronttells=$21, relationships=$22, hobbies=$23, appearance=$24, colour=$25, nickname=$26, species=$27, pk_id=$28, sp_id=$29 WHERE alt_id=$1", [
              `${req.params.id}`,
              `'${Buffer.from(req.body.name).toString('base64')}'`,
              `'${Buffer.from(req.body.postr).toString('base64')}'`,
              `'${Buffer.from(req.body.negtr).toString('base64')}'`,
              `'${Buffer.from(req.body.age).toString('base64')}'`,
              `'${Buffer.from(req.body.likes).toString('base64')}'`,
              `'${Buffer.from(req.body.dislikes).toString('base64')}'`,
              `'${Buffer.from(req.body.internalJob).toString('base64')}'`,
              `'${Buffer.from(req.body.safety).toString('base64')}'`,
              `'${Buffer.from(req.body.wish).toString('base64')}'`,
              `'${Buffer.from(req.body.acc).toString('base64')}'`,
              `'${Buffer.from(req.body.notes).toString('base64')}'`,
              `'${Buffer.from(req.body.imgurl).toString('base64')}'`,
              req.body.type,
              `'${Buffer.from(req.body.pronouns).toString('base64')}'`,
              `'${Buffer.from(req.body.birthday).toString('base64')}'`,
              `'${Buffer.from(req.body.firstnoted).toString('base64')}'`,
              `'${Buffer.from(req.body.gender).toString('base64')}'`,
              `'${Buffer.from(req.body.sexuality).toString('base64')}'`,
              `'${Buffer.from(req.body.source).toString('base64')}'`,
              `'${Buffer.from(req.body.fronttells).toString('base64')}'`,
              `'${Buffer.from(req.body.relationships).toString('base64')}'`,
              `'${Buffer.from(req.body.hobbies).toString('base64')}'`,
              `'${Buffer.from(req.body.appearance).toString('base64')}'`,
              req.body.colour,
              `'${Buffer.from(req.body.nickname).toString('base64')}'`,
              `'${Buffer.from(req.body.species).toString("base64")}'`,
              pkId,
              spId,
            ], res, req);
            if (req.body.clear){
              await db.query(client, "UPDATE alters SET  img_blob=null, blob_mimetype=null WHERE alt_id=$1", [`${req.params.id}`], res, req);
            }
            if (req.body.headersclear){
                await db.query(client, "UPDATE alters SET  header_blob=null, header_mimetype=null WHERE alt_id=$1", [`${req.params.id}`], res, req);
              }
          
          let otherSystems;
          if (typeof req.body.othersys == "string"){
            // Make an array
            otherSystems = new Array(req.body.othersys);
          } else if(typeof req.body.othersys == "undefined"){
            otherSystems = new Array(5).fill(null)
          } else {
            otherSystems= req.body.othersys
          }
          try{
            let totalLength = otherSystems.length <= 6 ? otherSystems.length : 6;
          const finalSystem = otherSystems.slice(0, 6).concat(Array(6 - totalLength ).fill(null));
    
          // Let's update their systems if need be
          for (let i = 1; i < 6; i++) {
              await db.query(client, `UPDATE alters SET subsys_id${i}=$2 WHERE alt_id=$1`, [`${req.params.id}`, finalSystem[i-1]], res, req);
            
          }
          } catch(e){
            console.log(e)
          }
          
          
          
          
          req.flash("flash","Page updated!");
          res.redirect(`/alter/${req.params.id}`);
          
        } else {
          res.status(403).render('pages/403',{ session: req.session, code:"Forbidden", cookies:req.cookies });
        }
    
        
      });
console.log(`Alters Router Loaded.`);
module.exports = router;