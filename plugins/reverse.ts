import axios from 'axios';

export default {
  command: 'reverse',
  aliases: ['revt', 'reversetext'],
  category: 'tools',
  description: 'Reverse any text',
  usage: '.reverse <text>',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    const textToReverse = args?.join(' ')?.trim();

    if (!textToReverse) {
      return await sock.sendMessage(chatId, { text: 'Please provide text to reverse.\nExample: .reverse Hello World' }, { quoted: message });
    }

    try {
      const apiUrl = `https://discardapi.dpdns.org/api/tools/reverse?apikey=guru&text=${encodeURIComponent(textToReverse)}`;
      const { data } = await axios.get(apiUrl, { timeout: 10000 });

      if (!data?.status || !data.result) {
        return await sock.sendMessage(chatId, { text: '❌ Failed to reverse the text.' }, { quoted: message });
      }

      const reply = `*Reversed:* ${data.result}`;

      await sock.sendMessage(chatId, { text: reply }, { quoted: message });

    } catch(error: any) {
      console.error('Reverse plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, { text: '❌ Request timed out. Please try again.' }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to reverse the text.' }, { quoted: message });
      }
    }
  }
};
