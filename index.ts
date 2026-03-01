import './config.js';
import './settings.js';

import { Boom } from '@hapi/boom';
import fs from 'fs';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import path from 'path';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import axios from 'axios';
import { parsePhoneNumber as PhoneNumber } from 'awesome-phonenumber';
import readline from 'readline';
import { parsePhoneNumber } from 'libphonenumber-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

import { imageToWebp, videoToWebp, writeExifImg, writeExifVid } from './lib/exif.js';
import { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, sleep, reSize } from './lib/myfunc.js';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    Browsers,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';

import store from './lib/lightweight_store.js';
import SaveCreds from './lib/session.js';
import { app, server, PORT } from './lib/server.js';
import { printLog } from './lib/print.js';
import {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus,
    handleCall
} from './lib/messageHandler.js';

import settings from './settings.js';
import commandHandler from './lib/commandHandler.js';

store.readFromFile();
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

commandHandler.loadCommands();

setInterval(() => {
    if (global.gc) {
        global.gc();
        console.log('🧹 Garbage collection completed');
    }
}, 60_000);

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024;
    if (used > 400) {
        console.log(chalk.yellow('⚠️ RAM too high (>400MB), restarting bot...'));
        process.exit(1);
    }
}, 30_000);

let phoneNumber = global.PAIRING_NUMBER || process.env.PAIRING_NUMBER || "923051391005";
let owner = JSON.parse(fs.readFileSync('./data/owner.json', 'utf-8'));

global.botname = process.env.BOT_NAME || "MEGA-MD";
global.themeemoji = "•";

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");

let rl = null;
if (process.stdin.isTTY && !process.env.PAIRING_NUMBER) {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

const question = (text) => {
    if (rl && !rl.closed) {
        return new Promise((resolve) => rl.question(text, resolve));
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber);
    }
};

process.on('exit', () => {
    if (rl && !rl.closed) rl.close();
});

process.on('SIGINT', () => {
    if (rl && !rl.closed) rl.close();
    process.exit(0);
});

function ensureSessionDirectory() {
    const sessionPath = path.join(__dirname, 'session');
    if (!existsSync(sessionPath)) {
        mkdirSync(sessionPath, { recursive: true });
    }
    return sessionPath;
}

function hasValidSession() {
    try {
        const credsPath = path.join(__dirname, 'session', 'creds.json');

        if (!existsSync(credsPath)) return false;

        const fileContent = fs.readFileSync(credsPath, 'utf8');
        if (!fileContent || fileContent.trim().length === 0) {
            printLog('warning', 'creds.json exists but is empty');
            return false;
        }

        try {
            const creds = JSON.parse(fileContent);
            if (!creds.noiseKey || !creds.signedIdentityKey || !creds.signedPreKey) {
                printLog('warning', 'creds.json is missing required fields');
                return false;
            }
            if (creds.registered === false) {
                printLog('warning', 'Session credentials exist but are not registered yet');
                // Don't delete - pairing may be in progress
                return false;
            }
            printLog('success', 'Valid and registered session credentials found');
            return true;
        } catch (parseError) {
            printLog('warning', 'creds.json contains invalid JSON');
            return false;
        }
    } catch (error) {
        printLog('error', `Error checking session validity: ${error.message}`);
        return false;
    }
}

async function initializeSession() {
    ensureSessionDirectory();

    const txt = global.SESSION_ID || process.env.SESSION_ID;

    if (!txt) {
        printLog('warning', 'No SESSION_ID found in environment variables');
        if (hasValidSession()) {
            printLog('success', 'Existing session found. Using saved credentials');
            return true;
        }
        printLog('warning', 'No existing session found. Pairing code will be required');
        return false;
    }

    if (hasValidSession()) return true;

    try {
        await SaveCreds(txt);
        await delay(2000);

        if (hasValidSession()) {
            printLog('success', 'Session file verified and valid');
            await delay(1000);
            return true;
        } else {
            printLog('error', 'Session file not valid after download');
            return false;
        }
    } catch (error) {
        printLog('error', `Error downloading session: ${error.message}`);
        return false;
    }
}

server.listen(PORT, () => {
    printLog('success', `Server listening on port ${PORT}`);
});

