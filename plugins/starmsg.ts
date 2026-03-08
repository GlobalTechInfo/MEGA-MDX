import type { BotContext } from '../types.js';
export default {
    command: 'star',
    aliases: ['starmsg', 'unstar', 'unstarmsg'],
    category: 'owner',
    description: 'Star or unstar a replied message',
    usage: '.star — reply to a message | .unstar — reply to a message',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const shouldStar = !rawText.startsWith('.unstar');

        // contextInfo can be nested in any message type
        const msg = message.message;
        const contextInfo =
            msg?.extendedTextMessage?.contextInfo ||
            msg?.imageMessage?.contextInfo ||
            msg?.videoMessage?.contextInfo ||
            msg?.audioMessage?.contextInfo ||
            msg?.documentMessage?.contextInfo ||
            msg?.stickerMessage?.contextInfo ||
            msg?.buttonsResponseMessage?.contextInfo ||
            null;

        if (!contextInfo?.stanzaId) {
            return await sock.sendMessage(chatId, {
                text: `*⭐ STAR MESSAGE*\n\n_Reply to any message with:_\n• \`.star\` — to star it\n• \`.unstar\` — to unstar it`,
                ...channelInfo
            }, { quoted: message });
        }

        const targetId = contextInfo.stanzaId;

        // Determine fromMe: compare phone numbers only (strip :xx@suffix)
        const botNum = (sock.user?.id || '').split(':')[0].split('@')[0];
        const participantNum = (contextInfo.participant || '').split(':')[0].split('@')[0];
        const fromMe = participantNum ? participantNum === botNum : message.key.fromMe;

        try {
            await sock.chatModify(
                {
                    star: {
                        messages: [{ id: targetId, fromMe }],
                        star: shouldStar
                    }
                },
                chatId
            );
            await sock.sendMessage(chatId, {
                text: shouldStar ? `⭐ *Message starred!*` : `✴️ *Message unstarred!*`,
                ...channelInfo
            }, { quoted: message });
        } catch (e: any) {
            console.error('[STARMSG] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${shouldStar ? 'star' : 'unstar'} message: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
