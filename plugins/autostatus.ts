import fs from 'fs';
import path from 'path';
import { dataFile } from '../lib/paths.js';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);


const configPath = dataFile('autoStatus.json');

if (!HAS_DB && !fs.existsSync(configPath)) {
    if (!fs.existsSync(path.dirname(configPath))) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify({
        enabled: false,
        reactOn: false
    }, null, 2));
}

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363319098372999@newsletter',
            newsletterName: 'GlobalTechInc',
            serverMessageId: -1
        }
    }
};

async function readConfig() {
    try {
        if (HAS_DB) {
            const config = await store.getSetting('global', 'autoStatus');
            return config || { enabled: false, reactOn: false };
        } else {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return {
                enabled: !!config.enabled,
                reactOn: !!config.reactOn
            };
        }
    } catch(error: any) {
        console.error('Error reading auto status config:', error);
        return { enabled: false, reactOn: false };
    }
}

async function writeConfig(config) {
    try {
        if (HAS_DB) {
            await store.saveSetting('global', 'autoStatus', config);
        } else {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
    } catch(error: any) {
        console.error('Error writing auto status config:', error);
    }
}

async function isAutoStatusEnabled() {
    const config = await readConfig();
    return config.enabled;
}

async function isStatusReactionEnabled() {
    const config = await readConfig();
    return config.reactOn;
}

async function reactToStatus(sock, statusKey) {
    try {
        const enabled = await isStatusReactionEnabled();
        if (!enabled) {
            return;
        }

        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );

        console.log('✅ Reacted to status');
    } catch(error: any) {
        console.error('❌ Error reacting to status:', error.message);
    }
}

async function handleStatusUpdate(sock, status) {
    try {
        const enabled = await isAutoStatusEnabled();
        if (!enabled) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([msg.key]);
                    console.log('✅ Viewed status from messages');

                    await reactToStatus(sock, msg.key);
                } catch(err: any) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ Rate limit hit, waiting before retrying...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await sock.readMessages([msg.key]);
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.key]);
                console.log('✅ Viewed status from key');

                await reactToStatus(sock, status.key);
            } catch(err: any) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.key]);
                } else {
                    throw err;
                }
            }
            return;
        }
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.reaction.key]);
                console.log('✅ Viewed status from reaction');

                await reactToStatus(sock, status.reaction.key);
            } catch(err: any) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch(error: any) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

export default {
    command: 'autostatus',
    aliases: ['autoview', 'statusview'],
    category: 'owner',
    description: 'Automatically view and react to WhatsApp statuses',
    usage: '.autostatus <on|off|react on|react off>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any, context: any) {
        const chatId = context.chatId || message.key.remoteJid;

        try {
            const config = await readConfig();
            if (!args || args.length === 0) {
                const viewStatus = config.enabled ? '✅ Enabled' : '❌ Disabled';
                const reactStatus = config.reactOn ? '✅ Enabled' : '❌ Disabled';

                await sock.sendMessage(chatId, {
                    text: `🔄 *Auto Status Settings*\n\n` +
                          `📱 *Auto Status View:* ${viewStatus}\n` +
                          `💫 *Status Reactions:* ${reactStatus}\n` +
                          `🗄️ *Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                          `*Commands:*\n` +
                          `• \`.autostatus on\` - Enable auto view\n` +
                          `• \`.autostatus off\` - Disable auto view\n` +
                          `• \`.autostatus react on\` - Enable reaction\n` +
                          `• \`.autostatus react off\` - Disable reaction`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }

            const command = args[0].toLowerCase();

            if (command === 'on') {
                config.enabled = true;
                await writeConfig(config);

                await sock.sendMessage(chatId, {
                    text: '✅ *Auto status view enabled!*\n\n' +
                          'Bot will now automatically view all contact statuses.',
                    ...channelInfo
                }, { quoted: message });

            } else if (command === 'off') {
                config.enabled = false;
                await writeConfig(config);

                await sock.sendMessage(chatId, {
                    text: '❌ *Auto status view disabled!*\n\n' +
                          'Bot will no longer automatically view statuses.',
                    ...channelInfo
                }, { quoted: message });

            } else if (command === 'react') {
                if (!args[1]) {
                    await sock.sendMessage(chatId, {
                        text: '❌ *Please specify on/off for reactions!*\n\n' +
                              'Usage: `.autostatus react on/off`',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }

                const reactCommand = args[1].toLowerCase();

                if (reactCommand === 'on') {
                    config.reactOn = true;
                    await writeConfig(config);

                    await sock.sendMessage(chatId, {
                        text: '💫 *Status reactions enabled!*\n\n' +
                              'Bot will now react to status updates with 💚',
                        ...channelInfo
                    }, { quoted: message });

                } else if (reactCommand === 'off') {
                    config.reactOn = false;
                    await writeConfig(config);

                    await sock.sendMessage(chatId, {
                        text: '❌ *Status reactions disabled!*\n\n' +
                              'Bot will no longer react to status updates.',
                        ...channelInfo
                    }, { quoted: message });

                } else {
                    await sock.sendMessage(chatId, {
                        text: '❌ *Invalid reaction command!*\n\n' +
                              'Usage: `.autostatus react on/off`',
                        ...channelInfo
                    }, { quoted: message });
                }

            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ *Invalid command!*\n\n' +
                          '*Usage:*\n' +
                          '• `.autostatus on/off` - Enable/disable auto view\n' +
                          '• `.autostatus react on/off` - Enable/disable reactions',
                    ...channelInfo
                }, { quoted: message });
            }

        } catch(error: any) {
            console.error('Error in autostatus command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Error occurred while managing auto status!*\n\n' +
                      `Error: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    },

    handleStatusUpdate,
    isAutoStatusEnabled,
    isStatusReactionEnabled,
    reactToStatus,
    readConfig,
    writeConfig
};
