import { createRequire } from 'module';
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import fs from 'fs';
import path from 'path';
import store from './lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

async function loadCommandReactState() {
  try {
    if (HAS_DB) {
      const data = await store.getSetting('global', 'userGroupData');
      return data?.autoReaction || false;
    } else {
      if (fs.existsSync(USER_GROUP_DATA)) {
        const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA, "utf-8").toString());
        return data.autoReaction || false;
      }
    }
  } catch {}
  return false;
}

let COMMAND_REACT_ENABLED = false;

loadCommandReactState().then(state => {
  COMMAND_REACT_ENABLED = state;
});

async function addCommandReaction(sock: any, message: any) {
  if (!COMMAND_REACT_ENABLED) return;
  if (!message?.key?.id) return;

  await sock.sendMessage(message.key.remoteJid, {
    react: { text: '⏳', key: message.key }
  });
}

async function setCommandReactState(state) {
  COMMAND_REACT_ENABLED = state;
  
  try {
    if (HAS_DB) {
      const data = await store.getSetting('global', 'userGroupData') || {};
      data.autoReaction = state;
      await store.saveSetting('global', 'userGroupData', data);
    } else {
      let data: Record<string, any> = {};
      if (fs.existsSync(USER_GROUP_DATA)) {
        data = JSON.parse(fs.readFileSync(USER_GROUP_DATA, "utf-8").toString());
      }
      data.autoReaction = state;
      fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    }
  } catch(error: any) {
    console.error('Error saving command react state:', error);
  }
}

export {
  addCommandReaction,
  setCommandReactState,
  loadCommandReactState
};

