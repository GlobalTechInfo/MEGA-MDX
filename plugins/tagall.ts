import type { BotContext } from '../types.js';
export default {
  command: 'tagall',
  aliases: ['everyone', 'all'],
  category: 'admin',
  description: 'Tag all group members with their usernames',
  usage: '.tagall',
  groupOnly: true,
  adminOnly: true,

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    try {
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;

      if (!participants || participants.length === 0) {
        await sock.sendMessage(chatId, {
          text: 'No participants found in the group.',
          ...channelInfo
        }, { quoted: message });
        return;
      }

      let messageText = '🔊 *Hello Everyone:*\n\n';
      participants.forEach((participant: any) => {
        messageText += `@${participant.id.split('@')[0]}\n`;
      });

      await sock.sendMessage(chatId, {
        text: messageText,
        mentions: participants.map((p: any) => p.id),
        ...channelInfo
      });

    } catch(error: any) {
      console.error('Error in tagall command:', error);
      await sock.sendMessage(chatId, {
        text: 'Failed to tag all members.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
