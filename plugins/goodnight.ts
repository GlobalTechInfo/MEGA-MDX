
export default {
  command: 'goodnight',
  aliases: ['gn', 'night'],
  category: 'quotes',
  description: 'Send a random good night message',
  usage: '.goodnight',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const shizokeys = 'shizo';
      const res = await fetch(
        `https://shizoapi.onrender.com/api/texts/lovenight?apikey=${shizokeys}`
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json() as any as any;
      const goodnightMessage = json.result;

      await sock.sendMessage(chatId, { text: goodnightMessage }, { quoted: message });

    } catch(error: any) {
      console.error('Goodnight plugin error:', error);
      await sock.sendMessage(chatId, { text: '❌ Failed to get goodnight message. Please try again later!' }, { quoted: message });
    }}
};
