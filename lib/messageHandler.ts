import { fileURLToPath} from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import fs from 'fs';
import { dataFile } from './paths.js';
import config from '../config.js';
import store from './lightweight_store.js';
import commandHandler from './commandHandler.js';
import { printMessage, printLog } from './print.js';
import { isBanned } from './isBanned.js';
import { isSudo } from './index.js';
import isOwnerOrSudo from './isOwner.js';
import isAdmin from './isAdmin.js';
import { handleAutoread } from '../plugins/autoread.js';
import { handleAutotypingForMessage, showTypingAfterCommand } from '../plugins/autotyping.js';
import { storeMessage, handleMessageRevocation } from '../plugins/antidelete.js';
import { handleBadwordDetection } from './antibadword.js';
import { handleLinkDetection } from '../plugins/antilink.js';
import { handleTagDetection } from '../plugins/antitag.js';
import { handleMentionDetection } from '../plugins/mention.js';
import { handleChatbotResponse } from '../plugins/chatbot.js';
import { handleLocalBotMessage } from '../plugins/localbot.js';
import { handleTicTacToeMove } from '../plugins/tictactoe.js';
import { handleAutoReply } from '../plugins/autoreply.js';
import { handleAntiSpam, invalidateGroupCache } from '../plugins/antispam.js';
import { startSchedulerEngine } from '../plugins/schedule.js';
import { addCommandReaction } from './reactions.js';
import { writeErrorLog } from './logger.js';

import { channelInfo } from './messageConfig.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
const STICKER_FILE = dataFile('sticker_commands.json');

async function getStickerCommands() {
    if (HAS_DB) {
        const data = await store.getSetting('global', 'stickerCommands');
        return data || {};
    } else {
        try {
            if (!fs.existsSync(STICKER_FILE)) {
                return {};
            }
            return JSON.parse(fs.readFileSync(STICKER_FILE, 'utf8'));
        } catch {
            return {};
        }
    }
}

