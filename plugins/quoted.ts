import axios from 'axios';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import fs from 'fs';
import os from 'os';
import path from 'path';

export default {
  command: 'quoted',
  aliases: ['q', 'fakereply'],
  category: 'stickers',
  description: 'Generate a quote sticker from text',
  usage: '.quote <text> or reply to a message',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    let text = args.join(' ').trim();

    try {
      // Check if no text and no quoted message
      if (!text && !message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return await sock.sendMessage(chatId, { 
          text: '📝 Please provide some text or reply to a message to create a quote.\n\nUsage: .quote <text>' 
        }, { quoted: message });
      }

      // Get text from quoted message if available
      if (!text && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMsg = message.message.extendedTextMessage.contextInfo.quotedMessage;
        text = quotedMsg.conversation || 
               quotedMsg.extendedTextMessage?.text || 
               quotedMsg.imageMessage?.caption || 
               quotedMsg.videoMessage?.caption || 
               'Media message';
      }

      // Determine who to get profile picture from
      let who;
      if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        // Quoted message sender
        who = message.message.extendedTextMessage.contextInfo.participant;
      } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        // Mentioned user
        who = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else {
        // Message sender
        who = message.key.participant || message.key.remoteJid;
      }

      // React with waiting emoji
      await sock.sendMessage(chatId, {
        react: {
          text: '⏳',
          key: message.key
        }
      });

      // Get profile picture
      let userPfp;
      try {
        userPfp = await sock.profilePictureUrl(who, 'image');
      } catch(err: any) {
        userPfp = 'https://i.ibb.co/9HY4wjz/a4c0b1af253197d4837ff6760d5b81c0.jpg';
      }

      // Get user name (try to extract from contact or use phone number)
      let userName = who.split('@')[0];
      try {
        const contactInfo = await sock.onWhatsApp(who);
        if (contactInfo?.[0]?.notify) {
          userName = contactInfo[0].notify;
        }
      } catch(err: any) {
        // Use default name
      }

      // Prepare quote JSON
      const quoteJson = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#FFFFFF',
        width: 1800,
        height: 200,
        scale: 2,
        messages: [
          {
            entities: [],
            avatar: true,
            from: {
              id: 1,
              name: userName,
              photo: {
                url: userPfp,
              },
            },
            text: text,
            replyMessage: {},
          },
        ],
      };

      // Fetch quote image from API
      const res = await axios.post('https://bot.lyo.su/quote/generate', quoteJson, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (!res.data?.result?.image) {
        throw new Error('Invalid API response');
      }

      // Convert base64 to buffer
      const bufferImage = Buffer.from(res.data.result.image, 'base64');

      // Save to temporary file
      const tempImagePath = path.join(os.tmpdir(), `quote_${Date.now()}.png`);
      fs.writeFileSync(tempImagePath, bufferImage);

      // Create sticker
      const sticker = new Sticker(tempImagePath, {
        pack: 'WhatsApp Bot',
        author: userName,
        type: StickerTypes.FULL,
        categories: ['🤩' as any, '🎉'],
        id: Math.floor(100000 + Math.random() * 900000).toString(),
        quality: 100,
        background: '#00000000',
      });

      // Send sticker
      try {
        const stickerBuffer = await sticker.toBuffer();
        await sock.sendMessage(chatId, {
          sticker: stickerBuffer
        }, { quoted: message });

        // React with success emoji
        await sock.sendMessage(chatId, {
          react: {
            text: '✅',
            key: message.key
          }
        });
      } catch(stickerError: any) {
        console.error('Error sending sticker:', stickerError);
        
        // Fallback: send as image
        await sock.sendMessage(chatId, {
          image: bufferImage,
          caption: '📝 Quote image (sticker conversion failed)'
        }, { quoted: message });

        await sock.sendMessage(chatId, {
          react: {
            text: '⚠️',
            key: message.key
          }
        });
      }

      // Clean up temporary file
      try {
        fs.unlinkSync(tempImagePath);
      } catch(err: any) {
        console.error('Error cleaning up temp file:', err);
      }

    } catch(err: any) {
      console.error('Quote plugin error:', err);

      // React with error emoji
      await sock.sendMessage(chatId, {
        react: {
          text: '❌',
          key: message.key
        }
      });

      let errorMessage = '❌ Failed to generate quote. ';
      
      if (err.message.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.';
      } else if (err.message.includes('Invalid API response')) {
        errorMessage += 'API returned invalid data.';
      } else {
        errorMessage += 'Please try again later.';
      }

      await sock.sendMessage(chatId, { 
        text: errorMessage 
      }, { quoted: message });
    }
  }
};
