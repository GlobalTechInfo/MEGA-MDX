import fs from 'fs';
import path from 'path';
import { dataFile } from '../lib/paths.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const mentionFilePath = dataFile('mention.json');

async function loadState() {
    try {
        if (HAS_DB) {
            const state = await store.getSetting('global', 'mention');
            if (state && typeof state.assetPath === 'string' && state.assetPath.endsWith('assets/mention_default.webp')) {
                return { enabled: !!state.enabled, assetPath: '', type: 'text' };
            }
            return state || { enabled: false, assetPath: '', type: 'text' };
        } else {
            const raw = fs.readFileSync(mentionFilePath, 'utf8');
            const state = JSON.parse(raw);
            if (state && typeof state.assetPath === 'string' && state.assetPath.endsWith('assets/mention_default.webp')) {
                return { enabled: !!state.enabled, assetPath: '', type: 'text' };
            }
            return state;
        }
    } catch {
        return { enabled: false, assetPath: '', type: 'text' };
    }
}

async function saveState(state) {
    if (HAS_DB) {
        await store.saveSetting('global', 'mention', state);
    } else {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(mentionFilePath, JSON.stringify(state, null, 2));
    }
}

async function ensureDefaultSticker(state) {
    try {
        const assetPath = path.join(process.cwd(), state.assetPath);
        if (state.assetPath.endsWith('mention_default.webp') && !fs.existsSync(assetPath)) {
            const defaultStickerPath = path.join(process.cwd(), 'assets', 'stickintro.webp');
            if (fs.existsSync(defaultStickerPath)) {
                fs.copyFileSync(defaultStickerPath, assetPath);
            } else {
                const assetsDir = path.dirname(assetPath);
                if (!fs.existsSync(assetsDir)) {
                    fs.mkdirSync(assetsDir, { recursive: true });
                }
                fs.writeFileSync(assetPath.replace('.webp', '.txt'), 'Default mention sticker not available');
            }
        }
    } catch(e: any) {
        console.warn('ensureDefaultSticker failed:', e?.message || e);
    }
}

export async function handleMentionDetection(sock: any, chatId: any, message: any) {
    try {
        if (message.key?.fromMe) return;
        if (!chatId?.endsWith('@g.us')) return; // Group only

        const state = await loadState();
        await ensureDefaultSticker(state);
        if (!state.enabled) return;

        const rawId = sock.user?.id || sock.user?.jid || '';
        if (!rawId) return;
        const botNum = rawId.split('@')[0].split(':')[0];
        const botJids = [
            `${botNum}@s.whatsapp.net`,
            `${botNum}@whatsapp.net`,
            rawId
        ];
        const msg = message.message || {};
        const contexts = [
            msg.extendedTextMessage?.contextInfo,
            msg.imageMessage?.contextInfo,
            msg.videoMessage?.contextInfo,
            msg.documentMessage?.contextInfo,
            msg.stickerMessage?.contextInfo,
            msg.buttonsResponseMessage?.contextInfo,
            msg.listResponseMessage?.contextInfo
        ].filter(Boolean);

        let mentioned = [];
        for (const c of contexts) {
            if (Array.isArray(c.mentionedJid)) {
                mentioned = mentioned.concat(c.mentionedJid);
            }
        }
        const directMentionLists = [
            msg.extendedTextMessage?.mentionedJid,
            msg.mentionedJid
        ].filter(Array.isArray);
        for (const arr of directMentionLists) mentioned = mentioned.concat(arr);

        if (!mentioned.length) {
            const rawText = (
                msg.conversation ||
                msg.extendedTextMessage?.text ||
                msg.imageMessage?.caption ||
                msg.videoMessage?.caption ||
                ''
            ).toString();
            if (rawText) {
                const safeBot = botNum.replace(/[-\s]/g, '');
                const re = new RegExp(`@?${safeBot}\b`);
                if (!re.test(rawText.replace(/\s+/g, ''))) return;
            } else {
                return;
            }
        }
        const isBotMentioned = mentioned.some(j => botJids.includes(j));
        if (!isBotMentioned) return;

        if (!state.assetPath) {
            await sock.sendMessage(chatId, { text: 'Hi' }, { quoted: message });
            return;
        }
        const assetPath = path.join(process.cwd(), state.assetPath);
        if (!fs.existsSync(assetPath)) {
            await sock.sendMessage(chatId, { text: 'Hi' }, { quoted: message });
            return;
        }
        try {
            if (state.type === 'sticker') {
                await sock.sendMessage(chatId, { sticker: fs.readFileSync(assetPath) }, { quoted: message });
                return;
            }
            const payload: Record<string, any> = {};
            if (state.type === 'image') payload.image = fs.readFileSync(assetPath);
            else if (state.type === 'video') {
                payload.video = fs.readFileSync(assetPath);
                if (state.gifPlayback) payload.gifPlayback = true;
            }
            else if (state.type === 'audio') {
                payload.audio = fs.readFileSync(assetPath);
                if (state.mimetype) payload.mimetype = state.mimetype; else payload.mimetype = 'audio/mpeg';
                if (typeof state.ptt === 'boolean') payload.ptt = state.ptt;
            }
            else if (state.type === 'text') payload.text = fs.readFileSync(assetPath, 'utf8');
            else payload.text = 'Hi';
            await sock.sendMessage(chatId, payload, { quoted: message });
        } catch(e: any) {
            await sock.sendMessage(chatId, { text: 'Hi' }, { quoted: message });
        }
    } catch(err: any) {
        console.error('handleMentionDetection error:', err);
    }
}

