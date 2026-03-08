import type { BotContext } from '../types.js';
import axios from 'axios';

export default {
  command: 'sora',
  aliases: ['txt2video', 'aiVideo'],
  category: 'ai',
  description: 'Generate AI video from text prompt',
  usage: '.sora <prompt>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    try {
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
      const input = args.join(' ') || quotedText;

      if (!input) {
        await sock.sendMessage(chatId, {
          text: 'Provide a prompt. Example: .sora anime girl with short blue hair',
          ...channelInfo
        }, { quoted: message });
        return;
      }

      const apiUrl = `https://okatsu-rolezapiiz.vercel.app/ai/txt2video?text=${encodeURIComponent(input)}`;
      const { data } = await axios.get(apiUrl, { timeout: 60000, headers: { 'user-agent': 'Mozilla/5.0' } });

      const videoUrl = data?.videoUrl || data?.result || data?.data?.videoUrl;
      if (!videoUrl) {
        throw new Error('No videoUrl in API response');
      }

      await sock.sendMessage(chatId, {
        video: { url: videoUrl },
        mimetype: 'video/mp4',
        caption: `Prompt: ${input}`,
        ...channelInfo
      }, { quoted: message });

    } catch(error: any) {
      console.error('[SORA] error:', error?.message || error);
      await sock.sendMessage(chatId, {
        text: 'Failed to generate video. Try a different prompt later.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