async function handleMessages(sock: any, messageUpdate: any) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        await printMessage(message, sock);

        try {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (!ghostMode || !ghostMode.enabled) {
                await handleAutoread(sock, message);
            } else {
                printLog('info', '👻 Stealth mode active');
            }
        } catch(err: any) {
            await handleAutoread(sock, message);
        }

        const chatId = message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        if (message.message?.protocolMessage?.type === 0) {
            printLog('info', 'Message deletion detected');
            await handleMessageRevocation(sock, message);
            return;
        }

        await storeMessage(sock, message);

        // Store pushName in contacts for name resolution (store under both lid and real JID)
        if (message.pushName && (sock as any).store?.contacts) {
            const pid = message.key.participant || message.key.remoteJid;
            if (pid) {
                (sock as any).store.contacts[pid] = {
                    ...(sock as any).store.contacts[pid],
                    id: pid,
                    notify: message.pushName,
                    name: message.pushName
                };
                // Also store under decoded JID
                const decoded = (sock as any).decodeJid?.(pid);
                if (decoded && decoded !== pid) {
                    (sock as any).store.contacts[decoded] = {
                        ...(sock as any).store.contacts[decoded],
                        id: decoded,
                        notify: message.pushName,
                        name: message.pushName
                    };
                }
            }
        }

        const rawSenderId = message.key.participant || message.key.remoteJid;
        // Resolve @lid to real JID if possible
        let senderId = rawSenderId;
        if (rawSenderId?.includes('@lid') && (sock as any).store?.contacts) {
            const contacts = (sock as any).store.contacts;
            const resolved = Object.keys(contacts).find(k =>
                contacts[k]?.lid === rawSenderId || contacts[k]?.lid?.split(':')[0] === rawSenderId.split('@')[0]
            );
            if (resolved?.includes('@s.whatsapp.net')) senderId = resolved;
        }

        if (message.message?.stickerMessage) {
            const fileSha256 = message.message.stickerMessage.fileSha256;
            if (fileSha256) {
                const hash = Buffer.from(fileSha256).toString('base64');
                const stickers = await getStickerCommands();

                if (stickers[hash]) {
                    const commandText = stickers[hash].text;
                    const [cmdName, ...cmdArgs] = commandText.split(' ');

                    let foundCommand = null;
                    let usedPrefix = '';

                    for (const prefix of config.prefixes) {
                        const testCmd = (prefix + cmdName).toLowerCase();
                        foundCommand = commandHandler.getCommand(testCmd, config.prefixes);
                        if (foundCommand) {
                            usedPrefix = prefix;
                            break;
                        }
                    }

                    if (foundCommand) {
                        const _senderIsSudo = await isSudo(senderId);
                        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
                        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

                        const botMode = await store.getBotMode();
                        const isAllowed = (() => {
                            if (isOwnerOrSudoCheck) return true;

                            switch (botMode) {
                                case 'public':
                                    return true;
                                case 'private':
                                case 'self':
                                    return false;
                                case 'groups':
                                    return isGroup;
                                case 'inbox':
                                    return !isGroup;
                                default:
                                    return true;
                            }
                        })();

                        if (!isAllowed) return;

                        const userBanned = await isBanned(senderId);
                        if (userBanned) return;

                        if (foundCommand.strictOwnerOnly) {
                            const { isOwnerOnly } = await import('./isOwner.js');
                            if (!message.key.fromMe && !isOwnerOnly(senderId)) {
                                return await sock.sendMessage(chatId, {
                                    text: 'ℹ️ *This command is only available for the bot owner!*',
                                    ...channelInfo
                                }, { quoted: message });
                            }
                        }

                        if (foundCommand.ownerOnly && !message.key.fromMe && !senderIsOwnerOrSudo) {
                            return await sock.sendMessage(chatId, {
                                text: 'ℹ️ *This command is only available for the owner or sudo users!*',
                                ...channelInfo
                            }, { quoted: message });
                        }

                        if (foundCommand.groupOnly && !isGroup) {
                            return await sock.sendMessage(chatId, {
                                text: 'ℹ️ *This command can only be used in groups!*',
                                ...channelInfo
                            }, { quoted: message });
                        }

                        let isSenderAdmin = false;
                        let isBotAdmin = false;

                        if (foundCommand.adminOnly && isGroup) {
                            const adminStatus = await isAdmin(sock, chatId, senderId);
                            isSenderAdmin = adminStatus.isSenderAdmin;
                            isBotAdmin = adminStatus.isBotAdmin;

                            if (!isBotAdmin) {
                                return await sock.sendMessage(chatId, {
                                    text: 'ℹ️ *Please make the bot an admin to use this command.*',
                                    ...channelInfo
                                }, { quoted: message });
                            }

                            if (!isSenderAdmin && !message.key.fromMe && !senderIsOwnerOrSudo) {
                                return await sock.sendMessage(chatId, {
                                    text: 'ℹ️ *Sorry, only group admins can use this command.*',
                                    ...channelInfo
                                }, { quoted: message });
                            }
                        }

                        const syntheticMessage = {
                            key: message.key,
                            message: {
                                extendedTextMessage: {
                                    text: usedPrefix + commandText,
                                    contextInfo: message.message.stickerMessage.contextInfo || {}
                                }
                            },
                            messageTimestamp: message.messageTimestamp,
                            pushName: message.pushName,
                            broadcast: message.broadcast
                        };


        const context = {
                            chatId,
                            senderId,
                            isGroup,
                            isSenderAdmin,
                            isBotAdmin,
                            senderIsOwnerOrSudo,
                            isOwnerOrSudoCheck,
                            channelInfo,
                            rawText: usedPrefix + commandText,
                            userMessage: (usedPrefix + commandText).toLowerCase(),
                            messageText: usedPrefix + commandText,
                            config
                        };

                        try {
                            await foundCommand.handler(sock, syntheticMessage, cmdArgs, context);
                            await addCommandReaction(sock, message);
                            await showTypingAfterCommand(sock, chatId);
                            printLog('success', `✅ Sticker command executed: ${commandText}`);
                        } catch(error: any) {
                            printLog('error', `❌ Sticker command error [${commandText}]: ${error.message}`);
                            console.error(error.stack);
                            await sock.sendMessage(chatId, {
                                text: `❌ Error executing sticker command: ${error.message}`,
                                ...channelInfo
                            }, { quoted: message });
                        }
                    } else {
                        printLog('warning', `⚠️ Sticker command not found: ${commandText}`);
                    }

                    return;
                }
            }
        }

        const rawText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            message.message?.buttonsResponseMessage?.selectedButtonId ||
            '';

        const messageText = rawText.trim();
        const userMessage = messageText.toLowerCase();

        const senderIsSudo = await isSudo(senderId);
        startSchedulerEngine(sock);

        if (!message.key.fromMe) {
            const replied = await handleAutoReply(sock, chatId, message, userMessage);
            if (replied) return;
        }

        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;


        if (message.message?.buttonsResponseMessage) {
            const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
            printLog('info', `Button response: ${buttonId}`);

            if (buttonId === 'channel') {
                await sock.sendMessage(chatId, {
                    text: '*Join our Channel:*\n[https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07](https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07)'
                }, { quoted: message });
                return;
            } else if (buttonId === 'owner') {
                const ownerCommand = (await import('../plugins/owner.js')).default;
                await (ownerCommand as any).handler?.(sock, chatId, "", {});
                return;
            } else if (buttonId === 'support') {
                await sock.sendMessage(chatId, {
                    text: `*Support*\n\nhttps://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07`
                }, { quoted: message });
                return;
            }
        }

        const userBanned = await isBanned(senderId);
        if (userBanned && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                printLog('warning', `Banned user attempted command: ${senderId.split('@')[0]}`);
                await sock.sendMessage(chatId, {
                    text: 'You are banned from using the bot. Contact an admin to get unbanned.',
                    ...channelInfo
                });
            }
            return;
        }

        if (/^[1-9]$/.test(userMessage) || userMessage === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        if (!message.key.fromMe) {
            await store.incrementMessageCount(chatId, senderId, message.pushName);
        } else {
            // Count bot owner's own messages too
            const ownJid = (sock as any).user?.id || senderId;
            const ownName = (sock as any).user?.name || (sock as any).user?.notify || 'Me';
            await store.incrementMessageCount(chatId, ownJid, ownName);
        }

        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }
            await handleLinkDetection(sock, chatId, message, userMessage, senderId);
        }

        // Anti-spam flood detection
        if (isGroup && !message.key.fromMe) {
            const spammed = await handleAntiSpam(sock, chatId, message, senderId, senderIsOwnerOrSudo);
            if (spammed) return;
        }

        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const _pmblocker = (await import('../plugins/pmblocker.js')).default;
                const readPmBlockerState = _pmblocker?.readState;
                const pmState = await readPmBlockerState();
                if (pmState.enabled) {
                    printLog('warning', `PM blocked from: ${senderId.split('@')[0]}`);
                    await sock.sendMessage(chatId, {
                        text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.'
                    });
                    await new Promise(r => setTimeout(r, 1500));
                    try {
                        await sock.updateBlockStatus(chatId, 'block');
                        printLog('success', `Blocked user: ${senderId.split('@')[0]}`);
                    } catch(e: any) {
                        printLog('error', `Failed to block user: ${e.message}`);
                    }
                    return;
                }
            } catch(e: any) {
                printLog('error', `PM blocker error: ${e.message}`);
            }
        }

        const usedPrefix = config.prefixes.find(p => userMessage.startsWith(p));

        const command = commandHandler.getCommand(userMessage, config.prefixes);

        if (!usedPrefix && !command) {
            await handleAutotypingForMessage(sock, chatId, userMessage);

            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);

                const botMode = await store.getBotMode();
                const canUseChatbot = botMode === 'public' ||
                                     (botMode === 'groups' && isGroup) ||
                                     (botMode === 'inbox' && !isGroup) ||
                                     isOwnerOrSudoCheck;

                if (canUseChatbot) {
                    const handledByLocal = await handleLocalBotMessage(sock, message, chatId, userMessage, senderId, channelInfo);
                    if (!handledByLocal) await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                }
            }
            return;
        }

        if (!command) {
            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
                const botMode = await store.getBotMode();
                const canUseChatbot = botMode === 'public' ||
                                     (botMode === 'groups' && isGroup) ||
                                     (botMode === 'inbox' && !isGroup) ||
                                     isOwnerOrSudoCheck;

                if (canUseChatbot) {
                    const handledByLocal2 = await handleLocalBotMessage(sock, message, chatId, userMessage, senderId, channelInfo);
                    if (!handledByLocal2) await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                }
            }
            return;
        }

        const botMode = await store.getBotMode();
        const isAllowed = (() => {
            if (isOwnerOrSudoCheck) return true;

            switch (botMode) {
                case 'public':
                    return true;
                case 'private':
                case 'self':
                    return false;
                case 'groups':
                    return isGroup;
                case 'inbox':
                    return !isGroup;
                default:
                    return true;
            }
        })();

        if (!isAllowed) {
            return;
        }

        let args;
        if (usedPrefix) {
            const originalCommandText = messageText.slice(usedPrefix.length).trim();
            args = originalCommandText.split(/\s+/).slice(1);
        } else {
            args = messageText.trim().split(/\s+/).slice(1);
        }

        if (command.strictOwnerOnly) {
            const { isOwnerOnly } = await import('./isOwner.js');
            if (!message.key.fromMe && !isOwnerOnly(senderId)) {
                return await sock.sendMessage(chatId, {
                    text: 'ℹ️ *This command is only available for the bot owner!*\n\n_Sudo users cannot manage other sudo users._',
                    ...channelInfo
                }, { quoted: message });
            }
        }

        if (command.ownerOnly && !message.key.fromMe && !senderIsOwnerOrSudo) {
            return await sock.sendMessage(chatId, {
                text: 'ℹ️ *This command is only available for the owner or sudo users!*',
                ...channelInfo
            }, { quoted: message });
        }

        if (command.groupOnly && !isGroup) {
            return await sock.sendMessage(chatId, {
                text: 'ℹ️ *This command can only be used in groups!*',
                ...channelInfo
            }, { quoted: message });
        }

        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (command.adminOnly && isGroup) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                return await sock.sendMessage(chatId, {
                    text: 'ℹ️ *Please make the bot an admin to use this command.*',
                    ...channelInfo
                }, { quoted: message });
            }

            if (!isSenderAdmin && !message.key.fromMe && !senderIsOwnerOrSudo) {
                return await sock.sendMessage(chatId, {
                    text: 'ℹ️ *Sorry, only group admins can use this command.*',
                    ...channelInfo
                }, { quoted: message });
            }
        }

        const context = {
            chatId,
            senderId,
            isGroup,
            isSenderAdmin,
            isBotAdmin,
            senderIsOwnerOrSudo,
            isOwnerOrSudoCheck,
            channelInfo,
            rawText,
            userMessage,
            messageText,
            config
        };

        try {
            await command.handler(sock, message, args, context);
            await addCommandReaction(sock, message);
            await showTypingAfterCommand(sock, chatId);
        } catch(error: any) {
            printLog('error', `Command error [${command.command}]: ${error.message}`);
            console.error(error.stack);

            await sock.sendMessage(chatId, {
                text: `❌ Error executing command: ${error.message}`,
                ...channelInfo
            }, { quoted: message });

            const errorLog = {
                command: command.command,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: senderId,
                chat: chatId
            };

            try {
                writeErrorLog(errorLog);

            } catch(e: any) {
                printLog('error', `Failed to write error log: ${e.message}`);
            }
        }

    } catch(error: any) {
        printLog('error', `Message handler error: ${error.message}`);
        console.error(error.stack);

        const chatId = messageUpdate.messages?.[0]?.key?.remoteJid;
        if (chatId) {
            try {
                await sock.sendMessage(chatId, {
                    text: 'ℹ️ *Failed to process message!*',
                    ...channelInfo
                });
            } catch(e: any) {
                printLog('error', `Failed to send error message: ${e.message}`);
            }
        }
    }
 }


