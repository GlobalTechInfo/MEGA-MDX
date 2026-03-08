import axios from 'axios';

export default {
  command: 'istock',
  aliases: ['istockdl', 'istockdownload'],
  category: 'download',
  description: 'Download image or video from iStock URL',
  usage: '.istock <iStock URL>',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    const url = args?.[0]?.trim();

    if (!url) {
      return await sock.sendMessage(chatId, { text: 'Please provide an iStock URL.\nExample: .istock https://www.istockphoto.com/video/...' }, { quoted: message });
    }

    try {
      const apiUrl = `https://discardapi.dpdns.org/api/dl/istock?apikey=guru&url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiUrl, { timeout: 10000 });

      if (!data?.status || !data.result) {
        return await sock.sendMessage(chatId, { text: '❌ Failed to fetch media from the provided iStock URL.' }, { quoted: message });
      }

      const item = data.result;

      if (item.video) {
        await sock.sendMessage(chatId, { video: { url: item.video }, caption: '🎬 *iStock Video*' }, { quoted: message });
      }

      if (item.image) {
        await sock.sendMessage(chatId, { image: { url: item.image }, caption: '🖼️ *iStock Image*' }, { quoted: message });
      }

    } catch(error: any) {
      console.error('iStock download plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to download media from iStock URL.' }, { quoted: message });
      }
    }
  }
};
