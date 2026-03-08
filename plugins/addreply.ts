import type { BotContext } from '../types.js';
import { initConfig, saveConfig } from './autoreply.js';
import config from '../config.js';

export default {
    command: 'addreply',
    aliases: ['newtrigger', 'setreply'],
    category: 'owner',
    description: 'Add an auto-reply trigger',
    usage: `${config.prefix}addreply <trigger> | <response>\nFor exact match: ${config.prefix}addreply exact:<trigger> | <response>\nUse {name} in response to mention sender name`,
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const { chatId, senderId, channelInfo } = context;

        const fullText = args.join(' ');
        const pipeIndex = fullText.indexOf('|');

        if (!fullText || pipeIndex === -1) {
            return await sock.sendMessage(chatId, {
                text: `*➕ ADD AUTO-REPLY*\n\n` +
                      `*Usage:*\n` +
                      `\`${config.prefix}addreply <trigger> | <response>\`\n\n` +
                      `*Examples:*\n` +
                      `• \`${config.prefix}addreply hello | Hi there! 👋\`\n` +
                      `• \`${config.prefix}addreply exact:good morning | Good morning! ☀️\`\n` +
                      `• \`${config.prefix}addreply hi | Hello {name}! How are you?\`\n\n` +
                      `*Tips:*\n` +
                      `• Use \`exact:\` prefix for full message match\n` +
                      `• Without \`exact:\` it matches if message *contains* trigger\n` +
                      `• Use \`{name}\` in response to mention the sender's name`,
                ...channelInfo
            }, { quoted: message });
        }

        let trigger = fullText.substring(0, pipeIndex).trim();
        const response = fullText.substring(pipeIndex + 1).trim();

        if (!trigger || !response) {
            return await sock.sendMessage(chatId, {
                text: `❌ Both trigger and response are required.\n\nExample: \`${config.prefix}addreply hello | Hi there!\``,
                ...channelInfo
            }, { quoted: message });
        }

        let exactMatch = false;
        if (trigger.toLowerCase().startsWith('exact:')) {
            exactMatch = true;
            trigger = trigger.substring(6).trim();
        }

        if (!trigger) {
            return await sock.sendMessage(chatId, {
                text: '❌ Trigger cannot be empty after `exact:` prefix',
                ...channelInfo
            }, { quoted: message });
        }

        const replyData = await initConfig();
        const exists = replyData.replies.find((r: any) => r.trigger === trigger.toLowerCase());

        if (exists) {
            return await sock.sendMessage(chatId, {
                text: `⚠️ A reply for *"${trigger}"* already exists!\n\nUse \`${config.prefix}delreply ${trigger}\` to remove it first.`,
                ...channelInfo
            }, { quoted: message });
        }

        replyData.replies.push({
            trigger: trigger.toLowerCase(),
            response,
            exactMatch,
            addedBy: senderId,
            createdAt: Date.now()
        });

        await saveConfig(replyData);

        await sock.sendMessage(chatId, {
            text: `✅ *Auto-Reply Added!*\n\n` +
                  `🔑 *Trigger:* ${trigger}\n` +
                  `🎯 *Match type:* ${exactMatch ? 'Exact' : 'Contains'}\n` +
                  `💬 *Response:* ${response}`,
            ...channelInfo
        }, { quoted: message });
    }
};
