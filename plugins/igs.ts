import type { BotContext } from '../types.js';
import config from '../config.js';
import { igdl } from 'ruhend-scraper';
import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import webp from 'node-webpmux';
import crypto from 'crypto';

async function convertBufferToStickerWebp(inputBuffer: Buffer, isAnimated: boolean, cropSquare: boolean) {
  const tmpDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const tempInputBase = path.join(tmpDir, `igs_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const tempInput = isAnimated ? `${tempInputBase}.mp4` : `${tempInputBase}.jpg`;
  const tempOutput = path.join(tmpDir, `igs_out_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);

  fs.writeFileSync(tempInput, inputBuffer);
  const filesToDelete = [];
  const scheduleDelete = (p: string) => {
    if (!p) return;
    filesToDelete.push(p);
    setTimeout(() => {
      try { fs.unlinkSync(p); } catch {}
    }, 5000);
  };

  const vfCropSquareImg = "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512";
  const vfPadSquareImg = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000";

  let ffmpegCommand;
  if (isAnimated) {
    const isLargeVideo = inputBuffer.length > (5 * 1024 * 1024);
    if (cropSquare) {
      if (isLargeVideo) {
        ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
      } else {
        ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
      }
    } else {
      if (isLargeVideo) {
        ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 35 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
      } else {
        ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 3 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 45 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
      }
    }
  } else {
    const vf = `${cropSquare ? vfCropSquareImg : vfPadSquareImg},format=rgba`;
    ffmpegCommand = `ffmpeg -y -i "${tempInput}" -vf "${vf}" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 20 -compression_level 6 "${tempOutput}"`;
  }

  await new Promise<void>((resolve, reject) => {
    exec(ffmpegCommand, (error) => {
      if (error) return reject(error);
      resolve(undefined);
    });
  });

  let webpBuffer = fs.readFileSync(tempOutput);
  scheduleDelete(tempOutput);

  if (isAnimated && webpBuffer.length > 1000 * 1024) {
    try {
      const tempOutput2 = path.join(tmpDir, `igs_out2_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
      const harsherCmd = cropSquare
        ? `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`
        : `ffmpeg -y -i "${tempInput}" -t 2 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 35 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput2}"`;
      await new Promise<void>((resolve, reject) => {
        exec(harsherCmd, (error) => error ? reject(error) : resolve(undefined));
      });
      if (fs.existsSync(tempOutput2)) {
        webpBuffer = fs.readFileSync(tempOutput2);
        scheduleDelete(tempOutput2);
      }
    } catch {}
  }

  const img = new webp.Image();
  await img.load(webpBuffer);

  const json = {
    'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
    'sticker-pack-name': config.packname || 'MegaBot',
    'emojis': ['📸']
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  img.exif = exif;

  let finalBuffer = await img.save(null);

  if (finalBuffer.length > 900 * 1024) {
    try {
      const tempOutput3 = path.join(tmpDir, `igs_out3_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
      const vfSmall = cropSquare
        ? `crop=min(iw\\,ih):min(iw\\,ih),scale=320:320${isAnimated ? ',fps=8' : ''}`
        : `scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=#00000000${isAnimated ? ',fps=8' : ''}`;
      const cmdSmall = `ffmpeg -y -i "${tempInput}" ${isAnimated ? '-t 2' : ''} -vf "${vfSmall}" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality ${isAnimated ? 28 : 65} -compression_level 6 -b:v 80k -max_muxing_queue_size 1024 "${tempOutput3}"`;
      await new Promise<void>((resolve, reject) => {
        exec(cmdSmall, (error) => error ? reject(error) : resolve(undefined));
      });
      if (fs.existsSync(tempOutput3)) {
        const smallWebp = fs.readFileSync(tempOutput3);
        const img2 = new webp.Image();
        await img2.load(smallWebp);
        const json2 = {
          'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
          'sticker-pack-name': config.packname || 'MegaBot',
          'emojis': ['📸']
        };
        const exifAttr2 = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuffer2 = Buffer.from(JSON.stringify(json2), 'utf8');
        const exif2 = Buffer.concat([exifAttr2, jsonBuffer2]);
        exif2.writeUIntLE(jsonBuffer2.length, 14, 4);
        img2.exif = exif2;
        finalBuffer = await img2.save(null);
        scheduleDelete(tempOutput3);
      }
    } catch {}
  }
  scheduleDelete(tempInput);

  return finalBuffer;
}

async function fetchBufferFromUrl(url: string) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity'
      },
      timeout: 30000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      decompress: true,
      validateStatus: s => s >= 200 && s < 400
    });
    return Buffer.from(res.data);
  } catch(e1: any) {
    try {
      const res = await axios.get(url, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'identity'
        },
        timeout: 40000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: s => s >= 200 && s < 400
      });
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        res.data.on('data', (c: Buffer) => chunks.push(c));
        res.data.on('end', resolve);
        res.data.on('error', reject);
      });
      return Buffer.concat(chunks);
    } catch(e2: any) {
      console.error('Both axios download attempts failed:', e1?.message || e1, e2?.message || e2);
      throw e2;
    }
  }
}

