import type { BotContext } from '../types.js';
export default {
    command: 'setgname',
    aliases: ['setname', 'groupname'],
    category: 'admin',
    description: 'Change group name',
    usage: '.setgname <new name>',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const name = args.join(' ').trim();

        if (!name) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please provide a group name*\n\nUsage: `.setgname <new name>`'
            }, { quoted: message });
            return;
        }

        try {
            await sock.groupUpdateSubject(chatId, name);
            await sock.sendMessage(chatId, {
                text: `✅ *Group name updated to:*\n${name}`
            }, { quoted: message });
        } catch(error: any) {
            console.error('Error updating group name:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Failed to update group name*\n\nMake sure the bot is an admin.'
            }, { quoted: message });
        }
    }
};
