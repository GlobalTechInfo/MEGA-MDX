import fs from 'fs';
import path from 'path';
import { dataFile } from '../lib/paths.js';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const configPath = dataFile('autoreplies.json');

interface AutoReply {
    trigger: string;
    response: string;
    exactMatch: boolean;
    addedBy: string;
    createdAt: number;
}

interface AutoReplyConfig {
    enabled: boolean;
    replies: AutoReply[];
}

async function initConfig(): Promise<AutoReplyConfig> {
    if (HAS_DB) {
        const config = await store.getSetting('global', 'autoreplies');
        return config || { enabled: true, replies: [] };
    } else {
        if (!fs.existsSync(configPath)) {
            const dataDir = path.dirname(configPath);
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify({ enabled: true, replies: [] }, null, 2));
        }
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
}

async function saveConfig(config: AutoReplyConfig) {
    if (HAS_DB) {
        await store.saveSetting('global', 'autoreplies', config);
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
}

// Named export — imported in lib/messageHandler.ts
export async function handleAutoReply(sock: any, chatId: string, message: any, userMessage: string): Promise<boolean> {
    try {
        const config = await initConfig();
        if (!config.enabled || !config.replies.length) return false;

        const lowerMsg = userMessage.toLowerCase().trim();

        for (const reply of config.replies) {
            const trigger = reply.trigger.toLowerCase();
            const matched = reply.exactMatch
                ? lowerMsg === trigger
                : lowerMsg.includes(trigger);

            if (matched) {
                const senderName = message.pushName || 'there';
                const responseText = reply.response.replace(/\{name\}/gi, senderName);

                await sock.sendMessage(chatId, {
                    text: responseText,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363319098372999@newsletter',
                            newsletterName: 'GlobalTechInc',
                            serverMessageId: -1
                        }
                    }
                }, { quoted: message });

                return true;
            }
        }
    } catch (e: any) {
        console.error('[AUTOREPLY] Error:', e.message);
    }
    return false;
}

export { initConfig, saveConfig };

export default {
    command: 'autoreply',
    aliases: ['ar', 'autorespond'],
    category: 'owner',
    description: 'Toggle the auto-reply system on or off',
    usage: '.autoreply <on|off>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        try {
            const config = await initConfig();
            const action = args[0]?.toLowerCase();

            if (!action) {
                return await sock.sendMessage(chatId, {
                    text: `*🤖 AUTO-REPLY STATUS*\n\n` +
                          `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                          `*Total Replies:* ${config.replies.length}\n` +
                          `*Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                          `*Commands:*\n` +
                          `• \`.autoreply on\` - Enable\n` +
                          `• \`.autoreply off\` - Disable\n` +
                          `• \`.addreply\` - Add a new trigger\n` +
                          `• \`.delreply\` - Remove a trigger\n` +
                          `• \`.listreplies\` - View all triggers`,
                    ...channelInfo
                }, { quoted: message });
            }

            if (action === 'on' || action === 'enable') {
                if (config.enabled) {
                    return await sock.sendMessage(chatId, {
                        text: '⚠️ *Auto-reply is already enabled*',
                        ...channelInfo
                    }, { quoted: message });
                }
                config.enabled = true;
                await saveConfig(config);
                return await sock.sendMessage(chatId, {
                    text: '✅ *Auto-reply enabled!*\n\nBot will now respond to configured triggers.',
                    ...channelInfo
                }, { quoted: message });
            }

            if (action === 'off' || action === 'disable') {
                if (!config.enabled) {
                    return await sock.sendMessage(chatId, {
                        text: '⚠️ *Auto-reply is already disabled*',
                        ...channelInfo
                    }, { quoted: message });
                }
                config.enabled = false;
                await saveConfig(config);
                return await sock.sendMessage(chatId, {
                    text: '❌ *Auto-reply disabled!*\n\nBot will no longer respond to triggers.',
                    ...channelInfo
                }, { quoted: message });
            }

            return await sock.sendMessage(chatId, {
                text: '❌ *Invalid option!*\n\nUse: `.autoreply on` or `.autoreply off`',
                ...channelInfo
            }, { quoted: message });

        } catch (e: any) {
            console.error('Error in autoreply command:', e);
            await sock.sendMessage(chatId, {
                text: '❌ *Error processing command!*',
                ...channelInfo
            }, { quoted: message });
        }
    },

    handleAutoReply,
    initConfig,
    saveConfig
};
