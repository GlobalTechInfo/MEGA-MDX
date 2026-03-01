import fetch from 'node-fetch';

export default {
    command: 'simp',
    aliases: ['simpcard'],
    category: 'group',
    description: 'Generate a simp card for a user',
    usage: '.simp (reply to user or mention someone)',
    async handler(sock: any, message: any, args: any, context: any = {}) {
        const chatId = context.chatId || message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;

        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        let who = quotedMsg 
            ? quotedMsg.sender 
            : mentionedJid && mentionedJid[0] 
                ? mentionedJid[0] 
                : sender;

        try {
            let avatarUrl;
            try {
                avatarUrl = await sock.profilePictureUrl(who, 'image');
            } catch(error: any) {
                console.error('Error fetching profile picture:', error);
                avatarUrl = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'; // Default avatar
            }

            const apiUrl = `https://some-random-api.com/canvas/misc/simpcard?avatar=${encodeURIComponent(avatarUrl)}`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const imageBuffer = await response.buffer();

            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: '*your religion is simping*',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363319098372999@newsletter',
                        newsletterName: 'MEGA MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });

        } catch(error: any) {
            console.error('Simp Command Error:', error);
            await sock.sendMessage(chatId, { 
                text: '❌ Sorry, I couldn\'t generate the simp card. Please try again later!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363319098372999@newsletter',
                        newsletterName: 'MEGA MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        }
    }
};
