/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *****************************************************************************/

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default {
    command: 'vnote',
    aliases: ['voicenote', 'vn'],
    category: 'tools',
    description: 'Convert any audio message into a voice note',
    usage: 'Reply to an audio file with .vnote',

    async handler(sock: any, message: any, args: any, _context: any) {
        const chatId = message.key.remoteJid;

        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.audioMessage) {
            return sock.sendMessage(chatId, {
                text: '❌ Please reply to an *audio file* to convert it to a voice note.'
            }, { quoted: message });
        }

        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const tmpIn = path.join(tmpDir, `vnote_in_${Date.now()}`);
        const tmpOut = path.join(tmpDir, `vnote_out_${Date.now()}.ogg`);

        try {
            const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            console.log('[VNOTE] original size:', buffer.length, 'mimetype:', quoted.audioMessage.mimetype);

            fs.writeFileSync(tmpIn, buffer);

            await execAsync(`ffmpeg -y -i "${tmpIn}" -c:a libopus -b:a 64k -ar 48000 -ac 1 "${tmpOut}"`);

            const opusBuffer = fs.readFileSync(tmpOut);
            console.log('[VNOTE] converted size:', opusBuffer.length);

            await sock.sendMessage(chatId, {
                audio: opusBuffer,
                ptt: true,
                mimetype: 'audio/ogg; codecs=opus'
            }, { quoted: message });

        } catch(error: any) {
            console.error('[VNOTE] Error:', error.message);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to convert audio to voice note.'
            }, { quoted: message });
        } finally {
            try { fs.unlinkSync(tmpIn); } catch {}
            try { fs.unlinkSync(tmpOut); } catch {}
        }
    }
};
