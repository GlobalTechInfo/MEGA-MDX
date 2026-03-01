export default {
  command: 'echo',
  aliases: [],
  category: 'general',
  description: 'Repeats your message a specified number of times.',
  usage: '.echo <text> <count>',
  isPrefixless: true,

  async handler(sock, message, args) {
    const chatId = message.key.remoteJid;

    if (args.length < 2) {
      return await sock.sendMessage(chatId, { text: 'Usage: .echo <text> <count>' }, { quoted: message });
    }

    const count = parseInt(args[args.length - 1]);
    if (isNaN(count) || count <= 0) {
      return await sock.sendMessage(chatId, { text: 'Count must be a positive number.' }, { quoted: message });
    }

    args.pop();
    const text = args.join(' ').trim();

    const repeated = Array(count).fill(text).join('\n');
    await sock.sendMessage(chatId, { text: repeated }, { quoted: message });
  }
};
