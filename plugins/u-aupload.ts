import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { uploadFile } from '../lib/uploaders.js';

export default {
    command: 'aupload',
    aliases: ['upall', 'aup', 'toall'],
    category: 'upload',
    description: 'Upload media to cloud and get URL',
    usage: '.aupload (reply to image/video/gif/sticker)',
    async handler(sock: any, message: any, args: any, context: any) {
        const chatId = context.chatId || message.key.remoteJid;

        try {
            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await sock.sendMessage(chatId, { text: '⚠️ Please reply to an image, video, GIF, or sticker!' }, { quoted: message });
                return;
            }

            const type = Object.keys(quotedMsg)[0];
            const supportedTypes = ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage'];

            if (!supportedTypes.includes(type)) {
                await sock.sendMessage(chatId, { text: '⚠️ Unsupported file type! Reply to image/video/gif/sticker/document' }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, { text: 'Uploading to cloud...' }, { quoted: message });

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
            else if (type === 'documentMessage') {
                const fileName = quotedMsg[type].fileName || 'file';
                ext = fileName.split('.').pop() || 'bin';
            }

            const tempDir = path.join('./temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const tempPath = path.join(tempDir, `upload_${Date.now()}.${ext}`);
            fs.writeFileSync(tempPath, buffer);

            const stats = fs.statSync(tempPath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            const result = await uploadFile(tempPath);

            await sock.sendMessage(chatId, {
                text: `✅ *Upload Successful!*\n\n` +
                      `📊 *Service:* ${result.service}\n` +
                      `📦 *Size:* ${fileSizeMB} MB\n` +
                      `🔗 *URL:* ${result.url}\n\n` +
                      `_Click the link to view/download_`
            }, { quoted: message });

            fs.unlinkSync(tempPath);

        } catch(error: any) {
            console.error('Upload Error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ Upload failed!\n\nError: ${error.message}`
            }, { quoted: message });
        }
    }
};
