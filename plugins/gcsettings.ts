import type { BotContext } from '../types.js';
export default {
    command: 'gcset',
    aliases: ['gsetting', 'groupset', 'gpset'],
    category: 'admin',
    description: 'Change group settings (lock/unlock messages or settings)',
    usage: '.gcset <setting>',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const isBotAdmin = context.isBotAdmin || false;

        if (!isBotAdmin) {
            return await sock.sendMessage(chatId, {
                text: `❌ Bot needs to be an admin to change group settings.`,
                ...channelInfo
            }, { quoted: message });
        }

        const setting = args[0]?.toLowerCase();

        if (!setting) {
            return await sock.sendMessage(chatId, {
                text:
                    `╔════════════════╗\n` +
                    `║⚙️ *GROUP SETTINGS*   ║\n` +
                    `╚════════════════╝\n\n` +
                    `📌 *Usage:* \`.gcset <option>\`\n\n` +
                    `────────────────────\n` +
                    `*💬 MESSAGE PERMISSIONS*\n` +
                    `🔒 *lock* — Only admins can send messages\n\n` +
                    `🔓 *unlock* — Everyone can send messages\n\n` +
                    `*🛠️ SETTINGS PERMISSIONS*\n` +
                    `🔒 *lockset* — Only admins can edit group info\n\n` +
                    `🔓 *unlockset* — Everyone can edit group info\n` +
                    `────────────────────`,
                ...channelInfo
            }, { quoted: message });
        }

        const settingsMap: Record<string, { value: string; label: string }> = {
            lock:      { value: 'announcement',     label: '🔒 Only admins can send messages' },
            unlock:    { value: 'not_announcement', label: '🔓 Everyone can send messages' },
            lockset:   { value: 'locked',           label: '🔒 Only admins can edit group info' },
            unlockset: { value: 'unlocked',         label: '🔓 Everyone can edit group info' },
        };

        const config = settingsMap[setting];
        if (!config) {
            return await sock.sendMessage(chatId, {
                text: `❌ Unknown setting: *${setting}*\n\nUse \`.groupsettings\` to see options.`,
                ...channelInfo
            }, { quoted: message });
        }

        try {
            await sock.groupSettingUpdate(chatId, config.value as any);
            return await sock.sendMessage(chatId, {
                text: `✅ ${config.label}`,
                ...channelInfo
            }, { quoted: message });
        } catch (e: any) {
            console.error('[GROUPSETTINGS] Error:', e.message);
            return await sock.sendMessage(chatId, {
                text: `❌ Failed to update setting: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
