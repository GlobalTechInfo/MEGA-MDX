import { fileURLToPath} from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import store from './lightweight_store.js';
import fs from 'fs';
import { dataFile } from './paths.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL);

async function loadAntibadwordConfig(groupId: string) {
    try {
        if (HAS_DB) {
            const config = await store.getSetting(groupId, 'antibadword');
            return config || {};
        } else {
            const configPath = dataFile('userGroupData.json');
            if (!fs.existsSync(configPath)) {
                return {};
            }
            const data = JSON.parse(fs.readFileSync(configPath, "utf-8").toString());
            return data.antibadword?.[groupId] || {};
        }
    } catch(error: any) {
        console.error('❌ Error loading antibadword config:', error.message);
        return {};
    }
}

async function setAntiBadword(chatId: string, type: string, action: string) {
    try {
        await store.saveSetting(chatId, 'antibadword', {
            enabled: true,
            action: action,
            type: type
        });
        return true;
    } catch(error: any) {
        console.error('Error setting antibadword:', error);
        return false;
    }
}

async function getAntiBadword(chatId: string, _type?: string) {
    try {
        const settings = await store.getSetting(chatId, 'antibadword');
        return settings || null;
    } catch(error: any) {
        console.error('Error getting antibadword:', error);
        return null;
    }
}

async function removeAntiBadword(chatId: string) {
    try {
        await store.saveSetting(chatId, 'antibadword', {
            enabled: false,
            action: null,
            type: null
        });
        return true;
    } catch(error: any) {
        console.error('Error removing antibadword:', error);
        return false;
    }
}

async function incrementWarningCount(chatId: string, userId: string) {
    try {
        const warningsKey = `antibadword_warnings`;
        const warnings = await store.getSetting(chatId, warningsKey) || {};

        if (!warnings[userId]) {
            warnings[userId] = 0;
        }
        warnings[userId]++;

        await store.saveSetting(chatId, warningsKey, warnings);
        return warnings[userId];
    } catch(error: any) {
        console.error('Error incrementing warning count:', error);
        return 0;
    }
}

async function resetWarningCount(chatId: string, userId: string) {
    try {
        const warningsKey = `antibadword_warnings`;
        const warnings = await store.getSetting(chatId, warningsKey) || {};

        if (warnings[userId]) {
            delete warnings[userId];
            await store.saveSetting(chatId, warningsKey, warnings);
        }
        return true;
    } catch(error: any) {
        console.error('Error resetting warning count:', error);
        return false;
    }
}

async function handleAntiBadwordCommand(sock: any, chatId: string, message: any, match: string) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `*ANTIBADWORD SETUP*\n\n*.antibadword on*\nTurn on antibadword\n\n*.antibadword set <action>*\nSet action: delete/kick/warn\n\n*.antibadword off*\nDisables antibadword in this group\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`
        }, { quoted: message });
    }

    if (match === 'on') {
        const existingConfig = await getAntiBadword(chatId, 'on');
        if (existingConfig?.enabled) {
            return sock.sendMessage(chatId, { text: '*AntiBadword is already enabled for this group*' });
        }
        await setAntiBadword(chatId, 'on', 'delete');
        return sock.sendMessage(chatId, { text: '*AntiBadword has been enabled. Use .antibadword set <action> to customize action*' }, { quoted: message });
    }

    if (match === 'off') {
        const config = await getAntiBadword(chatId, 'on');
        if (!config?.enabled) {
            return sock.sendMessage(chatId, { text: '*AntiBadword is already disabled for this group*' }, { quoted: message } );
        }
        await removeAntiBadword(chatId);
        return sock.sendMessage(chatId, { text: '*AntiBadword has been disabled for this group*' }, { quoted: message } );
    }

    if (match.startsWith('set')) {
        const action = match.split(' ')[1];
        if (!action || !['delete', 'kick', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, { text: '*Invalid action. Choose: delete, kick, or warn*' }, { quoted: message } );
        }
        await setAntiBadword(chatId, 'on', action);
        return sock.sendMessage(chatId, { text: `*AntiBadword action set to: ${action}*` }, { quoted: message } );
    }

    return sock.sendMessage(chatId, { text: '*Invalid command. Use .antibadword to see usage*' }, { quoted: message } );
}

