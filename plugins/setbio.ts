import type { BotContext } from '../types.js';
import store from '../lib/lightweight_store.js';
import axios from 'axios';

const QUOTE_URLS = [
  'https://raw.githubusercontent.com/GlobalTechInfo/Islamic-Database/main/text/random_quotes.txt',
  'https://raw.githubusercontent.com/GlobalTechInfo/Islamic-Database/main/text/motivational_quotes.txt',
  'https://raw.githubusercontent.com/GlobalTechInfo/Islamic-Database/main/text/pickup_quotes.txt'
];

let cachedQuotes = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000;

async function fetchQuotes() {
  try {
    if (cachedQuotes.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
      return cachedQuotes;
    }

    const allQuotes = [];

    for (const url of QUOTE_URLS) {
      try {
        const response = await axios.get(url, { timeout: 15000 });
        const lines = response.data
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 10);

        allQuotes.push(...lines);
      } catch(error: any) {
      }
    }

    if (allQuotes.length === 0) {
      // Fallback quotes if fetch fails
      return [
        '💎 By MEGA-MD - Your WhatsApp Bot',
        '🌟 Stay positive, work hard, make it happen.',
        '✨ Believe in yourself and all that you are.',
        '🚀 The future belongs to those who believe in the beauty of their dreams.',
        '💪 Success is not final, failure is not fatal.',
        '🎯 Dream big, work hard, stay focused.',
        '⭐ Every day is a new beginning.',
        '🌈 Be the reason someone smiles today.'
      ];
    }

    cachedQuotes = allQuotes;
    lastFetchTime = Date.now();

    return allQuotes;
  } catch(error: any) {
    return cachedQuotes.length > 0 ? cachedQuotes : ['💎 By MEGA-MD - Your WhatsApp Bot'];
  }
}

function getRandomQuote(quotes) {
  if (!quotes || quotes.length === 0) return '💎 By MEGA-MD';
  return quotes[Math.floor(Math.random() * quotes.length)];
}

async function updateAutoBio(sock) {
  try {
    const autoBioSettings = await store.getSetting('global', 'autoBio');
    if (!autoBioSettings?.enabled) return;

    const quotes = await fetchQuotes();
    const randomQuote = getRandomQuote(quotes);

    let bio;
    if (autoBioSettings.customBio) {
      bio = autoBioSettings.customBio.replace('{quote}', randomQuote);
    } else {
      bio = `${randomQuote}\n\n💎 MEGA-MD`;
    }
    if (bio.length > 139) {
      bio = bio.substring(0, 136) + '...';
    }

    await sock.updateProfileStatus(bio);
  } catch(error: any) {
  }
}

let autoBioInterval = null;

export function startAutoBio(sock) {
  if (autoBioInterval) return;
  fetchQuotes().then(() => {
  });
  autoBioInterval = setInterval(() => {
    updateAutoBio(sock);
  }, 10 * 60 * 1000);
  updateAutoBio(sock);
}
function stopAutoBio() {
  if (autoBioInterval) {
    clearInterval(autoBioInterval);
    autoBioInterval = null;
  }
}

