
import axios from 'axios';

export default {
  command: 'snapchat',
  aliases: ['scspot', 'snapdl'],
  category: 'download',
  description: 'Download media (video or image) from Snapchat Spotlight URL',
  usage: '.snapchat <Snapchat URL>',

  async handler(sock: any, message: any, args: any, context: any) {
    const { chatId, channelInfo, rawText } = context;
    
    const prefix = context.rawText.match(/^[.!#]/)?.[0] || '.';
    const commandPart = rawText.slice(prefix.length).trim();
    const parts = commandPart.split(/\s+/);
    const url = parts.slice(1).join(' ').trim();

    if (!url) {
      return await sock.sendMessage(chatId, { 
        text: 'Please provide a Snapchat Spotlight URL.\nExample: .snapchat https://www.snapchat.com/spotlight/...',
        ...channelInfo
      }, { quoted: message });
    }

    try {
      await sock.sendMessage(chatId, { 
        text: '⏳ Fetching Snapchat media...',
        ...channelInfo
      }, { quoted: message });

      const apiUrl = `https://discardapi.dpdns.org/api/dl/snapchat?apikey=guru&url=${encodeURIComponent(url)}`;
      
      console.log('Requesting URL:', apiUrl);
      console.log('Original URL:', url);
      
      const { data } = await axios.get(apiUrl, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      console.log('Snapchat API Response:', JSON.stringify(data, null, 2));

      if (!data || data.status !== true || !data.result || !Array.isArray(data.result) || data.result.length === 0) {
        return await sock.sendMessage(chatId, { 
          text: '❌ No media found for this Snapchat Spotlight URL.',
          ...channelInfo
        }, { quoted: message });
      }

      for (let mediaItem of data.result) {
        if (mediaItem.video) {
          await sock.sendMessage(chatId, { 
            video: { url: mediaItem.video }, 
            caption: '📹 Snapchat Spotlight Video',
            ...channelInfo
          }, { quoted: message });
        }
        if (mediaItem.image) {
          await sock.sendMessage(chatId, { 
            image: { url: mediaItem.image }, 
            caption: '🖼 Snapchat Spotlight Image',
            ...channelInfo
          }, { quoted: message });
        }
      }

    } catch(error: any) {
      console.error('Snapchat plugin error:', error.message);
      
      await sock.sendMessage(chatId, { 
        text: `❌ Failed to fetch Snapchat media.\nError: ${error.message}`,
        ...channelInfo
      }, { quoted: message });
    }
  }
};
