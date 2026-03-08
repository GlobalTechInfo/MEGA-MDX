import type { BotContext } from '../types.js';
import config from '../config.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import webp from 'node-webpmux';
import crypto from 'crypto';

export async function stickercropFromBuffer(inputBuffer: any, isAnimated: any) {
  const tmpDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const tempInput = path.join(tmpDir, `cropbuf_${Date.now()}`);
  const tempOutput = path.join(tmpDir, `cropbuf_out_${Date.now()}.webp`);

  fs.writeFileSync(tempInput, inputBuffer);
  const fileSizeKB = inputBuffer.length / 1024;
  const isLargeFile = fileSizeKB > 5000;

  let ffmpegCommand;
  if (isAnimated) {
    if (isLargeFile) {
      ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
    } else {
      ffmpegCommand = `ffmpeg -y -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
    }
  } else {
    ffmpegCommand = `ffmpeg -y -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=256:256" -c:v libwebp -quality 15 -compression_level 6 "${tempOutput}"`;
  }

  await new Promise<void>((resolve, reject) => {
    exec(ffmpegCommand, (error) => {
      if (error) return reject(error);
      resolve(undefined);
    });
  });

  const webpBuffer = fs.readFileSync(tempOutput);

  const img = new webp.Image();
  await img.load(webpBuffer);
  const json = {
    'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
    'sticker-pack-name': config.packname || 'MEGA-MD',
    'emojis': ['✂️']
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  img.exif = exif;
  const finalBuffer = await img.save(null);

  try {
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);
  } catch {}

  return finalBuffer;
}

export default {
  command: 'crop',
  aliases: ['stickercrop', 'scrop'],
  category: 'stickers',
  description: 'Crop image/video/sticker to circle sticker',
  usage: '.crop (reply to image/video/sticker)',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;
    const messageToQuote = message;
    let targetMessage = message;

    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quotedInfo = message.message.extendedTextMessage.contextInfo;
      targetMessage = {
        key: {
          remoteJid: chatId,
          id: quotedInfo.stanzaId,
          participant: quotedInfo.participant
        },
        message: quotedInfo.quotedMessage
      };
    }

    const mediaMessage = targetMessage.message?.imageMessage || targetMessage.message?.videoMessage || targetMessage.message?.documentMessage || targetMessage.message?.stickerMessage;

    if (!mediaMessage) {
      await sock.sendMessage(chatId, {
        text: 'Please reply to an image/video/sticker with .crop, or send an image/video/sticker with .crop as the caption.',
        ...channelInfo
      }, { quoted: messageToQuote });
      return;
    }

    try {
      const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
        logger: undefined as any,
        reuploadRequest: sock.updateMediaMessage
      });

      if (!mediaBuffer) {
        await sock.sendMessage(chatId, {
          text: 'Failed to download media. Please try again.',
          ...channelInfo
        }, { quoted: messageToQuote });
        return;
      }

      const tmpDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const tempInput = path.join(tmpDir, `temp_${Date.now()}`);
      const tempOutput = path.join(tmpDir, `crop_${Date.now()}.webp`);

      fs.writeFileSync(tempInput, mediaBuffer);

      const isAnimated = mediaMessage.mimetype?.includes('gif') ||
                        mediaMessage.mimetype?.includes('video') ||
                        mediaMessage.seconds > 0;

      const fileSizeKB = mediaBuffer.length / 1024;
      const isLargeFile = fileSizeKB > 5000;

      let ffmpegCommand;

      if (isAnimated) {
        if (isLargeFile) {
          ffmpegCommand = `ffmpeg -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -compression_level 6 -b:v 100k -max_muxing_queue_size 1024 "${tempOutput}"`;
        } else {
          ffmpegCommand = `ffmpeg -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -compression_level 6 -b:v 150k -max_muxing_queue_size 1024 "${tempOutput}"`;
        }
      } else {
        ffmpegCommand = `ffmpeg -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;
      }

      await new Promise<void>((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('FFmpeg error:', error);
            console.error('FFmpeg stderr:', stderr);
            reject(error);
          } else {
            console.log('FFmpeg stdout:', stdout);
            resolve(undefined);
          }
        });
      });

      if (!fs.existsSync(tempOutput)) {
        throw new Error('FFmpeg failed to create output file');
      }

      const outputStats = fs.statSync(tempOutput);
      if (outputStats.size === 0) {
        throw new Error('FFmpeg created empty output file');
      }

      const webpBuffer = fs.readFileSync(tempOutput);
      const finalSizeKB = webpBuffer.length / 1024;
      console.log(`Final sticker size: ${Math.round(finalSizeKB)} KB`);

      if (finalSizeKB > 1000) {
        console.log(`⚠️ Warning: Sticker size (${Math.round(finalSizeKB)} KB) exceeds recommended limit but will be sent anyway`);
      }

      const img = new webp.Image();
      await img.load(webpBuffer);

      const json = {
        'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
        'sticker-pack-name': config.packname || 'MegaBot',
        'emojis': ['✂️']
      };

      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
      const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
      const exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);

      img.exif = exif;
      const finalBuffer = await img.save(null);

      await sock.sendMessage(chatId, {
        sticker: finalBuffer,
        ...channelInfo
      }, { quoted: messageToQuote });

      try {
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);
      } catch(err: any) {
        console.error('Error cleaning up temp files:', err);
      }

    } catch(error: any) {
      console.error('Error in stickercrop command:', error);
      await sock.sendMessage(chatId, {
        text: 'Failed to crop sticker! Try with an image.',
        ...channelInfo
      }, { quoted: messageToQuote });
    }
  },

  stickercropFromBuffer
};
