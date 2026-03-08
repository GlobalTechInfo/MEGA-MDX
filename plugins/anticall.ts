import store from '../lib/lightweight_store.js';
import fs from 'fs';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const ANTICALL_PATH = './data/anticall.json';

async function readState() {
  try {
    if (HAS_DB) {
      const settings = await store.getSetting('global', 'anticall');
      return settings || { enabled: false };
    } else {
      if (!fs.existsSync(ANTICALL_PATH)) return { enabled: false };
      const raw = fs.readFileSync(ANTICALL_PATH, 'utf8');
      const data = JSON.parse(raw || '{}');
      return { enabled: !!data.enabled };
    }
  } catch {
    return { enabled: false };
  }
}

async function writeState(enabled) {
  try {
    if (HAS_DB) {
      await store.saveSetting('global', 'anticall', { enabled: !!enabled });
    } else {
      if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
      fs.writeFileSync(ANTICALL_PATH, JSON.stringify({ enabled: !!enabled }, null, 2));
    }
  } catch(e: any) {
    console.error('Error writing anticall state:', e);
  }
}

export default {
  command: 'anticall',
  aliases: ['acall', 'callblock'],
  category: 'owner',
  description: 'Enable or disable auto-blocking of incoming calls',
  usage: '.anticall <on|off|status>',
  ownerOnly: true,

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    const state = await readState();
    const sub = args.join(' ').trim().toLowerCase();

    if (!sub || !['on', 'off', 'status'].includes(sub)) {
      return await sock.sendMessage(
        chatId,
        {
          text: '*ANTICALL SETTINGS*\n\n' +
                '📵 Auto-block incoming calls\n\n' +
                '*Usage:*\n' +
                '• `.anticall on` - Enable\n' +
                '• `.anticall off` - Disable\n' +
                '• `.anticall status` - Current status\n\n' +
                `*Current Status:* ${state.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
                `*Storage:* ${HAS_DB ? 'Database' : 'File System'}`
        },
        { quoted: message }
      );
    }
    if (sub === 'status') {
      return await sock.sendMessage(
        chatId,
        {
          text: `📵 *Anticall Status*\n\n` +
                `Current: ${state.enabled ? '✅ *ENABLED*' : '❌ *DISABLED*'}\n` +
                `Storage: ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                `${state.enabled ? 'All incoming calls will be rejected and blocked.' : 'Incoming calls are allowed.'}`
        },
        { quoted: message }
      );
    }

    const enable = sub === 'on';
    await writeState(enable);

    await sock.sendMessage(
      chatId,
      {
        text: `📵 *Anticall ${enable ? 'ENABLED' : 'DISABLED'}*\n\n` +
              `${enable ? '✅ Incoming calls will now be rejected and blocked automatically.' : '❌ Incoming calls are now allowed.'}`
      },
      { quoted: message }
    );
  },

  readState,
  writeState
};
