import type { BotContext } from '../types.js';
import fs from 'fs';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);


const bannedFilePath = './data/banned.json';

async function getBannedUsers() {
    if (HAS_DB) {
        const banned = await store.getSetting('global', 'banned');
        return banned || [];
    } else {
        if (fs.existsSync(bannedFilePath)) {
            return JSON.parse(fs.readFileSync(bannedFilePath, "utf-8"));
        }
        return [];
    }
}

async function saveBannedUsers(bannedUsers: any) {
    if (HAS_DB) {
        await store.saveSetting('global', 'banned', bannedUsers);
    } else {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data', { recursive: true });
        }
        fs.writeFileSync(bannedFilePath, JSON.stringify(bannedUsers, null, 2));
    }
}

async function isUserBanned(userId: any) {
    const bannedUsers = await getBannedUsers();
    return bannedUsers.includes(userId);
}

export default {
    command: 'ban',
    aliases: ['block', 'banuser'],
    category: 'admin',
    description: 'Ban a user from using the bot',
    usage: '.ban @user or reply to message',

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const _isGroup = context.isGroup;

        let userToBan;
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToBan = message.message.extendedTextMessage.contextInfo.participant;
        }

        if (!userToBan) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please mention a user or reply to their message*\n\nUsage: `.ban @user` or reply with `.ban`',
                ...channelInfo
            }, { quoted: message });
            return;
        }

        try {
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (userToBan === botId || userToBan === botId.replace('@s.whatsapp.net', '@lid')) {
                await sock.sendMessage(chatId, {
                    text: '❌ *Cannot ban the bot account*',
                    ...channelInfo
                }, { quoted: message });
                return;
            }
        } catch(e: any) {}

        try {
            const bannedUsers = await getBannedUsers();

            if (!bannedUsers.includes(userToBan)) {
                bannedUsers.push(userToBan);
                await saveBannedUsers(bannedUsers);

                await sock.sendMessage(chatId, {
                    text: `🚫 *User Banned Successfully!*\n\n@${userToBan.split('@')[0]} has been banned from using the bot.\n\n` +
                          `*Storage:* ${HAS_DB ? 'Database' : 'File System'}`,
                    mentions: [userToBan],
                    ...channelInfo
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, {
                    text: `⚠️ *Already Banned*\n\n@${userToBan.split('@')[0]} is already banned!`,
                    mentions: [userToBan],
                    ...channelInfo
                }, { quoted: message });
            }
        } catch(error: any) {
            console.error('Error in ban command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Failed to ban user!*\n\nPlease try again.',
                ...channelInfo
            }, { quoted: message });
        }
    }
};

export { getBannedUsers };
export { saveBannedUsers };
export { isUserBanned };
