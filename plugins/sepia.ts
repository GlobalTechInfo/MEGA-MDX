import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
  command: 'sepia',
  aliases: ['vintage'],
  category: 'tools',
  description: 'Convert an image to sepia',
  usage: 'Reply to an image with .sepia',

  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      const quoted =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted?.imageMessage) {
        return await sock.sendMessage(
          chatId,
          { text: '🧡 *Sepia Image*\n\nReply to an image to convert it to sepia\n\nUsage:\n.sepia' },
          { quoted: message }
        );
      }

      await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

      const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempFile = path.join(process.cwd(), `sepia_${Date.now()}.jpg`);
      fs.writeFileSync(tempFile, buffer);

      const form = new FormData();
      form.append('apikey', 'guru');
      form.append('file', fs.createReadStream(tempFile));

      const res = await axios.post(
        'https://discardapi.dpdns.org/api/image/sepia',
        form,
        { headers: form.getHeaders(), responseType: 'arraybuffer', timeout: 60000 }
      );
      fs.unlinkSync(tempFile);

      if (!res?.data) throw new Error('Sepia conversion failed');

      const grayFile = path.join(process.cwd(), `sepia_result_${Date.now()}.jpg`);
      fs.writeFileSync(grayFile, res.data);

      await sock.sendMessage(
        chatId,
        {
          image: { url: grayFile },
          caption: `🧡 *Sepia Image*\n\nProcessed by: MEGA-MD`
        },
        { quoted: message }
      );
      fs.unlinkSync(grayFile);

    } catch(err: any) {
      console.error('Sepia Plugin Error:', err);
      await sock.sendMessage(
        chatId,
        { text: '❌ Failed to convert image to sepia. Make sure the image is clear and try again.' },
        { quoted: message }
      );
    }
  }
};
