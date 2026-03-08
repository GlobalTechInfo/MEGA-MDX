import { loadSchedules, formatTimeLeft } from './schedule.js';

export default {
    command: 'schedulelist',
    aliases: ['schedlist', 'schedules', 'reminders'],
    category: 'utility',
    description: 'View all scheduled messages for this chat',
    usage: '.schedulelist',

    async handler(sock: any, message: any, args: any[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const senderId = context.senderId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        const schedules = await loadSchedules();

        // Show schedules for this chat
        const mine = schedules.filter(s => s.chatId === chatId || s.senderId === senderId);

        if (mine.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '📭 *No scheduled messages found*\n\nUse `.schedule <time> <message>` to schedule one!',
                ...channelInfo
            }, { quoted: message });
        }

        const now = Date.now();
        const lines = mine.map((s, i) => {
            const timeLeft = formatTimeLeft(s.sendAt - now);
            const preview = s.message.length > 40
                ? s.message.substring(0, 40) + '...'
                : s.message;
            return `${i + 1}. 📌 *ID:* ${s.id} | ⏳ ${timeLeft}\n    💬 ${preview}`;
        }).join('\n\n');

        await sock.sendMessage(chatId, {
            text: `*⏰ SCHEDULED MESSAGES (${mine.length})*\n\n${lines}\n\n_Use .schedulecancel <ID> to cancel_`,
            ...channelInfo
        }, { quoted: message });
    }
};
