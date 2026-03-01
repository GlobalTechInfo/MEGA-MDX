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


import axios from 'axios';

export default {
  command: 'unshorten',
  aliases: ['expand', 'trace'],
  category: 'tools',
  description: 'See where a short link actually goes',
  usage: '.unshorten <short_url>',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const url = args[0];

    if (!url) {
      return await sock.sendMessage(chatId, { 
        text: '*Please provide a URL*\n\n*Usage:* .unshorten <url>' 
      }, { quoted: message });
    }

    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      targetUrl = 'https://' + url;
    }

    try {

      const res = await axios.get(targetUrl, { 
        maxRedirects: 10,
        timeout: 15000,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });

      const finalUrl = res.request.res.responseUrl || res.config.url || targetUrl;
      const redirectCount = res.request._redirectable._redirectCount || 0;

      let report = `*🔗 LINK TRACE RESULTS*\n\n`;
      report += `*Original:*\n${url}\n\n`;
      report += `*Destination:*\n${finalUrl}\n\n`;
      report += `*Redirects:* ${redirectCount}\n`;
      report += `*Status:* ${res.status} ${res.statusText || 'OK'}`;

      await sock.sendMessage(chatId, { text: report }, { quoted: message });

    } catch(err: any) {
      let errorMsg = '❌ *Failed to trace URL*\n\n';
      
      if (err.code === 'ENOTFOUND') {
        errorMsg += '*Reason:* Domain not found';
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        errorMsg += '*Reason:* Connection timeout';
      } else if (err.response) {
        errorMsg += `*Status:* ${err.response.status} ${err.response.statusText}`;
      } else {
        errorMsg += `*Error:* ${err.message}`;
      }

      await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
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
