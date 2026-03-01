export default {
    command: 'setgdesc',
    aliases: ['setdesc', 'groupdesc'],
    category: 'admin',
    description: 'Change group description',
    usage: '.setgdesc <new description>',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any, context: any = {}) {
        const chatId = context.chatId || message.key.remoteJid;
        const desc = args.join(' ').trim();

        if (!desc) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please provide a description*\n\nUsage: `.setgdesc <description>`'
            }, { quoted: message });
            return;
        }

        try {
            await sock.groupUpdateDescription(chatId, desc);
            await sock.sendMessage(chatId, {
                text: '✅ *Group description updated successfully!*'
            }, { quoted: message });
        } catch(error: any) {
            console.error('Error updating group description:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Failed to update group description*\n\nMake sure the bot is an admin.'
            }, { quoted: message });
        }
    }
};
