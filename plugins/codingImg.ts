import type { BotContext } from '../types.js';
import axios from 'axios';

export default {
  command: 'coding',
  aliases: ['codingimg', 'programming', 'programmingimg'],
  category: 'images',
  description: 'Get a random programming image',
  usage: '.coding',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/images/coding.json');

      if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
        return await sock.sendMessage(chatId, { text: '❌ Failed to fetch image.' }, { quoted: message });
      }

      const randomImage = res.data[Math.floor(Math.random() * res.data.length)];

      await sock.sendMessage(chatId, { image: { url: randomImage }, caption: '💻 Programming Image' }, { quoted: message });

    } catch(err: any) {
      console.error('Programming image plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Error while fetching image.' }, { quoted: message });
    }
  }
};
