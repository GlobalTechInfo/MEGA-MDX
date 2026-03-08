import type { BotContext } from '../types.js';
import pkg from 'api-qasim';
const QasimAny = pkg as any;

export default {
  command: 'stext',
  aliases: ['fancytext', 'textstyle', 'styletext'],
  category: 'menu',
  description: 'Style text in different fancy formats',
  usage: '.stext <text>',
  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const text = args.join(' ');
    try {
      if (!text || text.trim() === '') {
        await sock.sendMessage(chatId, {
          text: "*Please provide a text to style.*\nExample: .stext Hello"
        }, { quoted: message });
        return;
      }
      const styledResult = await QasimAny.styletext(text);

      if (!Array.isArray(styledResult) || styledResult.length === 0) {
        throw new Error('No styled text found.');
      }
      let messageText = 'Reply with choosen number:\n\n';
      styledResult.forEach((item, index) => {
        const styledText = item.result || item;
        messageText += `*${index + 1}.* ${styledText}\n`;
      });

      const sentMsg = await sock.sendMessage(chatId, {
        text: messageText
      }, { quoted: message });

      sock.styletext = sock.styletext || {};
      sock.styletext[sentMsg.key.id] = styledResult;

      const listener = async ({ messages }: any) => {
        const m = messages[0];
        if (!m.message || !m.key || !m.key.remoteJid) return;
        if (m.key.remoteJid !== chatId) return;

        let isQuoted = false;
        if (m.message.extendedTextMessage &&
            m.message.extendedTextMessage.contextInfo &&
            m.message.extendedTextMessage.contextInfo.quotedMessage) {
          const quotedId = m.message.extendedTextMessage.contextInfo.stanzaId
            || m.message.extendedTextMessage.contextInfo.quotedMessageKey?.id;
          if (quotedId === sentMsg.key.id) isQuoted = true;
        }

        let userReply = m.message.conversation || '';
        if (m.message.extendedTextMessage && m.message.extendedTextMessage.text)
          userReply = m.message.extendedTextMessage.text;

        if (!userReply) return;
        if (!isQuoted && m.message.conversation !== sentMsg.key.id) return;

        const choice = parseInt(userReply.trim(), 10);
        if (!isNaN(choice) && choice >= 1 && choice <= styledResult.length) {
          const selectedText = styledResult[choice - 1].result || styledResult[choice - 1];
          await sock.sendMessage(m.key.remoteJid, { text: selectedText }, { quoted: m });
          delete sock.styletext[sentMsg.key.id];
          sock.ev.off('messages.upsert', listener);
        } else {
          await sock.sendMessage(m.key.remoteJid, {
            text: `Invalid selection. Please choose a number between 1 and ${styledResult.length}.`
          }, { quoted: m });
        }
      };

      sock.ev.on('messages.upsert', listener);

    } catch(error: any) {
      console.error('Error in styleTextCommand:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Failed to style the text. Please try again later.'
      }, { quoted: message });
    }
  }
};
