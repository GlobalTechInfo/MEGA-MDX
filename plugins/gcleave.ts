import type { BotContext } from '../types.js';
export default {
    command: 'gcleave',
    aliases: ['leavegroup', 'groupleave', 'leavegc'],
    category: 'owner',
    description: 'Make the bot leave a group',
    usage: '.groupleave — leave current group\n.groupleave <jid> — leave specific group',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        const targetJid = args[0]?.includes('@g.us') ? args[0] : chatId;

        if (!targetJid.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: `❌ This command only works in groups.\n\nTo leave a specific group: \`.groupleave 1234567890-1234567890@g.us\``,
                ...channelInfo
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(targetJid, {
                text: `👋 *Bot is leaving the group.*\n\n_Goodbye everyone!_`,
                ...channelInfo
            });
            await new Promise(r => setTimeout(r, 500));
            await sock.groupLeave(targetJid);

            // If triggered from another chat, confirm there
            if (targetJid !== chatId) {
                await sock.sendMessage(chatId, {
                    text: `✅ Left group: \`${targetJid}\``,
                    ...channelInfo
                }, { quoted: message });
            }
        } catch (e: any) {
            console.error('[GROUPLEAVE] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to leave group: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