async function startQasimDev() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion();

        ensureSessionDirectory();
        await delay(1000);

        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const msgRetryCounterCache = new NodeCache();

        printLog('info', `Credentials loaded. Registered: ${state.creds?.registered || false}`);

        const ghostMode = await store.getSetting('global', 'stealthMode');
        const isGhostActive = ghostMode && ghostMode.enabled;

        if (isGhostActive) {
            printLog('info', '👻 STEALTH MODE IS ACTIVE - Starting in stealth mode');
        }

        const QasimDev = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: Browsers.macOS('Chrome'),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: !isGhostActive,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid);
                let msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        }) as any;

        const originalSendPresenceUpdate = QasimDev.sendPresenceUpdate;
        const originalReadMessages = QasimDev.readMessages;
        const originalSendReceipt = QasimDev.sendReceipt;
        const originalSendReceipt2 = QasimDev.sendReceipt;

        QasimDev.sendPresenceUpdate = async function (...args) {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (ghostMode && ghostMode.enabled) {
                printLog('info', '👻 Blocked presence update (stealth mode)');
                return;
            }
            return originalSendPresenceUpdate.apply(this, args);
        };

        QasimDev.readMessages = async function (...args) {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (ghostMode && ghostMode.enabled) return;
            return originalReadMessages.apply(this, args);
        };

        if (originalSendReceipt) {
            QasimDev.sendReceipt = async function (...args) {
                const ghostMode = await store.getSetting('global', 'stealthMode');
                if (ghostMode && ghostMode.enabled) return;
                return originalSendReceipt.apply(this, args);
            };
        }

        if (originalSendReceipt2) {
            QasimDev.sendReceipt = async function (...args) {
                const ghostMode = await store.getSetting('global', 'stealthMode');
                if (ghostMode && ghostMode.enabled) return;
                return originalSendReceipt2.apply(this, args);
            };
        }

        const originalQuery = QasimDev.query;
        QasimDev.query = async function (node, ...args) {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (ghostMode && ghostMode.enabled) {
                if (node && node.tag === 'receipt') return;
                if (node && node.attrs && (node.attrs.type === 'read' || node.attrs.type === 'read-self')) return;
            }
            return originalQuery.apply(this, [node, ...args]);
        };

        QasimDev.isGhostMode = async () => {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            return ghostMode && ghostMode.enabled;
        };

        QasimDev.ev.on('creds.update', saveCreds);
        store.bind(QasimDev.ev);

        QasimDev.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;

                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage')
                    ? mek.message.ephemeralMessage.message
                    : mek.message;

                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(QasimDev, chatUpdate);
                    return;
                }

                if (!QasimDev.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us');
                    if (!isGroup) return;
                }

                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

                if (QasimDev?.msgRetryCounterCache) {
                    QasimDev.msgRetryCounterCache.clear();
                }

                try {
                    await handleMessages(QasimDev, chatUpdate);
                } catch (err) {
                    printLog('error', `Error in handleMessages: ${(err as any).message}`);
                    if (mek.key && mek.key.remoteJid) {
                        await QasimDev.sendMessage(mek.key.remoteJid, {
                            text: '❌ An error occurred while processing your message.',
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363319098372999@newsletter',
                                    newsletterName: 'MEGA MD',
                                    serverMessageId: -1
                                }
                            }
                        }).catch(console.error);
                    }
                }
            } catch (err) {
                printLog('error', `Error in messages.upsert: ${(err as any).message}`);
            }
        });

        QasimDev.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {};
                return (decode as any).user && (decode as any).server && (decode as any).user + '@' + (decode as any).server || jid;
            } else return jid;
        };

        QasimDev.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = QasimDev.decodeJid(contact.id);
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
            }
        });

        QasimDev.getName = (jid, withoutContact = false) => {
            let id = QasimDev.decodeJid(jid);
            withoutContact = QasimDev.withoutContact || withoutContact;
            let v;
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {};
                if (!(v.name || v.subject)) v = QasimDev.groupMetadata(id) || {};
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).number.international);
            });
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === QasimDev.decodeJid(QasimDev.user.id) ?
                QasimDev.user :
                (store.contacts[id] || {});
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).number.international;
        };

        QasimDev.public = true;
        QasimDev.serializeM = (m) => smsg(QasimDev, m, store);

        const isRegistered = state.creds?.registered === true;

        if (pairingCode && !isRegistered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api');

            printLog('warning', 'Session not registered. Pairing code required');

            let phoneNumberInput;
            if (!!global.phoneNumber) {
                phoneNumberInput = global.phoneNumber;
            } else if (process.env.PAIRING_NUMBER) {
                phoneNumberInput = process.env.PAIRING_NUMBER;
                printLog('info', `Using phone number from environment: ${phoneNumberInput}`);
            } else if (rl && !rl.closed) {
                phoneNumberInput = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFormat: 6281376552730 (without + or spaces) : `)));
            } else {
                phoneNumberInput = phoneNumber;
                printLog('info', `Using default phone number: ${phoneNumberInput}`);
            }

            phoneNumberInput = phoneNumberInput.replace(/[^0-9]/g, '');

            // awesome-phonenumber v3+ uses .valid instead of .isValid()
            const pn = PhoneNumber('+' + phoneNumberInput);
            if (!pn.valid) {
                printLog('error', 'Invalid phone number format');
                if (rl && !rl.closed) rl.close();
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    let code = await QasimDev.requestPairingCode(phoneNumberInput);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)));
                    printLog('success', `Pairing code generated: ${code}`);
                    if (rl && !rl.closed) {
                        rl.close();
                        rl = null;
                    }
                } catch (error) {
                    printLog('error', `Failed to get pairing code: ${error.message}`);
                }
            }, 3000);
        } else if (isRegistered) {
            if (rl && !rl.closed) {
                rl.close();
                rl = null;
            }
        } else {
            printLog('warning', 'Waiting for connection to establish...');
            if (rl && !rl.closed) {
                rl.close();
                rl = null;
            }
        }

        QasimDev.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s;

            if (qr) printLog('info', 'QR Code generated. Please scan with WhatsApp');
            if (connection === 'connecting') printLog('connection', 'Connecting to WhatsApp...');

            if (connection == "open") {
                printLog('success', 'Bot connected successfully!');

                // Dynamic import for setbio (avoids circular dependency issues)
                try {
                    const setbioModule = await import('./plugins/setbio.js');
                    const startAutoBio = setbioModule.startAutoBio || setbioModule.default?.startAutoBio;
                    if (typeof startAutoBio === 'function') startAutoBio(QasimDev);
                } catch (e) {
                    printLog('error', `Failed to start auto bio: ${e.message}`);
                }

                const ghostMode = await store.getSetting('global', 'stealthMode');
                if (ghostMode && ghostMode.enabled) {
                    printLog('info', '👻 STEALTH MODE ACTIVE - Bot is in stealth mode');
                    console.log(chalk.gray('• No online status'));
                    console.log(chalk.gray('• No typing indicators'));
                }

                console.log(chalk.yellow(`🌿Connected to => ` + JSON.stringify(QasimDev.user, null, 2)));

                try {
                    const botNumber = QasimDev.user.id.split(':')[0] + '@s.whatsapp.net';
                    const ghostStatus = (ghostMode && ghostMode.enabled) ? '\n👻 Stealth Mode: ACTIVE' : '';

                    await QasimDev.sendMessage(botNumber, {
                        text: `🤖 Bot Connected Successfully!\n\n⏰ Time: ${new Date().toLocaleString()}\n✅ Status: Online and Ready!${ghostStatus}\n\n✅Make sure to join below channel`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363319098372999@newsletter',
                                newsletterName: 'MEGA MD',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (error) {
                    printLog('error', `Failed to send connection message: ${error.message}`);
                }

                await delay(1999);
                console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || 'MEGA-MD'} ]`)}\n\n`));
                console.log(chalk.cyan(`< ================================================== >`));
                console.log(chalk.magenta(`\n${global.themeemoji || '•'} YT CHANNEL: GlobalTechInfo`));
                console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: GlobalTechInfo`));
                console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${owner}`));
                console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: Qasim Ali`));
                console.log(chalk.green(`${global.themeemoji || '•'} 🤖 Bot Connected Successfully! ✅`));
                console.log(chalk.blue(`Bot Version: ${settings.version}`));
                console.log(chalk.cyan(`Loaded Commands: ${commandHandler.commands.size}`));
                console.log(chalk.cyan(`Prefixes: ${settings.prefixes.join(', ')}`));
                console.log(chalk.gray(`Backend: ${store.getStats().backend}`));
                console.log();
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                const statusCode = lastDisconnect?.error?.output?.statusCode;

                printLog('error', `Connection closed - Status: ${statusCode}`);

                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        rmSync('./session', { recursive: true, force: true });
                        printLog('warning', 'Session logged out. Please re-authenticate');
                    } catch (error) {
                        printLog('error', `Error deleting session: ${error.message}`);
                    }
                }

                if (shouldReconnect) {
                    printLog('connection', 'Reconnecting in 5 seconds...');
                    await delay(5000);
                    startQasimDev();
                }
            }
        });

        QasimDev.ev.on('call', async (calls) => {
            await handleCall(QasimDev, calls);
        });

        QasimDev.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(QasimDev, update);
        });

        QasimDev.ev.on('status.update', async (status) => {
            await handleStatus(QasimDev, status);
        });

        QasimDev.ev.on('messages.reaction', async (reaction) => {
            await handleStatus(QasimDev, reaction);
        });

        return QasimDev;
    } catch (error) {
        printLog('error', `Error in startQasimDev: ${error.message}`);
        if (rl && !rl.closed) {
            rl.close();
            rl = null;
        }
        await delay(5000);
        startQasimDev();
    }
}

