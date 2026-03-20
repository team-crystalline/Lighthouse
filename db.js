// DATABASE
require('dotenv').config();
var strings = require("./lang/en.json");


const { Pool, Client, pg, Query } = require('pg');
if (process.env['environment'] == "dev") {
	console.log("⚒ Starting Lighthouse in  𝙎 𝘼 𝙉 𝘿 𝘽 𝙊 𝙓  mode. You are using an offline database.");
	var client = new Client({
		user: "dannyliehr",
		host: "localhost",
		database: "Sandbox",
		password: "",
		port: 5432
	});
} else {
	console.log("📷 Starting Lighthouse in  𝙋 𝙍 𝙊 𝘿 𝙐 𝘾 𝙏 𝙄 𝙊 𝙉  mode. ⚠ You are using the live site's database. ⚠");
	var client = new Client({
		user: process.env.DB_USER,
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		password: process.env.DB_PASS,
		port: process.env.DB_PORT,
		ssl: { rejectUnauthorized: false }
	});

}

// Database functions now that all that is declared.
/**
 * Run a database query. Renders a 400 error if nothing works. Use with "await".
 * @param {object} client The database client credentials. Differs between production and dev.
 * @param {string} customQuery The string query with $1, $2, etc.
 * @param {array} customValues array of values for $1, $2, etc.
 * @param {object} res The ExpressJS API response
 * @param {object} req The ExpressJS API request
 * @param {boolean} handleZero Determine if we need to handle if the result has 0 rows.
 * @returns {array} Array of matching rows to query.
 */
async function query(client, customQuery, customValues, res, req, handleZero = false) {
	try {
		const result = await client.query({ text: customQuery, values: customValues });

		if (handleZero == true && result.rows.length < 1) {
			// We need to handle if the result has no rows. This one has none.
			return res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
		}
		return result.rows;
	} catch (e) {
		console.error(e.stack);
		return res.status(400).render('pages/400', { session: req.session, code: "Bad Request", cookies: req.cookies });
	}
}

Pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err);
	// Don't throw an error here, as it will crash the server. Instead, log it and move on.
});

client.connect();

// MODULE EXPORTS
module.exports = {
	query,
	client: client
};