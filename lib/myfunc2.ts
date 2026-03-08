import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';
import * as cheerio from 'cheerio';
import BodyForm from 'form-data';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import child_process from 'child_process';

const { unlink } = fsPromises;

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const fetchJson = async (url: string, options: AxiosRequestConfig = {}): Promise<any> => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: DEFAULT_HEADERS,
            ...options
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

export const fetchBuffer = async (url: string, options: AxiosRequestConfig = {}): Promise<Buffer> => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36',
                'DNT': '1',
                'Upgrade-Insecure-Request': '1'
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err: any) {
        return err;
    }
};

interface WebpToMp4Result {
    status: boolean;
    message: string;
    result: string;
}

export const webp2mp4File = (filePath: string): Promise<WebpToMp4Result> => {
    return new Promise((resolve, reject) => {
        const form = new BodyForm();
        form.append('new-image-url', '');
        form.append('new-image', fs.createReadStream(filePath));
        axios({
            method: 'post',
            url: 'https://s6.ezgif.com/webp-to-mp4',
            data: form,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${(form as any)._boundary}`
            }
        }).then(({ data }) => {
            const bodyFormThen = new BodyForm();
            const $ = cheerio.load(data);
            const file = $('input[name="file"]').attr('value');
            bodyFormThen.append('file', file);
            bodyFormThen.append('convert', 'Convert WebP to MP4!');
            axios({
                method: 'post',
                url: 'https://ezgif.com/webp-to-mp4/' + file,
                data: bodyFormThen,
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${(bodyFormThen as any)._boundary}`
                }
            }).then(({ data }) => {
                const $ = cheerio.load(data);
                const result = 'https:' + $('div#output > p.outfile > video > source').attr('src');
                resolve({ status: true, message: 'Created By Eternity', result });
            }).catch(reject);
        }).catch(reject);
    });
};

export const fetchUrl = async (url: string, options: AxiosRequestConfig = {}): Promise<any> => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: DEFAULT_HEADERS,
            ...options
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

export const WAVersion = async (): Promise<string[]> => {
    const get = await fetchUrl('https://web.whatsapp.com/check-update?version=1&platform=web');
    const version = [get.currentVersion.replace(/[.]/g, ', ')];
    return version;
};

export const getRandom = (ext: string): string => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export const isUrl = (url: string): RegExpMatchArray | null => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/, 'gi'));
};

export const isNumber = (number: string | number): boolean => {
    const int = parseInt(String(number), 10);
    return typeof int === 'number' && !isNaN(int);
};

export const TelegraPh = (filePath: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        if (!fs.existsSync(filePath)) return reject(new Error('File not Found'));
        try {
            const form = new BodyForm();
            form.append('file', fs.createReadStream(filePath));
            const data = await axios({
                url: 'https://telegra.ph/upload',
                method: 'POST',
                headers: { ...form.getHeaders() },
                data: form
            });
            return resolve('https://telegra.ph' + data.data[0].src);
        } catch (err) {
            return reject(new Error(String(err)));
        }
    });
};

export const buffergif = async (image: Buffer): Promise<Buffer> => {
    const filename = Math.random().toString(36);
    const gifPath = `./XeonMedia/trash/${filename}.gif`;
    const mp4Path = `./XeonMedia/trash/${filename}.mp4`;

    fs.writeFileSync(gifPath, image);
    child_process.exec(
        `ffmpeg -i ${gifPath} -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${mp4Path}`
    );

    await sleep(4000);

    const buffer = fs.readFileSync(mp4Path);
    await Promise.all([
        unlink(mp4Path).catch(() => {}),
        unlink(gifPath).catch(() => {})
    ]);
    return buffer;
};
