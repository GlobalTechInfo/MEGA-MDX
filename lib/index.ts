import { fileURLToPath} from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import path from 'path';
import { dataFile } from './paths.js';
import store from './lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const dataPath = dataFile('userGroupData.json');

async function loadUserGroupData() {
    try {
        if (HAS_DB) {
            const data = await store.getSetting('global', 'userGroupData');
            return data || {
                antibadword: {},
                antilink: {},
                welcome: {},
                goodbye: {},
                chatbot: {},
                warnings: {},
                sudo: [],
                antitag: {}
            };
        } else {
            if (!fs.existsSync(dataPath)) {
                const defaultData = {
                    antibadword: {},
                    antilink: {},
                    welcome: {},
                    goodbye: {},
                    chatbot: {},
                    warnings: {},
                    sudo: [],
                    antitag: {}
                };
                fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
                return defaultData;
            }
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            return data;
        }
    } catch(error: any) {
        console.error('Error loading user group data:', error);
        return {
            antibadword: {},
            antilink: {},
            welcome: {},
            goodbye: {},
            chatbot: {},
            warnings: {},
            sudo: [],
            antitag: {}
        };
    }
}

async function saveUserGroupData(data: any) {
    try {
        if (HAS_DB) {
            await store.saveSetting('global', 'userGroupData', data);
        } else {
            const dir = path.dirname(dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        }
        return true;
    } catch(error: any) {
        console.error('Error saving user group data:', error);
        return false;
    }
}

async function setAntilink(groupId: string, type: string, action: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.antilink) data.antilink = {};
        if (!data.antilink[groupId]) data.antilink[groupId] = {};

        data.antilink[groupId] = {
            enabled: type === 'on',
            action: action || 'delete'
        };

        await saveUserGroupData(data);
        return true;
    } catch(error: any) {
        console.error('Error setting antilink:', error);
        return false;
    }
}

async function getAntilink(groupId: string, type: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.antilink || !data.antilink[groupId]) return null;

        return type === 'on' ? data.antilink[groupId] : null;
    } catch(error: any) {
        console.error('Error getting antilink:', error);
        return null;
    }
}

async function removeAntilink(groupId: string, _type?: string) {
    try {
        const data = await loadUserGroupData();
        if (data.antilink && data.antilink[groupId]) {
            delete data.antilink[groupId];
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error removing antilink:', error);
        return false;
    }
}

async function setAntitag(groupId: string, type: string, action: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.antitag) data.antitag = {};
        if (!data.antitag[groupId]) data.antitag[groupId] = {};

        data.antitag[groupId] = {
            enabled: type === 'on',
            action: action || 'delete'
        };

        await saveUserGroupData(data);
        return true;
    } catch(error: any) {
        console.error('Error setting antitag:', error);
        return false;
    }
}

async function getAntitag(groupId: string, type: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.antitag || !data.antitag[groupId]) return null;

        return type === 'on' ? data.antitag[groupId] : null;
    } catch(error: any) {
        console.error('Error getting antitag:', error);
        return null;
    }
}

async function removeAntitag(groupId: string, _type?: string) {
    try {
        const data = await loadUserGroupData();
        if (data.antitag && data.antitag[groupId]) {
            delete data.antitag[groupId];
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error removing antitag:', error);
        return false;
    }
}

async function incrementWarningCount(groupId: string, userId: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.warnings) data.warnings = {};
        if (!data.warnings[groupId]) data.warnings[groupId] = {};
        if (!data.warnings[groupId][userId]) data.warnings[groupId][userId] = 0;

        data.warnings[groupId][userId]++;
        await saveUserGroupData(data);
        return data.warnings[groupId][userId];
    } catch(error: any) {
        console.error('Error incrementing warning count:', error);
        return 0;
    }
}

async function resetWarningCount(groupId: string, userId: string) {
    try {
        const data = await loadUserGroupData();
        if (data.warnings && data.warnings[groupId] && data.warnings[groupId][userId]) {
            data.warnings[groupId][userId] = 0;
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error resetting warning count:', error);
        return false;
    }
}

async function isSudo(userId: string) {
    try {
        const data = await loadUserGroupData();
        return data.sudo && data.sudo.includes(userId);
    } catch(error: any) {
        console.error('Error checking sudo:', error);
        return false;
    }
}

async function addSudo(userJid: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.sudo) data.sudo = [];
        if (!data.sudo.includes(userJid)) {
            data.sudo.push(userJid);
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error adding sudo:', error);
        return false;
    }
}

async function removeSudo(userJid: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.sudo) data.sudo = [];
        const idx = data.sudo.indexOf(userJid);
        if (idx !== -1) {
            data.sudo.splice(idx, 1);
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error removing sudo:', error);
        return false;
    }
}

async function getSudoList() {
    try {
        const data = await loadUserGroupData();
        return Array.isArray(data.sudo) ? data.sudo : [];
    } catch(error: any) {
        console.error('Error getting sudo list:', error);
        return [];
    }
}

