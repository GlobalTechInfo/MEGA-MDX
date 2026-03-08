import type { BotContext } from '../types.js';
export default {
    command: 'joinrequests',
    aliases: ['gcreqs', 'groupreqs', 'pendingjoins', 'approvejoin', 'rejectjoin'],
    category: 'group',
    description: 'View, approve or reject group join requests',
    usage: '.joinrequests — list pending\n.approvejoin <number|all>\n.rejectjoin <number|all>',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};
        const rawText = (context.rawText || '').toLowerCase();

        const isApprove = rawText.startsWith('.approvejoin');
        const isReject = rawText.startsWith('.rejectjoin');

        // List pending requests
        if (!isApprove && !isReject) {
            try {
                const requests = await sock.groupRequestParticipantsList(chatId);
                if (!requests || requests.length === 0) {
                    return await sock.sendMessage(chatId, {
                        text: `📋 *Join Requests*\n\n_No pending join requests._`,
                        ...channelInfo
                    }, { quoted: message });
                }

                const list = requests.map((r: any, i: number) =>
                    `${i + 1}. +${r.jid.split('@')[0]}`
                ).join('\n');

                return await sock.sendMessage(chatId, {
                    text: `╔═══════════════════════╗\n` +
                          `║   📋 *JOIN REQUESTS*    ║\n` +
                          `╚═══════════════════════╝\n\n` +
                          `${list}\n\n` +
                          `──────────────────────────\n` +
                          `*Total:* ${requests.length} pending\n\n` +
                          `• \`.approvejoin all\` — approve all\n` +
                          `• \`.rejectjoin all\` — reject all\n` +
                          `• \`.approvejoin 923001234567\` — approve one`,
                    ...channelInfo
                }, { quoted: message });
            } catch (e: any) {
                return await sock.sendMessage(chatId, {
                    text: `❌ Failed to fetch requests: ${e.message}`,
                    ...channelInfo
                }, { quoted: message });
            }
        }

        // Approve or reject
        const action = isApprove ? 'approve' : 'reject';
        const input = args[0]?.toLowerCase();

        try {
            let targets: string[] = [];

            if (input === 'all') {
                const requests = await sock.groupRequestParticipantsList(chatId);
                if (!requests || requests.length === 0) {
                    return await sock.sendMessage(chatId, {
                        text: `⚠️ No pending join requests.`,
                        ...channelInfo
                    }, { quoted: message });
                }
                targets = requests.map((r: any) => r.jid);
            } else if (input) {
                const num = input.replace(/[^0-9]/g, '');
                targets = [`${num}@s.whatsapp.net`];
            } else {
                return await sock.sendMessage(chatId, {
                    text: `❌ Provide a number or \`all\`.\n\nExample: \`.${isApprove ? 'approvejoin' : 'rejectjoin'} all\``,
                    ...channelInfo
                }, { quoted: message });
            }

            await sock.groupRequestParticipantsUpdate(chatId, targets, action);
            const icon = isApprove ? '✅' : '❌';
            const verb = isApprove ? 'Approved' : 'Rejected';

            await sock.sendMessage(chatId, {
                text: `${icon} *${verb}* ${targets.length === 1 ? `+${targets[0].split('@')[0]}` : `${targets.length} request(s)`}`,
                ...channelInfo
            }, { quoted: message });

        } catch (e: any) {
            console.error('[JOINREQUESTS] Error:', e.message);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to ${action}: ${e.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
