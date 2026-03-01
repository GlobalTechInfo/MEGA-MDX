export default {
  command: 'brainfuck',
  aliases: ['bfcode', 'obfuscate'],
  category: 'tools',
  description: 'Convert text into Brainfuck code',
  usage: '.brainfuck <text> OR reply to a message',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    try {
      let text = args?.join(' ') || "";

      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        text = quoted.conversation || 
               quoted.extendedTextMessage?.text || 
               quoted.imageMessage?.caption || 
               quoted.videoMessage?.caption || 
               text;
      }

      text = text.replace(/^\.\w+\s*/, '').trim();

      if (!text) {
        return await sock.sendMessage(chatId, { text: '*Please provide text or reply to a message to obfuscate!*' }, { quoted: message });
      }

      let bfCode = "";
      let lastAscii = 0;

      for (let i = 0; i < text.length; i++) {
        const ascii = text.charCodeAt(i);
        const diff = ascii - lastAscii;

        if (diff > 0) {
          bfCode += "+".repeat(diff);
        } else if (diff < 0) {
          bfCode += "-".repeat(Math.abs(diff));
        }

        bfCode += ".";
        lastAscii = ascii; 
      }

      const response = `*❄️ Brainfuck Obfuscated Text:*\n\n${bfCode}`;
      
      await sock.sendMessage(chatId, { text: response }, { quoted: message });

    } catch(err: any) {
      console.error('BF Encoding Error:', err);
      await sock.sendMessage(chatId, { text: '❌ Error generating code.' }, { quoted: message });
    }
  }
};