async function addWelcome(jid: string, enabled: boolean, message?: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.welcome) data.welcome = {};

        data.welcome[jid] = {
            enabled: enabled,
            message: message || '╔═⚔️ WELCOME ⚔️═╗\n║ 🛡️ User: {user}\n║ 🏰 Kingdom: {group}\n╠═══════════════╣\n║ 📜 Message:\n║ {description}\n╚═══════════════╝',
            channelId: '120363161513685998@newsletter'
        };

        await saveUserGroupData(data);
        return true;
    } catch(error: any) {
        console.error('Error in addWelcome:', error);
        return false;
    }
}

async function delWelcome(jid: string) {
    try {
        const data = await loadUserGroupData();
        if (data.welcome && data.welcome[jid]) {
            delete data.welcome[jid];
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error in delWelcome:', error);
        return false;
    }
}

async function isWelcomeOn(jid: string) {
    try {
        const data = await loadUserGroupData();
        return data.welcome && data.welcome[jid] && data.welcome[jid].enabled;
    } catch(error: any) {
        console.error('Error in isWelcomeOn:', error);
        return false;
    }
}

async function addGoodbye(jid: string, enabled: boolean, message?: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.goodbye) data.goodbye = {};

        data.goodbye[jid] = {
            enabled: enabled,
            message: message || '╔═⚔️ GOODBYE ⚔️═╗\n║ 🛡️ User: {user}\n║ 🏰 Kingdom: {group}\n╠═══════════════╣\n║ ⚰️ We will never miss you!\n╚═══════════════╝',
            channelId: '120363161513685998@newsletter'
        };

        await saveUserGroupData(data);
        return true;
    } catch(error: any) {
        console.error('Error in addGoodbye:', error);
        return false;
    }
}

async function delGoodBye(jid: string) {
    try {
        const data = await loadUserGroupData();
        if (data.goodbye && data.goodbye[jid]) {
            delete data.goodbye[jid];
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error in delGoodBye:', error);
        return false;
    }
}

async function isGoodByeOn(jid: string) {
    try {
        const data = await loadUserGroupData();
        return data.goodbye && data.goodbye[jid] && data.goodbye[jid].enabled;
    } catch(error: any) {
        console.error('Error in isGoodByeOn:', error);
        return false;
    }
}

async function getWelcome(jid: string) {
    try {
        const data = await loadUserGroupData();
        return data.welcome && data.welcome[jid] ? data.welcome[jid].message : null;
    } catch(error: any) {
        console.error('Error in getWelcome:', error);
        return null;
    }
}

async function getGoodbye(jid: string) {
    try {
        const data = await loadUserGroupData();
        return data.goodbye && data.goodbye[jid] ? data.goodbye[jid].message : null;
    } catch(error: any) {
        console.error('Error in getGoodbye:', error);
        return null;
    }
}

async function setAntiBadword(groupId: string, type: string, action: string) {
    try {
        const data = await loadUserGroupData();
        if (!data.antibadword) data.antibadword = {};
        if (!data.antibadword[groupId]) data.antibadword[groupId] = {};

        data.antibadword[groupId] = {
            enabled: type === 'on',
            action: action || 'delete'
        };

        await saveUserGroupData(data);
        return true;
    } catch(error: any) {
        console.error('Error setting antibadword:', error);
        return false;
    }
}

async function getAntiBadword(groupId: string, type: string) {
    try {
        const data = await loadUserGroupData();

        if (!data.antibadword || !data.antibadword[groupId]) {
            return null;
        }

        const groupConfig = data.antibadword[groupId];

        return type === 'on' ? groupConfig : null;
    } catch(error: any) {
        console.error('Error getting antibadword:', error);
        return null;
    }
}

async function removeAntiBadword(groupId: string, _type?: string) {
    try {
        const data = await loadUserGroupData();
        if (data.antibadword && data.antibadword[groupId]) {
            delete data.antibadword[groupId];
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error removing antibadword:', error);
        return false;
    }
}

async function setChatbot(groupId: string, enabled: boolean) {
    try {
        const data = await loadUserGroupData();
        if (!data.chatbot) data.chatbot = {};

        data.chatbot[groupId] = {
            enabled: enabled
        };

        await saveUserGroupData(data);
        return true;
    } catch(error: any) {
        console.error('Error setting chatbot:', error);
        return false;
    }
}

async function getChatbot(groupId: string) {
    try {
        const data = await loadUserGroupData();
        return data.chatbot?.[groupId] || null;
    } catch(error: any) {
        console.error('Error getting chatbot:', error);
        return null;
    }
}

async function removeChatbot(groupId: string) {
    try {
        const data = await loadUserGroupData();
        if (data.chatbot && data.chatbot[groupId]) {
            delete data.chatbot[groupId];
            await saveUserGroupData(data);
        }
        return true;
    } catch(error: any) {
        console.error('Error removing chatbot:', error);
        return false;
    }
}

export {
    setAntilink,
    getAntilink,
    removeAntilink,
    setAntitag,
    getAntitag,
    removeAntitag,
    incrementWarningCount,
    resetWarningCount,
    isSudo,
    addSudo,
    removeSudo,
    getSudoList,
    addWelcome,
    delWelcome,
    isWelcomeOn,
    getWelcome,
    addGoodbye,
    delGoodBye,
    isGoodByeOn,
    getGoodbye,
    setAntiBadword,
    getAntiBadword,
    removeAntiBadword,
    setChatbot,
    getChatbot,
    removeChatbot,
    loadUserGroupData,
    saveUserGroupData
};

