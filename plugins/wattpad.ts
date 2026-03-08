import type { BotContext } from '../types.js';
import pkg from 'api-qasim';
const QasimAny = pkg as any;
import { channelInfo } from '../lib/messageConfig.js';

export default {
  command: 'wattpad',
  aliases: ['wattpadsearch', 'searchwattpad'],
  category: 'search',
  description: 'Search for stories on Wattpad!',
  usage: '.wattpad <query>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const query = args.join(' ').trim();

    if (!query) {
      return await sock.sendMessage(chatId, {
        text: '*Please provide a query (e.g., story title, author, or tag).*' +
              `\nExample: .wattpad The Hunger Games`,
        ...channelInfo
      }, { quoted: message });
    }

    try {
      const results = await QasimAny.wattpad(query);

      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('No results found for your query.');
      }

      const formattedResults = results.slice(0, 9).map((story, index) => {
        const title = story.judul || 'No title available';
        const reads = story.dibaca || 'No reads available';
        const votes = story.divote || 'No votes available';
        const thumb = story.thumb || '';
        const link = story.link || 'No link available';

        return `${index + 1}. *${title}*\n*Reads*: ${reads}\n*Votes*: ${votes}\nRead more: ${link}${thumb ? `\n${thumb}` : ''}`;
      }).join('\n\n');

      await sock.sendMessage(chatId, {
        text: `*Search Results For "${query}":*\n\n${formattedResults}`,
        ...channelInfo
      }, { quoted: message });

    } catch(error: any) {
      await sock.sendMessage(chatId, {
        text: `❌ An error occurred: ${error.message || error}`,
        ...channelInfo
      }, { quoted: message });
    }
  }
};

