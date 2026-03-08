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

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);


async function getAllCloneSessions() {
    if (HAS_DB) {
        const settings = await store.getAllSettings('clones') || {};
        return Object.entries(settings)
            .filter(([_key, value]) => value && (value as any).status)
            .map(([authId, data]) => ({ authId, ...((data) as any) }));
    } else {
        const { default: fs } = await import('fs');
        const { default: path } = await import('path');
        const clonesDir = path.join(process.cwd(), 'session', 'clones');
        if (!fs.existsSync(clonesDir)) return [];

        const dirs = fs.readdirSync(clonesDir);
        return dirs.map(authId => {
            const sessionPath = path.join(clonesDir, authId, 'session.json');
            if (fs.existsSync(sessionPath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
                    return { authId, ...((data) as any) };
                } catch(e: any) {
                    return { authId, status: 'unknown' };
                }
            }
            return { authId, status: 'unknown' };
        });
    }
}

export default {
    command: 'listrent',
    aliases: ['listclone', 'botclones'],
    category: 'owner',
    description: 'List all currently active sub-bots',
    usage: '.listrent',

    async handler(sock: any, message: any, args: any, context: any) {
        const { chatId } = context;

        const activeConns = global.conns || [];
        const storedClones = await getAllCloneSessions();

        if (activeConns.length === 0 && storedClones.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "*❌ No sub-bots are currently active or stored.*"
            }, { quoted: message });
        }

        let msg = `*─── [ CLONE BOTS ] ───*\n\n`;
        msg += `*Storage:* ${HAS_DB ? 'Database 🗄️' : 'File System 📁'}\n\n`;

        if (activeConns.length > 0) {
            msg += `*🟢 ONLINE CLONES:*\n\n`;

            activeConns.forEach((conn, i) => {
                const user = conn.user;
                msg += `*${i + 1}.* @${user.id.split(':')[0]}\n`;
                msg += `   └ Name: ${user.name || 'Sub-Bot'}\n`;
                msg += `   └ Status: Connected ✅\n\n`;
            });
        }

        if (HAS_DB && storedClones.length > 0) {
            const offlineClones = storedClones.filter(clone => {
                return !activeConns.some(conn => {
                    const connNumber = conn.user.id.split(':')[0];
                    return (clone as any).userNumber === connNumber;
                });
            });

            if (offlineClones.length > 0) {
                msg += `*⚪ STORED CLONES (Offline):*\n\n`;

                offlineClones.forEach((clone, i) => {
                    msg += `*${i + 1}.* ID: ${clone.authId}\n`;
                    msg += `   └ Number: ${(clone as any).userNumber || 'N/A'}\n`;
                    msg += `   └ Status: ${(clone as any).status || 'offline'}\n`;
                    if (clone.createdAt) {
                        const date = new Date(clone.createdAt);
                        msg += `   └ Created: ${date.toLocaleString()}\n`;
                    }
                    msg += `\n`;
                });
            }
        }

        msg += `*Total Online:* ${activeConns.length}\n`;
        if (HAS_DB) {
            msg += `*Total Stored:* ${storedClones.length}`;
        }

        const mentions = activeConns.map(c => c.user.id);

        await sock.sendMessage(chatId, {
            text: msg,
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

