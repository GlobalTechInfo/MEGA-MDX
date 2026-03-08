import type { BotContext } from '../types.js';
export default {
  command: 'mute',
  aliases: ['silence'],
  category: 'admin',
  description: 'Mute the group for a specified duration',
  usage: '.mute [duration in minutes]',
  groupOnly: true,
  adminOnly: true,

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    const durationInMinutes = args[0] ? parseInt(args[0], 10) : undefined;

    try {
      await sock.groupSettingUpdate(chatId, 'announcement');

      if (durationInMinutes !== undefined && durationInMinutes > 0) {
        const durationInMilliseconds = durationInMinutes * 60 * 1000;
        await sock.sendMessage(chatId, {
          text: `The group has been muted for ${durationInMinutes} minutes.`,
          ...channelInfo
        }, { quoted: message });

        setTimeout(async () => {
          try {
            await sock.groupSettingUpdate(chatId, 'not_announcement');
            await sock.sendMessage(chatId, {
              text: 'The group has been unmuted.',
              ...channelInfo
            });
          } catch(unmuteError: any) {
            console.error('Error unmuting group:', unmuteError);
          }
        }, durationInMilliseconds);
      } else {
        await sock.sendMessage(chatId, {
          text: 'The group has been muted.',
          ...channelInfo
        }, { quoted: message });
      }
    } catch(error: any) {
      console.error('Error muting/unmuting the group:', error);
      await sock.sendMessage(chatId, {
        text: 'An error occurred while muting/unmuting the group. Please try again.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