export default {
  command: 'setbio',
  aliases: ['autobio', 'bio'],
  category: 'owner',
  description: 'Set custom WhatsApp bio with random quotes',
  usage: '.setbio <on|off|set|reset>',
  ownerOnly: true,

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const action = args[0]?.toLowerCase();

    try {
      const autoBioSettings = await store.getSetting('global', 'autoBio') || { enabled: false, customBio: null };

      if (!action) {
        const quotes = await fetchQuotes();
        return await sock.sendMessage(chatId, {
          text: `*📝 AUTO BIO SETTINGS*\n\n` +
                `*Status:* ${autoBioSettings.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                `*Custom Bio:* ${autoBioSettings.customBio ? 'Set' : 'Default'}\n` +
                `*Quotes Loaded:* ${quotes.length}\n` +
                `*Update Interval:* Every 10 minute\n\n` +
                `*Commands:*\n` +
                `• \`.setbio on\` - Enable auto bio\n` +
                `• \`.setbio off\` - Disable auto bio\n` +
                `• \`.setbio set <text>\` - Set custom bio\n` +
                `• \`.setbio reset\` - Reset to default bio\n` +
                `• \`.setbio preview\` - Preview random quote\n\n` +
                `*Default Bio:*\n{quote}\n💎 MEGA-MD\n\n` +
                `*Custom Bio:*\n${autoBioSettings.customBio || 'Not set'}\n\n` +
                `*Note:* Use \`{quote}\` in custom bio to insert random quotes.\n\n` +
                `*Sources:*\n• Famous Quotes\n• Motivational Quotes\n• Pickup Lines`
        }, { quoted: message });
      }

      if (action === 'preview') {
        const quotes = await fetchQuotes();
        const randomQuote = getRandomQuote(quotes);
        return await sock.sendMessage(chatId, {
          text: `*📝 Preview Quote*\n\n${randomQuote}\n\n💎 MEGA-MD\n\n_This is how your bio will look with random quotes_`
        }, { quoted: message });
      }

      if (action === 'on') {
        if (autoBioSettings.enabled) {
          return await sock.sendMessage(chatId, {
            text: '⚠️ *Auto bio is already enabled*'
          }, { quoted: message });
        }

        autoBioSettings.enabled = true;
        await store.saveSetting('global', 'autoBio', autoBioSettings);
        startAutoBio(sock);

        return await sock.sendMessage(chatId, {
          text: '✅ *Auto bio enabled!*\n\nYour bio will now update every 1 minute with random quotes from:\n• Islamic Quotes\n• Motivational Quotes\n• Pickup Lines'
        }, { quoted: message });
      }

      if (action === 'off') {
        if (!autoBioSettings.enabled) {
          return await sock.sendMessage(chatId, {
            text: '⚠️ *Auto bio is already disabled*'
          }, { quoted: message });
        }

        autoBioSettings.enabled = false;
        await store.saveSetting('global', 'autoBio', autoBioSettings);
        stopAutoBio();

        return await sock.sendMessage(chatId, {
          text: '❌ *Auto bio disabled!*\n\nYour bio will no longer auto-update.'
        }, { quoted: message });
      }

      if (action === 'set') {
        let customBio = null;

        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          customBio = quoted.conversation ||
                     quoted.extendedTextMessage?.text ||
                     null;
        } else {
          customBio = args.slice(1).join(' ').trim();
        }

        if (!customBio) {
          return await sock.sendMessage(chatId, {
            text: '❌ *Please provide bio text!*\n\n*Usage:*\n• `.setbio set Your bio here`\n• Reply to a message with `.setbio set`\n\n*Tip:* Use `{quote}` to insert random quotes in your bio.'
          }, { quoted: message });
        }

        autoBioSettings.customBio = customBio;
        await store.saveSetting('global', 'autoBio', autoBioSettings);

        if (autoBioSettings.enabled) {
          await updateAutoBio(sock);
        }

        return await sock.sendMessage(chatId, {
          text: `✅ *Custom bio set!*\n\n*Your bio:*\n${customBio}\n\n${autoBioSettings.enabled ? '✅ Auto bio is enabled - Bio updated!' : '⚠️ Auto bio is disabled - Use `.setbio on` to enable'}`
        }, { quoted: message });
      }

      if (action === 'reset') {
        autoBioSettings.customBio = null;
        await store.saveSetting('global', 'autoBio', autoBioSettings);

        if (autoBioSettings.enabled) {
          await updateAutoBio(sock);
        }

        return await sock.sendMessage(chatId, {
          text: '✅ *Bio reset to default!*\n\n*Default bio:*\n{quote}\n💎 MEGA-MD'
        }, { quoted: message });
      }

      return await sock.sendMessage(chatId, {
        text: '❌ *Invalid command!*\n\nUse `.setbio` to see available options.'
      }, { quoted: message });

    } catch(error: any) {
      console.error('SetBio Error:', error);
      await sock.sendMessage(chatId, {
        text: `❌ *Error:* ${error.message}`
      }, { quoted: message });
    }
  },

  startAutoBio,
  stopAutoBio,
  updateAutoBio
};

