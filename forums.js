// Static Pages Router
const express = require('express');
const router = express.Router();
const db = require('./db');
const client = db.client;
const crypto = require('crypto');
const CryptoJS = require("crypto-js");
var strings = require("./lang/en.json");


const { getCookies, apiEyesOnly, encryptWithAES, decryptWithAES, idCheck, paginate, sortFunction, authUser, validateParam } = require("./funcs.js")

// Refactored!
router.get('/forum/:id/new', validateParam('id'), authUser, async function (req, res) {
    const forumData = await db.query(client, "SELECT * FROM forums WHERE u_id=$1;", [getCookies(req)['u_id']], res, req);
    let forumList = new Array();
    forumData.forEach(element => {
        forumList.push({
            id: element.id,
            name: decryptWithAES(element.topic)
        })
    });
    res.render(`pages/create_topic`, { session: req.session, cookies: req.cookies, forumLisT: forumList });
});

router.get('/forum/:id/:pg?', validateParam('id'), authUser, async function (req, res) {

    try {
        // Get Forum Name
        let forumInfo = await db.query(client, "SELECT * FROM forums WHERE u_id=$1 AND id=$2;", [getCookies(req)['u_id'], req.params.id], res, req);
        let topicInfo = await db.query(client, 'SELECT threads.*, alters.name AS "alt_name" FROM threads INNER JOIN alters ON alters.alt_id = threads.alt_id WHERE threads.u_id=$1 AND topic_id=$2  ORDER BY created_on DESC;', [getCookies(req)['u_id'], req.params.id], res, req);
        let topics = new Array();
        topicInfo.forEach((topic) => {
            topics.push({
                name: decryptWithAES(topic.title),
                preview: decryptWithAES(topic.body),
                alt_id: topic.alt_id,
                is_sticky: topic.is_sticky,
                is_locked: topic.is_locked,
                is_popular: topic.is_popular,
                created_on: topic.created_on,
                id: topic.id,
                alter: Buffer.from(topic.alt_name, "base64").toString(),
                topic_id: topic.topic_id
            })
        });
        let blurryThreads = await db.query(client, "SELECT * from threads WHERE u_id=$1 AND alt_id is null AND topic_id=$2 ORDER BY created_on DESC;", [getCookies(req)['u_id'], req.params.id], res, req);
        blurryThreads.forEach((topic) => {
            topics.push({
                name: decryptWithAES(topic.title),
                preview: decryptWithAES(topic.body),
                alt_id: null,
                is_sticky: topic.is_sticky,
                is_locked: topic.is_locked,
                is_popular: topic.is_popular,
                created_on: topic.created_on,
                id: topic.id,
                alter: "Blurry",
                topic_id: topic.topic_id
            })
        });
        topics.sort(sortFunction).reverse();
        let topicArr = paginate(topics, 25);
        let categoryInfo = await db.query(client, "SELECT * FROM categories WHERE u_id=$1", [getCookies(req)['u_id']], res, req);
        let catArr = new Array();
        categoryInfo.forEach((cat) => {
            catArr.push({
                id: cat.id,
                name: decryptWithAES(cat.name)
            })
        });
        res.render(`pages/topics`, { session: req.session, cookies: req.cookies, topics: topicArr[req.params.pg - 1 || 0], forumName: decryptWithAES(forumInfo[0].topic), forumDesc: decryptWithAES(forumInfo[0].description), forumid: forumInfo[0].id, catArr: catArr, topicPages: topicArr.length, currPage: req.params.pg || 1, forum: req.params.id });
    } catch (e) {
        res.status(404).render('pages/404', { session: req.session, code: "Not Found", cookies: req.cookies });
    }


});

