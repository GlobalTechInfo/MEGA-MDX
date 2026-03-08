import type { BotContext } from '../types.js';
import { File } from 'megajs';
import path from 'path';

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateBar = (percentage: number): string => {
    const totalBars = 10;
    const filledBars = Math.floor((percentage / 100) * totalBars);
    return '█'.repeat(filledBars) + '░'.repeat(totalBars - filledBars);
};

const MIME_TYPES: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.apk': 'application/vnd.android.package-archive',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp3': 'audio/mpeg',
    '.mkv': 'video/x-matroska'
};

export default {
    command: 'mega',
    aliases: ['megadl'],
    category: 'download',
    description: 'Download from MEGA with real-time progress',
    usage: '.mega <mega-url>',

    async handler(sock: any, message: any, args: string[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const text = args.join(' ').trim();

        if (!text) {
            return sock.sendMessage(
                chatId,
                { text: `*Usage:* .mega https://mega.nz/file/xxxx#xxxx` },
                { quoted: message }
            );
        }

        try {
            const file = File.fromURL(text);
            await file.loadAttributes();

            if (file.size >= 500 * 1024 * 1024) {
                return sock.sendMessage(
                    chatId,
                    { text: '❌ *Error:* File too large (Limit: 500MB)' },
                    { quoted: message }
                );
            }

            const { key } = await sock.sendMessage(chatId, {
                text: `🌩️ *MEGA DOWNLOAD*\n\n▢ *File:* ${file.name}\n▢ *Size:* ${formatBytes(file.size)}\n\n*Progress:* 0% [░░░░░░░░░░]`
            }, { quoted: message });

            const stream = (file as any).download();
            const chunks: Buffer[] = [];
            let lastUpdate = Date.now();

            stream.on('progress', async (info: { bytesLoaded: number; bytesTotal: number }) => {
                const { bytesLoaded, bytesTotal } = info;
                const percentage = Math.floor((bytesLoaded / bytesTotal) * 100);

                if (Date.now() - lastUpdate > 3000 || percentage === 100) {
                    const bar = generateBar(percentage);
                    await sock.sendMessage(chatId, {
                        text: `🌩️ *MEGA DOWNLOAD*\n\n▢ *File:* ${file.name}\n▢ *Size:* ${formatBytes(bytesTotal)}\n\n*Progress:* ${percentage}% [${bar}]`,
                        edit: key
                    });
                    lastUpdate = Date.now();
                }
            });

            stream.on('data', (chunk: Buffer) => chunks.push(chunk));

            stream.on('end', async () => {
                const buffer = Buffer.concat(chunks);
                const ext = path.extname(file.name ?? '').toLowerCase();

                await sock.sendMessage(chatId, {
                    document: buffer,
                    fileName: file.name,
                    mimetype: MIME_TYPES[ext] || 'application/octet-stream',
                    caption: `✅ *Download Complete*\n▢ *File:* ${file.name}\n▢ *Size:* ${formatBytes(file.size)}`
                }, { quoted: message });
            });

            stream.on('error', async (err: Error) => {
                await sock.sendMessage(chatId, { text: `❌ *Download Error:* ${err.message}` }, { quoted: message });
            });

        } catch (error: any) {
            await sock.sendMessage(chatId, { text: `❌ *Error:* ${error.message}` }, { quoted: message });
        }
    }
};
