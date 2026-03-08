import type { BotContext } from '../types.js';
import axios from 'axios';

export default {
  command: 'ttstalk',
  aliases: ['tikstalk', 'ttprofile'],
  category: 'stalk',
  description: 'Lookup TikTok user profile',
  usage: '.ttstalk <username>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;

    if (!args.length) {
      return await sock.sendMessage(chatId, {
        text: '*Please provide a TikTok username.*\nExample: .ttstalk truepakistanofficial'
      }, { quoted: message });
    }

    const username = args[0];

    try {
      const { data } = await axios.get('https://discardapi.dpdns.org/api/stalk/tiktok', {
        params: { apikey: 'guru', username: username }
      });

      if (!data?.result?.user) {
        return await sock.sendMessage(chatId, { text: '❌ TikTok user not found.' }, { quoted: message });
      }

      const user = data.result.user;
      const stats = data.result.statsV2 || data.result.stats;
      const profileImage = user.avatarLarger || user.avatarMedium || user.avatarThumb;
      const verifiedMark = user.verified ? '✅ Verified' : '';

      const caption = `🎵 *TikTok Profile Info*\n\n` +
                      `👤 Nickname: ${user.nickname || 'N/A'} ${verifiedMark}\n` +
                      `🆔 Username: @${user.uniqueId || 'N/A'}\n` +
                      `📝 Bio: ${user.signature || 'N/A'}\n` +
                      `🔒 Private Account: ${user.privateAccount ? 'Yes' : 'No'}\n\n` +
                      `👥 Followers: ${stats?.followerCount || 0}\n` +
                      `➡ Following: ${stats?.followingCount || 0}\n` +
                      `❤️ Likes: ${stats?.heartCount || 0}\n` +
                      `🎥 Videos: ${stats?.videoCount || 0}\n\n` +
                      `🔗 Profile URL: https://www.tiktok.com/@${user.uniqueId}`;

      if (profileImage) {
        await sock.sendMessage(chatId, { image: { url: profileImage }, caption: caption }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: caption }, { quoted: message });
      }

    } catch(err: any) {
      console.error('TikTok plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Failed to fetch TikTok profile.' }, { quoted: message });
    }
  }
};
