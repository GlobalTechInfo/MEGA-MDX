import fs from 'fs';
import path from 'path';
import { dataFile } from '../lib/paths.js';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const configPath = dataFile('schedules.json');

interface ScheduledMessage {
    id: string;
    chatId: string;
    senderId: string;
    message: string;
    sendAt: number;
    createdAt: number;
}

async function loadSchedules(): Promise<ScheduledMessage[]> {
    try {
        if (HAS_DB) {
            const data = await store.getSetting('global', 'schedules');
            return data || [];
        } else {
            if (!fs.existsSync(configPath)) {
                const dataDir = path.dirname(configPath);
                if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                fs.writeFileSync(configPath, JSON.stringify([], null, 2));
            }
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    } catch {
        return [];
    }
}

async function saveSchedules(data: ScheduledMessage[]) {
    if (HAS_DB) {
        await store.saveSetting('global', 'schedules', data);
    } else {
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    }
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

/**
 * Parse time input to a future Date
 * Supports: 10m | 2h | 1h30m | 14:30 | 10:30am
 */
function parseTime(input: string): Date | null {
    const now = new Date();

    // e.g. 10m, 2h, 1h30m
    const relativeMatch = input.match(/^(?:(\d+)h)?(?:(\d+)m)?$/i);
    if (relativeMatch && (relativeMatch[1] || relativeMatch[2])) {
        const hours = parseInt(relativeMatch[1] || '0');
        const minutes = parseInt(relativeMatch[2] || '0');
        if (hours === 0 && minutes === 0) return null;
        return new Date(now.getTime() + (hours * 60 + minutes) * 60 * 1000);
    }

    // e.g. 14:30, 10:30am, 9:00pm
    const clockMatch = input.match(/^(\d{1,2}):(\d{2})(am|pm)?$/i);
    if (clockMatch) {
        let hour = parseInt(clockMatch[1]);
        const minute = parseInt(clockMatch[2]);
        const meridiem = clockMatch[3]?.toLowerCase();

        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;

        const target = new Date(now);
        target.setHours(hour, minute, 0, 0);

        // If already passed, schedule for tomorrow
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        return target;
    }

    return null;
}

function formatTimeLeft(ms: number): string {
    if (ms <= 0) return 'now';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts: string[] = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

// ── Scheduler Engine ───────────────────────────────────────────────────────
// Started once when bot connects — checks every 10s for due messages

let _engineStarted = false;

export function startSchedulerEngine(sock: any) {
    if (_engineStarted) return;
    _engineStarted = true;


    setInterval(async () => {
        try {
            const now = Date.now();
            const schedules = await loadSchedules();
            const remaining: ScheduledMessage[] = [];
            let changed = false;

            for (const item of schedules) {
                if (now >= item.sendAt) {
                    try {
                        await sock.sendMessage(item.chatId, {
                            text: item.message,
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363319098372999@newsletter',
                                    newsletterName: 'MEGA MD',
                                    serverMessageId: -1
                                }
                            }
                        });
                        console.log(`[SCHEDULE] ✅ Sent message ID:${item.id} to ${item.chatId}`);
                    } catch (e: any) {
                        console.error(`[SCHEDULE] ❌ Failed to send ID:${item.id}: ${e.message}`);
                    }
                    changed = true;
                } else {
                    remaining.push(item);
                }
            }

            if (changed) await saveSchedules(remaining);
        } catch (e: any) {
            console.error('[SCHEDULE] Engine error:', e.message);
        }
    }, 10_000);
}

export { loadSchedules, saveSchedules, generateId, parseTime, formatTimeLeft };

export default {
    command: 'schedule',
    aliases: ['sched', 'remind', 'remindme'],
    category: 'utility',
    description: 'Schedule a message to be sent later in this chat',
    usage: '.schedule <time> <message>\nTime: 10m | 2h | 1h30m | 14:30 | 10:30am',

    async handler(sock: any, message: any, args: any[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const senderId = context.senderId || message.key.remoteJid;
        const channelInfo = context.channelInfo || {};

        // Start engine with current sock
        startSchedulerEngine(sock);

        if (!args || args.length < 2) {
            return await sock.sendMessage(chatId, {
                text: `*⏰ SCHEDULE A MESSAGE*\n\n` +
                      `*Usage:*\n\`.schedule <time> <message>\`\n\n` +
                      `*Time formats:*\n` +
                      `• \`10m\` → in 10 minutes\n` +
                      `• \`2h\` → in 2 hours\n` +
                      `• \`1h30m\` → in 1 hour 30 minutes\n` +
                      `• \`14:30\` → today at 2:30 PM\n` +
                      `• \`10:30am\` → today at 10:30 AM\n\n` +
                      `*Examples:*\n` +
                      `\`.schedule 10m Good morning everyone!\`\n` +
                      `\`.schedule 2h Team meeting starting now!\`\n` +
                      `\`.schedule 14:30 Don't forget the call!\``,
                ...channelInfo
            }, { quoted: message });
        }

        const timeInput = args[0];
        const msgText = args.slice(1).join(' ').trim();

        if (!msgText) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a message after the time.\n\nExample: `.schedule 10m Hello!`',
                ...channelInfo
            }, { quoted: message });
        }

        const targetDate = parseTime(timeInput);
        if (!targetDate) {
            return await sock.sendMessage(chatId, {
                text: `❌ Invalid time format: *${timeInput}*\n\nValid: \`10m\` \`2h\` \`1h30m\` \`14:30\` \`10:30am\``,
                ...channelInfo
            }, { quoted: message });
        }

        const schedules = await loadSchedules();
        const newItem: ScheduledMessage = {
            id: generateId(),
            chatId,
            senderId,
            message: msgText,
            sendAt: targetDate.getTime(),
            createdAt: Date.now()
        };

        schedules.push(newItem);
        await saveSchedules(schedules);

        const timeLeft = formatTimeLeft(targetDate.getTime() - Date.now());
        const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        await sock.sendMessage(chatId, {
            text: `✅ *Message Scheduled!*\n\n` +
                  `📌 *ID:* ${newItem.id}\n` +
                  `⏳ *Sends in:* ${timeLeft} (at ${timeStr})\n` +
                  `💬 *Message:* ${msgText}\n\n` +
                  `_Use .schedulecancel ${newItem.id} to cancel_`,
            ...channelInfo
        }, { quoted: message });
    }
};
