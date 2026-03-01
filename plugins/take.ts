import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import webp from 'node-webpmux';
import crypto from 'crypto';

export default {
  command: 'take',
  aliases: ['steal', 'wm'],
  category: 'stickers',
  description: 'Change sticker pack name',
  usage: '.take <packname> (reply to sticker)',
  
  async handler(sock: any, message: any, args: any, context: any) {
    const { chatId, channelInfo } = context;
    
    try {
      const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quotedMessage?.stickerMessage) {
        await sock.sendMessage(chatId, { 
          text: '❌ Reply to a sticker with .take <packname>',
          ...channelInfo
        }, { quoted: message });
        return;
      }
      
      const packname = args.join(' ') || 'MEGA AI';

      try {
        const stickerBuffer = await downloadMediaMessage(
          {
            key: message.message.extendedTextMessage.contextInfo.stanzaId,
            message: quotedMessage,
            // messageType: 'stickerMessage'
          },
          'buffer',
          {},
          {
            logger: (console as any),
            reuploadRequest: sock.updateMediaMessage
          }
        );

        if (!stickerBuffer) {
          await sock.sendMessage(chatId, { 
            text: '❌ Failed to download sticker',
            ...channelInfo
          }, { quoted: message });
          return;
        }
        
        const img = new webp.Image();
        await img.load(stickerBuffer);

        const json = {
          'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
          'sticker-pack-name': packname,
          'emojis': ['🤖']
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
        }, {
          quoted: message
        });

      } catch(error: any) {
        console.error('Sticker processing error:', error);
        await sock.sendMessage(chatId, { 
          text: '❌ Error processing sticker',
          ...channelInfo
        }, { quoted: message });
      }

    } catch(error: any) {
      console.error('Error in take command:', error);
      await sock.sendMessage(chatId, { 
        text: '❌ Error processing command',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
