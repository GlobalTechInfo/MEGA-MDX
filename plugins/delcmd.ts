import store from '../lib/lightweight_store.js';
import fs from 'fs';
import path from 'path';
import { dataFile } from '../lib/paths.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);


const STICKER_FILE = dataFile('sticker_commands.json');

async function getStickerCommands() {
    if (HAS_DB) {
        const data = await store.getSetting('global', 'stickerCommands');
        return data || {};
    } else {
        try {
            if (!fs.existsSync(STICKER_FILE)) {
                return {};
            }
            return JSON.parse(fs.readFileSync(STICKER_FILE, 'utf8'));
        } catch {
            return {};
        }
    }
}

async function saveStickerCommands(data) {
    if (HAS_DB) {
        await store.saveSetting('global', 'stickerCommands', data);
    } else {
        const dir = path.dirname(STICKER_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(STICKER_FILE, JSON.stringify(data, null, 2));
    }
}

export default {
    command: 'delcmd',
    aliases: ['removecmd'],
    category: 'owner',
    description: 'Delete a sticker command',
    usage: '.delcmd <text>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any, context: any) {
        const { chatId } = context;

        let hash = args.join(' ');

        if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
            const fileSha256 = message.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage.fileSha256;
            if (fileSha256) {
                hash = Buffer.from(fileSha256).toString('base64');
            }
        }

        if (!hash) {
            return await sock.sendMessage(chatId, {
                text: '✳️ Please enter the command name or reply to a sticker'
            }, { quoted: message });
        }

        const stickers = await getStickerCommands();

        // Find by text name if hash not found
        if (!stickers[hash]) {
            const found = Object.entries(stickers).find(([, v]: any) => v.text === hash);
            if (found) hash = found[0];
        }

        if (stickers[hash] && stickers[hash].locked) {
            return await sock.sendMessage(chatId, {
                text: '✳️ You cannot delete this command'
            }, { quoted: message });
        }

        if (!stickers[hash]) {
            return await sock.sendMessage(chatId, {
                text: '⚠️ Command not found'
            }, { quoted: message });
        }

        delete stickers[hash];
        await saveStickerCommands(stickers);

        await sock.sendMessage(chatId, {
            text: '✅ Command deleted'
        }, { quoted: message });
    }
};
