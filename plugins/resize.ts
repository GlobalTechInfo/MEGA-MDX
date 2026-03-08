import type { BotContext } from '../types.js';
import { uploadImage } from '../lib/uploadImage.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function downloadMedia(msg, type) {
  const stream = await downloadContentFromMessage(msg, type);
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

export default {
  command: 'length',
  aliases: ['filelength', 'resize'],
  category: 'tools',
  description: 'Send an image or video with a custom file length',
  usage: '.length <size> (reply to media)',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const text = args?.join(' ')?.trim();

    try {
      let mediaMsg, mediaType;
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted) {
        if (quoted.imageMessage) {
          mediaMsg = quoted.imageMessage;
          mediaType = 'image';
        } else if (quoted.videoMessage) {
          mediaMsg = quoted.videoMessage;
          mediaType = 'video';
        }
      }

      if (!mediaMsg) {
        if (message.message?.imageMessage) {
          mediaMsg = message.message.imageMessage;
          mediaType = 'image';
        } else if (message.message?.videoMessage) {
          mediaMsg = message.message.videoMessage;
          mediaType = 'video';
        }
      }
      if (!mediaMsg) {
        return await sock.sendMessage(chatId, { text: '*⚠️ Reply to an image or video.*' }, { quoted: message });
      }
      if (!text || isNaN(text)) {
        return await sock.sendMessage(chatId, { text: '*🔢 Provide numeric file size.*\nExample: .length 999999' }, { quoted: message });
      }

      const buffer = await downloadMedia(mediaMsg, mediaType);
      const url = await uploadImage(buffer);

      await sock.sendMessage(
        chatId,
        mediaType === 'image'
          ? { image: { url }, caption: 'Here you go', fileLength: text }
          : { video: { url }, caption: 'Here you go', fileLength: text },
        { quoted: message }
      );

    } catch(err: any) {
      console.error('FileLength plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Failed to process media.' }, { quoted: message });
    }}
};
