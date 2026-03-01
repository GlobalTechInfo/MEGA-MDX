import axios from 'axios';

export default {
  command: 'bing',
  aliases: ['bingsearch'],
  category: 'search',
  description: 'Search something on Bing',
  usage: '.bing <query>',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const query = args?.join(' ')?.trim();
    if (!query) {
      return await sock.sendMessage(chatId, { text: '*Please provide something to search.*\nExample: .bing Pakistan' }, { quoted: message });
    }

    try {
      const url = `https://discardapi.dpdns.org/api/search/bing?apikey=guru&query=${encodeURIComponent(query)}`;
      const response = await axios.get(url);
      const data = response.data;

      if (!data?.status || !data?.result?.status || !Array.isArray(data.result.results.results) || data.result.results.results.length === 0) {
        return await sock.sendMessage(chatId, { text: '❌ No search results found.' }, { quoted: message });
      }
      const results = data.result.results.results.slice(0, 5);
      const text =
        `🔍 *Bing Search Results*\n\n` +
        results
          .map(
            (r, i) =>
              `「 ${i + 1} 」 *${r.title}*\n${r.description}\n🔗 ${r.url}`
          )
          .join('\n\n');

      await sock.sendMessage(chatId, { text }, { quoted: message });
    } catch(error: any) {
      console.error('Bing plugin error:', error);
      await sock.sendMessage(chatId, { text: '❌ Failed to fetch Bing search results.' }, { quoted: message });
    }}
};

