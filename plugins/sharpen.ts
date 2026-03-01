import { createRequire } from 'module';
import { fileURLToPath, URL } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
  command: 'sharpen',
  aliases: ['enhance'],
  category: 'tools',
  description: 'Convert an image to sharpen',
  usage: 'Reply to an image with .sharpen',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const quoted =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted?.imageMessage) {
        return await sock.sendMessage(
          chatId,
          { text: '🩵 *Sharpen Image*\n\nReply to an image to convert it to sepia\n\nUsage:\n.sharpen' },
          { quoted: message }
        );
      }

      await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

      const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempFile = path.join(__dirname, `sepia_${Date.now()}.jpg`);
      fs.writeFileSync(tempFile, buffer);

      const form = new FormData();
      form.append('apikey', 'guru');
      form.append('file', fs.createReadStream(tempFile));

      const res = await axios.post(
        'https://discardapi.dpdns.org/api/image/sharpen',
        form,
        { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 }
      );
      fs.unlinkSync(tempFile);

      if (!res?.data) throw new Error('Sharpen conversion failed');

      const grayFile = path.join(__dirname, `sepia_result_${Date.now()}.jpg`);
      fs.writeFileSync(grayFile, res.data);

      await sock.sendMessage(
        chatId,
        {
          image: { url: grayFile },
          caption: `🩵 *Sharpen Image*\n\n𝙿𝚛𝚘𝚌𝚎𝚜𝚜𝚎𝚍 𝚋𝚢: 𝙼𝙴𝙶𝙰-𝙼𝙳`
        },
        { quoted: message }
      );
      fs.unlinkSync(grayFile);

    } catch(err: any) {
      console.error('Sharpen Plugin Error:', err);
      await sock.sendMessage(
        chatId,
        { text: '❌ Failed to convert image to sepia. Make sure the image is clear and try again.' },
        { quoted: message }
      );
    }
  }
};
