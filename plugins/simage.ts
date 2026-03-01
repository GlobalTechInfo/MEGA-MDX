import sharp from 'sharp';
import fs from 'fs';
import fsPromises from 'fs/promises';
import fse from 'fs-extra';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const tempDir = './temp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const scheduleFileDeletion = (filePath) => {
    setTimeout(async () => {
        try {
            await fse.remove(filePath);
            console.log(`File deleted: ${filePath}`);
        } catch(error: any) {
            console.error(`Failed to delete file:`, error);
        }
    }, 10000); // 10 seconds
};

export default {
    command: 's2img',
    aliases: ['simage', 'stoimg'],
    category: 'stickers',
    description: 'Convert a sticker to an image',
    usage: '.s2img (reply to a sticker)',
    async handler(sock: any, message: any, args: any, context: any = {}) {
        const chatId = context.chatId || message.key.remoteJid;

        try {
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMessage?.stickerMessage) {
                await sock.sendMessage(chatId, { text: '⚠️ Reply to a sticker with .simage to convert it.' }, { quoted: message });
                return;
            }

            const stickerFilePath = path.join(tempDir, `sticker_${Date.now()}.webp`);
            const outputImagePath = path.join(tempDir, `converted_image_${Date.now()}.png`);

            const stream = await downloadContentFromMessage(quotedMessage.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            await fsPromises.writeFile(stickerFilePath, buffer);
            await sharp(stickerFilePath).toFormat('png').toFile(outputImagePath);

            const imageBuffer = await fsPromises.readFile(outputImagePath);
            await sock.sendMessage(chatId, { image: imageBuffer, caption: '✨ Here is the converted image!' }, { quoted: message });

            scheduleFileDeletion(stickerFilePath);
            scheduleFileDeletion(outputImagePath);

        } catch(error: any) {
            console.error('SImage Command Error:', error);
            await sock.sendMessage(chatId, { text: '❌ An error occurred while converting the sticker.' }, { quoted: message });
        }
    }
};
