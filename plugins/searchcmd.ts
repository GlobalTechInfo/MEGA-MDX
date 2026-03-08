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

import CommandHandler from '../lib/commandHandler.js';

export default {
  command: 'find',
  aliases: ['lookup', 'searchcmd'],
  category: 'general',
  description: 'Find a command by keyword or description',
  usage: '.find [keyword]',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const query = args.join(' ').toLowerCase();

    if (!query) {
      return await sock.sendMessage(chatId, { text: 'What are you looking for? Example: *.find status*' }, { quoted: message });
    }

    try {
      const allCommands = Array.from(CommandHandler.commands.values());

      const results = allCommands.filter(commandObject => {
        const nameMatch = commandObject.command?.toLowerCase().includes(query);
        const descMatch = commandObject.description?.toLowerCase().includes(query);
        const aliasMatch = commandObject.aliases?.some(a => a.toLowerCase().includes(query));

        return nameMatch || descMatch || aliasMatch;
      });

      if (results.length === 0) {
        const suggestion = CommandHandler.findSuggestion(query);
        let failText = `❌ No commands found matching *"${query}"*`;
        if (suggestion) failText += `\n\nDid you mean: *.${suggestion}*?`;

        return await sock.sendMessage(chatId, { text: failText }, { quoted: message });
      }

      let resultText = `🔍 *SEARCH RESULTS FOR:* "${query.toUpperCase()}"\n\n`;

      results.forEach((res, index) => {
        const status = CommandHandler.disabledCommands.has(res.command.toLowerCase()) ? '🔸' : '🔹';
        resultText += `${index + 1}. ${status} *.${res.command}*\n`;
        resultText += `📝 _${res.description || 'No description available.'}_\n`;
        if (res.aliases && res.aliases.length > 0) {
          resultText += `🔗 Aliases: ${res.aliases.join(', ')}\n`;
        }
        resultText += `\n`;
      });

      resultText += `💡 _Tip: Use the prefix before the command name to run it._`;

      await sock.sendMessage(chatId, { text: resultText }, { quoted: message });

    } catch(error: any) {
      console.error('Search Error:', error);
      await sock.sendMessage(chatId, { text: '❌ An error occurred during the search.' });
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
