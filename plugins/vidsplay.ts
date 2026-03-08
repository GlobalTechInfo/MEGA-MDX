import axios from 'axios';

export default {
  command: 'vidsplay',
  aliases: ['vidsplaydl', 'vidsplayvideo'],
  category: 'download',
  description: 'Download video and thumbnail from Vidsplay',
  usage: '.vidsplay <Vidsplay URL>',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    const url = args?.[0];

    if (!url) {
      return await sock.sendMessage(chatId, { text: 'Please provide a Vidsplay URL.\nExample: .vidsplay https://www.vidsplay.com/golf-free-stock-video/' }, { quoted: message });
    }

    try {
      const apiUrl = `https://discardapi.dpdns.org/api/dl/vidsplay?apikey=guru&url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiUrl, { timeout: 10000 });

      if (!data?.status || !data.result?.length) {
        return await sock.sendMessage(chatId, { text: '❌ No video found for this URL.' }, { quoted: message });
      }

      const videoUrl = data.result[0].video;
      const imageUrl = data.result[0].image;

      if (imageUrl) {
        await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: '🖼️ Vidsplay Thumbnail' }, { quoted: message });
      }

      if (videoUrl) {
        await sock.sendMessage(chatId, { video: { url: videoUrl }, caption: '🎬 Vidsplay Video' }, { quoted: message });
      }

    } catch(error: any) {
      console.error('Vidsplay plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch Vidsplay video.' }, { quoted: message });
      }
    }
  }
};