router.get('/forum', authUser, (req, res) => {
    client.query({ text: "SELECT * FROM categories WHERE u_id=$1 ORDER BY f_order, created_on ASC;", values: [getCookies(req)['u_id']] }, (err, result) => {
        if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        } else {
            let categories = new Array();
            for (i in result.rows) {
                categories.push({ name: decryptWithAES(result.rows[i].name), desc: decryptWithAES(result.rows[i].description), icon: result.rows[i].icon, id: result.rows[i].id, order: result.rows[i].f_order });
            }
            // var forums= new Array();
            var forums = []; // Empty this array or create it.
            client.query({ text: "SELECT * FROM forums WHERE u_id=$1;", values: [getCookies(req)['u_id']] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                } else {
                    for (i in result.rows) {
                        forums.push(
                            {
                                name: decryptWithAES(result.rows[i].topic),
                                desc: decryptWithAES(result.rows[i].description),
                                cat_id: result.rows[i].cat_id,
                                id: result.rows[i].id
                            });


                    }
                    res.render(`pages/forum`, { session: req.session, cookies: req.cookies, categories: categories, forums: forums });
                }

            });

        }
    });


});
router.get('/topic/:id/:pg?', validateParam('id'), authUser, (req, res) => {
    client.query({ text: "SELECT threads.*, forums.topic FROM threads INNER JOIN forums ON threads.topic_id= forums.id WHERE threads.u_id=$1 AND threads.id=$2;", values: [getCookies(req)['u_id'], req.params.id] }, (err, result) => {
        if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        } else {
            // Here's the OP post
            /* issue */
            if (result.rows.length == 0){
                return lostPage(res, req);
            }
            let originalPost = {
                id: result.rows[0].id,
                title: decryptWithAES(result.rows[0].title),
                body: decryptWithAES(result.rows[0].body),
                created_on: result.rows[0].created_on,
                alt_id: result.rows[0].alt_id,
                is_sticky: result.rows[0].is_sticky,
                is_popular: result.rows[0].is_popular,
                is_locked: result.rows[0].is_locked,
                forum_name: decryptWithAES(result.rows[0].topic),
                topic_id: result.rows[0].topic_id
            }
            client.query({ text: "SELECT * FROM thread_posts WHERE thread_id=$1 ORDER BY created_on ASC;", values: [req.params.id] }, (err, aresult) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                } else {
                    // Replies
                    let replyArr = new Array();
                    for (i in aresult.rows) {
                        replyArr.push({
                            body: decryptWithAES(aresult.rows[i].body),
                            alt_id: aresult.rows[i].alt_id,
                            created_on: aresult.rows[i].created_on,
                            id: aresult.rows[i].id
                        });
                    }
                    // console.log(`${replyArr.length} replies.`);
                    var replyPages = paginate(replyArr, 15);
                    var finalPage = replyPages.length;
                    if (req.params.pg) {
                        if (req.params.pg > finalPage) req.params.pg = finalPage;
                        if (req.params.pg < 1) req.params.pg = 1;
                    }
                    replyArr = replyPages[req.params.pg - 1 || 0];

                    // console.log(`Post pagination: ${replyArr.length} replies loading.`);
                    client.query({
                        text: `
				SELECT alters.*, alters.alt_id AS "altid", systems.sys_alias, alter_moods.* FROM alters 
				INNER JOIN systems ON alters.sys_id = systems.sys_id 
				LEFT OUTER JOIN alter_moods ON alters.alt_id = alter_moods.alt_id 
				WHERE systems.user_id=$1`, values: [`${getCookies(req)['u_id']}`]
                    }, (err, bresult) => {
                        if (err) {
                            console.log(err.stack);
                            res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                        } else {
                            // Get alters
                            let alterArr = new Array();

                            for (i in bresult.rows) {
                                alterArr.push({
                                    id: bresult.rows[i].altid,
                                    name: Buffer.from(bresult.rows[i].name, "base64").toString(),
                                    pronouns: bresult.rows[i].pronouns ? Buffer.from(bresult.rows[i].pronouns, "base64").toString() : null,
                                    type: bresult.rows[i].type,
                                    avatar: Buffer.from(bresult.rows[i].img_url, "base64").toString() || "",
                                    sys_alias: bresult.rows[i].sys_alias == null ? "Null" : Buffer.from(bresult.rows[i].sys_alias, "base64").toString(),
                                    is_archived: bresult.rows[i].is_archived,
                                    img_blob: bresult.rows[i].img_blob,
                                    mimetype: bresult.rows[i].blob_mimetype,
                                    colour: bresult.rows[i].colour,
                                    mood: bresult.rows[i].mood,
                                    reason: bresult.rows[i].reason ? decryptWithAES(bresult.rows[i].reason) : null,
                                    colourEnabled: bresult.rows[i].colour_enabled,
                                    outlineEnabled: bresult.rows[i].outline_enabled,
                                    outline: bresult.rows[i].outline,
                                })

                            }
                            client.query({ text: "SELECT * FROM forums WHERE u_id=$1;", values: [`${getCookies(req)['u_id']}`] }, (err, cresult) => {
                                if (err) {
                                    console.log(err.stack);
                                    res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                                } else {
                                    let forumArr = new Array();
                                    for (i in cresult.rows) {
                                        forumArr.push({ id: cresult.rows[i].id, topic: decryptWithAES(cresult.rows[i].topic), description: decryptWithAES(cresult.rows[i].description) })
                                    }
                                    res.render(`pages/thread`, { session: req.session, cookies: req.cookies, originalPost: originalPost, replyArr: replyArr, alterArr: alterArr, forumArr: forumArr, finalPage: finalPage, topic: req.params.id, currPage: req.params.pg || 1 });
                                }
                            });
                        }

                    });

                }
            });
        }
    });

});

