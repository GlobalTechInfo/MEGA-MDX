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
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/


import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    command: 'vnote',
    aliases: ['voicenote', 'vn'],
    category: 'tools',
    description: 'Convert any audio message into a live-looking voice note',
    usage: 'Reply to an audio file with .vnote',

    async handler(sock: any, message: any, args: any, context: any = {}) {
        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || chatId;

        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.audioMessage) {
            return sock.sendMessage(chatId, { text: "Please reply to an *audio file* to convert it to a PTT." }, { quoted: message });
        }

        try {
            const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio');
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            await sock.sendMessage(chatId, { 
                audio: buffer, 
                ptt: true, 
                mimetype: 'audio/ogg; codecs=opus' 
            }, { quoted: message });

        } catch(error: any) {
            console.error('PTT Conversion Error:', error);
            await sock.sendMessage(chatId, { text: "❌ Failed to convert audio to voice note." });
        }
    }
};

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
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/
