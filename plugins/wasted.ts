import type { BotContext } from '../types.js';
import axios from 'axios';
import { channelInfo } from '../lib/messageConfig.js';

export default {
  command: 'wasted',
  aliases: ['waste'],
  category: 'group',
  description: 'Waste someone in style!',
  usage: '.wasted @user',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    let userToWaste;
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
      userToWaste = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
      userToWaste = message.message.extendedTextMessage.contextInfo.participant;
    }
    if (!userToWaste) {
      return await sock.sendMessage(chatId, {
        text: 'Please mention someone or reply to their message to waste them!',
        ...channelInfo
      }, { quoted: message });
    }

    try {
      let profilePic;
      try {
        profilePic = await sock.profilePictureUrl(userToWaste, 'image');
      } catch {
        profilePic = 'https://i.imgur.com/2wzGhpF.jpeg';
      }
      const wastedResponse = await axios.get(
        `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(profilePic)}`,
        { responseType: 'arraybuffer' }
      );
      await sock.sendMessage(chatId, {
        image: Buffer.from(wastedResponse.data),
        caption: `⚰️ *Wasted* : ${(sock as any).store?.contacts?.[userToWaste]?.name || (sock as any).store?.contacts?.[userToWaste]?.notify || (userToWaste.includes('@s.whatsapp.net') ? '+' + userToWaste.replace('@s.whatsapp.net', '') : 'User')} 💀\n\nRest in pieces!`,
        mentions: [userToWaste],
        ...channelInfo
      }, { quoted: message });

    } catch(error: any) {
      console.error('Error in wasted command:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Failed to create wasted image! Try again later.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
