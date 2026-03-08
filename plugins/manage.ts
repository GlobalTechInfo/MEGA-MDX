import type { BotContext } from '../types.js';
import CommandHandler from '../lib/commandHandler.js';

export default {
  command: 'manage',
  aliases: ['ctrl', 'control'],
  category: 'owner',
  description: 'Manage bot commands and aliases',
  usage: '.manage [toggle/alias] [command_name] [new_alias]',
  ownerOnly: true,

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;

    const action = args[0]?.toLowerCase();
    const targetCmd = args[1]?.toLowerCase();

    try {
      if (action === 'toggle') {
        if (!CommandHandler.commands.has(targetCmd)) {
          return await sock.sendMessage(chatId, { text: `❌ Command *${targetCmd}* not found.` }, { quoted: message });
        }
        const state = CommandHandler.toggleCommand(targetCmd);
        return await sock.sendMessage(chatId, { text: `✅ Command *${targetCmd}* has been *${state}*.` }, { quoted: message });
      }

      if (action === 'alias') {
        const newAlias = args[2]?.toLowerCase();
        if (!targetCmd || !newAlias) {
          return await sock.sendMessage(chatId, { text: '❌ Usage: .manage alias [command] [new_alias]' }, { quoted: message });
        }

        if (!CommandHandler.commands.has(targetCmd)) {
          return await sock.sendMessage(chatId, { text: `❌ Source command *${targetCmd}* not found.` }, { quoted: message });
        }

        CommandHandler.aliases.set(newAlias, targetCmd);
        return await sock.sendMessage(chatId, { text: `✅ Added alias *${newAlias}* for command *${targetCmd}*.` }, { quoted: message });
      }

      const helpText = `🛠️ *COMMAND MANAGER*\n\n` +
                       `*⁠• Toggle:* .manage toggle [name]\n` +
                       `*• Alias:* .manage alias [name] [new_alias]\n` +
                       `*• Reload:* Run your reload command to reset changes.`;

      await sock.sendMessage(chatId, { text: helpText }, { quoted: message });

    } catch(error: any) {
      console.error('Error in manage plugin:', error);
      await sock.sendMessage(chatId, { text: '❌ Management action failed.' }, { quoted: message });
    }
  }
};
