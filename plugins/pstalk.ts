import axios from 'axios';

export default {
  command: 'pinstalk',
  aliases: ['pstalk', 'pinprofile'],
  category: 'stalk',
  description: 'Lookup Pinterest user profile',
  usage: '.pinstalk <username>',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    if (!args.length) {
      return await sock.sendMessage(chatId, {
        text: '*Please provide a Pinterest username.*\nExample: .pinstalk anti_establishment'
      }, { quoted: message });
    }

    const username = args[0];

    try {
      const { data } = await axios.get(`https://discardapi.dpdns.org/api/stalk/pinterest`, {
        params: { apikey: 'guru', username: username }
      });

      if (!data?.result) {
        return await sock.sendMessage(chatId, { text: '❌ Pinterest user not found.' }, { quoted: message });
      }

      const result = data.result;
      const profileImage = result.image?.large || result.image?.original || null;

      const caption = `📌 *Pinterest Profile Info*\n\n` +
                      `👤 Full Name: ${result.full_name || 'N/A'}\n` +
                      `🆔 Username: ${result.username || 'N/A'}\n` +
                      `📝 Bio: ${result.bio || 'N/A'}\n` +
                      `📌 Boards: ${result.stats?.boards || 0}\n` +
                      `👥 Followers: ${result.stats?.followers || 0}\n` +
                      `➡ Following: ${result.stats?.following || 0}\n` +
                      `❤️ Likes: ${result.stats?.likes || 0}\n` +
                      `📌 Pins: ${result.stats?.pins || 0}\n` +
                      `💾 Saves: ${result.stats?.saves || 0}\n` +
                      `🔗 Profile URL: ${result.profile_url || 'N/A'}\n` +
                      `🌐 Website: ${result.website || 'N/A'}`;

      if (profileImage) {
        await sock.sendMessage(chatId, { image: { url: profileImage }, caption: caption }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: caption }, { quoted: message });
      }

    } catch(err: any) {
      console.error('Pinterest plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Failed to fetch Pinterest profile.' }, { quoted: message });
    }
  }
};
