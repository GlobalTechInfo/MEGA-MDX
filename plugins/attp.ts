import type { BotContext } from '../types.js';
import { spawn } from 'child_process';
import fs from 'fs';
import { writeExifVid } from '../lib/exif.js';

export default {
  command: 'attp',
  aliases: ['texts', 'textsticker'],
  category: 'stickers',
  description: 'Generate an animated sticker from text',
  usage: '.attp <text>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return await sock.sendMessage(chatId, { text: 'Please provide text after the .attp command.' }, { quoted: message });
    }

    try {
      const mp4Buffer = await renderBlinkingVideoWithFfmpeg(text);
      const webpPath = await writeExifVid(mp4Buffer as Buffer, { packname: 'Mega Md', author: 'MEGA-MD' });
      const webpBuffer = fs.readFileSync(webpPath);
      try { fs.unlinkSync(webpPath); } catch {}
      await sock.sendMessage(chatId, { sticker: webpBuffer }, { quoted: message });
    } catch {
      await sock.sendMessage(chatId, { text: '❌ Failed to generate the sticker locally.' }, { quoted: message });
    }
  }
};

function _renderTextToPngWithFfmpeg(text: string) {
    return new Promise((resolve, reject) => {
        const fontPath = process.platform === 'win32'
            ? 'C:/Windows/Fonts/arialbd.ttf'
            : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

        // Robust escaping for ffmpeg drawtext
        const escapeDrawtextText = (s: string) => s
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "\\'")
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/%/g, '\\%');

        const safeText = escapeDrawtextText(text);
        const safeFontPath = process.platform === 'win32'
            ? fontPath.replace(/\\/g, '/').replace(':', '\\:')
            : fontPath;

        const args = [
            '-y',
            '-f', 'lavfi',
            '-i', 'color=c=#00000000:s=512x512',
            '-vf', `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=white:fontsize=56:borderw=2:bordercolor=black@0.6:x=(w-text_w)/2:y=(h-text_h)/2`,
            '-frames:v', '1',
            '-f', 'image2',
            'pipe:1'
        ];

        const ff = spawn('ffmpeg', args);
        const chunks: Buffer[] = [];
        const errors: Buffer[] = [];
        ff.stdout.on('data', d => chunks.push(d));
        ff.stderr.on('data', e => errors.push(e));
        ff.on('error', reject);
        ff.on('close', code => {
            if (code === 0) return resolve(Buffer.concat(chunks));
            reject(new Error(Buffer.concat(errors).toString() || `ffmpeg exited with code ${code}`));
        });
    });
}

function renderBlinkingVideoWithFfmpeg(text: string) {
    return new Promise((resolve, reject) => {
        const fontPath = process.platform === 'win32'
            ? 'C:/Windows/Fonts/arialbd.ttf'
            : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

        const escapeDrawtextText = (s: string) => s
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/,/g, '\\,')
            .replace(/'/g, "\\'")
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/%/g, '\\%');

        const safeText = escapeDrawtextText(text);
        const safeFontPath = process.platform === 'win32'
            ? fontPath.replace(/\\/g, '/').replace(':', '\\:')
            : fontPath;

        // Blink cycle length (seconds) and fast delay ~0.1s per color
        const cycle = 0.3;
        const dur = 1.8; // 6 cycles

        const drawRed = `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=red:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='lt(mod(t\,${cycle})\,0.1)'`;
        const drawBlue = `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=blue:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(mod(t\,${cycle})\,0.1\,0.2)'`;
        const drawGreen = `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontcolor=green:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(mod(t\,${cycle})\,0.2)'`;

        const filter = `${drawRed},${drawBlue},${drawGreen}`;

        const args = [
            '-y',
            '-f', 'lavfi',
            '-i', `color=c=black:s=512x512:d=${dur}:r=20`,
            '-vf', filter,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart+frag_keyframe+empty_moov',
            '-t', String(dur),
            '-f', 'mp4',
            'pipe:1'
        ];

        const ff = spawn('ffmpeg', args);
        const chunks: Buffer[] = [];
        const errors: Buffer[] = [];
        ff.stdout.on('data', d => chunks.push(d));
        ff.stderr.on('data', e => errors.push(e));
        ff.on('error', reject);
        ff.on('close', code => {
            if (code === 0) return resolve(Buffer.concat(chunks));
            reject(new Error(Buffer.concat(errors).toString() || `ffmpeg exited with code ${code}`));
        });
    });
}