async function main() {
    printLog('info', 'Starting MEGA MD BOT...');

    const sessionReady = await initializeSession();

    if (sessionReady) {
        printLog('success', 'Session initialization complete. Starting bot...');
    } else {
        printLog('warning', 'Session initialization incomplete. Will attempt pairing...');
    }

    await delay(3000);

    startQasimDev().catch(error => {
        printLog('error', `Fatal error: ${error.message}`);
        if (rl && !rl.closed) rl.close();
        process.exit(1);
    });
}

main();

// Session cleanup interval
const sessionDir = path.join(process.cwd(), 'session');
setInterval(() => {
    if (!fs.existsSync(sessionDir)) return;
    fs.readdir(sessionDir, (err, files) => {
        if (err) return;
        for (const file of files) {
            if (file === 'creds.json') continue;
            fs.unlink(path.join(sessionDir, file), () => {});
        }
    });
}, 3 * 60 * 1000);

// Temp folder setup
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Temp folder cleanup
setInterval(() => {
    fs.readdir(customTemp, (err, files) => {
        if (err) return;
        for (const file of files) {
            const filePath = path.join(customTemp, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
                    fs.unlink(filePath, () => {});
                }
            });
        }
    });
}, 1 * 60 * 60 * 1000);

// Syntax check dist files
const folders = [
    path.join(__dirname, './dist/lib'),
    path.join(__dirname, './dist/plugins')
];

folders.forEach(folder => {
    if (!fs.existsSync(folder)) return;
    fs.readdirSync(folder)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            const filePath = path.join(folder, file);
            try {
                const code = fs.readFileSync(filePath, 'utf-8');
                const err = syntaxerror(code, file, {
                    sourceType: 'module',
                    allowAwaitOutsideFunction: true
                });
                if (err) {
                    console.error(chalk.red(`❌ Syntax error in ${filePath}:\n${err}`));
                }
            } catch (e) {
                console.error(chalk.yellow(`⚠️ Cannot read file ${filePath}:\n${e}`));
            }
        });
});

// Error handlers
process.on('uncaughtException', (err) => {
    printLog('error', `Uncaught Exception: ${(err as any).message}`);
    console.error((err as any).stack);
});

process.on('unhandledRejection', (err) => {
    printLog('error', `Unhandled Rejection: ${(err as any).message}`);
    console.error((err as any).stack);
});

server.on('error', (error) => {
    if ((error as any).code === 'EADDRINUSE') {
        printLog('error', `Address localhost:${PORT} in use`);
        server.close();
    } else {
        printLog('error', `Server error: ${error.message}`);
    }
});

// Hot reload removed - not supported in ESM
