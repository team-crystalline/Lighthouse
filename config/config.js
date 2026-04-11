/* Script to get constants from the environment and set defaults if they don't exist */

require('dotenv').config();


var port = process.env.PORT || "5000";

module.exports = {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
    CLOUDFLARE_KEY: process.env.environment == "dev" ? '1x0000000000000000000000000000000AA' : process.env.CLOUDFLARE_KEY,
    CRYPT_KEY: process.env.cryptkey,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_PASS: process.env.DB_PASS,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DEVELOPERS: [process.env.dev1, process.env.dev2, process.env.dev3],
    ENVIRONMENT: process.env.environment || "dev",
    GMAIL_PASS: process.env.gmail_pass,
    LOG_EMAIL: process.env.LOG_EMAIL,
    MAINTENANCE: process.env.MAINTENANCE, // Set to "true" to switch on maintenance mode.
    PORT: port,
    SALT_KEY: process.env.SALT_KEY,
    SECRET: process.env.sec,
    URL_PREFIX: process.env.URL_PREFIX || `http://${process.env.HOSTNAME}:${port}`
};
