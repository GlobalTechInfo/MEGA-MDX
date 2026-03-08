import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default {
  command: 'addplugin',
  aliases: ['installplugin', 'install'],
  category: 'owner',
  description: 'Install a plugin from a GitHub Gist URL (owner only)',
  usage: '.addplugin <Gist URL>',

  /**
   * @param {object} sock - Baileys sock
   * @param {object} message - the original message object
   * @param {Array} args - command arguments
   * @param {object} context - additional context
   */
  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    const text = args?.[0];
    if (!text) {
      return await sock.sendMessage(chatId, {
        text: 'Please provide a plugin URL.\nExample: .addplugin https://gist.github.com/username/gistid'
      }, { quoted: message });
    }

    const gistMatch = text.match(/(?:\/|gist\.github\.com\/)([a-fA-F0-9]+)/);
    if (!gistMatch) {
      return await sock.sendMessage(chatId, { text: '❌ Invalid plugin URL.' }, { quoted: message });
    }

    const gistId = gistMatch[1];
    const gistURL = `https://api.github.com/gists/${gistId}`;

    try {
      const response = await axios.get(gistURL);
      const gistData = response.data;

      if (!gistData || !gistData.files) {
        return await sock.sendMessage(chatId, { text: '❌ No valid files found in the Gist.' }, { quoted: message });
      }

      const pluginDir = path.join(process.cwd(), 'plugins');

      for (const file of Object.values(gistData.files)) {
        const pluginName = (file as any).filename;
        const pluginPath = path.join(pluginDir, pluginName);

        await fs.promises.writeFile(pluginPath, (file as any).content);
      }

      await sock.sendMessage(chatId, { text: '*✅ Successfully installed plugin from Gist.*' }, { quoted: message });
    } catch(error: any) {
      console.error('install plugin error:', error);
      await sock.sendMessage(chatId, { text: `❌ Error fetching or saving the plugin: ${error.message}` }, { quoted: message });
    }
  }
};

