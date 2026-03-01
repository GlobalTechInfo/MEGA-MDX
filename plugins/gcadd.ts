/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/


export default {
    command: 'add',
    aliases: ['invite', 'gcadd', 'addgc'],
    category: 'group',
    description: 'Add a user to the group',
    usage: '.add <number> or reply to vcard/message',
    groupOnly: 'true',
    adminOnly: 'true',

    async handler(sock: any, message: any, args: any, context: any = {}) {
        const { chatId, channelInfo } = context;

        let targetNumber = null;

        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = message.message.extendedTextMessage.contextInfo.quotedMessage;
            const quotedParticipant = message.message.extendedTextMessage.contextInfo.participant;

            if (quotedMsg.contactMessage) {
                const vcard = quotedMsg.contactMessage.vcard;
                const phoneMatch = vcard.match(/waid=(\d+)/);
                if (phoneMatch) {
                    targetNumber = phoneMatch[1];
                } else {
                    const telMatch = vcard.match(/TEL.*?:(\+?\d+)/);
                    if (telMatch) {
                        targetNumber = telMatch[1].replace(/\D/g, '');
                    }
                }
            }
            else if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
                const text = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
                const numberMatch = text.match(/(\+?\d{10,15})/);
                if (numberMatch) {
                    targetNumber = numberMatch[1].replace(/\D/g, '');
                }
            }
            else if (quotedParticipant) {
                targetNumber = quotedParticipant.split('@')[0];
            }
        }

        if (!targetNumber && args.length > 0) {
            const input = args.join(' ');
            const cleaned = input.replace(/[^\d+]/g, '');
            targetNumber = cleaned.replace(/^\+/, '');
        }

        if (!targetNumber) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Please provide a number to add!*

*Usage:*
• \`.add 923051234567\`
• \`.add +923051234567\`
• \`.add 92 305 1234567\`
• Reply to a vcard with \`.add\`
• Reply to a message with \`.add\``,
                ...channelInfo
            }, { quoted: message });
        }

        if (!targetNumber.startsWith('1') && !targetNumber.startsWith('2') && !targetNumber.startsWith('3') && 
            !targetNumber.startsWith('4') && !targetNumber.startsWith('5') && !targetNumber.startsWith('6') && 
            !targetNumber.startsWith('7') && !targetNumber.startsWith('8') && !targetNumber.startsWith('9')) {
            return await sock.sendMessage(chatId, {
                text: '❌ *Invalid number format!*\n\nPlease include the country code.\nExample: 923051234567',
                ...channelInfo
            }, { quoted: message });
        }

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants.map(p => p.id);
            
            if (participants.includes(targetJid)) {
                return await sock.sendMessage(chatId, {
                    text: `⚠️ *User is already in the group!*\n\n${targetNumber}`,
                    ...channelInfo
                }, { quoted: message });
            }

            const result = await sock.groupParticipantsUpdate(
                chatId,
                [targetJid],
                'add'
            );

            if (result[0].status === '200') {
                await sock.sendMessage(chatId, {
                    text: `✅ *Successfully added!*\n\n@${targetNumber}`,
                    mentions: [targetJid],
                    ...channelInfo
                }, { quoted: message });
            } else if (result[0].status === '403') {
                await sock.sendMessage(chatId, {
                    text: `❌ *Failed to add user!*\n\n*Reason:* User has privacy settings that prevent being added to groups.\n\n*Solution:* Send them the group invite link.`,
                    ...channelInfo
                }, { quoted: message });
            } else if (result[0].status === '408') {
                await sock.sendMessage(chatId, {
                    text: `⚠️ *Invite sent!*\n\nUser needs to accept the invitation to join.`,
                    ...channelInfo
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, {
                    text: `❌ *Failed to add user!*\n\n*Status:* ${result[0].status}\n\nThe user may have blocked the bot or changed their privacy settings.`,
                    ...channelInfo
                }, { quoted: message });
            }

        } catch(error: any) {
            console.error('Add command error:', error);
            await sock.sendMessage(chatId, {
                text: `❌ *Error adding user!*\n\n${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};

/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/


