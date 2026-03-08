
export default {
    command: 'stupid',
    aliases: ['stupidcard', 'dumb'],
    category: 'group',
    description: 'Generate a stupid card for a user',
    usage: '.stupid (reply to user, mention someone, or add text)',
    async handler(sock: any, message: any, args: any, context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;

        const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        const who = quotedMsg
            ? quotedMsg.sender
            : mentionedJid && mentionedJid[0]
                ? mentionedJid[0]
                : sender;

        const text = args && args.length > 0 ? args.join(' ') : 'im+stupid';

        try {
            let avatarUrl;
            try {
                avatarUrl = await sock.profilePictureUrl(who, 'image');
            } catch(error: any) {
                console.error('Error fetching profile picture:', error);
                avatarUrl = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'; // Default avatar
            }

            const apiUrl = `https://api.popcat.xyz/its-so-stupid?image=${encodeURIComponent(avatarUrl)}&text=${encodeURIComponent(text)}`;
            const response = await fetch(apiUrl);

            if (!response.ok) throw new Error(`API responded with status: ${response.status}`);

            const imageBuffer = Buffer.from(await response.arrayBuffer());

            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `*@${who.split('@')[0]}*`,
                mentions: [who]
            }, { quoted: message });

        } catch(error: any) {
            console.error('Stupid Command Error:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Sorry, I couldn\'t generate the stupid card. Please try again later!'
            }, { quoted: message });
        }
    }
};
