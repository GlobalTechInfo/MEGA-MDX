import fetch from 'node-fetch';

export default {
  command: 'quote',
  aliases: ['quotes', 'quotetext'],
  category: 'quotes',
  description: 'Get a random quote',
  usage: '.quote',
  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    try {
      const apiKey = 'shizo';
      const res = await fetch(`https://shizoapi.onrender.com/api/texts/quotes?apikey=${apiKey}`);
      if (!res.ok) throw await res.text();
      const json = await res.json() as any as any;
      const quoteMessage = json.result;
      await sock.sendMessage(chatId, { text: quoteMessage }, { quoted: message });
    } catch(error: any) {
      console.error('Quote Command Error:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Failed to get quote. Please try again later!'
      }, { quoted: message });
    }
  }
};
