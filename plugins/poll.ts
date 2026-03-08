import type { BotContext } from '../types.js';
export default {
    command: 'poll',
    aliases: ['createpoll', 'newpoll'],
    category: 'group',
    description: 'Create a native WhatsApp poll in the group',
    usage: '.poll <Question> | <Option1> | <Option2> | ...',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        const fullText = args.join(' ');
        const parts = fullText.split('|').map((p: string) => p.trim()).filter(Boolean);

        if (parts.length < 3) {
            return await sock.sendMessage(chatId, {
                text: `*📊 CREATE A POLL*\n\n` +
                      `*Usage:*\n\`.poll <Question> | <Option1> | <Option2> | ...\`\n\n` +
                      `*Example:*\n\`.poll Favourite color? | Red | Blue | Green | Yellow\`\n\n` +
                      `_Minimum 2 options. Maximum 12 options._`,
                ...channelInfo
            }, { quoted: message });
        }

        const question = parts[0];
        const options = parts.slice(1);

        if (options.length > 12) {
            return await sock.sendMessage(chatId, {
                text: '❌ Maximum 12 options allowed.',
                ...channelInfo
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, {
                poll: {
                    name: question,
                    values: options,
                    selectableCount: 1
                }
            });
        } catch (e: any) {
            console.error('[POLL] Error sending poll:', e.message);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to create poll. Please try again.',
                ...channelInfo
            }, { quoted: message });
        }
    }
};
