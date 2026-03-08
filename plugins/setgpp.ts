import type { BotContext } from '../types.js';
import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    command: 'setgpp',
    aliases: ['setgpic', 'grouppp', 'setgrouppic'],
    category: 'admin',
    description: 'Change group profile picture',
    usage: '.setgpp (reply to image)',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;

        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = quoted?.imageMessage || quoted?.stickerMessage;

        if (!imageMessage) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please reply to an image or sticker*\n\nUsage: Reply to an image with `.setgpp`'
            }, { quoted: message });
            return;
        }

        try {
            const tmpDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const imgPath = path.join(tmpDir, `gpp_${Date.now()}.jpg`);
            fs.writeFileSync(imgPath, buffer);

            await sock.updateProfilePicture(chatId, { url: imgPath });

            try {
                fs.unlinkSync(imgPath);
            } catch(e: any) {}

            await sock.sendMessage(chatId, {
                text: '✅ *Group profile picture updated successfully!*'
            }, { quoted: message });

        } catch(error: any) {
            console.error('Error updating group photo:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Failed to update group profile picture*\n\nMake sure the bot is an admin and the image is valid.'
            }, { quoted: message });
        }
    }
};
