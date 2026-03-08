import isAdmin from '../lib/isAdmin.js';

export default {
    command: 'clearchat',
    aliases: ['deletechat'],
    category: 'owner',
    description: 'Clear/delete the current chat',
    usage: '.clearchat',

    async handler(sock: any, message: any, args: any[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const isGroup = chatId.endsWith('@g.us');
        const senderId = context.senderId || message.key.participant || message.key.remoteJid;
        const senderIsOwnerOrSudo = context.senderIsOwnerOrSudo || false;

        if (isGroup && !senderIsOwnerOrSudo) {
            // Fetch admin status directly — context.isSenderAdmin unreliable without adminOnly flag
            const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
            if (!isSenderAdmin) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Only group admins or bot owner can clear this chat.',
                    ...channelInfo
                }, { quoted: message });
            }
        }

        if (!isGroup && !senderIsOwnerOrSudo && !message.key.fromMe) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only the bot owner can clear DM chats.',
                ...channelInfo
            }, { quoted: message });
        }

        try {
            await sock.chatModify(
                {
                    delete: true,
                    lastMessages: [
                        {
                            key: message.key,
                            messageTimestamp: message.messageTimestamp
                        }
                    ]
                },
                chatId
            );

            await sock.sendMessage(chatId, {
                text: `🗑️ *Chat cleared successfully!*`,
                ...channelInfo
            }, { quoted: message });

        } catch (e: any) {
            console.error('[CLEARCHAT] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to clear chat: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
