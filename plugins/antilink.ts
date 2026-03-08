import type { BotContext } from '../types.js';
import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import isAdmin from '../lib/isAdmin.js';

async function setAntilink(chatId: string, type: string, action: string) {
    try {
        await store.saveSetting(chatId, 'antilink', {
            enabled: true,
            action: action,
            type: type
        });
        return true;
    } catch(error: any) {
        console.error('Error setting antilink:', error);
        return false;
    }
}

async function getAntilink(chatId: string, _type?: string) {
    try {
        const settings = await store.getSetting(chatId, 'antilink');
        return settings || null;
    } catch(error: any) {
        console.error('Error getting antilink:', error);
        return null;
    }
}

async function removeAntilink(chatId: string, _type?: string) {
    try {
        await store.saveSetting(chatId, 'antilink', {
            enabled: false,
            action: null,
            type: null
        });
        return true;
    } catch(error: any) {
        console.error('Error removing antilink:', error);
        return false;
    }
}

export async function handleLinkDetection(sock: any, chatId: string, message: any, userMessage: string, senderId: string) {
    try {
        const config = await getAntilink(chatId, 'on');
        if (!config?.enabled) return;

        // Check if sender is owner or sudo
        const isOwnerSudo = await isOwnerOrSudo(senderId, sock, chatId);
        if (isOwnerSudo) return;

        // Check if sender is admin
        try {
            const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
            if (isSenderAdmin) return;
        } catch(e: any) {}

        const action = config.action || 'delete';
        let shouldAct = false;
        let linkType = '';

        const linkPatterns = {
            whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
            whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
            telegram: /t\.me\/[A-Za-z0-9_]+/i,
            allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
        };

        if (linkPatterns.whatsappGroup.test(userMessage)) {
            shouldAct = true;
            linkType = 'WhatsApp Group';
        } else if (linkPatterns.whatsappChannel.test(userMessage)) {
            shouldAct = true;
            linkType = 'WhatsApp Channel';
        } else if (linkPatterns.telegram.test(userMessage)) {
            shouldAct = true;
            linkType = 'Telegram';
        } else if (linkPatterns.allLinks.test(userMessage)) {
            shouldAct = true;
            linkType = 'Link';
        }

        if (!shouldAct) return;

        const messageId = message.key.id;
        const participant = message.key.participant || senderId;

        if (action === 'delete' || action === 'kick') {
            try {
                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: messageId,
                        participant: participant
                    }
                });
            } catch(error: any) {
                console.error('Failed to delete message:', error);
            }
        }

        if (action === 'warn' || action === 'delete') {
            await sock.sendMessage(chatId, {
                text: `⚠️ *Antilink Warning*\n\n@${senderId.split('@')[0]}, posting ${linkType} links is not allowed!`,
                mentions: [senderId]
            });
        }

        if (action === 'kick') {
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `🚫 @${senderId.split('@')[0]} has been removed for posting ${linkType} links.`,
                    mentions: [senderId]
                });
            } catch(error: any) {
                console.error('Failed to kick user:', error);
                await sock.sendMessage(chatId, {
                    text: `⚠️ Failed to remove user. Make sure the bot is an admin.`
                });
            }
        }

    } catch(error: any) {
        console.error('Error in link detection:', error);
    }
}

export default {
    command: 'antilink',
    aliases: ['alink', 'linkblock'],
    category: 'admin',
    description: 'Prevent users from sending links in the group',
    usage: '.antilink <on|off|set>',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();

        if (!action) {
            const config = await getAntilink(chatId, 'on');
            await sock.sendMessage(chatId, {
                text: `*🔗 ANTILINK SETUP*\n\n` +
                      `*Current Status:* ${config?.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                      `*Current Action:* ${config?.action || 'Not set'}\n\n` +
                      `*Commands:*\n` +
                      `• \`.antilink on\` - Enable antilink\n` +
                      `• \`.antilink off\` - Disable antilink\n` +
                      `• \`.antilink set delete\` - Delete link messages\n` +
                      `• \`.antilink set kick\` - Kick users who send links\n` +
                      `• \`.antilink set warn\` - Warn users only\n\n` +
                      `*Protected Links:*\n` +
                      `• WhatsApp Groups\n` +
                      `• WhatsApp Channels\n` +
                      `• Telegram\n` +
                      `• All other links\n\n` +
                      `*Note:* Admins, Owner, and Sudo users are exempt.`
            }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, {
                        text: '⚠️ *Antilink is already enabled*'
                    }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, {
                    text: result ? '✅ *Antilink enabled successfully!*\n\nDefault action: Delete messages\n\n*Exempt:* Admins, Owner, Sudo users' : '❌ *Failed to enable antilink*'
                }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, {
                    text: '❌ *Antilink disabled*\n\nUsers can now send links freely.'
                }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, {
                        text: '❌ *Please specify an action*\n\nUsage: `.antilink set delete | kick | warn`'
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1].toLowerCase();
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sock.sendMessage(chatId, {
                        text: '❌ *Invalid action*\n\nChoose: delete, kick, or warn'
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);

                const actionDescriptions: Record<string, string> = {
                    delete: 'Delete link messages and warn users',
                    kick: 'Delete messages and remove users',
                    warn: 'Only send warning messages'
                };

                await sock.sendMessage(chatId, {
                    text: setResult
                        ? `✅ *Antilink action set to: ${setAction}*\n\n${actionDescriptions[setAction]}\n\n*Exempt:* Admins, Owner, Sudo users`
                        : '❌ *Failed to set antilink action*'
                }, { quoted: message });
                break;

            case 'status':
            case 'get':
                const status = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, {
                    text: `*🔗 ANTILINK STATUS*\n\n` +
                          `*Status:* ${status?.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                          `*Action:* ${status?.action || 'Not set'}\n\n` +
                          `*What happens when links are detected:*\n` +
                          `${status?.action === 'delete' ? '• Message is deleted\n• User gets warning' : ''}` +
                          `${status?.action === 'kick' ? '• Message is deleted\n• User is removed from group' : ''}` +
                          `${status?.action === 'warn' ? '• User gets warning\n• Message stays' : ''}\n\n` +
                          `*Exempt:* Admins, Owner, Sudo users`
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, {
                    text: '❌ *Invalid command*\n\nUse `.antilink` to see available options.'
                }, { quoted: message });
        }
    },

    handleLinkDetection,
    setAntilink,
    getAntilink,
    removeAntilink
};


