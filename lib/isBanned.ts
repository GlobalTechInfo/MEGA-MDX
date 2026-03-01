
import fs from 'fs';
import store from './lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
const bannedFilePath = './data/banned.json';

async function isBanned(userId) {
    try {
        if (HAS_DB) {
            const banned = await store.getSetting('global', 'banned');
            return (banned || []).includes(userId);
        } else {
            if (!fs.existsSync(bannedFilePath)) {
                return false;
            }
            const bannedUsers = JSON.parse(fs.readFileSync(bannedFilePath, 'utf8'));
            return bannedUsers.includes(userId);
        }
    } catch(error: any) {
        console.error('Error checking banned status:', error);
        return false;
    }
}

export { isBanned };

