import type { BotContext } from '../types.js';
import { initConfig } from './autoreply.js';

export default {
    command: 'listreplies',
    aliases: ['autoreplies', 'replylist', 'replies'],
    category: 'owner',
    description: 'List all configured auto-reply triggers',
    usage: '.listreplies',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        const config = await initConfig();

        if (config.replies.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `📭 *No auto-replies configured yet*\n\nStatus: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n\nUse \`.addreply <trigger> | <response>\` to add one!`,
                ...channelInfo
            }, { quoted: message });
        }

        const lines = config.replies.map((r, i) => {
            const preview = r.response.length > 40
                ? r.response.substring(0, 40) + '...'
                : r.response;
            const matchIcon = r.exactMatch ? '🎯' : '🔍';
            return `${i + 1}. ${matchIcon} *${r.trigger}*\n    ↳ ${preview}`;
        }).join('\n\n');

        await sock.sendMessage(chatId, {
            text: `*🤖 AUTO-REPLIES (${config.replies.length})*\n` +
                  `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
                  `${lines}\n\n` +
                  `🎯 = exact match | 🔍 = contains\n` +
                  `_Use .delreply <trigger> to remove one_`,
            ...channelInfo
        }, { quoted: message });
    }
};
