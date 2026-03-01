import axios from 'axios';

export default {
  command: 'sfile',
  aliases: ['sfl', 'sfileapk'],
  category: 'apks',
  description: 'Search APKs/files from SFile',
  usage: '.sfile <query>',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;

    if (!args.length) {
      return await sock.sendMessage(chatId, {
        text: '*Please provide a search query.*\nExample: .sfile telegram'
      }, { quoted: message });
    }
    const query = args.join(' ');
    try {
      const { data } = await axios.get(`https://discardapi.dpdns.org/api/apk/search/sfile`, {
        params: {
          apikey: 'guru',
          query: query
        }
      });

      if (!data?.result?.length) {
        return await sock.sendMessage(chatId, { text: '❌ No results found.' }, { quoted: message });
      }

      let menuText = '';
      data.result.forEach((item, i) => {
        menuText += `*${i + 1}.* ${item.nama}\n💾 Size: ${item.size}\n🔗 Link: ${item.link}\n\n`;
      });

      await sock.sendMessage(chatId, { text: menuText }, { quoted: message });

    } catch(err: any) {
      console.error('SFile plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Failed to fetch files.' }, { quoted: message });
    }
  }
};
