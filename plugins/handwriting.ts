import axios from 'axios';

export default {
  command: 'handwrite',
  aliases: ['hw', 'writehand'],
  category: 'tools',
  description: 'Convert text to handwritten-style image',
  usage: '.handwrite <text>',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const textInput = args?.join(' ')?.trim();

    if (!textInput) {
      return await sock.sendMessage(chatId, { text: '*Provide some text to handwrite.*\nExample: .handwrite Hello World' }, { quoted: message });
    }

    try {
      const apiUrl = `https://discardapi.onrender.com/api/tools/handwrite?apikey=guru&text=${encodeURIComponent(textInput)}`;

      const { data } = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      const caption = `✍️ Handwritten Text:\n${textInput}`;
      await sock.sendMessage(chatId, { image: { buffer: data }, caption }, { quoted: message });

    } catch(error: any) {
      console.error('Handwrite plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, { text: '❌ Request timed out. The API may be slow or unreachable.' }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, { text: '❌ Failed to generate handwritten image.' }, { quoted: message });
      }
    }
  }
};
