import type { BotContext } from '../types.js';
import store from '../lib/lightweight_store.js';

async function getAntibadwordSettings(chatId) {
    const settings = await store.getSetting(chatId, 'antibadword');
    return settings || { enabled: false, words: [] };
}

async function saveAntibadwordSettings(chatId, settings) {
    await store.saveSetting(chatId, 'antibadword', settings);
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
    const args = match.trim().toLowerCase().split(/\s+/);
    const action = args[0];

    const settings = await getAntibadwordSettings(chatId);

    if (!action || action === 'status') {
        const status = settings.enabled ? '✅ Enabled' : '❌ Disabled';
        const wordCount = settings.words?.length || 0;

        await sock.sendMessage(chatId, {
            text: `*Anti-Badword Status*\n\n` +
                  `Status: ${status}\n` +
                  `Blocked Words: ${wordCount}\n\n` +
                  `Use:\n` +
                  `• \`.antibadword on\` - Enable\n` +
                  `• \`.antibadword off\` - Disable\n` +
                  `• \`.antibadword add <word>\` - Add word\n` +
                  `• \`.antibadword remove <word>\` - Remove word\n` +
                  `• \`.antibadword list\` - Show all words`
        }, { quoted: message });
        return;
    }

    if (action === 'on') {
        settings.enabled = true;
        await saveAntibadwordSettings(chatId, settings);

        await sock.sendMessage(chatId, {
            text: '✅ *Anti-Badword Enabled*\n\nMessages with blocked words will be deleted.'
        }, { quoted: message });
        return;
    }

    if (action === 'off') {
        settings.enabled = false;
        await saveAntibadwordSettings(chatId, settings);

        await sock.sendMessage(chatId, {
            text: '❌ *Anti-Badword Disabled*\n\nBadword filter is now inactive.'
        }, { quoted: message });
        return;
    }

    if (action === 'add') {
        const word = args.slice(1).join(' ').toLowerCase().trim();

        if (!word) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please specify a word to add*\n\nExample: `.antibadword add badword`'
            }, { quoted: message });
            return;
        }

        if (!settings.words) settings.words = [];

        if (settings.words.includes(word)) {
            await sock.sendMessage(chatId, {
                text: `❌ *Word already in list*\n\n"${word}" is already blocked.`
            }, { quoted: message });
            return;
        }

        settings.words.push(word);
        await saveAntibadwordSettings(chatId, settings);

        await sock.sendMessage(chatId, {
            text: `✅ *Word Added*\n\nAdded "${word}" to blocked words list.\n\nTotal blocked words: ${settings.words.length}`
        }, { quoted: message });
        return;
    }

    if (action === 'remove' || action === 'delete' || action === 'del') {
        const word = args.slice(1).join(' ').toLowerCase().trim();

        if (!word) {
            await sock.sendMessage(chatId, {
                text: '❌ *Please specify a word to remove*\n\nExample: `.antibadword remove badword`'
            }, { quoted: message });
            return;
        }

        if (!settings.words || !settings.words.includes(word)) {
            await sock.sendMessage(chatId, {
                text: `❌ *Word not found*\n\n"${word}" is not in the blocked list.`
            }, { quoted: message });
            return;
        }

        settings.words = settings.words.filter(w => w !== word);
        await saveAntibadwordSettings(chatId, settings);

        await sock.sendMessage(chatId, {
            text: `✅ *Word Removed*\n\nRemoved "${word}" from blocked words list.\n\nRemaining blocked words: ${settings.words.length}`
        }, { quoted: message });
        return;
    }

    if (action === 'list') {
        if (!settings.words || settings.words.length === 0) {
            await sock.sendMessage(chatId, {
                text: '📝 *Blocked Words List*\n\nNo words are currently blocked.\n\nUse `.antibadword add <word>` to add words.'
            }, { quoted: message });
            return;
        }

        const wordList = settings.words.map((w, i) => `${i + 1}. ${w}`).join('\n');

        await sock.sendMessage(chatId, {
            text: `📝 *Blocked Words List*\n\n${wordList}\n\nTotal: ${settings.words.length} words`
        }, { quoted: message });
        return;
    }

    await sock.sendMessage(chatId, {
        text: '❌ *Invalid action*\n\nUse:\n' +
              '• `.antibadword on/off`\n' +
              '• `.antibadword add <word>`\n' +
              '• `.antibadword remove <word>`\n' +
              '• `.antibadword list`'
    }, { quoted: message });
}

async function checkAntiBadword(sock: any, message: any) {
    const chatId = message.key.remoteJid;
    if (!chatId.endsWith('@g.us')) return false;

    const settings = await getAntibadwordSettings(chatId);
    if (!settings.enabled || !settings.words || settings.words.length === 0) return false;

    const messageText = (
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        ''
    ).toLowerCase();

    if (!messageText) return false;

    for (const word of settings.words) {
        if (messageText.includes(word.toLowerCase())) {
            try {
                await sock.sendMessage(chatId, { delete: message.key });

                await sock.sendMessage(chatId, {
                    text: `❌ Message deleted: Contains blocked word "${word}"`
                });

                return true;
            } catch(error: any) {
                console.error('Error deleting badword message:', error);
            }
            break;
        }
    }

    return false;
}

export default {
    command: 'antibadword',
    aliases: ['abw', 'badword', 'antibad'],
    category: 'admin',
    description: 'Configure anti-badword filter to delete messages containing inappropriate words',
    usage: '.antibadword <on|off|add|remove|list>',
    groupOnly: true,
    adminOnly: true,

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const match = args.join(' ');

        try {
            await handleAntiBadwordCommand(sock, chatId, message, match);
        } catch(error: any) {
            console.error('Error in antibadword command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ *Error processing antibadword command*\n\nPlease try again later.'
            }, { quoted: message });
        }
    }
};

export { handleAntiBadwordCommand };
export { checkAntiBadword };
