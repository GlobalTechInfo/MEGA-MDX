import os from 'os';
import process from 'process';
import settings from '../settings.js';

export default {
  command: 'alive',
  aliases: ['status', 'bot'],
  category: 'general',
  description: 'Check bot status and system info',
  usage: '.alive',
  isPrefixless: true,

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      let uptime = Math.floor(process.uptime());

      const days = Math.floor(uptime / 86400);
      uptime %= 86400;
      const hours = Math.floor(uptime / 3600);
      uptime %= 3600;
      const minutes = Math.floor(uptime / 60);
      const seconds = (Number(uptime) % Number(60));

      const uptimeParts = [];
      if (days) uptimeParts.push(`${days}d`);
      if (hours) uptimeParts.push(`${hours}h`);
      if (minutes) uptimeParts.push(`${minutes}m`);
      if (seconds || uptimeParts.length === 0) uptimeParts.push(`${seconds}s`);

      const uptimeText = uptimeParts.join(' ');
      const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
      const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
      const usedMem = (Number(totalMem) - Number(freeMem)).toFixed(2);
      const cpuLoad = os.loadavg()[0].toFixed(2);
      const platform = os.platform();
      const arch = os.arch();
      const nodeVersion = process.version;

      const text =
        `*🤖 ${settings.botName} IS ACTIVE!*\n\n` +
        `*Version:* ${settings.version}\n` +
        `*Uptime:* ${uptimeText}\n` +
        `*RAM Usage:* ${usedMem} MB / ${totalMem} MB\n` +
        `*CPU Load:* ${cpuLoad}\n` +
        `*Platform:* ${platform} (${arch})\n` +
        `*Node.js:* ${nodeVersion}\n`;

      await sock.sendMessage(chatId, {
        text,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363319098372999@newsletter',
            newsletterName: 'MEGA MD',
            serverMessageId: -1
          }
        }
      }, { quoted: message });

    } catch(error: any) {
      console.error('Error in alive command:', error);
      await sock.sendMessage(chatId, { text: '✅ Bot is alive and running!' }, { quoted: message });
    }
  }
};
