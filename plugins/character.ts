import { channelInfo } from '../lib/messageConfig.js';

export default {
  command: 'character',
  aliases: ['personality', 'traits'],
  category: 'group',
  description: 'Analyze someone\'s character traits',
  usage: '.character @user',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    let userToAnalyze;

    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      userToAnalyze = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
      userToAnalyze = message.message.extendedTextMessage.contextInfo.participant;
    }

    if (!userToAnalyze) {
      return await sock.sendMessage(chatId, { 
        text: '❌ Please mention someone or reply to their message to analyze their character!', 
        ...channelInfo 
      }, { quoted: message });
    }

    try {
      let profilePic;
      try {
        profilePic = await sock.profilePictureUrl(userToAnalyze, 'image');
      } catch {
        profilePic = 'https://i.imgur.com/2wzGhpF.jpeg';
      }

      const traits = [
        "Intelligent","Creative","Determined","Ambitious","Caring",
        "Charismatic","Confident","Empathetic","Energetic","Friendly",
        "Generous","Honest","Humorous","Imaginative","Independent",
        "Intuitive","Kind","Logical","Loyal","Optimistic",
        "Passionate","Patient","Persistent","Reliable","Resourceful",
        "Sincere","Thoughtful","Understanding","Versatile","Wise"
      ];

      const numTraits = Math.floor(Math.random() * 3) + 3;
      const selectedTraits = [];
      while (selectedTraits.length < numTraits) {
        const randomTrait = traits[Math.floor(Math.random() * traits.length)];
        if (!selectedTraits.includes(randomTrait)) selectedTraits.push(randomTrait);
      }

      const traitPercentages = selectedTraits.map(trait => `${trait}: ${Math.floor(Math.random() * 41) + 60}%`);
      const analysis = `🔮 *Character Analysis* 🔮\n\n` +
        `👤 *User:* ${userToAnalyze.split('@')[0]}\n\n` +
        `✨ *Key Traits:*\n${traitPercentages.join('\n')}\n\n` +
        `🎯 *Overall Rating:* ${Math.floor(Math.random() * 21) + 80}%\n\n` +
        `Note: This is a fun analysis and should not be taken seriously!`;

      await sock.sendMessage(chatId, {
        image: { url: profilePic },
        caption: analysis,
        mentions: [userToAnalyze],
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

