import { createRequire } from 'module';
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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


import fs from 'fs';
import path from 'path';

export default {
  command: 'inspect',
  aliases: ['cat', 'readcode', 'getplugin'],
  category: 'owner',
  description: 'Read the source code of a specific plugin',
  usage: '.inspect [plugin_name]',
  ownerOnly: 'true',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = message.key.remoteJid;

    const pluginName = args[0];
    if (!pluginName) {
      return await sock.sendMessage(chatId, { text: 'Which plugin do you want to inspect? Example: *.inspect convert*' }, { quoted: message });
    }

    try {
      const pluginsDir = path.join(__dirname, '../plugins');
      
      const fileName = pluginName.endsWith('.js') ? pluginName : `${pluginName}.js`;
      const filePath = path.join(pluginsDir, fileName);

      if (!fs.existsSync(filePath)) {
        return await sock.sendMessage(chatId, { text: `❌ Plugin "${fileName}" not found.` }, { quoted: message });
      }

      const code = fs.readFileSync(filePath, 'utf8');

      const formattedCode = `💻 *SOURCE CODE: ${fileName}*\n\n\`\`\`javascript\n${code}\n\`\`\``;

      if (formattedCode.length > 4000) {
        await sock.sendMessage(chatId, {
          document: Buffer.from(code),
          fileName: fileName,
          mimetype: 'text/javascript',
          caption: `📄 Code for *${fileName}* (File too large for text message)`
        }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: formattedCode }, { quoted: message });
      }

    } catch(error: any) {
      console.error('Inspect Error:', error);
      await sock.sendMessage(chatId, { text: '❌ Failed to read the plugin file.' });
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
 