async function handleGroupParticipantUpdate(sock: any, update: any) {
    try {
        const { id, participants, action, author } = update;
        // Invalidate antispam cache so admin changes take effect immediately
        invalidateGroupCache(id);
        if (!id.endsWith('@g.us')) return;

        printLog('info', `Group update: ${action} in ${id.split('@')[0]}`);

        const botMode = await store.getBotMode();
        const isPublicMode = botMode === 'public' || botMode === 'groups';

        switch (action) {
            case 'promote':
                if (!isPublicMode) return;
                if (participants && participants.length > 0) {
                    const _participant = Array.isArray(participants) ? participants[0] : participants;
                }
                const handlePromotionEvent = (await import('../plugins/promote.js')).default?.handlePromotionEvent;
                await handlePromotionEvent(sock, id, participants, author);
                break;

            case 'demote':
                if (!isPublicMode) return;
                if (participants && participants.length > 0) {
                    const _participant = Array.isArray(participants) ? participants[0] : participants;
                }
                const handleDemotionEvent = (await import('../plugins/demote.js')).default?.handleDemotionEvent;
                await handleDemotionEvent(sock, id, participants, author);
                break;

            case 'add':
                if (participants && participants.length > 0) {
                    const _participant = Array.isArray(participants) ? participants[0] : participants;
                }
                const { handleJoinEvent } = await import('../plugins/welcome.js');
                await handleJoinEvent(sock, id, participants);
                break;

            case 'remove':
                if (participants && participants.length > 0) {
                    const _participant = Array.isArray(participants) ? participants[0] : participants;
                }
                const handleLeaveEvent = (await import('../plugins/goodbye.js')).default?.handleLeaveEvent;
                await handleLeaveEvent(sock, id, participants);
                break;

            default:
                printLog('warning', `Unhandled group action: ${action}`);
        }
    } catch(error: any) {
        printLog('error', `Group update error: ${error.message}`);
        console.error(error.stack);
    }
}

