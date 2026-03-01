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


import CommandHandler from '../lib/commandHandler.js';

let activeMaintenanceTimer = null;

export default {
  command: 'maintenance',
  aliases: ['mtnc', 'lockdown'],
  category: 'owner',
  description: 'Disable non-owner commands for a duration or stop it early',
  usage: '.maintenance [minutes / stop]',
  ownerOnly: 'true',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;

    const input = args[0]?.toLowerCase();

    if (input === 'stop' || input === 'off') {
      if (activeMaintenanceTimer) {
        clearTimeout(activeMaintenanceTimer);
        activeMaintenanceTimer = null;
      }
      
      const allCommands = Array.from(CommandHandler.commands.values());
      allCommands.forEach(cmd => {
        if (cmd.category !== 'owner') {
          CommandHandler.disabledCommands.delete(cmd.command.toLowerCase());
        }
      });

      return await sock.sendMessage(chatId, { text: '✅ *MAINTENANCE ENDED EARLY*\nAll commands are now active.' }, { quoted: message });
    }
    
    const minutes = parseInt(input);
    if (isNaN(minutes) || minutes <= 0) {
      return await sock.sendMessage(chatId, { text: '❌ Usage: .maintenance [minutes] OR .maintenance stop' }, { quoted: message });
    }

    try {
      if (activeMaintenanceTimer) clearTimeout(activeMaintenanceTimer);

      const allCommands = Array.from(CommandHandler.commands.values());
      let affectedCount = 0;

      allCommands.forEach(cmd => {
        if (cmd.category !== 'owner' && cmd.command !== 'maintenance') {
          const key = cmd.command.toLowerCase();
          if (!CommandHandler.disabledCommands.has(key)) {
            CommandHandler.disabledCommands.add(key);
            affectedCount++;
          }
        }
      });

      await sock.sendMessage(chatId, { 
        text: `⚠️ *MAINTENANCE MODE STARTING*\n\n` +
              `Locked: ${affectedCount} commands\n` +
              `Duration: ${minutes}m\n\n` +
              `_Type ".maintenance stop" to enable commands early._`
      }, { quoted: message });

      activeMaintenanceTimer = setTimeout(async () => {
        allCommands.forEach(cmd => {
          if (cmd.category !== 'owner') {
            CommandHandler.disabledCommands.delete(cmd.command.toLowerCase());
          }
        });
        activeMaintenanceTimer = null;
        await sock.sendMessage(chatId, { text: '✅ *MAINTENANCE FINISHED*\nCommands re-enabled automatically.' });
      }, minutes * 60000);

    } catch(error: any) {
      console.error('Maintenance Error:', error);
      await sock.sendMessage(chatId, { text: '❌ Action failed.' }, { quoted: message });
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

