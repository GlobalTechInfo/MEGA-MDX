import fs from 'fs';
import path from 'path';
import { dataFile } from '../lib/paths.js';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);


const configPath = dataFile('autotyping.json');

async function initConfig() {
    if (HAS_DB) {
        const config = await store.getSetting('global', 'autotyping');
        return config || { enabled: false };
    } else {
        if (!fs.existsSync(configPath)) {
            const dataDir = path.dirname(configPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
        }
        return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
}

async function saveConfig(config) {
    if (HAS_DB) {
        await store.saveSetting('global', 'autotyping', config);
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
}

async function isAutotypingEnabled() {
    try {
        const config = await initConfig();
        return config.enabled;
    } catch(error: any) {
        console.error('Error checking autotyping status:', error);
        return false;
    }
}

async function isGhostModeActive() {
    try {
        const ghostMode = await store.getSetting('global', 'stealthMode');
        return ghostMode && ghostMode.enabled;
    } catch(error: any) {
        return false;
    }
}

export async function handleAutotypingForMessage(sock, chatId, userMessage) {
    const ghostActive = await isGhostModeActive();
    if (ghostActive) {
        return false;
    }

    const enabled = await isAutotypingEnabled();
    if (enabled) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(resolve => setTimeout(resolve, 500));

            await sock.sendPresenceUpdate('composing', chatId);
            const typingDelay = Math.max(3000, Math.min(8000, userMessage.length * 150));
            await new Promise(resolve => setTimeout(resolve, typingDelay));

            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sock.sendPresenceUpdate('paused', chatId);

            return true;
        } catch(error: any) {
            console.error('Error sending typing indicator:', error);
            return false;
        }
    }
    return false;
}

async function handleAutotypingForCommand(sock, chatId) {
    const ghostActive = await isGhostModeActive();
    if (ghostActive) {
        return false;
    }

    const enabled = await isAutotypingEnabled();
    if (enabled) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(resolve => setTimeout(resolve, 500));

            await sock.sendPresenceUpdate('composing', chatId);
            const commandTypingDelay = 3000;
            await new Promise(resolve => setTimeout(resolve, commandTypingDelay));

            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sock.sendPresenceUpdate('paused', chatId);

            return true;
        } catch(error: any) {
            console.error('Error sending command typing indicator:', error);
            return false;
        }
    }
    return false;
}

export async function showTypingAfterCommand(sock, chatId) {
    const ghostActive = await isGhostModeActive();
    if (ghostActive) {
        return false;
    }

    const enabled = await isAutotypingEnabled();
    if (enabled) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch(error: any) {
            console.error('Error sending post-command typing indicator:', error);
            return false;
        }
    }
    return false;
}

export default {
    command: 'autotyping',
    aliases: ['typing', 'autotype'],
    category: 'owner',
    description: 'Toggle auto-typing indicator when bot is processing messages',
    usage: '.autotyping <on|off>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any, context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        try {
            const config = await initConfig();
            const action = args[0]?.toLowerCase();

            if (!action) {
                const ghostActive = await isGhostModeActive();
                await sock.sendMessage(chatId, {
                    text: `*⌨️ AUTOTYPING STATUS*\n\n` +
                          `*Current Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                          `*Ghost Mode:* ${ghostActive ? '👻 Active (blocks typing)' : '❌ Inactive'}\n` +
                          `*Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                          `*Commands:*\n` +
                          `• \`.autotyping on\` - Enable auto-typing\n` +
                          `• \`.autotyping off\` - Disable auto-typing\n\n` +
                          `*What it does:*\n` +
                          `When enabled, the bot will show "typing..." indicator while processing messages and commands.\n\n` +
                          `*Note:* Ghost mode overrides autotyping to maintain stealth.`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }

            if (action === 'on' || action === 'enable') {
                if (config.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Autotyping is already enabled*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                config.enabled = true;
                await saveConfig(config);

                const ghostActive = await isGhostModeActive();
                await sock.sendMessage(chatId, {
                    text: `✅ *Auto-typing enabled!*\n\nThe bot will now show typing indicator while processing.${ghostActive ? '\n\n⚠️ *Ghost mode is active* - typing indicators are currently blocked.' : ''}`,
                    ...channelInfo
                }, { quoted: message });

            } else if (action === 'off' || action === 'disable') {
                if (!config.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Autotyping is already disabled*',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                config.enabled = false;
                await saveConfig(config);

                await sock.sendMessage(chatId, {
                    text: '❌ *Auto-typing disabled!*\n\nThe bot will no longer show typing indicator.',
                    ...channelInfo
                }, { quoted: message });

            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ *Invalid option!*\n\nUse: `.autotyping on/off`',
                    ...channelInfo
                }, { quoted: message });
            }

        } catch(error: any) {
            console.error('Error in autotyping command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Error processing command!*',
                ...channelInfo
            }, { quoted: message });
        }
    },

    isAutotypingEnabled,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand
};

