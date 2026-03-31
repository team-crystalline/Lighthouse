// DATABASE
var strings= require("./lang/en.json");
const config = require('./config');


const { Pool, Client,pg, Query } = require('pg');
var client = new Client({
	user: config.DB_USER,
	host: config.DB_HOST,
	database: config.DB_NAME,
	password: config.DB_PASS,
	port: config.DB_PORT,
	ssl: { rejectUnauthorized: false }
  });

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
async function query(client, customQuery, customValues, res, req, handleZero=false) {
	try {
	  const result = await client.query({ text: customQuery, values: customValues });
	  
	  if (handleZero == true && result.rows.length < 1){
		// We need to handle if the result has no rows. This one has none.
		return res.status(400).render('pages/400',{ session: req.session, code:"Bad Request", cookies:req.cookies });
	  }
	  return result.rows;
	} catch (e) {
	// Might not have this in the database or something. Just return nothing.
		return [];
	}
  }
  

client.connect();

// MODULE EXPORTS
module.exports = {
	query,
	client:client
  };
