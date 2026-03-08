import type { BotContext } from '../types.js';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

export default {
  command: 'emojimix',
  aliases: ['mixemoji', 'emix'],
  category: 'stickers',
  description: 'Mix two emojis into a sticker',
  usage: '.emojimix 😎+🥰',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      if (!args[0]) {
        await sock.sendMessage(chatId, {
          text: '🎴 Example: .emojimix 😎+🥰'
        }, { quoted: message });
        return;
      }

      if (!args[0].includes('+')) {
        await sock.sendMessage(chatId, {
          text: '✳️ Separate the emoji with a *+* sign\n\n📌 Example:\n.emojimix 😎+🥰'
        }, { quoted: message });
        return;
      }

      const [emoji1, emoji2] = args[0].split('+').map((e: any) => e.trim());

      const url =
        `https://tenor.googleapis.com/v2/featured?` +
        `key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ` +
        `&contentfilter=high&media_filter=png_transparent` +
        `&component=proactive&collection=emoji_kitchen_v5` +
        `&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;

      const response = await fetch(url);
      const data = await response.json() as any as any;

      if (!data.results || data.results.length === 0) {
        await sock.sendMessage(chatId, {
          text: '❌ These emojis cannot be mixed! Try different ones.'
        }, { quoted: message });
        return;
      }

      const imageUrl = data.results[0].url;
      const tmpDir = path.join(process.cwd(), 'tmp');

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const tempFile = path.join(tmpDir, `temp_${Date.now()}.png`).replace(/\\/g, '/');
      const outputFile = path.join(tmpDir, `sticker_${Date.now()}.webp`).replace(/\\/g, '/');

      const imageResponse = await fetch(imageUrl);
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      fs.writeFileSync(tempFile, buffer);

      const ffmpegCommand =
        `ffmpeg -i "${tempFile}" ` +
        `-vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,` +
        `pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" ` +
        `"${outputFile}"`;

      await new Promise<void>((resolve, reject) => {
        exec(ffmpegCommand, (error) => {
          if (error) {
            console.error('FFmpeg error:', error);
            reject(error);
          } else {
            resolve(undefined);
          }
        });
      });

      if (!fs.existsSync(outputFile)) {
        throw new Error('Sticker creation failed');
      }

      const stickerBuffer = fs.readFileSync(outputFile);

      await sock.sendMessage(chatId, {
        sticker: stickerBuffer
      }, { quoted: message });

      // Cleanup
      try {
        fs.unlinkSync(tempFile);
        fs.unlinkSync(outputFile);
      } catch(err: any) {
        console.error('Temp cleanup error:', err);
      }

    } catch(error: any) {
      console.error('Error in emojimix command:', error);
      await sock.sendMessage(chatId, {
        text:
          '❌ Failed to mix emojis!\n\n' +
          '📌 Example:\n.emojimix 😎+🥰'
      }, { quoted: message });
    }
  }
};
