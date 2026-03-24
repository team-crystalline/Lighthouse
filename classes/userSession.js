const db = require('../db');
/**
 * A class for a user's session. It has information on the account, the preferances, and if they're a developer or not.
 * @param {Object} dbResults The database entry for this user.
 */
class UserSession {
    constructor(dbResults) {
        // This is for basic user info.
        this.u_id = dbResults.id;
        this.username = dbResults.username;
        this.email = dbResults.email;

        // This part is for UI preferences.
        this.skin = dbResults.skin;
        this.language = dbResults.language || 'en';
        this.text_size = dbResults.text_size;
        this.font = dbResults.font;

        // This part is for preferred terms.
        this.terms = {
            system: this._truncateTerm(dbResults.system_term, 'system'),
            alter: this._truncateTerm(dbResults.alter_term, 'alter'),
            subsystem: this._truncateTerm(dbResults.subsystem_term, 'subsystem'),
            plural: this._truncateTerm(dbResults.plural_term, 'plural'),
        };

        // This is for user permissions and toggles.
        this.innerWorldsEnabled = dbResults.inner_worlds || false;
        this.worksheetsEnabled = dbResults.worksheets_enabled || false;
        this.isLegacy = dbResults.is_legacy || false;
        this.glossaryEnabled = dbResults.glossary_enabled || false;
        this.isDev = Boolean(
            this.u_id &&
            [process.env.dev1, process.env.dev2, process.env.dev3].includes(this.u_id)
        )
    }
    /**
     * A function to automatically keep a term within 16 characters, using a fallback if the term is not provided.
     * @param {String} term 
     * @param {String} fallback 
     * @returns {String}
     */
    _truncateTerm(term, fallback) {
        const value = term || fallback;
        return value.length > 16 ? value.substring(0, 16) : value;
    }

    /**
     * A function to get the strings for Lighthouse based on the class' language.
     * @returns {Object} An object containing all the strings for the user's preferred language, or English if that language is not available.
     */
    getStrings() {
        try {
            return require(`../lang/${this.language}.json`);
        } catch (e) {
            return require('../lang/en.json');
        }
    }
    /**
     * Updates a property of the session and also the data.
     * @param {String} property The property of the session to update. Must be a property of the class.
     * @param {String} dbProperty The corresponding property in the database.
     * @param {*} value The new value to set. Can be any type, so long as it matches the type in the database. Look at your local database for reference.
     * @return {Boolean} Returns true if the update was successful, false if it was not.
     */
    async updateProperty(property, dbProperty, value) {
        // Doing this so there's no funky SQL injection shit. You can only update these columns. Anything else rejects.
        const allowedProperties = [
            'skin', 'language', 'text_size', 'font', 'system_term', 'alter_term', 'subsystem_term', 'plural_term', 'inner_worlds', 'worksheets_enabled', 'is_legacy', 'glossary_enabled'
        ];
        // Does the user session itself have this property?
        if (!this.hasOwnProperty(property)) {
            console.error(`Property ${property} does not exist on UserSession.`);
            return false;
        }
        // Cool. Does the DATABASE have this property AND do we allow it?
        if (!allowedProperties.includes(dbProperty)) {
            console.error(`Database property ${dbProperty} is not allowed to be updated.`);
            return false;
        }
        // Cool. Proceed!
        try {
            await db.query(db.client, `UPDATE users SET ${dbProperty} = $1 WHERE id = $2`, [value, this.u_id]);
            this[property] = value;
            return true;
        } catch (e) {
            console.error(`Failed to update property ${property} in database:`, e);
            return false;
        }
    }

    logOut() {
        // Cleaning up the session, if we ever want to add like... "last_active" or something.
    }
}

module.exports = UserSession;