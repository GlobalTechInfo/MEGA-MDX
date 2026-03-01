import isOwnerOrSudo from '../lib/isOwner.js';
import store from '../lib/lightweight_store.js';
import { cleanJid } from '../lib/isOwner.js';

export default {
    command: 'settings',
    aliases: ['config', 'setting'],
    category: 'owner',
    description: 'Show bot settings and per-group configurations',
    usage: '.settings',
    async handler(sock: any, message: any, args: any, context: any = {}) {
        const chatId = context.chatId || message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;

        try {
            const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
            const isMe = message.key.fromMe;

            if (!isMe && !isOwner) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ *Access Denied:* Only Owner/Sudo can view settings.' 
                }, { quoted: message });
            }
            
            const isGroup = chatId.endsWith('@g.us');

            const botMode = await store.getBotMode();
            
            const allSettings = await store.getAllSettings('global');
            const autoStatus = allSettings.autoStatus || { enabled: false };
            const autoread = allSettings.autoread || { enabled: false };
            const autotyping = allSettings.autotyping || { enabled: false };
            const pmblocker = allSettings.pmblocker || { enabled: false };
            const anticall = allSettings.anticall || { enabled: false };
            const autoReaction = allSettings.autoReaction || false;

            const getSt = (val) => val ? '✅' : '❌';

            let menuText = `╭━〔 *MEGA SETTINGS* 〕━┈\n┃\n`;
            menuText += `┃ 👤 *User:* @${cleanJid(senderId)}\n`;
            menuText += `┃ 🤖 *Mode:* ${botMode.toUpperCase()}\n`;
            menuText += `┃\n┣━〔 *GLOBAL CONFIG* 〕━┈\n`;
            menuText += `┃ ${getSt(autoStatus?.enabled)} *Auto Status*\n`;
            menuText += `┃ ${getSt(autoread?.enabled)} *Auto Read*\n`;
            menuText += `┃ ${getSt(autotyping?.enabled)} *Auto Typing*\n`;
            menuText += `┃ ${getSt(pmblocker?.enabled)} *PM Blocker*\n`;
            menuText += `┃ ${getSt(anticall?.enabled)} *Anti Call*\n`;
            menuText += `┃ ${getSt(autoReaction)} *Auto Reaction*\n`;
            menuText += `┃\n`;

            if (isGroup) {
                const groupSettings = await store.getAllSettings(chatId);
                
                const groupAntilink = groupSettings.antilink || { enabled: false };
                const groupBadword = groupSettings.antibadword || { enabled: false };
                const groupAntitag = groupSettings.antitag || { enabled: false };
                const groupChatbot = groupSettings.chatbot || false;
                const groupWelcome = groupSettings.welcome || false;
                const groupGoodbye = groupSettings.goodbye || false;

                menuText += `┣━〔 *GROUP CONFIG* 〕━┈\n`;
                menuText += `┃ ${getSt(groupAntilink.enabled)} *Antilink*\n`;
                menuText += `┃ ${getSt(groupBadword.enabled)} *Antibadword*\n`;
                menuText += `┃ ${getSt(groupAntitag.enabled)} *Antitag*\n`;
                menuText += `┃ ${getSt(groupChatbot)} *Chatbot*\n`;
                menuText += `┃ ${getSt(groupWelcome)} *Welcome*\n`;
                menuText += `┃ ${getSt(groupGoodbye)} *Goodbye*\n`;
            } else {
                menuText += `┃ 💡 *Note:* _Use in group for group configs._\n`;
            }

            menuText += `┃\n╰━━━━━━━━━━━━━━━━┈`;

            await sock.sendMessage(chatId, { 
                text: menuText,
                mentions: [senderId],
                contextInfo: {
                    externalAdReply: {
                        title: "SYSTEM SETTINGS PANEL",
                        body: "Configuration Status",
                        thumbnailUrl: "https://github.com/GlobalTechInfo.png",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: message });

        } catch(error: any) {
            console.error('Settings Command Error:', error);
            await sock.sendMessage(chatId, { 
                text: '❌ Error: Failed to load settings.' 
            }, { quoted: message });
        }
    }
};
