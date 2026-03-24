// For web crawlers, sitemaps, etc.

const express = require('express');
const router = express.Router();


// ROBOTS.TXT
router.get("/sitemap.xml", function(req, res) {
res.setHeader('content-type', 'text/plain');
res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset
xmlns="http://www.writelighthouse.com"
xsi:schemaLocation="http://www.writelighthouse.com/sitemap.xml">

<url>
<loc>https://www.writelighthouse.com/</loc>
<lastmod>2023-05-06T00:29:06+00:00</lastmod>
<priority>1.00</priority>
</url>
<url>
<loc>https://www.writelighthouse.com/signup</loc>
<lastmod>2023-05-06T00:29:06+00:00</lastmod>
<priority>0.80</priority>
</url>
<url>
<loc>https://www.writelighthouse.com/login</loc>
<lastmod>2023-05-06T00:29:06+00:00</lastmod>
<priority>0.80</priority>
</url>
<url>
<loc>https://www.writelighthouse.com/about</loc>
<lastmod>2023-05-06T00:29:06+00:00</lastmod>
<priority>0.80</priority>
</url>
<url>
<loc>https://www.writelighthouse.com/changelog</loc>
<lastmod>2023-05-06T00:29:06+00:00</lastmod>
<priority>0.80</priority>
</url>
<url>
<loc>https://www.writelighthouse.com/glossary</loc>
<lastmod>2023-05-06T00:29:06+00:00</lastmod>
<priority>0.90</priority>
</url>
<url>
<loc>https://www.writelighthouse.com/tutorial</loc>
<lastmod>2023-05-06T00:29:06+00:00</lastmod>
<priority>0.75</priority>
</url>

</urlset>`);
})
router.get("/robots.txt", function(req, res) {
res.setHeader('content-type', 'text/plain');
res.send(`
User-agent: GPTBot
Disallow: /
User-agent: ChatGPT-User
Disallow: /
User-agent: Google-Extended
Disallow: /
User-agent: PerplexityBot
Disallow: /
User-agent: Amazonbot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: Omgilibot
Disallow: /
User-Agent: FacebookBot
Disallow: /
User-Agent: Applebot
Disallow: /
User-agent: anthropic-ai
Disallow: /
User-agent: Bytespider
Disallow: /
User-agent: Claude-Web
Disallow: /
User-agent: Diffbot
Disallow: /
User-agent: ImagesiftBot
Disallow: /
User-agent: Omgilibot
Disallow: /
User-agent: Omgili
Disallow: /
User-agent: YouBot
Disallow: /
User-Agent: *
Disallow: /system
Disallow: /alter
Disallow: /editsys
Disallow: /deletesys
Disallow: /clearalter
Disallow: /edit-alter
Disallow: /mood
Disallow: /system/inner-world 
Disallow: /system/rules
Disallow: /reset
Disallow: /forgot-password
Disallow: /del-mood
Disallow: /journal
Disallow: /comm
Disallow: /profile
Disallow: /users
Disallow: /forum
Allow: /
Disallow: /signup
Allow: /login
Allow: /about
Allow: /glossary
Allow: /tutorial
Crawl-delay: 10
Sitemap: www.writelighthouse.com/sitemap.xml`);
});

console.log(`Web Crawler Router Loaded.`);
module.exports = router;