router.get('/reply/:id', validateParam('id'), authUser, async function (req, res) {

    let threadInfo = await db.query(client, "SELECT thread_posts.*, threads.u_id FROM thread_posts INNER JOIN threads ON thread_posts.thread_id = threads.id WHERE thread_posts.id=$1", [`${req.params.id}`], res, req);
    if (!idCheck(req, threadInfo[0].u_id)) return res.status(404).render(`pages/404`, { session: req.session, code: "Not Found", cookies: req.cookies });
    res.render(`pages/edit_reply`, { session: req.session, cookies: req.cookies, chosenReply: { id: threadInfo[0].id, body: decryptWithAES(threadInfo[0].body), alt_id: threadInfo[0].alt_id, thread_id: threadInfo[0].thread_id } });

});



router.get('/forum-data', authUser, (req, res, next) => {
    if (apiEyesOnly(req)) {
        // No browser access.
        var blurry = Buffer.from("Blurry").toString("base64")
        if (req.headers.get == "latestPost") {
            // Get the latest post from a forum.
            client.query({ text: `SELECT threads.*, alters.* FROM threads LEFT JOIN alters ON threads.alt_id = alters.alt_id WHERE threads.topic_id = $1 ORDER BY created_on DESC LIMIT 1;`, values: [req.headers.forumid] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                } else {
                    if (result.rows.length > 0) {
                        res.json({
                            code: 200,
                            thread_id: result.rows[0].id,
                            alt_id: result.rows[0].alt_id,
                            name: Buffer.from(result.rows[0].name || blurry, "base64").toString(),
                            title: decryptWithAES(result.rows[0].title),
                            date: result.rows[0].created_on
                        })
                    } else {
                        res.json({
                            code: 404
                        })
                    }

                }

            });
        } else if (req.headers.get == "latestReply") {
            // get the latest post from a thread.
            client.query({ text: `SELECT COUNT(thread_posts.id) FROM thread_posts WHERE thread_posts.thread_id=$1;`, values: [req.headers.threadid] }, (err, aresult) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                } else {
                    let replyCount = aresult.rows[0].count || 0;
                    // console.log(replyCount)
                    client.query({ text: `SELECT alters.alt_id, alters.name, thread_posts.created_on, thread_posts.id FROM alters INNER JOIN thread_posts ON thread_posts.alt_id=alters.alt_id WHERE thread_posts.thread_id=$1 ORDER BY thread_posts.created_on DESC LIMIT 1;`, values: [req.headers.threadid] }, (err, result) => {
                        if (err) {
                            console.log(err.stack);
                            res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                        } else {
                            if (result.rows.length > 0) {
                                res.json({
                                    code: 200,
                                    reply_count: replyCount || 0,
                                    thread_id: result.rows[0].id,
                                    alt_id: result.rows[0].alt_id,
                                    name: Buffer.from(result.rows[0].name, "base64").toString(),
                                    date: result.rows[0].created_on
                                })
                            } else {
                                res.json({
                                    code: 404
                                })
                            }

                        }

                    });

                }
            });

        }


    } else {
        return res.json({ code: 403 }).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies });;
    }
})

