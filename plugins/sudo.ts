import type { BotContext } from '../types.js';
import { addSudo, removeSudo, getSudoList } from '../lib/index.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import { cleanJid } from '../lib/isOwner.js';

function extractTargetJid(message: any, args: any) {
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        return message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return message.message.extendedTextMessage.contextInfo.participant;
    }

    const text = args.join(' ');
    const match = text.match(/\b(\d{7,15})\b/);
    if (match) return match[1] + '@s.whatsapp.net';

    return null;
}

export default {
    command: 'sudo',
    aliases: [],
    category: 'owner',
    description: 'Add or remove sudo users or list them',
    usage: '.sudo add|del|list <@user|number>',
    strictOwnerOnly: true,

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const config = context.config;
        const _senderJid = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        const isOwner = message.key.fromMe || isOwnerOrSudo;

        const sub = (args[0] || '').toLowerCase();

        if (!sub || !['add', 'del', 'remove', 'list'].includes(sub)) {
            await sock.sendMessage(chatId, {
                text: '╭━━━〔 *SUDO MANAGER* 〕━━━┈\n┃\n┃ 📝 *Usage:*\n┃ ▢ .sudo add <@tag/reply/num>\n┃ ▢ .sudo del <@tag/reply/num>\n┃ ▢ .sudo list\n┃\n╰━━━━━━━━━━━━━━━━━━┈'
            }, { quoted: message });
            return;
        }

        if (sub === 'list') {
            const list = await getSudoList();
            if (list.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ No sudo users found.' }, { quoted: message });
                return;
            }
            const textList = list.map((j: any, i: any) => `┃ ${i + 1}. @${cleanJid(j)}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `╭━━〔 *SUDO USERS* 〕━━┈\n┃\n${textList}\n┃\n╰━━━━━━━━━━━━━━━┈`,
                mentions: list
            }, { quoted: message });
            return;
        }

        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ *Access Denied:* Only the Main Owner can manage Sudo privileges.' }, { quoted: message });
            return;
        }

        const targetJid = extractTargetJid(message, args.slice(1));
        if (!targetJid) {
            await sock.sendMessage(chatId, { text: '❌ Please mention a user, reply to a message, or provide a number.' }, { quoted: message });
            return;
        }

        let displayId = cleanJid(targetJid);
        if (targetJid.includes('@lid') && isGroup) {
            try {
                const metadata = await sock.groupMetadata(chatId);
                const found = metadata.participants.find((p: any) => p.lid === targetJid || p.id === targetJid);
                if (found && found.id && !found.id.includes('@lid')) {
                    displayId = cleanJid(found.id);
                }
            } catch(e: any) {}
        }

        if (sub === 'add') {
            const ok = await addSudo(targetJid);
            await sock.sendMessage(chatId, {
                text: ok ? `✅ *Success:* @${displayId} has been granted Sudo privileges.` : `❌ *Error:* Failed to add sudo.`,
                mentions: [targetJid]
            }, { quoted: message });
            return;
        }

        if (sub === 'del' || sub === 'remove') {
            const ownerNumberClean = cleanJid(config.ownerNumber);
            if (displayId === ownerNumberClean) {
                await sock.sendMessage(chatId, { text: '❌ *Action Denied:* Cannot remove the Main Owner.' }, { quoted: message });
                return;
            }
            const ok = await removeSudo(targetJid);
            await sock.sendMessage(chatId, {
                text: ok ? `✅ *Success:* Sudo privileges revoked from @${displayId}.` : `❌ *Error:* Failed to remove sudo.`,
                mentions: [targetJid]
            }, { quoted: message });

        }
    }
};

