import { createRequire } from 'module';
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile } from 'fs/promises';
import store from '../lib/lightweight_store.js';

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }

        return totalSize / (1024 * 1024);
    } catch(err: any) {
        console.error('Error getting folder size:', err);
        return 0;
    }
};

const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        
        if (sizeMB > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
        }
    } catch(err: any) {
        console.error('Temp cleanup error:', err);
    }
};

setInterval(cleanTempFolderIfLarge, 60 * 1000);

async function loadAntideleteConfig() {
    try {
        if (HAS_DB) {
            const config = await store.getSetting('global', 'antidelete');
            return config || { enabled: false };
        } else {
            if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
            return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        }
    } catch {
        return { enabled: false };
    }
}

async function saveAntideleteConfig(config) {
    try {
        if (HAS_DB) {
            await store.saveSetting('global', 'antidelete', config);
        } else {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        }
    } catch(err: any) {
        console.error('Config save error:', err);
    }
}

export async function storeMessage(sock: any, message: any) {
    try {
        const config = await loadAntideleteConfig();
        if (!config.enabled) return;

        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;

        const sender = message.key.participant || message.key.remoteJid;

        const viewOnceContainer = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        if (viewOnceContainer) {
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content = viewOnceContainer.imageMessage.caption || '';
                const stream = await downloadContentFromMessage(viewOnceContainer.imageMessage, 'image' as any);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content = viewOnceContainer.videoMessage.caption || '';
                const stream = await downloadContentFromMessage(viewOnceContainer.videoMessage, 'video' as any);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            }
        } else if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.imageMessage, 'image' as any);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const stream = await downloadContentFromMessage(message.message.stickerMessage, 'sticker' as any);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.videoMessage, 'video' as any);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const mime = message.message.audioMessage.mimetype || '';
            const ext = mime.includes('mpeg') ? 'mp3' : (mime.includes('ogg') ? 'ogg' : 'mp3');
            const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio' as any);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const senderName = sender.split('@')[0];
                const mediaOptions = {
                    caption: `*Anti-ViewOnce ${mediaType}*\nFrom: @${senderName}`,
                    mentions: [sender]
                };
                if (mediaType === 'image') {
                    await sock.sendMessage(ownerNumber, { image: { url: mediaPath }, ...mediaOptions });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(ownerNumber, { video: { url: mediaPath }, ...mediaOptions });
                }
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch(e: any) {}
        }

    } catch(err: any) {
        console.error('storeMessage error:', err);
    }
}

export async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = await loadAntideleteConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        if (deletedBy.includes(sock.user.id) || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const groupName = original.group ? (await sock.groupMetadata(original.group)).subject : '';

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        let text = `*🔰 ANTIDELETE REPORT 🔰*\n\n` +
            `*🗑️ Deleted By:* @${deletedBy.split('@')[0]}\n` +
            `*👤 Sender:* @${senderName}\n` +
            `*📱 Number:* ${sender}\n` +
            `*🕒 Time:* ${time}\n`;

        if (groupName) text += `*👥 Group:* ${groupName}\n`;

        if (original.content) {
            text += `\n*💬 Deleted Message:*\n${original.content}`;
        }

        await sock.sendMessage(ownerNumber, {
            text,
            mentions: [deletedBy, sender]
        });

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption: `*Deleted ${original.mediaType}*\nFrom: @${senderName}`,
                mentions: [sender]
            };

            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(ownerNumber, {
                            image: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'sticker':
                        await sock.sendMessage(ownerNumber, {
                            sticker: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerNumber, {
                            video: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'audio':
                        await sock.sendMessage(ownerNumber, {
                            audio: { url: original.mediaPath },
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            ...mediaOptions
                        });
                        break;
                }
            } catch(err: any) {
                await sock.sendMessage(ownerNumber, {
                    text: `⚠️ Error sending media: ${err.message}`
                });
            }

            try {
                fs.unlinkSync(original.mediaPath);
            } catch(err: any) {
                console.error('Media cleanup error:', err);
            }
        }

        messageStore.delete(messageId);

    } catch(err: any) {
        console.error('handleMessageRevocation error:', err);
    }
}

export default {
    command: 'antidelete',
    aliases: ['antidel', 'adel'],
    category: 'owner',
    description: 'Enable or disable antidelete feature to track deleted messages',
    usage: '.antidelete <on|off>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any, context: any = {}) {
        const chatId = context.chatId || message.key.remoteJid;
        const config = await loadAntideleteConfig();
        const action = args[0]?.toLowerCase();

        if (!action) {
            await sock.sendMessage(chatId, {
                text: `*🔰 ANTIDELETE SETUP 🔰*\n\n` +
                      `*Current Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                      `*Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                      `*Commands:*\n` +
                      `• \`.antidelete on\` - Enable\n` +
                      `• \`.antidelete off\` - Disable\n\n` +
                      `*Features:*\n` +
                      `• Track deleted messages\n` +
                      `• Save deleted media\n` +
                      `• Auto-save ViewOnce media\n` +
                      `• Send reports to owner`
            }, { quoted: message });
            return;
        }

        if (action === 'on') {
            config.enabled = true;
            await saveAntideleteConfig(config);
            await sock.sendMessage(chatId, {
                text: `✅ *Antidelete enabled!*\n\n` +
                      `Storage: ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                      `The bot will now:\n` +
                      `• Track all messages\n` +
                      `• Monitor deleted messages\n` +
                      `• Save ViewOnce media\n` +
                      `• Send deletion reports to owner`
            }, { quoted: message });
        } else if (action === 'off') {
            config.enabled = false;
            await saveAntideleteConfig(config);
            await sock.sendMessage(chatId, {
                text: `❌ *Antidelete disabled!*\n\n` +
                      `The bot will no longer track deleted messages.`
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: '❌ *Invalid command*\n\nUse: `.antidelete on/off`'
            }, { quoted: message });
        }
    },

    handleMessageRevocation,
    storeMessage,
    loadAntideleteConfig,
    saveAntideleteConfig
};
