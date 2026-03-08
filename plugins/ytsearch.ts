import type { BotContext } from '../types.js';
/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/


import yts from 'yt-search';

export default {
  command: 'ytsearch',
  aliases: ['yts', 'playlist', 'playlista'],
  category: 'music',
  description: 'Search YouTube',
  usage: '.yts [query]',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, config } = context;
    const query = args.join(' ');
    const prefix = config.prefix;

    if (!query) {
      return sock.sendMessage(chatId, {
        text: `Example: *${prefix}yts* Lil Peep`
      }, { quoted: message });
    }

    try {
      await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

      const result = await yts(query);
      const videos = result.videos.slice(0, 10);

      if (videos.length === 0) {
        return sock.sendMessage(chatId, { text: '❌ No results found.' });
      }

      let searchText = `✨ *MUSIC SEARCH* ✨\n\n`;

      videos.forEach((v, index) => {
        searchText += `*${index + 1}.🎧 ${v.title}*\n`;
        searchText += `*⌚ Duration:* ${v.timestamp}\n`;
        searchText += `*👀 Views:* ${v.views}\n`;
        searchText += `*🔗 URL:* ${v.url}\n`;
        searchText += `──────────────────\n`;
      });

      await sock.sendMessage(chatId, {
        image: { url: videos[0].image },
        caption: searchText
      }, { quoted: message });

    } catch(error: any) {
      console.error('YouTube Search Error:', error);
      await sock.sendMessage(chatId, { text: '❌ Error searching YouTube.' });
    }
  }
};

/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/
