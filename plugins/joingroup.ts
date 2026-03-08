export default {
    command: 'joingroup',
    aliases: ['join', 'gcjoin', 'groupinfo'],
    category: 'owner',
    description: 'Join a group via invite link or get group info from link',
    usage: '.joingroup <link or code>\n.groupinfo <link or code>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();
        const isInfo = rawText.startsWith('.groupinfo');

        const input = args[0];
        if (!input) {
            return await sock.sendMessage(chatId, {
                text: `*${isInfo ? '🔍 GROUP INFO' : '🚪 JOIN GROUP'}*\n\n` +
                      `*Usage:*\n` +
                      `• \`.joingroup https://chat.whatsapp.com/XXXX\`\n` +
                      `• \`.joingroup XXXX\` (code only)\n` +
                      `• \`.groupinfo https://chat.whatsapp.com/XXXX\` — get info without joining`,
                ...channelInfo
            }, { quoted: message });
        }

        // Extract code from full link or use directly
        const code = input.replace('https://chat.whatsapp.com/', '').trim();

        try {
            if (isInfo) {
                const info = await sock.groupGetInviteInfo(code);
                const members = info.participants?.length || 0;
                return await sock.sendMessage(chatId, {
                    text: `╔═══════════════════════╗\n` +
                          `║    🔍 *GROUP INFO*       ║\n` +
                          `╚═══════════════════════╝\n\n` +
                          `*Name:* ${info.subject || 'Unknown'}\n` +
                          `*Description:* ${info.desc || 'None'}\n` +
                          `*Members:* ${members}\n` +
                          `*Created:* ${info.creation ? new Date(info.creation * 1000).toLocaleDateString() : 'Unknown'}\n` +
                          `*JID:* \`${info.id}\``,
                    ...channelInfo
                }, { quoted: message });
            } else {
                const response = await sock.groupAcceptInvite(code);
                return await sock.sendMessage(chatId, {
                    text: `✅ *Joined group successfully!*\n\nJID: \`${response}\``,
                    ...channelInfo
                }, { quoted: message });
            }
        } catch (e: any) {
            console.error('[JOINGROUP] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
