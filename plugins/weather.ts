import type { BotContext } from '../types.js';
import axios from 'axios';
import { channelInfo } from '../lib/messageConfig.js';

export default {
  command: 'weather',
  aliases: ['forecast', 'climate'],
  category: 'info',
  description: 'Get the current weather for a specific city!',
  usage: '.weather <city>',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const city = args.join(' ').trim();

    if (!city) {
      return await sock.sendMessage(chatId, {
        text: "*Please provide a place to search.*\nExample: .weather Karachi",
        ...channelInfo
      }, { quoted: message });
    }

    try {
      const apiKey = '060a6bcfa19809c2cd4d97a212b19273';
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`);
      const weather = response.data;

      const weatherText =
        `ʜᴇʀᴇ ɪs ʏᴏᴜʀ ᴘʟᴀᴄᴇ ᴡᴇᴀᴛʜᴇʀ\n\n` +
        `「 🌅 」ᴘʟᴀᴄᴇ: ${weather.name}\n` +
        `「 🗺️ 」ᴄᴏᴜɴᴛʀʏ: ${weather.sys.country}\n` +
        `「 🌤️ 」ᴠɪᴇᴡ: ${weather.weather[0].description}\n` +
        `「 🌡️ 」ᴛᴇᴍᴘᴇʀᴀᴛᴜʀᴇ: ${weather.main.temp}°C\n` +
        `「 💠 」ᴍɪɴɪᴍᴜᴍ ᴛᴇᴍᴘᴇʀᴀᴛᴜʀᴇ: ${weather.main.temp_min}°C\n` +
        `「 🔥 」ᴍᴀxɪᴍᴜᴍ ᴛᴇᴍᴘᴇʀᴀᴛᴜʀᴇ: ${weather.main.temp_max}°C\n` +
        `「 💦 」ʜᴜᴍɪᴅɪᴛʏ: ${weather.main.humidity}%\n` +
        `「 🌬️ 」ᴡɪɴᴅ sᴘᴇᴇᴅ: ${weather.wind.speed} km/h`;

      await sock.sendMessage(chatId, {
        text: weatherText,
        ...channelInfo
      }, { quoted: message });

    } catch(error: any) {
      console.error('Weather plugin error:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Sorry, I could not fetch the weather. Make sure the place name is correct.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
