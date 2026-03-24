const db = require('../db');

/**
 * A class for an alter, which is a member of a system.
 */
class Alter {
    /**
     * Constructs an Alter object from a database result.
     * @param {Object} dbResults 
     */
    constructor(dbResults) {
        this.id = dbResults.alter_id;
        this.userId = dbResults.user_id;
        this.sysId = dbResults.sys_id;
        this.name = dbResults.name;
        this.triggersPos = dbResults.triggers_pos;
        this.triggersNeg = dbResults.triggers_neg;
        this.age = dbResults.agetext;
        this.likes = dbResults.likes;
        this.dislikes = dbResults.dislikes;
        this.job = dbResults.job;
        this.safePlace = dbResults.safe_place;
        this.wants = dbResults.wants;
        this.accommodations = dbResults.acc;
        this.notes = dbResults.notes;
        this.imgUrl = dbResults.img_url;
        this.type = dbResults.type;
        this.pronouns = dbResults.pronouns;
        this.birthday = dbResults.birthday;
        this.firstNoted = dbResults.first_noted;
        this.gender = dbResults.gender;
        this.sexuality = dbResults.sexuality;
        this.source = dbResults.source;
        this.fronttells = dbResults.fronttells;
        this.relationships = dbResults.relationships;
        this.isArchived = dbResults.is_archived;
        this.hobbies = dbResults.hobbies;
        this.appearance = dbResults.appearance;
        this.imgBlob = dbResults.img_blob;
        this.blobMimeType = dbResults.blob_mimetype;
        this.colour = dbResults.colour;
        this.outline_enabled = dbResults.outline_enabled;
        this.outline = dbResults.outline;
        this.sig = dbResults.sig;
        this.species = dbResults.species;
        this.nickname = dbResults.nickname;
        this.spID = dbResults.sp_id;
        this.pkID = dbResults.pk_id;
        this.subsys = [dbResults.subsys1, dbResults.subsys2, dbResults.subsys3, dbResults.subsys4, dbResults.subsys5].filter(s => s !== null);
        this.headerBlob = dbResults.header_blob;
        this.headerMimeType = dbResults.header_mimetype;
        this.colourEnabled = dbResults.colour_enabled;
    };

    /**
     * Checks if the given user ID is the owner of this alter. For security purposes, so only the owner of the alter can edit it.
     * @param {string} userId - The ID of the user to check.
     * @returns {boolean} - True if the user is the owner, false otherwise.
     */
    checkOwnership(userId) {
        return this.userId === userId;
    }

    /**
     * Updates a property of the Alter object and the corresponding database field.
     * @param {string} property - The property of the Alter object to update.
     * @param {string} dbProperty - The corresponding database field to update.
     * @param {*} value - The new value to set.
     * @param {string} userId - The ID of the user attempting the update. ALWAYS LIFT THIS FROM THE SESSION, NEVER FROM USER INPUT. (Users can't edit the session since it's server-side, so it's safe to trust this value.)
     * @returns {boolean} - True if the update was successful, false otherwise.
     */
    async updateProperty(property, dbProperty, value, userId) {

        if (!this.checkOwnership(userId)) return false;

        // sys_id is allowed, 100% to move an alter to a different system.
        // the subsys1-5 fields are allowed, to move an alter to a different subsystem.
        const allowedColumns = ['sys_id', 'name', 'triggers_pos', 'triggers_neg', 'agetext', 'likes', 'dislikes', 'job', 'safe_place', 'wants', 'acc', 'notes', 'img_url', 'type', 'pronouns', 'birthday', 'first_noted', 'gender', 'sexuality', 'source', 'fronttells', 'relationships', 'is_archived', 'hobbies', 'appearance', 'img_blob', 'blob_mimetype', 'colour', 'outline_enabled', 'outline', 'sig', 'species', 'nickname', 'sp_id', 'pk_id', 'subsys1', 'subsys2', 'subsys3', 'subsys4', 'subsys5', 'header_blob', 'header_mimetype', 'colour_enabled'];

        if (!this.hasOwnProperty(property)) {
            console.error(`Property ${property} does not exist on Alter class.`);
            return false;
        }

        if (!allowedColumns.includes(dbProperty)) {
            console.error(`Database property ${dbProperty} is not allowed to be updated.`);
            return false;
        }

        // Ok, now it's ok to update.
        this[property] = value;
        await db.query(`UPDATE alters SET ${dbProperty} = ? WHERE alter_id = ?`, [value, this.id]);
        return true;
    }

    /**
     * Deletes an alter, if the user is the owner.
     * @param {string} userId - The ID of the user attempting the delete.
     * @returns {boolean} True if the delete was successful, false otherwise.
     */
    async delete(userId) {
        if (!this.checkOwnership(userId)) return false;
        await db.query('DELETE FROM alters WHERE alter_id = ?', [this.id]);
        return true;
    }

    async archive() {
        this.isArchived = true;
        await db.query('UPDATE alters SET is_archived = 1 WHERE alter_id = ?', [this.id]);
    }

    async unarchive() {
        this.isArchived = false;
        await db.query('UPDATE alters SET is_archived = 0 WHERE alter_id = ?', [this.id]);
    }

    async getInfo() {
        return this;
    }
}

module.exports = Alter;