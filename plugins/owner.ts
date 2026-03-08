import type { BotContext } from '../types.js';

export default {
  command: 'owner',
  aliases: ['creator'],
  category: 'info',
  description: 'Get the contact of the bot owner',
  usage: '.owner',
  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const config = context.config;
    try {
      const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${config.botOwner}
TEL;waid=${config.ownerNumber}:${config.ownerNumber}
END:VCARD
      `.trim();
      await sock.sendMessage(chatId, {
        contacts: { displayName: config.botOwner, contacts: [{ vcard }] },
      }, { quoted: message });
    } catch(error: any) {
      console.error('Owner Command Error:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Failed to fetch owner contact.'
      }, { quoted: message });
    }
  }
};
