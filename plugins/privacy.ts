import type { BotContext } from '../types.js';
export default {
    command: 'privacy',
    aliases: ['setprivacy', 'pvcy', 'pri'],
    category: 'menu',
    description: 'Manage all WhatsApp privacy settings, block/unblock users',
    usage: '.privacy — show menu',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const setting = args[0]?.toLowerCase();
        const value = args[1]?.toLowerCase();

        // ── No args: show full menu ───────────────────────────────────────
        if (!setting) {
            return await sock.sendMessage(chatId, {
                text:
                    `╔══════════════╗\n` +
                    `║🔒*PRIVACY SETTING*║\n` +
                    `╚══════════════╝\n` +
                    `📌 *Usage:* \`.pvcy <set> <val>\`\n\n` +
                    `────────────────────\n` +
                    `*⚙️ PRIVACY CONTROLS*\n\n` +
                    `👁️ *lastseen* — \`all\` \`contacts\` \`blacklist\` \`none\`\n\n` +
                    `🟢 *online* — \`all\` \`match_last_seen\`\n\n` +
                    `🖼️ *profile* — \`all\` \`contacts\` \`blacklist\` \`none\`\n\n` +
                    `📊 *status* — \`all\` \`contacts\` \`blacklist\` \`none\`\n\n` +
                    `✅ *receipts* — \`all\` \`none\`\n\n` +
                    `👥 *groups* — \`all\` \`contacts\` \`blacklist\`\n\n` +
                    `⏳ *timer* — \`off\` \`24h\` \`7d\` \`90d\`\n\n` +
                    `*🚫 BLOCK CONTROLS*\n\n` +
                    `🔴 *block* — \`<number>\` or reply to msg\n\n` +
                    `🟢 *unblock* — \`<number>\` or reply to msg\n\n` +
                    `📋 *blocklist* — view blocked users\n\n` +
                    `*📊 INFO*\n` +
                    `🔍 *status* — view privacy settings\n` +
                    `────────────────────\n\n` +
                    `💡 *Examples:*\n` +
                    `› \`.privacy lastseen all\`\n\n` +
                    `› \`.privacy receipts none\`\n\n` +
                    `› \`.privacy timer 7d\`\n\n` +
                    `› \`.privacy block 923001234567\`\n\n` +
                    `› \`.privacy blocklist\`\n\n` +
                    `› \`.privacy status\``,
                ...channelInfo
            }, { quoted: message });
        }

        // ── status: show current privacy settings ─────────────────────────
        if (setting === 'status') {
            try {
                const s = await sock.fetchPrivacySettings(true);
                const fmt = (v: any) => v ? `\`${v}\`` : `\`unknown\``;
                return await sock.sendMessage(chatId, {
                    text:
                        `╔═══════════════╗\n` +
                        `║🔒*CURRENT PRIVACY*║\n` +
                        `╚═══════════════╝\n\n` +
                        `👁️ *Last Seen:* ${fmt(s.last)}\n\n` +
                        `🟢 *Online:* ${fmt(s.online)}\n\n` +
                        `🖼️ *Profile Pic:* ${fmt(s.profile)}\n\n` +
                        `📊 *Status:* ${fmt(s.status)}\n\n` +
                        `✅ *Read Receipts:* ${fmt(s.readreceipts)}\n\n` +
                        `👥 *Groups Add:* ${fmt(s.groupadd)}\n\n` +
                        `_Use \`.pvcy <set> <value>\` to change_`,
                    ...channelInfo
                }, { quoted: message });
            } catch (e: any) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to fetch settings: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }

        // ── blocklist ─────────────────────────────────────────────────────
        if (setting === 'blocklist') {
            try {
                const list = await sock.fetchBlocklist();
                if (!list || list.length === 0) {
                    return await sock.sendMessage(chatId, { text: `📋 *Block List*\n\n_No blocked users._`, ...channelInfo }, { quoted: message });
                }
                const entries = list.map((jid: string, i: number) => `${i + 1}. +${jid.split('@')[0]}`).join('\n');
                return await sock.sendMessage(chatId, {
                    text:
                        `╔═════════════╗\n` +
                        `║🚫 *BLOCK LIST*   ║\n` +
                        `╚═════════════╝\n\n` +
                        `${entries}\n\n` +
                        `────────────────────\n` +
                        `*Total:* ${list.length} blocked user(s)`,
                    ...channelInfo
                }, { quoted: message });
            } catch (e: any) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to fetch block list: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }

        // ── block/unblock ─────────────────────────────────────────────────
        if (setting === 'block' || setting === 'unblock') {
            let targetJid: string | null = null;

            const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
            if (quotedParticipant) {
                const num = quotedParticipant.split('@')[0].split(':')[0];
                targetJid = `${num}@s.whatsapp.net`;
            }

            if (!targetJid && value) {
                const num = value.replace(/[^0-9]/g, '');
                if (num.length >= 7) targetJid = `${num}@s.whatsapp.net`;
            }

            if (!targetJid && !chatId.endsWith('@g.us')) {
                targetJid = chatId;
            }

            if (!targetJid) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Provide a number or reply to a message.\n\nExample: \`.privacy block 923001234567\``,
                    ...channelInfo
                }, { quoted: message });
            }

            try {
                await sock.updateBlockStatus(targetJid, setting);
                const icon = setting === 'block' ? '🚫' : '✅';
                const action = setting === 'block' ? 'Blocked' : 'Unblocked';
                return await sock.sendMessage(chatId, {
                    text: `${icon} *${action}* +${targetJid.split('@')[0]}`,
                    ...channelInfo
                }, { quoted: message });
            } catch (e: any) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to ${setting}: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }

        // ── default disappearing timer ────────────────────────────────────
        if (setting === 'timer') {
            const durations: Record<string, number> = {
                'off': 0, '0': 0,
                '24h': 86400, '1d': 86400,
                '7d': 604800, '1w': 604800,
                '90d': 7776000, '3m': 7776000,
            };
            if (!value || !(value in durations)) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Choose: \`off\` \`24h\` \`7d\` \`90d\`\n\nExample: \`.privacy timer 7d\``,
                    ...channelInfo
                }, { quoted: message });
            }
            try {
                await sock.updateDefaultDisappearingMode(durations[value]);
                const label = value === 'off' || value === '0' ? 'disabled' : `set to *${value}*`;
                return await sock.sendMessage(chatId, { text: `⏳ Default disappearing timer ${label}`, ...channelInfo }, { quoted: message });
            } catch (e: any) {
                return await sock.sendMessage(chatId, { text: `❌ Failed to set timer: ${e.message}`, ...channelInfo }, { quoted: message });
            }
        }

        // ── privacy setting updates ───────────────────────────────────────
        const privacySettings: Record<string, { fn: (v: string) => Promise<void>; allowed: string[]; label: string }> = {
            lastseen: { fn: (v) => sock.updateLastSeenPrivacy(v),        allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist', 'none'], label: 'Last Seen' },
            online:   { fn: (v) => sock.updateOnlinePrivacy(v),          allowed: ['all', 'match_last_seen'],                                    label: 'Online Status' },
            profile:  { fn: (v) => sock.updateProfilePicturePrivacy(v),  allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist', 'none'], label: 'Profile Picture' },
            status:   { fn: (v) => sock.updateStatusPrivacy(v),          allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist', 'none'], label: 'Status' },
            receipts: { fn: (v) => sock.updateReadReceiptsPrivacy(v),    allowed: ['all', 'none'],                                               label: 'Read Receipts' },
            groups:   { fn: (v) => sock.updateGroupsAddPrivacy(v),       allowed: ['all', 'contacts', 'contact_blacklist', 'blacklist'],         label: 'Groups Add' },
        };

        const config = privacySettings[setting];
        if (!config) {
            return await sock.sendMessage(chatId, {
                text: `❌ Unknown option: *${setting}*\n\nUse \`.privacy\` to see all commands.`,
                ...channelInfo
            }, { quoted: message });
        }

        if (!value || !config.allowed.includes(value)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Invalid value for *${setting}*\n\nAllowed: ${config.allowed.filter(v => v !== 'contact_blacklist').map(v => `\`${v}\``).join(' ')}`,
                ...channelInfo
            }, { quoted: message });
        }

        const resolvedValue = value === 'blacklist' ? 'contact_blacklist' : value;

        try {
            await config.fn(resolvedValue);
            return await sock.sendMessage(chatId, {
                text: `✅ *${config.label}* set to \`${value}\``,
                ...channelInfo
            }, { quoted: message });
        } catch (e: any) {
            console.error('[PRIVACY] Error:', e.message);
            return await sock.sendMessage(chatId, {
                text: `❌ Failed to update ${config.label}: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
