
import {
    proto,
    delay,
    getContentType
} from '@whiskeysockets/baileys';
import chalk from 'chalk';
import fs from 'fs';
import Crypto from 'crypto';
import axios from 'axios';
import moment from 'moment-timezone';
import {
    sizeFormatter
} from 'human-readable';
import util from 'util';
import { Jimp } from 'jimp';
import {
    defaultMaxListeners
} from 'stream';
import path from 'path';
import { tmpdir } from 'os';

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)

export { unixTimestampSeconds }

export const generateMessageTag = (epoch) => {
    let tag = unixTimestampSeconds().toString();
    if (epoch)
        tag += '.--' + epoch;
    return tag;
}

export const processTime = (timestamp, now) => {
    return moment.duration(now.valueOf() - moment(Number(timestamp) * 1000).valueOf()).asSeconds()
}

export const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

export const getBuffer = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch(err: any) {
        return err
    }
}

export const getImg = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch(err: any) {
        return err
    }
}

export const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch(err: any) {
        return err
    }
}

export const runtime = function(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(Number(seconds) % Number(3600) / 60);
    var s = Math.floor(Number(seconds) % Number(60));
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

export const clockString = (ms) => {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, String(0))).join(':')
}

export const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

export const getTime = (format, date) => {
    if (date) {
        return moment(date).locale('en').format(format)
    } else {
        return moment.tz('Asia/Karachi').locale('en').format(format)
    }
}

export const formatDate = (n, locale = 'en') => {
    let d = new Date(n)
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    })
}

export const tanggal = (numer) => {
    const myMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const myDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const tgl = new Date(numer);
    const day = tgl.getDate();
    const bulan = tgl.getMonth();
    let thisDay = tgl.getDay();
    let thisDayName = myDays[thisDay as number];
    const yy = tgl.getFullYear();
    const year = (yy < 1000) ? yy + 1900 : yy;
    const time = moment.tz('Asia/Karachi').format('DD/MM HH:mm:ss');
    const d = new Date();
    const locale = 'en';
    const gmt = new Date(0).getTime() - new Date('1 January 1970').getTime();
    const weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(((Number(d) * 1) + gmt) / 84600000) % 5];

    return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
}

export const jam = (numer, options = {}) => {
    let format = (options as any).format ? (options as any).format : "HH:mm"
    let jam = (options as any)?.timeZone ? moment(numer).tz((options as any).timeZone).format(format) : moment(numer).format(format)

    return `${jam}`
}

export const formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
})

export const json = (string) => {
    return JSON.stringify(string, null, 2)
}

function format(...args) {
    return util.format(...args)
}

export const logic = (check, inp, out) => {
    if (inp.length !== out.length) throw new Error('Input and Output must have same length')
    for (let i in inp)
        if (util.isDeepStrictEqual(check, inp[i])) return out[i]
    return null
}

export const generateProfilePicture = async (buffer) => {
    const jimp = await Jimp.read(buffer)
    const min = jimp.width
    const max = jimp.height
    const cropped = jimp.crop({ x: 0, y: 0, w: min, h: max })
    return {
        img: await cropped.scaleToFit({ w: 720, h: 720 }).getBuffer('image/jpeg'),
        preview: await cropped.scaleToFit({ w: 720, h: 720 }).getBuffer('image/jpeg')
    }
}

export const bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const getSizeMedia = (path) => {
    return new Promise((resolve, reject) => {
        if (/http/.test(path)) {
            axios.get(path)
                .then((res) => {
                    let length = parseInt(res.headers['content-length'])
                    let size = exports.bytesToSize(length, 3)
                    if (!isNaN(length)) resolve(size)
                })
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path)
            let size = exports.bytesToSize(length, 3)
            if (!isNaN(length)) resolve(size)
        } else {
            reject('error gatau apah')
        }
    })
}

export const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}

export const getGroupAdmins = (participants) => {
    let admins = []
    for (let i of participants) {
        i.admin === "superadmin" ? admins.push(i.id) : i.admin === "admin" ? admins.push(i.id) : ''
    }
    return admins || []
}

/**
 * Serialize Message
 * @param {WAConnection} conn 
 * @param {Object} m 
 * @param {store} store 
 */
export const smsg = (QasimDev, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = QasimDev.decodeJid(m.fromMe && QasimDev.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = QasimDev.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        if (m.quoted) {
            let type = getContentType(quoted)
            m.quoted = m.quoted[type]
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
            }
            if (typeof m.quoted === 'string') m.quoted = {
                text: m.quoted
            }
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
            m.quoted.sender = QasimDev.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === (QasimDev.user && QasimDev.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false
                let q = await store.loadMessage(m.chat, m.quoted.id, QasimDev)
                return exports.smsg(QasimDev, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? {
                    participant: m.quoted.sender
                } : {})
            })

            /**
             * 
             * @returns 
             */
            m.quoted.delete = () => QasimDev.sendMessage(m.quoted.chat, {
                delete: vM.key
            })

            /**
             * 
             * @param {*} jid 
             * @param {*} forceForward 
             * @param {*} options 
             * @returns 
             */
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => QasimDev.copyNForward(jid, vM, forceForward, options)

            /**
             *
             * @returns
             */
            m.quoted.download = () => QasimDev.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg.url) m.download = () => QasimDev.downloadMediaMessage(m.msg)
    m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || ''
    /**
     * Reply to this message
     * @param {String|Object} text 
     * @param {String|false} chatId 
     * @param {Object} options 
     */
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? QasimDev.sendMedia(chatId, text, 'file', '', m, {
        ...options
    }) : QasimDev.sendText(chatId, text, m, {
        ...options
    })
    /**
     * Copy this message
     */
    m.copy = () => exports.smsg(QasimDev, M.fromObject(M.toObject(m)))

    /**
     * 
     * @param {*} jid 
     * @param {*} forceForward 
     * @param {*} options 
     * @returns 
     */
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => QasimDev.copyNForward(jid, m, forceForward, options)

    return m
}
export const reSize = (buffer, ukur1, ukur2) => {
    return new Promise(async (resolve, reject) => {
        var baper = await Jimp.read(buffer);
        var ab = await (baper as any).resize(ukur1, ukur2).getBuffer('image/jpeg')
        resolve(ab)
    })
}

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const _require = createRequire(import.meta.url);
let file = __filename;
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    // hot reload not supported in ESM
})