import type { BotContext } from '../types.js';
import axios from 'axios';

export default {
  command: 'tiktok',
  aliases: ['tt', 'ttdl', 'tiktokdl'],
  category: 'download',
  description: 'Download TikTok video without watermark (HD if available)',
  usage: '.tiktok <TikTok URL>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, rawText } = context;

    const prefix = rawText.match(/^[.!#]/)?.[0] || '.';
    const commandPart = rawText.slice(prefix.length).trim();
    const parts = commandPart.split(/\s+/);
    const url = parts.slice(1).join(' ').trim();

    if (!url) {
      return await sock.sendMessage(chatId, {
        text: '🎵 *TikTok Downloader*\n\nPlease provide a TikTok URL.\nExample:\n.tiktok https://vm.tiktok.com/XXXX'
      }, { quoted: message });
    }

    try {
      await sock.sendMessage(chatId, {
        text: '⏳ Downloading TikTok video...'
      }, { quoted: message });

      const apiUrl = `https://discardapi.onrender.com/api/dl/tiktok?apikey=guru&url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiUrl, {
        timeout: 45000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!data?.status || !data?.result) {
        throw new Error('Invalid API response');
      }

      const res = data.result;
      const hd = res.data.find((v: any) => v.type === 'nowatermark_hd');
      const noWm = res.data.find((v: any) => v.type === 'nowatermark');
      const videoUrl = hd?.url || noWm?.url;

      if (!videoUrl) {
        throw new Error('No downloadable video found');
      }

      const caption =
`🎵 *TikTok Downloader*
━━━━━━━━━━━━━━━━━━━
👤 *User:* ${res.author.nickname}
🆔 *Username:* ${res.author.fullname}
🌍 *Region:* ${res.region}
⏱️ *Duration:* ${res.duration}

❤️ *Likes:* ${res.stats.likes}
💬 *Comments:* ${res.stats.comment}
🔁 *Shares:* ${res.stats.share}
👀 *Views:* ${res.stats.views}

🎧 *Sound:* ${res.music_info.title}
📅 *Posted:* ${res.taken_at}

📝 *Caption:*
${res.title || 'No caption'}

✨ *Quality:* ${hd ? 'HD No Watermark' : 'No Watermark'}
━━━━━━━━━━━━━━━━━━━`;

      await sock.sendMessage(chatId, {
        video: { url: videoUrl },
        mimetype: 'video/mp4',
        caption
      }, { quoted: message });

    } catch(error: any) {
      console.error('TikTok plugin error:', error);

      if (error.code === 'ECONNABORTED') {
        await sock.sendMessage(chatId, {
          text: '⏱️ Request timed out. Please try again later.'
        }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, {
          text: `❌ Failed to download TikTok video.\nReason: ${error.message}`
        }, { quoted: message });
      }
    }
  }
};
