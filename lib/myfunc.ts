import { proto, getContentType } from '@whiskeysockets/baileys';
import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import moment from 'moment-timezone';
import { sizeFormatter } from 'human-readable';
import util from 'util';
import sharp from 'sharp';

// ─── Utilities ───────────────────────────────────────────────────────────────

export const unixTimestampSeconds = (date: Date = new Date()): number =>
    Math.floor(date.getTime() / 1000);

export const generateMessageTag = (epoch?: number): string => {
    let tag = unixTimestampSeconds().toString();
    if (epoch) tag += '.--' + epoch;
    return tag;
};

export const processTime = (timestamp: number, now: moment.Moment): number =>
    moment.duration(now.valueOf() - moment(timestamp * 1000).valueOf()).asSeconds();

export const getRandom = (ext: string): string =>
    `${Math.floor(Math.random() * 10000)}${ext}`;

// ─── HTTP ─────────────────────────────────────────────────────────────────────

const BROWSER_HEADERS = {
    'DNT': '1',
    'Upgrade-Insecure-Request': '1'
};

export const getBuffer = async (url: string, options: AxiosRequestConfig = {}): Promise<Buffer> => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: BROWSER_HEADERS,
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err: any) {
        return err;
    }
};

export const getImg = async (url: string, options: AxiosRequestConfig = {}): Promise<Buffer> => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: BROWSER_HEADERS,
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err: any) {
        return err;
    }
};

export const fetchJson = async (url: string, options: AxiosRequestConfig = {}): Promise<any> => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    } catch (err: any) {
        return err;
    }
};

// ─── Time & Formatting ────────────────────────────────────────────────────────

export const runtime = (seconds: number): string => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d === 1 ? ' day, ' : ' days, ') : '';
    const hDisplay = h > 0 ? h + (h === 1 ? ' hour, ' : ' hours, ') : '';
    const mDisplay = m > 0 ? m + (m === 1 ? ' minute, ' : ' minutes, ') : '';
    const sDisplay = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : '';
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

export const clockString = (ms: number): string => {
    const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

export const isUrl = (url: string): RegExpMatchArray | null =>
    url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));

export const getTime = (format: string, date?: Date | string): string => {
    if (date) return moment(date).locale('en').format(format);
    return moment.tz('Asia/Karachi').locale('en').format(format);
};

export const formatDate = (n: number | string, locale = 'en'): string => {
    const d = new Date(n);
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
};

export const tanggal = (numer: number | string): string => {
    const myMonths = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const myDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const tgl = new Date(numer);
    const day = tgl.getDate();
    const bulan = tgl.getMonth();
    const thisDay = myDays[tgl.getDay()];
    const yy = tgl.getFullYear();
    const year = yy < 1000 ? yy + 1900 : yy;
    return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
};

export const jam = (numer: number | string, options: any = {}): string => {
    const format = options.format ?? 'HH:mm';
    const result = options.timeZone
        ? moment(numer).tz(options.timeZone).format(format)
        : moment(numer).format(format);
    return result;
};

export const formatp = sizeFormatter({
    std: 'JEDEC',
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal: string, symbol: string) => `${literal} ${symbol}B`
});

export const json = (string: any): string => JSON.stringify(string, null, 2);

export const logic = (check: any, inp: any[], out: any[]): any => {
    if (inp.length !== out.length) throw new Error('Input and Output must have same length');
    for (let i = 0; i < inp.length; i++) {
        if (util.isDeepStrictEqual(check, inp[i])) return out[i];
    }
    return null;
};

// ─── Image ────────────────────────────────────────────────────────────────────

export const generateProfilePicture = async (buffer: Buffer): Promise<{ img: Buffer; preview: Buffer }> => {
    const img = sharp(buffer);
    const { width = 0, height = 0 } = await img.metadata();
    const min = Math.min(width, height);
    const cropped = await img
        .extract({ left: 0, top: 0, width: min, height: min })
        .resize(720, 720)
        .jpeg()
        .toBuffer();
    return { img: cropped, preview: cropped };
};

export const reSize = async (buffer: Buffer, ukur1: number, ukur2: number): Promise<Buffer> =>
    sharp(buffer).resize(ukur1, ukur2).jpeg().toBuffer();

// ─── Size ─────────────────────────────────────────────────────────────────────

export const bytesToSize = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const getSizeMedia = (input: string | Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (typeof input === 'string' && /http/.test(input)) {
            axios.get(input).then((res) => {
                const length = parseInt(res.headers['content-length'], 10);
                const size = bytesToSize(length, 3);
                if (!isNaN(length)) resolve(size);
                else reject('Invalid content-length');
            }).catch(reject);
        } else if (Buffer.isBuffer(input)) {
            const length = Buffer.byteLength(input);
            const size = bytesToSize(length, 3);
            if (!isNaN(length)) resolve(size);
            else reject('Invalid buffer length');
        } else {
            reject('Invalid input: must be a URL string or Buffer');
        }
    });
};

// ─── WhatsApp Helpers ─────────────────────────────────────────────────────────

export const parseMention = (text = ''): string[] =>
    [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');

export const getGroupAdmins = (participants: any[]): string[] => {
    const admins: string[] = [];
    for (const i of participants) {
        if (i.admin === 'superadmin' || i.admin === 'admin') admins.push(i.id);
    }
    return admins;
};

export const smsg = (QasimDev: any, m: any, store: any): any => {
    if (!m) return m;
    const M = proto.WebMessageInfo;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = QasimDev.decodeJid(m.fromMe && QasimDev.user.id || m.participant || m.key.participant || m.chat || '');
        if (m.isGroup) m.participant = QasimDev.decodeJid(m.key.participant) || '';
    }
    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = m.mtype === 'viewOnceMessage'
            ? (m.message[m.mtype as any] as any).message[getContentType((m.message[m.mtype as any] as any).message) as string]
            : m.message[m.mtype as any];
        m.body = m.message.conversation
            || m.msg?.caption
            || m.msg?.text
            || (m.mtype === 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId)
            || (m.mtype === 'buttonsResponseMessage' && m.msg?.selectedButtonId)
            || (m.mtype === 'viewOnceMessage' && m.msg?.caption)
            || m.text;

        const quoted = m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];

        if (m.quoted) {
            let type = getContentType(quoted);
            m.quoted = (m.quoted as any)[type as string];
            if (['productMessage'].includes(type as string)) {
                type = getContentType(m.quoted);
                m.quoted = (m.quoted as any)[type as string];
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
            m.quoted.mtype = type as string;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = QasimDev.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === (QasimDev.user && QasimDev.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];

            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false;
                const q = await store.loadMessage(m.chat, m.quoted.id, QasimDev);
                return smsg(QasimDev, q, store);
            };

            const vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });

            m.quoted.delete = () => QasimDev.sendMessage(m.quoted.chat, { delete: vM.key });
            m.quoted.copyNForward = (jid: string, forceForward = false, options = {}) =>
                QasimDev.copyNForward(jid, vM, forceForward, options);
            m.quoted.download = () => QasimDev.downloadMediaMessage(m.quoted);
        }
    }
    if (m.msg?.url) m.download = () => QasimDev.downloadMediaMessage(m.msg);
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
    m.reply = (text: any, chatId = m.chat, options = {}) =>
        Buffer.isBuffer(text)
            ? QasimDev.sendMedia(chatId, text, 'file', '', m, { ...options })
            : QasimDev.sendText(chatId, text, m, { ...options });
    m.copy = () => smsg(QasimDev, M.fromObject(M.toObject(m)), store);
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
        QasimDev.copyNForward(jid, m, forceForward, options);
    return m;
};
