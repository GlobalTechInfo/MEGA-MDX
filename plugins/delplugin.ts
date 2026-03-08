import type { BotContext } from '../types.js';
import { join } from 'path';
import { unlinkSync, readdirSync } from 'fs';

export default {
  command: 'delplugin',
  aliases: ['deleteplugin', 'rmplugin'],
  category: 'owner',
  description: 'Delete a plugin by name (owner only)',
  usage: '.delplugin <plugin_name>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      if (!args || !args[0]) {
        return await sock.sendMessage(chatId, {
          text: `*🌟Example usage:*\n.delplugin main-menu`
        }, { quoted: message });
      }

      const pluginDir = join(process.cwd(), 'plugins');
      const pluginFiles = readdirSync(pluginDir).filter(f => f.endsWith('.js'));
      const pluginNames = pluginFiles.map(f => f.replace('.js', ''));

      if (!pluginNames.includes(args[0])) {
        return await sock.sendMessage(chatId, {
          text: `🗃️ This plugin doesn't exist!\n\nAvailable plugins:\n${pluginNames.join('\n')}`
        }, { quoted: message });
      }

      const filePath = join(pluginDir, args[0] + '.js');
      unlinkSync(filePath);

      await sock.sendMessage(chatId, { text: `⚠️ Plugin "${args[0]}.js" has been deleted.` }, { quoted: message });

    } catch(err: any) {
      console.error('rmplugin error:', err);
      await sock.sendMessage(chatId, {  text: `❌ Failed to delete plugin: ${err.message}`
      }, { quoted: message });
    }
  }
};
