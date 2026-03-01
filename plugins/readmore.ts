const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

export default {
  command: 'readmore',
  aliases: ['rmadd', 'readadd'],
  category: 'tools',
  description: 'Hide text using read more',
  usage: '.readmore text\n.readmore text1|text2',
  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const text = args.join(' ').trim();
    if (!text) {
      return await sock.sendMessage(
        chatId,
        { text: 'Usage:\n.readmore text\n.readmore text1|text2' },
        { quoted: message }
      );
    }
    let output;
    if (text.includes('|')) {
      const parts = text.split('|');
      const firstPart = parts.shift();
      const rest = parts.join('|');
      output = firstPart + readMore + rest;
    } else {
      output = text + readMore;
    }
    await sock.sendMessage(chatId, { text: output }, { quoted: message });
  }
};
