import type { BotContext } from '../types.js';
export default {
    command: 'invitelink',
    aliases: ['invite', 'grouplink', 'gclink', 'revokeinvite', 'resetlink'],
    category: 'group',
    description: 'Get or revoke the group invite link',
    usage: '.invitelink — get link\n.revokeinvite — reset link',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const isBotAdmin = context.isBotAdmin || false;

        const isRevoke = rawText.startsWith('.revokeinvite') || rawText.startsWith('.resetlink') || args[0]?.toLowerCase() === 'revoke';

        if (isRevoke && !isBotAdmin) {
            return await sock.sendMessage(chatId, {
                text: `❌ Bot needs to be an admin to revoke the invite link.`,
                ...channelInfo
            }, { quoted: message });
        }

        try {
            if (isRevoke) {
                const newCode = await sock.groupRevokeInvite(chatId);
                return await sock.sendMessage(chatId, {
                    text: `🔄 *Invite link reset!*\n\n*New Link:*\nhttps://chat.whatsapp.com/${newCode}`,
                    ...channelInfo
                }, { quoted: message });
            } else {
                const code = await sock.groupInviteCode(chatId);
                return await sock.sendMessage(chatId, {
                    text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}\n\n_Use \`.revokeinvite\` to reset this link._`,
                    ...channelInfo
                }, { quoted: message });
            }
        } catch (e: any) {
            console.error('[INVITELINK] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
