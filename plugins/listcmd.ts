import { createRequire } from 'module';
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/


import store from '../lib/lightweight_store.js';
import fs from 'fs';
import path from 'path';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);


const STICKER_FILE = path.join(__dirname, '../data/sticker_commands.json');

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

export default {
    command: 'listcmd',
    aliases: ['cmdlist'],
    category: 'owner',
    description: 'List all sticker commands',
    usage: '.listcmd',

    async handler(sock: any, message: any, args: any, context: any = {}) {
        const { chatId } = context;
        
        const stickers = await getStickerCommands();
        const entries = Object.entries(stickers);

        if (entries.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: '✳️ No sticker commands found' 
            }, { quoted: message });
        }

        const stickerList = entries
            .map(([key, value], index) => 
                `${index + 1}. ${(value as any).locked ? `*(blocked)* ${key}` : key} : ${(value as any).text}`
            )
            .join('\n');

        const mentions = entries
            .map(([, value]) => (value as any).mentionedJid)
            .flat()
            .filter(Boolean);

        await sock.sendMessage(chatId, {
            text: `*COMMAND LIST*\n\n▢ *Info:* If it's in *bold*, it is blocked\n\n──────────────────\n${stickerList}`,
            mentions: mentions
        }, { quoted: message });
    }
};

/*****************************************************************************
 *                                                                           *
 *                     Developed By Qasim Ali                                *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/GlobalTechInfo                         *
 *  ▶️  YouTube  : https://youtube.com/@GlobalTechInfo                       *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07     *
 *                                                                           *
 *    © 2026 GlobalTechInfo. All rights reserved.                            *
 *                                                                           *
 *    Description: This file is part of the MEGA-MD Project.                 *
 *                 Unauthorized copying or distribution is prohibited.       *
 *                                                                           *
 *****************************************************************************/
