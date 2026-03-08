
export default {
  command: 'roseday',
  aliases: ['rose', 'rosequote'],
  category: 'quotes',
  description: 'Get a random Rose Day message/quote',
  usage: '.roseday',
  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const res = await fetch(`https://api.princetechn.com/api/fun/roseday?apikey=prince`);
      if (!res.ok) {
        throw await res.text();
      }
      const json = await res.json() as any as any;
      const rosedayMessage = json.result;
      await sock.sendMessage(chatId, { text: rosedayMessage }, { quoted: message });
    } catch(error: any) {
      console.error('RoseDay Command Error:', error);
      await sock.sendMessage(chatId, { text: '❌ Failed to get Rose Day quote. Please try again later!' }, { quoted: message });
    }
  }
};
