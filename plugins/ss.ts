import axios from 'axios';

export default {
  command: 'screenshot',
  aliases: ['ss', 'ssweb'],
  category: 'tools',
  description: 'Get a screenshot of a website',
  usage: '.screenshot <url>',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    let url = args?.[0]?.trim();

    if (!url) {
      return await sock.sendMessage(chatId, { text: '*Provide a URL.*\nExample: .screenshot https://github.com' }, { quoted: message });
    }

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
    } catch {
      return await sock.sendMessage(chatId, { text: '❌ Invalid URL provided.' }, { quoted: message });
    }

    try {
      const apiUrl = `https://discardapi.dpdns.org/api/tools/ssweb?apikey=guru&url=${encodeURIComponent(url)}`;

      const { data } = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      const caption = `🌐 Screenshot of:\n${url}`;
      await sock.sendMessage(chatId, { image: { buffer: data }, caption }, { quoted: message });

    } catch(error: any) {
      console.error('Screenshot plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, { text: '❌ Request timed out. The site may be slow or unreachable.' }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch screenshot. Make sure the URL is correct.' }, { quoted: message });
      }
    }
  }
};