async function forceMiniSticker(inputBuffer: Buffer, isVideo: boolean, cropSquare: boolean) {
  const tmpDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const tempInput = path.join(tmpDir, `mini_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
  const tempOutput = path.join(tmpDir, `mini_out_${Date.now()}.webp`);
  fs.writeFileSync(tempInput, inputBuffer);

  const vf = cropSquare
    ? `crop=min(iw\\,ih):min(iw\\,ih),scale=256:256${isVideo ? ',fps=6' : ''}`
    : `scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=#00000000${isVideo ? ',fps=6' : ''}`;

  const cmd = `ffmpeg -y -i "${tempInput}" ${isVideo ? '-t 2' : ''} -vf "${vf}" -c:v libwebp -preset default -loop 0 -pix_fmt yuva420p -quality 10 -compression_level 6 -b:v 40k "${tempOutput}"`;

  await new Promise<void>((resolve, reject) => {
    exec(cmd, (error) => error ? reject(error) : resolve(undefined));
  });

  if (!fs.existsSync(tempOutput)) {
    try { fs.unlinkSync(tempInput); } catch {}
    return null;
  }

  const smallWebp = fs.readFileSync(tempOutput);

  const img = new webp.Image();
  await img.load(smallWebp);
  const json = {
    'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
    'sticker-pack-name': config.packname || 'MegaBot',
    'emojis': ['📸']
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  img.exif = exif;
  const finalBuffer = await img.save(null);

  try { fs.unlinkSync(tempInput); } catch {}
  try { fs.unlinkSync(tempOutput); } catch {}

  return finalBuffer;
}

export default {
  command: 'igs',
  aliases: ['igsticker', 'instasticker'],
  category: 'stickers',
  description: 'Convert Instagram post/reel to sticker',
  usage: '.igs <instagram URL>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    try {
      const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
      const urlMatch = text.match(/https?:\/\/\S+/);

      if (!urlMatch) {
        await sock.sendMessage(chatId, {
          text: `Send an Instagram post/reel link.\nUsage: .igs <url>`,
          ...channelInfo
        }, { quoted: message });
        return;
      }

      await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

      const downloadData = await igdl(urlMatch[0]).catch(() => null);
      if (!downloadData || !downloadData.data) {
        await sock.sendMessage(chatId, {
          text: '❌ Failed to fetch media from Instagram link.',
          ...channelInfo
        }, { quoted: message });
        return;
      }

      const rawItems = (downloadData?.data || []).filter((m: any) => m && m.url);
      const seenUrls = new Set();
      const items = [];
      for (const m of rawItems) {
        if (!seenUrls.has(m.url)) {
          seenUrls.add(m.url);
          items.push(m);
        }
      }

      if (items.length === 0) {
        await sock.sendMessage(chatId, {
          text: '❌ No media found at the provided link.',
          ...channelInfo
        }, { quoted: message });
        return;
      }

      const maxItems = Math.min(items.length, 10);
      const seenHashes = new Set();

      for (let i = 0; i < maxItems; i++) {
        try {
          const media = items[i];
          const mediaUrl = media.url;
          const isVideo = (media?.type === 'video') || /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl);

          const buffer = await fetchBufferFromUrl(mediaUrl);
          const { createHash } = await import('crypto');
          const hash = createHash('sha1').update(buffer).digest('hex');
          if (seenHashes.has(hash)) {
            continue;
          }
          seenHashes.add(hash);

          let finalSticker = await forceMiniSticker(buffer, isVideo, false);
          if (!finalSticker) finalSticker = await convertBufferToStickerWebp(buffer, isVideo, false);

          await sock.sendMessage(chatId, {
            sticker: finalSticker,
            ...channelInfo
          }, { quoted: message });

          if (i < maxItems - 1) {
            await new Promise(r => setTimeout(r, 800));
          }
        } catch(perItemErr: any) {
          console.error('IGS item error:', perItemErr);
        }
      }

    } catch(err: any) {
      console.error('Error in igs command:', err);
      await sock.sendMessage(chatId, {
        text: 'Failed to create sticker from Instagram link.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};


