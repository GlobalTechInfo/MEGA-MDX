import type { BotContext } from '../types.js';
import isAdmin from '../lib/isAdmin.js';

export default {
    command: 'disappear',
    aliases: ['ephemeral', 'disappearing', 'vanish'],
    category: 'admin',
    description: 'Enable or disable disappearing messages in chat',
    usage: '.disappear off | .disappear 24h | .disappear 7d | .disappear 90d',

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const isGroup = chatId.endsWith('@g.us');
        const senderId = context.senderId || message.key.participant || message.key.remoteJid;
        const senderIsOwnerOrSudo = context.senderIsOwnerOrSudo || false;

        // Permission check
        if (isGroup && !senderIsOwnerOrSudo) {
            const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
            if (!isSenderAdmin) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Only group admins or bot owner can change disappearing messages.',
                    ...channelInfo
                }, { quoted: message });
            }
        }

        if (!isGroup && !senderIsOwnerOrSudo && !message.key.fromMe) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only the bot owner can change disappearing messages in DMs.',
                ...channelInfo
            }, { quoted: message });
        }

        const input = args[0]?.toLowerCase();

        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `*⏳ DISAPPEARING MESSAGES*\n\n` +
                      `*Usage:*\n` +
                      `• \`.disappear off\` — Disable\n` +
                      `• \`.disappear 24h\` — 24 hours\n` +
                      `• \`.disappear 7d\` — 7 days (default)\n` +
                      `• \`.disappear 90d\` — 90 days`,
                ...channelInfo
            }, { quoted: message });
        }

        const durations: Record<string, number | false> = {
            'off': false,
            '0':   false,
            '24h': 86400,
            '1d':  86400,
            '7d':  604800,
            '1w':  604800,
            '90d': 7776000,
            '3m':  7776000,
        };

        if (!(input in durations)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Invalid option: *${input}*\n\nChoose: \`off\`, \`24h\`, \`7d\`, \`90d\``,
                ...channelInfo
            }, { quoted: message });
        }

        const seconds = durations[input];

        try {
            await sock.sendMessage(chatId, {
                disappearingMessagesInChat: seconds === false ? false : seconds
            });

            const labels: Record<string, string> = {
                'off': '❌ Disappearing messages *disabled*',
                '0':   '❌ Disappearing messages *disabled*',
                '24h': '⏳ Disappearing messages set to *24 hours*',
                '1d':  '⏳ Disappearing messages set to *24 hours*',
                '7d':  '⏳ Disappearing messages set to *7 days*',
                '1w':  '⏳ Disappearing messages set to *7 days*',
                '90d': '⏳ Disappearing messages set to *90 days*',
                '3m':  '⏳ Disappearing messages set to *90 days*',
            };

            await sock.sendMessage(chatId, {
                text: labels[input],
                ...channelInfo
            }, { quoted: message });

        } catch (e: any) {
            console.error('[DISAPPEAR] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to change disappearing messages: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
