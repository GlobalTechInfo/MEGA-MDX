import type { BotContext } from '../types.js';
import axios from 'axios';

export default {
  command: 'gimage',
  aliases: ['googleimage', 'gimg'],
  category: 'download',
  description: 'Search and send first 4 Google images',
  usage: '.gimage <search query>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const query = args?.join(' ').trim();

    if (!query) {
      return await sock.sendMessage(chatId, { text: 'Please provide a search query.\nExample: .gimage Pakistan' }, { quoted: message });
    }

    try {
      const apiUrl = `https://discardapi.dpdns.org/api/dl/gimage?apikey=guru&query=${encodeURIComponent(query)}`;
      const { data } = await axios.get(apiUrl, { timeout: 10000 });

      if (!data?.status || !data.imageUrls?.length) {
        return await sock.sendMessage(chatId, { text: '❌ No images found for this query.' }, { quoted: message });
      }

      const imagesToSend = data.imageUrls.slice(0, 4);

      for (let i = 0; i < imagesToSend.length; i++) {
        const imgUrl = imagesToSend[i];
        await sock.sendMessage(chatId, { image: { url: imgUrl }, caption: `🖼️ *Google Image ${i + 1}*` }, { quoted: message });
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }

    } catch(error: any) {
      console.error('GImage plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch Google images.' }, { quoted: message });
      }
    }
  }
};