async function handleBadwordDetection(sock: any, chatId: string, message: any, userMessage: string, senderId: string) {
    const config = await loadAntibadwordConfig(chatId);
    if (!config.enabled) return;

    if (!chatId.endsWith('@g.us')) return;

    if (message.key.fromMe) return;

    const antiBadwordConfig = await getAntiBadword(chatId, 'on');
    if (!antiBadwordConfig?.enabled) {
        return;
    }

    const cleanMessage = userMessage.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const badWords = [
        'gandu', 'madarchod', 'bhosdike', 'bsdk', 'fucker', 'bhosda',
        'lauda', 'laude', 'betichod', 'chutiya', 'maa ki chut', 'behenchod',
        'behen ki chut', 'tatto ke saudagar', 'machar ki jhant', 'jhant ka baal',
        'randi', 'chuchi', 'boobs', 'boobies', 'tits', 'idiot', 'nigga', 'fuck',
        'dick', 'bitch', 'bastard', 'asshole', 'asu', 'awyu', 'teri ma ki chut',
        'teri maa ki', 'lund', 'lund ke baal', 'mc', 'lodu', 'benchod',
        'shit', 'damn', 'hell', 'piss', 'crap', 'bastard', 'slut', 'whore', 'prick',
        'motherfucker', 'cock', 'cunt', 'pussy', 'twat', 'wanker', 'douchebag', 'jackass',
        'moron', 'retard', 'scumbag', 'skank', 'slutty', 'arse', 'bugger', 'sod off',
        'chut', 'laude ka baal', 'madar', 'behen ke lode', 'chodne', 'sala kutta',
        'harami', 'randi ki aulad', 'gaand mara', 'chodu', 'lund le', 'gandu saala',
        'kameena', 'haramzada', 'chamiya', 'chodne wala', 'chudai', 'chutiye ke baap',
        'fck', 'fckr', 'fcker', 'fuk', 'fukk', 'fcuk', 'btch', 'bch', 'bsdk', 'f*ck','assclown',
        'a**hole', 'f@ck', 'b!tch', 'd!ck', 'n!gga', 'f***er', 's***head', 'a$$', 'l0du', 'lund69',
        'spic', 'chink', 'cracker', 'towelhead', 'gook', 'kike', 'paki', 'honky',
        'wetback', 'raghead', 'jungle bunny', 'sand nigger', 'beaner',
        'blowjob', 'handjob', 'cum', 'cumshot', 'jizz', 'deepthroat', 'fap',
        'hentai', 'MILF', 'anal', 'orgasm', 'dildo', 'vibrator', 'gangbang',
        'threesome', 'porn', 'sex', 'xxx',
        'fag', 'faggot', 'dyke', 'tranny', 'homo', 'sissy', 'fairy', 'lesbo',
        'weed', 'pot', 'coke', 'heroin', 'meth', 'crack', 'dope', 'bong', 'kush',
        'hash', 'trip', 'rolling'
    ];

    const messageWords = cleanMessage.split(' ');
    let containsBadWord = false;

    for (const word of messageWords) {
        if (word.length < 2) continue;

        if (badWords.includes(word)) {
            containsBadWord = true;
            break;
        }

        for (const badWord of badWords) {
            if (badWord.includes(' ')) {
                if (cleanMessage.includes(badWord)) {
                    containsBadWord = true;
                    break;
                }
            }
        }
        if (containsBadWord) break;
    }

    if (!containsBadWord) return;

    const groupMetadata = await sock.groupMetadata(chatId);
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = groupMetadata.participants.find((p: any) => p.id === botId);
    if (!bot?.admin) {
        return;
    }

    const participant = groupMetadata.participants.find((p: any) => p.id === senderId);
    if (participant?.admin) {
        return;
    }

    try {
        await sock.sendMessage(chatId, {
            delete: message.key
        });
    } catch(err: any) {
        console.error('Error deleting message:', err);
        return;
    }

    switch (antiBadwordConfig.action) {
        case 'delete':
            await sock.sendMessage(chatId, {
                text: `*@${senderId.split('@')[0]} bad words are not allowed here*`,
                mentions: [senderId]
            });
            break;

        case 'kick':
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} has been kicked for using bad words*`,
                    mentions: [senderId]
                });
            } catch(error: any) {
                console.error('Error kicking user:', error);
            }
            break;

        case 'warn': {
            const warningCount = await incrementWarningCount(chatId, senderId);
            if (warningCount >= 3) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await resetWarningCount(chatId, senderId);
                    await sock.sendMessage(chatId, {
                        text: `*@${senderId.split('@')[0]} has been kicked after 3 warnings*`,
                        mentions: [senderId]
                    });
                } catch(error: any) {
                    console.error('Error kicking user after warnings:', error);
                }
            } else {
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} warning ${warningCount}/3 for using bad words*`,
                    mentions: [senderId]
                });
            }
            break;
        }
    }
}

export {
    handleAntiBadwordCommand,
    handleBadwordDetection,
    setAntiBadword,
    getAntiBadword,
    removeAntiBadword,
    incrementWarningCount,
    resetWarningCount
};