router.post('/forum/:id/new', validateParam('id'), authUser, (req, res) => {
    let postAuth = req.body.author == "blur" ? null : req.body.author;
    client.query({ text: "INSERT INTO threads (u_id, topic_id, title, body, alt_id) VALUES ($1, $2, $3, $4, $5);", values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.fTitle)}`, `${encryptWithAES(req.body.topicBody)}`, postAuth] }, (err, result) => {
        if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        } else {
            client.query({ text: "SELECT * FROM threads WHERE u_id=$1 ORDER BY created_on DESC;", values: [getCookies(req)['u_id']] }, (err, bresult) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                } else {
                    req.flash("flash", "Topic posted!");
                    res.redirect(301, `/topic/${bresult.rows[0].id}`); // Redirects to the topic

                }
            });
        }
    });

});

router.post('/reply/:id', validateParam('id'), authUser, (req, res) => {
    let postAuth = req.body.replyauthor == "blur" ? null : req.body.replyauthor;
    client.query({ text: "UPDATE thread_posts SET body=$2, alt_id=$3 WHERE id=$1;", values: [`${req.params.id}`, `${encryptWithAES(req.body.editor3)}`, postAuth] }, (err, result) => {
        if (err) {
            console.log(err.stack);
            res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
        } else {
            req.flash("flash", "Reply edited!");
            res.redirect(`/topic/${req.body.threadid}`);
        }
    });

});

router.post('/topic/:id/:pg?', validateParam('id'), authUser, (req, res) => {
    if (req.body.newtop) {
        let postAuth = req.body.replyauthor == "blur" ? null : req.body.replyauthor;
        client.query({ text: "INSERT INTO thread_posts (alt_id, body, thread_id) VALUES ($1, $2, $3)", values: [postAuth, `${encryptWithAES(req.body.reply)}`, req.params.id] }, (err, result) => {
            if (err) {
                console.log(err.stack);
                res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
            } else {
                req.flash("flash", "Reply posted!");
                // Let's redirect them to the page they were on.
                res.redirect(301, `/topic/${req.params.id}/${req.body.pagenum}`);
            }
        })
    } else if (req.body.editop) {
        let postAuth = req.body.author == "blur" ? null : `${req.body.author}`;
        client.query({
            text: "UPDATE threads SET title=$3, body=$4, topic_id=$5, alt_id=$6 WHERE u_id=$1 AND id=$2", values: [
                getCookies(req)['u_id'],
                req.params.id,
                `${encryptWithAES(req.body.newtitle)}`,
                `${encryptWithAES(req.body.newbody)}`,
                req.body.topicforum,
                postAuth
            ]
        }, (err, result) => {
            if (err) {
                console.log(err.stack);
                res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
            } else {
                req.flash("flash", "Thread updated!");
                res.redirect(301, `/topic/${req.params.id}`);
            }
        })
    }

});
router.post('/forum/:id', validateParam('id'), authUser, (req, res) => {
    if (req.body.newtop) {
        client.query({ text: "INSERT INTO threads (u_id, topic_id, title, body, alt_id) VALUES ($1, $2, $3, $4, $5);", values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.fTitle)}`, `${encryptWithAES(req.body.topicBody)}`, req.body.author] }, (err, result) => {
            if (err) {
                console.log(err.stack);
                res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
            } else {
                client.query({ text: "SELECT * FROM threads WHERE u_id=$1 ORDER BY created_on DESC;", values: [getCookies(req)['u_id']] }, (err, bresult) => {
                    if (err) {
                        console.log(err.stack);
                        res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
                    } else {
                        req.flash("flash", "Topic posted!");
                        res.redirect(301, `/topic/${bresult.rows[0].id}`); // Redirects to the topic

                    }
                });
            }
        });
    } else if (req.body.editSubmit) {
        client.query({ text: "UPDATE forums SET cat_id=$4, topic=$3, description=$5 WHERE id=$2 AND u_id=$1", values: [getCookies(req)['u_id'], req.params.id, `${encryptWithAES(req.body.newName)}`, req.body.newcat, `${encryptWithAES(req.body.newDesc)}`] }, (err, result) => {
            if (err) {
                console.log(err.stack);
                res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
            } else {
                req.flash("flash", "Forum updated!");
                res.redirect(301, `/forum/${req.params.id}`); // Later: Redirect to the topic itself.
            }
        });
    }

});

