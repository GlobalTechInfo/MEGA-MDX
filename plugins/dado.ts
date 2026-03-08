import type { BotContext } from '../types.js';
export default {
  command: 'dado',
  aliases: ['dados', 'dice'],
  category: 'games',
  description: 'Roll a random dice sticker',
  usage: '.dado',

  async handler(sock: any, message: any, args: any, _context: BotContext) {
    const chatId = message.key.remoteJid;

    const diceLinks = [
      'https://tinyurl.com/gdd01',
      'https://tinyurl.com/gdd02',
      'https://tinyurl.com/gdd003',
      'https://tinyurl.com/gdd004',
      'https://tinyurl.com/gdd05',
      'https://tinyurl.com/gdd006'
    ];

    const randomDice = diceLinks[Math.floor(Math.random() * diceLinks.length)];

    try {
      await sock.sendMessage(chatId, {
        sticker: { url: randomDice }
      }, { quoted: message });

    } catch(e: any) {
      console.error('Dice Plugin Error:', e);
      await sock.sendMessage(chatId, {
        image: { url: randomDice },
        caption: '🎲 The dice rolled!'
      }, { quoted: message });
    }
  }
};
