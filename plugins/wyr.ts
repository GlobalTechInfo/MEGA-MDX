import axios from 'axios';

export default {
  command: 'wyr',
  aliases: ['wouldyourather'],
  category: 'quotes',
  description: 'Get a Would You Rather question',
  usage: '.wyr',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const res = await axios.get('https://discardapi.dpdns.org/api/quote/wyr?apikey=guru');

      if (!res.data || res.data.status !== true) {
        return await sock.sendMessage(chatId, { text: '❌ Failed to fetch question.' }, { quoted: message });
      }

      const opt1 = res.data.question?.option1 || 'Option 1 not found';
      const opt2 = res.data.question?.option2 || 'Option 2 not found';
      const _creator = res.data.creator || 'Unknown';

      const replyText = `🤔 *Would You Rather*\n\n◍ ${opt1}\n◍ ${opt2}`;

      await sock.sendMessage(chatId, { text: replyText }, { quoted: message });

    } catch(err: any) {
      console.error('WYR plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Error while fetching question.' }, { quoted: message });
    }
  }
};
