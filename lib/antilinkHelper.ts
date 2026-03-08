import { fileURLToPath} from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import { dataFile } from './paths.js';
import store from './lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const antilinkFilePath = dataFile('antilinkSettings.json');

async function loadAntilinkSettings() {
    if (HAS_DB) {
        const settings = await store.getSetting('global', 'antilinkSettings');
        return settings || {};
    } else {
        if (fs.existsSync(antilinkFilePath)) {
            const data = fs.readFileSync(antilinkFilePath);
            return JSON.parse(String(data));
        }
        return {};
    }
}

async function saveAntilinkSettings(settings: any) {
    if (HAS_DB) {
        await store.saveSetting('global', 'antilinkSettings', settings);
    } else {
        fs.writeFileSync(antilinkFilePath, JSON.stringify(settings, null, 2));
    }
}

async function setAntilinkSetting(groupId: any, type: any) {
    const settings = await loadAntilinkSettings();
    settings[groupId] = type;
    await saveAntilinkSettings(settings);
}

async function getAntilinkSetting(groupId: any) {
    const settings = await loadAntilinkSettings();
    return settings[groupId] || 'off';
}

export {
    setAntilinkSetting,
    getAntilinkSetting,
    loadAntilinkSettings,
    saveAntilinkSettings
};
