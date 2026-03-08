import type { BotContext } from '../types.js';
export default {
    command: 'gcmtdata',
    aliases: ['gcinfo', 'groupinfo', 'gcmetadata', 'groupdata'],
    category: 'group',
    description: 'Get detailed info about the current group',
    usage: '.gcinfo',
    groupOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        try {
            const meta = await sock.groupMetadata(chatId);

            const admins = meta.participants.filter((p: any) => p.admin).map((p: any) =>
                `  • @${p.id.split('@')[0]}`
            ).join('\n');

            const created = meta.creation
                ? new Date(meta.creation * 1000).toLocaleDateString()
                : 'Unknown';

            const memberCount = meta.participants.length;
            const adminCount = meta.participants.filter((p: any) => p.admin).length;

            await sock.sendMessage(chatId, {
                text: `╔═══════════════════════╗\n` +
                      `║    📊 *GROUP INFO*       ║\n` +
                      `╚═══════════════════════╝\n\n` +
                      `*📛 Name:* ${meta.subject}\n` +
                      `*📝 Description:*\n${meta.desc || '_No description_'}\n\n` +
                      `*👥 Members:* ${memberCount}\n` +
                      `*👑 Admins:* ${adminCount}\n` +
                      `*📅 Created:* ${created}\n` +
                      `*🆔 JID:* \`${meta.id}\`\n\n` +
                      `*👑 Admin List:*\n${admins || '_None_'}`,
                mentions: meta.participants.filter((p: any) => p.admin).map((p: any) => p.id),
                ...channelInfo
            }, { quoted: message });

        } catch (e: any) {
            console.error('[GROUPMETADATA] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to fetch group info: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
