export default {
  command: 'excard',
  aliases: [],
  category: 'tools',
  description: 'Create a rich media card',
  usage: '.excard Title | Body | ImageURL',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    const input = args.join(' ');

    if (!input.includes('|')) {
      return await sock.sendMessage(chatId, {
        text: '*Usage:* .excard Title | Body | ImageURL\n\n*Example:* .excard Google | Search anything | https://google.com/logo.png'
      }, { quoted: message });
    }

    const [title, body, url] = input.split('|').map(t => t.trim());

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const _hasQuotedImage = quoted?.imageMessage;

    await sock.sendMessage(chatId, {
      text: body || " ",
      contextInfo: {
        externalAdReply: {
          title: title,
          body: 'Shared via Mega Md',
          thumbnailUrl: url || 'https://i.ibb.co/3S6f0mS/default.jpg',
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: url || 'https://github.com'
        }
      }
    }, { quoted: message });
  }
};