async function setMentionCommand(sock, chatId, message, isOwner) {
    if (!isOwner) return sock.sendMessage(chatId, { text: '❌ *Only Owner or Sudo can use this command*' }, { quoted: message });
    const ctx = message.message?.extendedTextMessage?.contextInfo;
    const qMsg = ctx?.quotedMessage;
    if (!qMsg) return sock.sendMessage(chatId, { text: '❌ *Reply to a message or media*\n\nSupported: text, sticker, image, video, audio' }, { quoted: message });

    let type = 'sticker', buf, dataType;
    if (qMsg.stickerMessage) { dataType = 'stickerMessage'; type = 'sticker'; }
    else if (qMsg.imageMessage) { dataType = 'imageMessage'; type = 'image'; }
    else if (qMsg.videoMessage) { dataType = 'videoMessage'; type = 'video'; }
    else if (qMsg.audioMessage) { dataType = 'audioMessage'; type = 'audio'; }
    else if (qMsg.documentMessage) { dataType = 'documentMessage'; type = 'file'; }
    else if (qMsg.conversation || qMsg.extendedTextMessage?.text) { type = 'text'; }
    else return sock.sendMessage(chatId, { text: '❌ *Unsupported media type*\n\nReply to: text, sticker, image, video, or audio' }, { quoted: message });

    if (type === 'text') {
        buf = Buffer.from(qMsg.conversation || qMsg.extendedTextMessage?.text || '', 'utf8');
        if (!buf.length) return sock.sendMessage(chatId, { text: '❌ *Empty text*' }, { quoted: message });
    } else {
        try {
            const media = qMsg[dataType];
            if (!media) throw new Error('No media');
            const kind = type === 'sticker' ? 'sticker' : type;
            const stream = await downloadContentFromMessage(media, kind as any);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            buf = Buffer.concat(chunks);
        } catch(e: any) {
            console.error('download error', e);
            return sock.sendMessage(chatId, { text: '❌ *Failed to download media*' }, { quoted: message });
        }
    }

    if (buf.length > 1024 * 1024) {
        return sock.sendMessage(chatId, { text: '❌ *File too large*\n\nMaximum size: 1 MB' }, { quoted: message });
    }
    let mimetype = qMsg[dataType]?.mimetype || '';
    const ptt = !!qMsg.audioMessage?.ptt;
    const gifPlayback = !!qMsg.videoMessage?.gifPlayback;
    let ext = 'bin';
    if (type === 'sticker') ext = 'webp';
    else if (type === 'image') ext = mimetype.includes('png') ? 'png' : 'jpg';
    else if (type === 'video') ext = 'mp4';
    else if (type === 'audio') {
        if (mimetype.includes('ogg') || mimetype.includes('opus')) { ext = 'ogg'; mimetype = 'audio/ogg; codecs=opus'; }
        else if (mimetype.includes('mpeg') || mimetype.includes('mp3')) { ext = 'mp3'; mimetype = 'audio/mpeg'; }
        else if (mimetype.includes('aac')) { ext = 'aac'; mimetype = 'audio/aac'; }
        else if (mimetype.includes('wav')) { ext = 'wav'; mimetype = 'audio/wav'; }
        else if (mimetype.includes('m4a') || mimetype.includes('mp4')) { ext = 'm4a'; mimetype = 'audio/mp4'; }
        else { ext = 'mp3'; mimetype = 'audio/mpeg'; }
    }
    else if (type === 'text') ext = 'txt';
    const stateBefore = await loadState();
    try {
        const assetsDir = path.join(process.cwd(), 'assets');
        if (fs.existsSync(assetsDir)) {
            const files = fs.readdirSync(assetsDir);
            for (const f of files) {
                if (f.startsWith('mention_custom.')) {
                    try { fs.unlinkSync(path.join(assetsDir, f)); } catch {}
                }
            }
        }
        if (stateBefore.assetPath && stateBefore.assetPath.startsWith('assets/') &&
            !stateBefore.assetPath.endsWith('mention_default.webp')) {
            const prevPath = path.join(process.cwd(), stateBefore.assetPath);
            if (fs.existsSync(prevPath)) {
                try { fs.unlinkSync(prevPath); } catch {}
            }
        }
    } catch(e: any) {
        console.warn('cleanup previous assets failed:', e?.message || e);
    }
    const outName = `mention_custom.${ext}`;
    const assetsDir = path.join(process.cwd(), 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    const outPath = path.join(assetsDir, outName);
    try { fs.writeFileSync(outPath, buf); } catch(e: any) {
        console.error('write error', e);
        return sock.sendMessage(chatId, { text: '❌ *Failed to save file*' }, { quoted: message });
    }

    const state = await loadState();
    state.assetPath = path.join('assets', outName);
    state.type = type;
    if (type === 'audio') state.mimetype = mimetype;
    if (type === 'audio') state.ptt = ptt;
    if (type === 'video') state.gifPlayback = gifPlayback;
    await saveState(state);
    return sock.sendMessage(chatId, {
        text: `✅ *Mention reply updated!*\n\nType: ${type}\nStorage: ${HAS_DB ? 'Database' : 'File System'}`
    }, { quoted: message });
}

export default {
    command: 'mention',
    aliases: ['setmention', 'mentionreply'],
    category: 'owner',
    description: 'Toggle or set custom mention reply',
    usage: '.mention <on|off> or .setmention (reply to media)',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any, context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const onoff = args[0]?.toLowerCase();

        if (!onoff || !['on','off'].includes(onoff)) {
            return sock.sendMessage(chatId, {
                text: '❌ *Invalid usage*\n\nUsage: `.mention on|off`'
            }, { quoted: message });
        }
        const state = await loadState();
        state.enabled = onoff === 'on';
        await saveState(state);
        return sock.sendMessage(chatId, {
            text: `✅ *Mention reply ${state.enabled ? 'enabled' : 'disabled'}*\n\nStorage: ${HAS_DB ? 'Database' : 'File System'}`
        }, { quoted: message });
    },

    handleMentionDetection,
    setMentionCommand
};

