import axios from 'axios';

export default {
  command: 'joke2',
  aliases: ['funny2', 'jokes2'],
  category: 'fun',
  description: 'Get a random general joke',
  usage: '.joke2',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const res = await axios.get('https://raw.githubusercontent.com/GlobalTechInfo/Database/main/text/random_jokes.txt');

      if (!res.data) {
        return await sock.sendMessage(chatId, { text: '❌ Failed to fetch joke.' }, { quoted: message });
      }

      const jokes = res.data.split('\n').filter(line => line.trim() !== '');

      if (jokes.length === 0) {
        return await sock.sendMessage(chatId, { text: '❌ No jokes available.' }, { quoted: message });
      }

      const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

      await sock.sendMessage(chatId, { text: `😂 *Joke*\n\n${randomJoke}` }, { quoted: message });

    } catch(err: any) {
      console.error('Joke plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Error while fetching joke.' }, { quoted: message });
    }
  }
};
