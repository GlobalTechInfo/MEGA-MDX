import { channelInfo } from '../lib/messageConfig.js';

const extractPhoneNumber = (jid: string): string | null => {
    if (!jid) return null;
    const number = jid
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
        .replace('@g.us', '')
        .split(':')[0];
    if (number.length < 10 && jid.includes('@lid')) return null;
    return number;
};

const _getDisplayName = async (jid: string, sock: any, pushName?: string): Promise<string> => {
    try {
        if (pushName?.trim()) return pushName.trim();

        if (sock.store?.contacts?.[jid]) {
            const contact = sock.store.contacts[jid];
            if (contact.name || contact.notify) return contact.name || contact.notify;
        }

        const phone = extractPhoneNumber(jid);
        if (phone && phone.length >= 10) return `+${phone}`;

        return jid.split('@')[0].split(':')[0];
    } catch {
        return jid.split('@')[0].split(':')[0];
    }
};

const TRAITS = [
    'Intelligent', 'Creative', 'Determined', 'Ambitious', 'Caring',
    'Charismatic', 'Confident', 'Empathetic', 'Energetic', 'Friendly',
    'Generous', 'Honest', 'Humorous', 'Imaginative', 'Independent',
    'Intuitive', 'Kind', 'Logical', 'Loyal', 'Optimistic',
    'Passionate', 'Patient', 'Persistent', 'Reliable', 'Resourceful',
    'Sincere', 'Thoughtful', 'Understanding', 'Versatile', 'Wise'
];

export default {
    command: 'character',
    aliases: ['personality', 'traits'],
    category: 'group',
    description: "Analyze someone's character traits",
    usage: '.character @user',

    async handler(sock: any, message: any, args: string[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const ctx = message.message?.extendedTextMessage?.contextInfo;

        let userJid: string | undefined =
            ctx?.mentionedJid?.[0] ||
            ctx?.participant ||
            message.key.participant;

        if (!userJid) {
            return sock.sendMessage(chatId, {
                text: '❌ Please mention someone or reply to their message to analyze their character!',
                ...channelInfo
            }, { quoted: message });
        }

        if (userJid.includes('@lid') && sock.store?.contacts) {
            const resolved = Object.keys(sock.store.contacts).find(k =>
                sock.store.contacts[k]?.lid === userJid
            );
            if (resolved) userJid = resolved;
        }

        try {
            let profilePic: string;
            try {
                profilePic = await sock.profilePictureUrl(userJid, 'image');
            } catch {
                profilePic = 'https://i.imgur.com/2wzGhpF.jpeg';
            }

            let displayName: string;
        if (userJid.includes('@lid')) {
            // lid JID - can't resolve to real number unless in contacts
            const fromContacts = sock.store?.contacts?.[userJid];
            displayName = fromContacts?.name || fromContacts?.notify || 'Unknown User';
        } else {
            displayName = await sock.getName(userJid) || '+' + userJid.replace('@s.whatsapp.net', '');
        }

            // Pick random traits
            const numTraits = Math.floor(Math.random() * 3) + 3;
            const selected: string[] = [];
            while (selected.length < numTraits) {
                const t = TRAITS[Math.floor(Math.random() * TRAITS.length)];
                if (!selected.includes(t)) selected.push(t);
            }

            const traitLines = selected.map(t => `• ${t}: ${Math.floor(Math.random() * 41) + 60}%`);

            const analysis =
                `🔮 *Character Analysis* 🔮\n\n` +
                `👤 *User:* ${displayName}\n\n` +
                `✨ *Key Traits:*\n${traitLines.join('\n')}\n\n` +
                `🎯 *Overall Rating:* ${Math.floor(Math.random() * 21) + 80}%\n\n` +
                `_Note: This is a fun analysis, don't take it seriously!_`;

            await sock.sendMessage(chatId, {
                image: { url: profilePic },
                caption: analysis,
                mentions: [userJid],
                ...channelInfo
            }, { quoted: message });

        } catch {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to analyze character! Try again later.',
                ...channelInfo
            }, { quoted: message });
        }
    }
};
