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


export default {
  command: 'uptime',
  aliases: ['runtime'],
  category: 'general',
  description: 'Show bot status information',
  usage: '.uptime',
  isPrefixless: true,

  async handler(sock: any, message: any) {
    const chatId = message.key.remoteJid;
    const commandHandler = (await import('../lib/commandHandler.js')).default;
    const uptimeMs = process.uptime() * 1000;

    const formatUptime = (ms: any) => {
      const sec = Math.floor(ms / 1000) % 60;
      const min = Math.floor(ms / (1000 * 60)) % 60;
      const hr  = Math.floor(ms / (1000 * 60 * 60)) % 24;
      const day = Math.floor(ms / (1000 * 60 * 60 * 24));

      const parts = [];
      if (day) parts.push(`${day}d`);
      if (hr) parts.push(`${hr}h`);
      if (min) parts.push(`${min}m`);
      parts.push(`${sec}s`);

      return parts.join(' ');
    };

    const startedAt = new Date(Date.now() - uptimeMs).toLocaleString();
    const ramMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const commandCount = commandHandler.commands.size;

    const text =
      `🤖 *MEGA-MD STATUS*\n\n` +
      `⏱ Uptime: ${formatUptime(uptimeMs)}\n` +
      `🚀 Started: ${startedAt}\n` +
      `📦 Plugins: ${commandCount}\n` +
      `💾 RAM: ${ramMb} MB`;

    await sock.sendMessage(chatId, { text });
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
