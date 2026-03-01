import { createRequire } from 'module';
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import moment from 'moment-timezone';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export default {
  command: 'script',
  aliases: ['repo', 'sc'],
  category: 'info',
  description: 'Get information about the MEGA-MD GitHub repository',
  usage: '.script',
  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const res = await fetch('https://api.github.com/repos/GlobalTechInfo/MEGA-MD');
      if (!res.ok) throw new Error('Error fetching repository data');
      const json = await res.json() as any as any;

      let txt = `*乂  MEGA MD  乂*\n\n`;
      txt += `✩  *Name* : ${json.name}\n`;
      txt += `✩  *Watchers* : ${json.watchers_count}\n`;
      txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
      txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
      txt += `✩  *URL* : ${json.html_url}\n`;
      txt += `✩  *Forks* : ${json.forks_count}\n`;
      txt += `✩  *Stars* : ${json.stargazers_count}\n\n`;
      txt += `💥 *MEGA MD*`;

      const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
      const imgBuffer = fs.readFileSync(imgPath);

      await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
    } catch(error: any) {
      console.error('Error in github command:', error);
      await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
    }
  }
};
