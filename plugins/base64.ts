export default {
  command: 'base64',
  aliases: ['b64', 'encode'],
  category: 'tools',
  description: 'Encode text to Base64',
  usage: '.base64 <text> OR reply to a message',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    try {
      let txt = args?.join(' ') || "";

      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        txt = quoted.conversation || 
              quoted.extendedTextMessage?.text || 
              quoted.imageMessage?.caption || 
              quoted.videoMessage?.caption || 
              txt;
      }

      txt = txt.replace(/^\.\w+\s*/, '').trim();

      if (!txt) {
        return await sock.sendMessage(chatId, { text: '*Please provide text to encode or reply to a message.*\nExample: .base64 Hello World' }, { quoted: message });
      }

      const encoded = Buffer.from(txt, 'utf-8').toString('base64');
      
      const response = `*🔗 Base64 Encoded:*\n\n${encoded}`;
      await sock.sendMessage(chatId, { text: response }, { quoted: message });

    } catch(err: any) {
      console.error('Base64 plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Failed to encode text.' }, { quoted: message });
    }
  }
};
