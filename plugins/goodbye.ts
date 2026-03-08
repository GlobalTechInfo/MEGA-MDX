import type { BotContext } from '../types.js';
import { handleGoodbye } from '../lib/welcome.js';
import { isGoodByeOn, getGoodbye } from '../lib/index.js';

async function handleLeaveEvent(sock: any, id: any, participants: any) {
    const isGoodbyeEnabled = await isGoodByeOn(id);
    if (!isGoodbyeEnabled) return;

    const customMessage = await getGoodbye(id);
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;

    for (const participant of participants) {
        try {
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];

            let displayName = user;
            try {
                const contact = await sock.getBusinessProfile(participantString);
                if (contact && contact.name) {
                    displayName = contact.name;
                } else {
                    const groupParticipants = groupMetadata.participants;
                    const userParticipant = groupParticipants.find((p: any) => p.id === participantString);
                    if (userParticipant && userParticipant.name) {
                        displayName = userParticipant.name;
                    }
                }
            } catch(nameError: any) {
                console.log('Could not fetch display name, using phone number');
            }

            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName);
            } else {
                finalMessage = `*@${displayName}* we will never miss you!`;
            }

            try {
                let profilePicUrl = `https://img.pyrocdn.com/dbKUgahg.png`;
                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) {
                        profilePicUrl = profilePic;
                    }
                } catch(profileError: any) {
                    console.log('Could not fetch profile picture, using default');
                }

                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming1?type=leave&textcolor=red&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;

                const response = await fetch(apiUrl);
                if (response.ok) {
                    const imageBuffer = Buffer.from(await response.arrayBuffer());

                    await sock.sendMessage(id, {
                        image: imageBuffer,
                        caption: finalMessage,
                        mentions: [participantString]
                    });
                    continue;
                }
            } catch(imageError: any) {
                console.log('Image generation failed, falling back to text');
            }

            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString]
            });
        } catch(error: any) {
            console.error('Error sending goodbye message:', error);
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];

            let fallbackMessage;
            if (customMessage) {
                fallbackMessage = customMessage
                    .replace(/{user}/g, `@${user}`)
                    .replace(/{group}/g, groupName);
            } else {
                fallbackMessage = `Goodbye @${user}! 👋`;
            }

            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString]
            });
        }
    }
}

export default {
    command: 'goodbye',
    aliases: ['bye', 'leave'],
    category: 'admin',
    description: 'Configure goodbye messages for leaving members',
    usage: '.goodbye <on|off|set message>',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const matchText = args.join(' ');

        await handleGoodbye(sock, chatId, message, matchText);
    },

    handleLeaveEvent
};
