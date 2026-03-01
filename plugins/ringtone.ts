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
  command: 'ringtone',
  aliases: ['ring', 'tone'],
  category: 'music',
  description: 'Search and download ringtones',
  usage: '.ringtone <search term>',
  
  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const searchQuery = args.join(' ').trim();

    try {
      if (!searchQuery) {
        return await sock.sendMessage(chatId, {
          text: "*Which ringtone do you want to search?*\nUsage: .ringtone <name>\n\nExample: .ringtone Nokia"
        }, { quoted: message });
      }

      await sock.sendMessage(chatId, {
        text: "🔍 *Searching for ringtones...*"
      }, { quoted: message });

      await new Promise(resolve => setTimeout(resolve, 10000));

      const searchUrl = `https://discardapi.dpdns.org/api/dl/ringtone?apikey=guru&title=${encodeURIComponent(searchQuery)}`;
      const response = await axios.get(searchUrl, { timeout: 30000 });
      
      if (!response.data?.result || response.data.result.length === 0) {
        return await sock.sendMessage(chatId, {
          text: "❌ *No ringtones found!*\nTry a different search term."
        }, { quoted: message });
      }

      const ringtones = response.data.result;
      const totalFound = ringtones.length;

      const limit = Math.min(2, totalFound);

      for (let i = 0; i < limit; i++) {
        const audioUrl = ringtones[i].audio;
        
        try {
          await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${searchQuery}_${i + 1}.mp3`,
            contextInfo: {
              externalAdReply: {
                title: `${searchQuery} Ringtone ${i + 1}`,
                body: `Ringtone ${i + 1} of ${limit}`,
                mediaType: 2,
                thumbnail: null
              }
            }
          }, { quoted: message });

          if (i < limit - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch(sendError: any) {
          console.error(`Failed to send ringtone ${i + 1}:`, sendError.message);
          continue;
        }
      }

      await sock.sendMessage(chatId, {
        text: `✅ *Sent ${limit} ringtones!*\n\n${totalFound > limit ? `📊 *${totalFound - limit} more available*\nUse the same command again for different results.` : ''}`
      }, { quoted: message });

    } catch(error: any) {
      console.error('Ringtone Command Error:', error);
      
      let errorMsg = "❌ *Search failed!*\n\n";
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMsg += "*Reason:* Connection timeout\nThe API took too long to respond.";
      } else if (error.response) {
        errorMsg += `*Status:* ${error.response.status}\n*Error:* ${error.response.statusText}`;
      } else {
        errorMsg += `*Error:* ${error.message}`;
      }
      
      errorMsg += "\n\nPlease try again later.";

      await sock.sendMessage(chatId, {
        text: errorMsg
      }, { quoted: message });
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