async function handleStatus(sock: any, status: any) {
    try {
        const { default: _autostatus } = await import('../plugins/autostatus.js');
        const handleStatusUpdate = _autostatus.handleStatusUpdate;
        await handleStatusUpdate(sock, status);
    } catch(error: any) {
        printLog('error', `Status handler error: ${error.message}`);
        console.error(error.stack);
    }
}

async function handleCall(sock: any, calls: any) {
    try {
        const anticallPlugin = (await import('../plugins/anticall.js')).default;
        const state = anticallPlugin.readState ? await anticallPlugin.readState() : { enabled: false };
        if (!state.enabled) return;

        const antiCallNotified = new Set();

        for (const call of calls) {
            const callerJid = call.from || call.peerJid || call.chatId;
            if (!callerJid) continue;

            try {
                try {
                    if (typeof sock.rejectCall === 'function' && call.id) {
                        await sock.rejectCall(call.id, callerJid);
                    } else if (typeof sock.sendCallOfferAck === 'function' && call.id) {
                        await sock.sendCallOfferAck(call.id, callerJid, 'reject');
                    }
                } catch(e: any) {
                    printLog('error', `Error rejecting call: ${e.message}`);
                }

                if (!antiCallNotified.has(callerJid)) {
                    antiCallNotified.add(callerJid);
                    setTimeout(() => antiCallNotified.delete(callerJid), 60000);

                    await sock.sendMessage(callerJid, {
                        text: '📵 Anticall is enabled. Your call was rejected and you will be blocked.'
                    });
                    printLog('info', `Sent anticall warning to: ${callerJid.split('@')[0]}`);
                }

                setTimeout(async () => {
                    try {
                        await sock.updateBlockStatus(callerJid, 'block');
                        printLog('success', `Blocked caller: ${callerJid.split('@')[0]}`);
                    } catch(e: any) {
                        printLog('error', `Error blocking caller: ${e.message}`);
                    }
                }, 800);

            } catch(error: any) {
                printLog('error', `Error handling call from ${callerJid.split('@')[0]}: ${error.message}`);
            }
        }
    } catch(error: any) {
        printLog('error', `Call handler error: ${error.message}`);
        console.error(error.stack);
    }
}

export {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus,
    handleCall
};

