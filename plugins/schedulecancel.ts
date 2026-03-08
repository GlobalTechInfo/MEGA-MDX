import type { BotContext } from '../types.js';
import { loadSchedules, saveSchedules } from './schedule.js';

export default {
    command: 'schedulecancel',
    aliases: ['schedcancel', 'cancelschedule', 'unschedule'],
    category: 'utility',
    description: 'Cancel a scheduled message by its ID',
    usage: '.schedulecancel <ID>',

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const senderId = context.senderId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        if (!args || args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide the schedule ID.\n\nUsage: `.schedulecancel <ID>`\nGet IDs: `.schedulelist`',
                ...channelInfo
            }, { quoted: message });
        }

        const targetId = args[0].toUpperCase();
        const schedules = await loadSchedules();

        const index = schedules.findIndex(s =>
            s.id === targetId && (s.chatId === chatId || s.senderId === senderId)
        );

        if (index === -1) {
            return await sock.sendMessage(chatId, {
                text: `❌ No scheduled message found with ID *${targetId}*\n\nUse \`.schedulelist\` to see your scheduled messages.`,
                ...channelInfo
            }, { quoted: message });
        }

        const cancelled = schedules.splice(index, 1)[0];
        await saveSchedules(schedules);

        await sock.sendMessage(chatId, {
            text: `🗑️ *Schedule Cancelled!*\n\n📌 *ID:* ${cancelled.id}\n💬 *Message:* ${cancelled.message}`,
            ...channelInfo
        }, { quoted: message });
    }
};

