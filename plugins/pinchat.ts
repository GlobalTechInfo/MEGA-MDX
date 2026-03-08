import type { BotContext } from '../types.js';
export default {
    command: 'pinchat',
    aliases: ['pin', 'unpin', 'unpinchat'],
    category: 'owner',
    description: 'Pin or unpin the current chat',
    usage: '.pinchat pin | .pinchat unpin',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();

        const shouldPin = !rawText.startsWith('.unpin');

        try {
            await sock.chatModify({ pin: shouldPin }, chatId);
            await sock.sendMessage(chatId, {
                text: shouldPin ? `📌 *Chat pinned!*` : `📌 *Chat unpinned!*`,
                ...channelInfo
            }, { quoted: message });
        } catch (e: any) {
            console.error('[PINCHAT] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${shouldPin ? 'pin' : 'unpin'} chat: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
