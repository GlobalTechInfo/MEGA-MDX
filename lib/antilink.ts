import { isJidGroup } from '@whiskeysockets/baileys';
import { getAntilink, incrementWarningCount, resetWarningCount, isSudo } from '../lib/index.js';
import isAdmin from '../lib/isAdmin.js';
import config from '../config.js';

const WARN_COUNT = config.warnCount || 3;

/**
 * Checks if a string contains a URL.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} - True if the string contains a URL, otherwise false.
 */
function containsURL(str: any) {
        const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
        return urlRegex.test(str);
}

/**
 * Handles the Antilink functionality for group chats.
 *
 * @param {object} msg - The message object to process.
 * @param {object} sock - The socket object to use for sending messages.
 */
async function Antilink(msg: any, sock: any) {
        const jid = msg.key.remoteJid;
        if (!isJidGroup(jid)) return;

        const SenderMessage = msg.message?.conversation ||
                                                 msg.message?.extendedTextMessage?.text || '';
        if (!SenderMessage || typeof SenderMessage !== 'string') return;

        const sender = msg.key.participant;
        if (!sender) return;

        try {
                const { isSenderAdmin } = await isAdmin(sock, jid, sender);
                if (isSenderAdmin) return;
        } catch(_: any) {}
        const senderIsSudo = await isSudo(sender);
        if (senderIsSudo) return;

        if (!containsURL(SenderMessage.trim())) return;

        const antilinkConfig = await getAntilink(jid, 'on');
        if (!antilinkConfig) return;

        const action = antilinkConfig.action;

        try {
                await sock.sendMessage(jid, { delete: msg.key });

                switch (action) {
                        case 'delete':
                                await sock.sendMessage(jid, {
                                        text: `\`\`\`@${sender.split('@')[0]} link are not allowed here\`\`\``,
                                        mentions: [sender]
                                });
                                break;

                        case 'kick':
                                await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                                await sock.sendMessage(jid, {
                                        text: `\`\`\`@${sender.split('@')[0]} has been kicked for sending links\`\`\``,
                                        mentions: [sender]
                                });
                                break;

                        case 'warn':
                                const warningCount = await incrementWarningCount(jid, sender);
                                if (warningCount >= WARN_COUNT) {
                                        await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                                        await resetWarningCount(jid, sender);
                                        await sock.sendMessage(jid, {
                                                text: `\`\`\`@${sender.split('@')[0]} has been kicked after ${WARN_COUNT} warnings\`\`\``,
                                                mentions: [sender]
                                        });
                                } else {
                                        await sock.sendMessage(jid, {
                                                text: `\`\`\`@${sender.split('@')[0]} warning ${warningCount}/${WARN_COUNT} for sending links\`\`\``,
                                                mentions: [sender]
                                        });
                                }
                                break;
                }
        } catch(error: any) {
                console.error('Error in Antilink:', error);
        }
}

export default { Antilink };