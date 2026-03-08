import axios from 'axios';

export default {
  command: 'getty',
  aliases: ['gettyvideo', 'gettydl'],
  category: 'download',
  description: 'Download video or image from Getty Images',
  usage: '.getty <Getty URL>',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    const url = args?.[0];

    if (!url) {
      return await sock.sendMessage(chatId, { text: 'Please provide a Getty URL.\nExample: .getty https://www.gettyimages.com/detail/video/482277170' }, { quoted: message });
    }

    try {
      const apiUrl = `https://discardapi.dpdns.org/api/dl/getty?apikey=guru&url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiUrl, { timeout: 10000 });

      if (!data?.status || !data.result?.length) {
        return await sock.sendMessage(chatId, { text: '❌ No video found for this URL.' }, { quoted: message });
      }

      const videoUrl = data.result[0].video;
      const imageUrl = data.result[0].image;

      if (imageUrl) {
        await sock.sendMessage(chatId, { image: { url: imageUrl }, caption: '🖼️ Getty Thumbnail' }, { quoted: message });
      }

      if (videoUrl) {
        await sock.sendMessage(chatId, { video: { url: videoUrl }, caption: '🎬 Getty Video' }, { quoted: message });
      }

    } catch(error: any) {
      console.error('Getty plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch Getty video.' }, { quoted: message });
      }
    }
  }
};
