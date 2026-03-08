import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { uploadToLitterbox } from '../lib/uploaders.js';

export default {
    command: 'litterbox',
    aliases: ['tempup', 'litter', 'litr'],
    category: 'upload',
    description: 'Upload temporarily (1h/12h/24h/72h)',
    usage: '.litterbox <1h/12h/24h/72h> (reply to media)',
    async handler(sock: any, message: any, args: any, context: any) {
        const chatId = context.chatId || message.key.remoteJid;

        try {
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please reply to media!' }, { quoted: message });
                return;
            }

            const type = Object.keys(quotedMsg)[0];
            const supportedTypes = ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'];

            if (!supportedTypes.includes(type)) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported type!' }, { quoted: message });
                return;
            }

            const time = args[0] || '1h';
            const validTimes = ['1h', '12h', '24h', '72h'];
            const uploadTime = validTimes.includes(time) ? time : '1h';

            await sock.sendMessage(chatId, { text: `Uploading to Litterbox (${uploadTime})...` }, { quoted: message });

            const mediaType = type === 'stickerMessage' ? 'sticker' : type.replace('Message', '');
            const stream = await downloadContentFromMessage(quotedMsg[type], mediaType as any);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            let ext = 'bin';
            if (type === 'imageMessage') ext = 'jpg';
            else if (type === 'videoMessage') ext = 'mp4';
            else if (type === 'stickerMessage') ext = 'webp';
            else if (quotedMsg[type].fileName) {
                ext = quotedMsg[type].fileName.split('.').pop() || 'bin';
            }

            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const tempPath = path.join(tempDir, `litterbox_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);

            const result = await uploadToLitterbox(tempPath, uploadTime);

            await sock.sendMessage(chatId, {
                text: `✅ *Litterbox Upload Success!*\n\n` +
                      `⏰ *Expires:* ${result.expires}\n` +
                      `🔗 *URL:* ${result.url}\n\n` +
                      `_Link will expire after ${result.expires}_`
            }, { quoted: message });

            fs.unlinkSync(tempPath);

        } catch(error: any) {
            console.error('Litterbox Error:', error);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
        }
    }
};
