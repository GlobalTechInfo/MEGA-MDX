import { createRequire } from 'module';
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import path from 'path';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const warningsFilePath = path.join(__dirname, '../data/warnings.json');

async function loadWarnings() {
  if (HAS_DB) {
    const warnings = await store.getSetting('global', 'warnings');
    return warnings || {};
  } else {
    if (!fs.existsSync(warningsFilePath)) {
      fs.writeFileSync(warningsFilePath, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(warningsFilePath, 'utf8');
    return JSON.parse(data);
  }
}

export default {
  command: 'warnings',
  aliases: ['checkwarn', 'warncount'],
  category: 'group',
  description: 'Check warning count of a user',
  usage: '.warnings [@user]',
  groupOnly: true,
  
  async handler(sock: any, message: any, args: any, context: any) {
    const { chatId, channelInfo } = context;
    
    const mentionedJidList = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    
    if (mentionedJidList.length === 0) {
      await sock.sendMessage(chatId, { 
        text: 'Please mention a user to check warnings.',
        ...channelInfo
      }, { quoted: message });
      return;
    }

    const userToCheck = mentionedJidList[0];
    const warnings = await loadWarnings();
    const warningCount = (warnings[chatId] && warnings[chatId][userToCheck]) || 0;

    await sock.sendMessage(chatId, { 
      text: `@${userToCheck.split('@')[0]} has ${warningCount} warning(s).\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`,
      mentions: [userToCheck],
      ...channelInfo
    }, { quoted: message });
  }
};