router.post('/forum', authUser, (req, res) => {
    if (req.body.newcat) {
        // New Category
        client.query({ text: "INSERT INTO categories (u_id, name, description, icon) VALUES ($1, $2, $3, $4)", values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.cattitle)}`, `${encryptWithAES(req.body.catdesc)}`, req.body.caticon] }, (err, result) => {
            if (err) {
                console.log(err.stack);
                res.status(400).json({ code: 400, message: err.stack });
            } else {
                req.flash("flash", "Category created!");
                res.status(200).redirect(301, "/forum");
            }
        });
    } else if (req.body.newfor) {
        client.query({ text: "INSERT INTO forums (u_id, topic, description, cat_id) VALUES ($1, $2, $3, $4)", values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.fortitle)}`, `${encryptWithAES(req.body.fordesc)}`, req.body.forumLoc] }, (err, result) => {
            if (err) {
                console.log(err.stack);
                res.status(400).json({ code: 400, message: err.stack });
            } else {
                req.flash("flash", "Forum created!");
                res.status(200).redirect(301, "/forum");
            }
        });
    } else if (req.body.editcat) {
        // Edit category.
        client.query({ text: "UPDATE categories SET name=$2, icon=$4 WHERE u_id=$1 AND id= $3", values: [getCookies(req)['u_id'], `${encryptWithAES(req.body.newCatName)}`, req.body.catid, req.body.newcaticon] }, (err, result) => {
            if (err) {
                console.log(err.stack);
                res.status(400).json({ code: 400, message: err.stack });
            } else {
                req.flash("flash", "Category renamed!");
                res.status(200).redirect(301, "/forum");
            }
        });
    }
});



router.put("/forum-data", authUser, (req, res) => {
    if (apiEyesOnly(req)) {
        if (req.body.mode == "sticky") {
            // Toggle Sticky Mode.
            client.query({ text: "UPDATE threads SET is_sticky= NOT is_sticky WHERE id=$2 AND u_id=$1;", values: [getCookies(req)['u_id'], req.body.id] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    req.flash("flash", "Topic pinned.");
                    res.status(200).json({ code: 200 });
                }
            });
        } else if (req.body.mode == "lock") {
            // Toggle Sticky Mode.
            client.query({ text: "UPDATE threads SET is_locked= NOT is_locked WHERE id=$2 AND u_id=$1;", values: [getCookies(req)['u_id'], req.body.id] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    req.flash("flash", "Topic locked.");
                    res.status(200).json({ code: 200 });
                }
            });
        } else if (req.body.mode == "pop") {
            // Toggle Sticky Mode.
            client.query({ text: "UPDATE threads SET is_popular= NOT is_popular WHERE id=$2 AND u_id=$1;", values: [getCookies(req)['u_id'], req.body.id] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    req.flash("flash", "Topic made popular.");
                    res.status(200).json({ code: 200 });
                }
            });
        } else if (req.body.mode == "cat-order") {
            // Toggle Sticky Mode.
            client.query({ text: "UPDATE categories SET f_order= $3 WHERE id=$2 AND u_id=$1;", values: [getCookies(req)['u_id'], req.body.id, req.body.order] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    res.status(200).json({ code: 200 });
                }
            });
        }
    } else res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies })
});
router.delete("/forum-data", authUser, (req, res) => {
    if (apiEyesOnly(req)) {
        if (req.body.mode == "category") {
            client.query({ text: "DELETE FROM categories WHERE id=$2 AND u_id=$1;", values: [getCookies(req)['u_id'], req.body.id] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    req.flash("flash", "Category deleted.");
                    res.status(200).json({ code: 200 });
                }
            });
        } else if (req.body.mode == "forum") {
            client.query({ text: "DELETE FROM forums WHERE id=$2 AND u_id=$1;", values: [getCookies(req)['u_id'], req.body.id] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    req.flash("flash", "Forum deleted.");
                    return res.status(200).json({ code: 200 });
                }
            });
        } else if (req.body.mode == "topic") {
            client.query({ text: "DELETE FROM threads WHERE id=$2 AND u_id=$1;", values: [getCookies(req)['u_id'], req.body.id] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    req.flash("flash", "Topic deleted.");
                    res.status(200).json({ code: 200 });
                }
            });
        } else if (req.body.mode == "reply") {
            client.query({ text: "DELETE FROM thread_posts WHERE id=$1;", values: [req.body.id] }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                    res.status(400).json({ code: 400, message: err.stack });
                } else {
                    req.flash("flash", "Reply deleted.");
                    return res.status(200).json({ code: 200 });
                }
            });
        }

    } else res.status(403).render('pages/403', { session: req.session, code: "Forbidden", cookies: req.cookies })
})


console.log(`Forums Router Loaded.`);
module.exports = router;