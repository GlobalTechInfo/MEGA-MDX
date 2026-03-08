import type { BotContext } from '../types.js';

import { setCommandReactState } from '../lib/reactions.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);


export default {
  command: 'cmdreact',
  aliases: ['creact', 'commandreact'],
  category: 'owner',
  description: 'Toggle command reactions',
  usage: '.creact on/off',
  ownerOnly: true,

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    if (!args[0] || !['on', 'off'].includes(args[0])) {
      await sock.sendMessage(chatId, {
        text: `*Usage:*\n.creact on/off\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
        ...channelInfo
      }, { quoted: message });
      return;
    }

    if (args[0] === 'on') {
      await setCommandReactState(true);
      await sock.sendMessage(chatId, {
        text: `*✅ Command reactions enabled*\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
        ...channelInfo
      }, { quoted: message });
    } else if (args[0] === 'off') {
      await setCommandReactState(false);
      await sock.sendMessage(chatId, {
        text: `*❌ Command reactions disabled*\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
        ...channelInfo
      }, { quoted: message });
    }
  }
};


