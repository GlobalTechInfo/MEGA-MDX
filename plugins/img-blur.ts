import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';

export default {
  command: 'blur',
  aliases: ['blurimg', 'blurpic'],
  category: 'tools',
  description: 'Apply a blur effect to an image',
  usage: '.blur (reply to an image or send image with caption)',
  async handler(sock: any, message: any, args: any, context: any) {
    const chatId = context.chatId || message.key.remoteJid;
    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    try {
      let imageBuffer;
      if (quotedMessage?.imageMessage) {
        const quoted = { message: { imageMessage: quotedMessage.imageMessage } };
        imageBuffer = await downloadMediaMessage(quoted as any, 'buffer', {} as any);
      } else if (message.message?.imageMessage) {
        imageBuffer = await downloadMediaMessage(message, 'buffer', {}, {} as any);
      } else {
        await sock.sendMessage(chatId, {
          text: 'Please reply to an image or send an image with caption `.blur`'
        }, { quoted: message });
        return;
      }
      const resizedImage = await sharp(imageBuffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      const blurredImage = await sharp(resizedImage)
        .blur(10)
        .toBuffer();

      await sock.sendMessage(chatId, {
        image: blurredImage,
        caption: '✨ *Image Blurred Successfully!*',
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363319098372999@newsletter',
            newsletterName: 'MEGA MD',
            serverMessageId: -1
          }
        }
      }, { quoted: message });

    } catch(error: any) {
      console.error('Error in blur command:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Failed to blur image. Please try again later.'
      }, { quoted: message });
    }
  }
};
