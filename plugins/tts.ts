import { gSpeak } from 'gspeak';
import fs from 'fs';
import path from 'path';


export default {
    command: 'tts',
    aliases: ['texttospeech', 'speak'],
    category: 'tools',
    description: 'Convert text to speech and send as an audio message.',
    usage: '.tts <text> [language code]',

    async handler(sock: any, message: any, args: string[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;

        if (!args.length) {
            return sock.sendMessage(
                chatId,
                { text: '*Please provide text for TTS.*\nExample: `.tts Hello world`\nWith language: `.tts Hola mundo es`' },
                { quoted: message }
            );
        }

        let language = 'en';
        if (args.length > 1 && /^[a-z]{2}$/.test(args[args.length - 1])) {
            language = args.pop()!;
        }

        const text = args.join(' ').trim();
        const filePath = path.join(process.cwd(), 'tmp', `tts-${Date.now()}.mp3`);

        const tempDir = path.dirname(filePath);
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        try {
            await new Promise<void>((resolve, reject) => {
                const tts = new gSpeak(text, language);
                tts.save(filePath, (err: Error | null) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            await sock.sendMessage(chatId, {
                audio: { url: filePath },
                mimetype: 'audio/mpeg',
                fileName: 'tts.mp3'
            }, { quoted: message });

        } catch (err: any) {
            console.error('TTS error:', err.message);
            await sock.sendMessage(
                chatId,
                { text: `❌ Failed to generate TTS audio.\nReason: ${err.message}` },
                { quoted: message }
            );
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
    }
};

