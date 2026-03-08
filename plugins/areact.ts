import type { BotContext } from '../types.js';
import store from '../lib/lightweight_store.js';
const autoEmojis = [
  '💘','💝','💖','💗','💓','💞','💕','💟','❣️','❤️',
  '🧡','💛','💚','💙','💜','🤎','🖤','🤍','♥️',
  '🎈','🎁','💌','💐','😘','🤗',
  '🌸','🌹','🥀','🌺','🌼','🌷',
  '🍁','⭐️','🌟','😊','🥰','😍',
  '🤩','☺️'
];

let AUTO_REACT_MESSAGES = false;
// Load persisted state
store.getSetting('global', 'autoReaction').then((v: any) => {
    if (v?.enabled !== undefined) AUTO_REACT_MESSAGES = v.enabled;
}).catch(() => {});
let lastReactedTime = 0;

function random(arr: any) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default {
  command: 'autoreact',
  aliases: ['areact'],
  category: 'owner',
  description: 'Toggle auto-react to messages',
  usage: '.autoreact on/off',
  ownerOnly: true,

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    if (!args[0] || !['on', 'off'].includes(args[0])) {
      await sock.sendMessage(chatId, {
        text: '*Usage:*\n.autoreact on/off',
        ...channelInfo
      }, { quoted: message });
      return;
    }

    AUTO_REACT_MESSAGES = args[0] === 'on';
    await store.saveSetting('global', 'autoReaction', { enabled: AUTO_REACT_MESSAGES });

    await sock.sendMessage(chatId, {
      text: AUTO_REACT_MESSAGES ? '*✅ Auto-react enabled*' : '*❌ Auto-react disabled*',
      ...channelInfo
    }, { quoted: message });

    if (sock.__autoReactAttached) return;

    sock.ev.on('messages.upsert', async ({ messages }: any) => {
      if (!AUTO_REACT_MESSAGES) return;

      for (const m of messages) {
        if (!m?.message) continue;
        if (m.key.fromMe) continue;

        const text =
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          '';

        if (!text) continue;
        if (/^[!#.$%^&*+=?<>]/.test(text)) continue;

        const now = Date.now();
        if (now - lastReactedTime < 2000) continue;

        await sock.sendMessage(m.key.remoteJid, {
          react: {
            text: random(autoEmojis),
            key: m.key
          }
        });

        lastReactedTime = now;
      }
    });

    sock.__autoReactAttached = true;
  }
};
