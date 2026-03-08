export default {
    command: 'archivechat',
    aliases: ['archive', 'unarchive', 'unarchivechat'],
    category: 'owner',
    description: 'Archive or unarchive the current chat',
    usage: '.archivechat <archive|unarchive>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = context.rawText || '';

        // Auto-detect from command name
        const isUnarchive = rawText.toLowerCase().startsWith('.unarchive');
        const action = args[0]?.toLowerCase() || (isUnarchive ? 'unarchive' : 'archive');

        if (!['archive', 'unarchive'].includes(action)) {
            return await sock.sendMessage(chatId, {
                text: `*📦 ARCHIVE CHAT*\n\n*Usage:*\n• \`.archivechat archive\` — Archive this chat\n• \`.archivechat unarchive\` — Unarchive this chat\n\n_Or use aliases: \`.archive\` / \`.unarchive\`_`,
                ...channelInfo
            }, { quoted: message });
        }

        const shouldArchive = action === 'archive';

        try {
            const lastMsg = message;
            await sock.chatModify(
                {
                    archive: shouldArchive,
                    lastMessages: [
                        {
                            key: lastMsg.key,
                            messageTimestamp: lastMsg.messageTimestamp
                        }
                    ]
                },
                chatId
            );

            await sock.sendMessage(chatId, {
                text: shouldArchive
                    ? `📦 *Chat archived!*`
                    : `📂 *Chat unarchived!*`,
                ...channelInfo
            }, { quoted: message });

        } catch (e: any) {
            console.error('[ARCHIVECHAT] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${action} chat: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
