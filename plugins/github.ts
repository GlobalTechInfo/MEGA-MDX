import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';

export default {
  command: 'script',
  aliases: ['repo', 'sc'],
  category: 'info',
  description: 'Get information about the MEGA-MDX GitHub repository',
  usage: '.script',
  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const res = await fetch('https://api.github.com/repos/GlobalTechInfo/MEGA-MDX');
      if (!res.ok) throw new Error('Error fetching repository data');
      const json = await res.json() as any as any;

      let txt = `*乂  MEGA MDX  乂*\n\n`;
      txt += `✩  *Name* : ${json.name}\n`;
      txt += `✩  *Watchers* : ${json.watchers_count}\n`;
      txt += `✩  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
      txt += `✩  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
      txt += `✩  *URL* : ${json.html_url}\n`;
      txt += `✩  *Forks* : ${json.forks_count}\n`;
      txt += `✩  *Stars* : ${json.stargazers_count}\n\n`;
      txt += `💥 *MEGA MD*`;

      const imgPath = path.join(process.cwd(), 'assets/thumb.png');
      const imgBuffer = fs.readFileSync(imgPath);

      await sock.sendMessage(chatId, { image: imgBuffer, caption: txt }, { quoted: message });
    } catch(error: any) {
      console.error('Error in github command:', error);
      await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
    }
  }
};
