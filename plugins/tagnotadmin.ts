import type { BotContext } from '../types.js';
export default {
  command: 'tagnotadmin',
  aliases: ['tagmembers', 'tagnon'],
  category: 'admin',
  description: 'Tag all non-admin members in the group',
  usage: '.tagnotadmin',
  groupOnly: true,
  adminOnly: true,

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    try {
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants || [];

      const nonAdmins = participants.filter((p: any) => !p.admin).map((p: any) => p.id);

      if (nonAdmins.length === 0) {
        await sock.sendMessage(chatId, {
          text: 'No non-admin members to tag.',
          ...channelInfo
        }, { quoted: message });
        return;
      }

      let text = '🔊 *Hello Everyone:*\n\n';
      nonAdmins.forEach((jid: any) => {
        text += `@${jid.split('@')[0]}\n`;
      });

      await sock.sendMessage(chatId, {
        text,
        mentions: nonAdmins,
        ...channelInfo
      }, { quoted: message });

    } catch(error: any) {
      console.error('Error in tagnotadmin command:', error);
      await sock.sendMessage(chatId, {
        text: 'Failed to tag non-admin members.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
