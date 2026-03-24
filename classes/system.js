const db = require('../db');

/**
 * A class for a system.
 */
class System {
    constructor(dbResults) {
        this.id = dbResults.sys_id;
        this.userId = dbResults.user_id;
        this.rawAlias = dbResults.sys_alias;
        this.icon = dbResults.icon;
        this.subSysId = dbResults.subsys_id;
    }

    /**
     * Checks if the given user ID is the owner of this system.
     * @param {string} userId - The ID of the user to check.
     * @returns {boolean} - True if the user is the owner, false otherwise.
     */
    checkOwnership(userId) {
        return this.userId === userId;
    }

    /**
     * Updates a value in the database and the class. Returns false if the update fails.
     * @param {String} property The class property.
     * @param {String} dbProperty The corresponding database column.
     * @param {*} value The new value to set.
     * @param {String} userId The ID of the user attempting the update. ALWAYS LIFT THIS FROM THE SESSION, NEVER FROM USER INPUT. (Users can't edit the session since it's server-side, so it's safe to trust this value.)
     * @returns {boolean} True if the update was successful, false otherwise.
     */
    async updateProperty(property, dbProperty, value, userId) {

        if (!this.checkOwnership(userId)) return false;

        const allowedColumns = ['sys_alias', 'icon', 'subsys_id'];

        if (!this.hasOwnProperty(property)) {
            return false;
        }

        if (!allowedColumns.includes(dbProperty)) {
            return false;
        }

        try {
            const result = await db.query(
                `UPDATE systems SET ${dbProperty} = ? WHERE sys_id = ?`,
                [value, this.id]
            );
            if (result.affectedRows === 0) {
                return false;
            }
            this[property] = value;
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Deletes a system, if the user is the owner.
     * @param {string} userId - The ID of the user attempting the delete.
     * @returns {boolean} True if the delete was successful, false otherwise.
     */
    async delete(userId) {
        if (!this.checkOwnership(userId)) return false;
        await db.query('DELETE FROM systems WHERE sys_id = ?', [this.id]);
        return true;
    }
}

module.exports = System;