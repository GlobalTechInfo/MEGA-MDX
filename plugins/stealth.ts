import type { BotContext } from '../types.js';
import store from '../lib/lightweight_store.js';

export default {
    command: 'stealth',
    aliases: ['alwaysonline', 'stealthmode'],
    category: 'owner',
    description: 'Toggle online status - bot will not send presence updates if off',
    usage: '.stealth <on|off>',
    ownerOnly: true,

    async handler(sock: any, message: any, args: any, context: BotContext) {
        const { chatId } = context;

        const action = args[0]?.toLowerCase();

        if (!action || !['on', 'off'].includes(action)) {
            const currentState = await store.getSetting('global', 'stealthMode');
            const status = currentState?.enabled ? 'ON' : 'OFF';

            let autotypingWarning = '';
            try {
                const autotypingState = await store.getSetting('global', 'autotyping');
                if (autotypingState?.enabled && currentState?.enabled) {
                    autotypingWarning = '\n\n⚠️ *Autotyping is enabled* but will be blocked by stealth mode.';
                }
            } catch(e: any) {}

            let autoreadWarning = '';
            try {
                const autoreadState = await store.getSetting('global', 'autoread');
                if (autoreadState?.enabled && currentState?.enabled) {
                    autoreadWarning = '\n⚠️ *Autoread is enabled* but will be blocked by stealth mode.';
                }
            } catch(e: any) {}

            return await sock.sendMessage(chatId, {
                text: `👻 *Stealth Mode Status:* ${status}\n\n*Usage:* .stealth <on|off>\n\n*What it does:*\n• Blocks all presence updates (typing, online, last seen)\n• Makes the bot completely invisible\n\n*When enabled:*\n✓ No "typing..." indicator\n✓ No "online" status\n✓ Complete stealth mode${autotypingWarning}${autoreadWarning}`
            }, { quoted: message });
        }

        const enabled = action === 'on';
        await store.saveSetting('global', 'stealthMode', { enabled });

        let warnings = '';
        if (enabled) {
            try {
                const autotypingState = await store.getSetting('global', 'autotyping');
                const autoreadState = await store.getSetting('global', 'autoread');

                if (autotypingState?.enabled || autoreadState?.enabled) {
                    warnings = '\n\n*⚠️ Note:*\n';
                    if (autotypingState?.enabled) warnings += '• Autotyping is enabled but will be blocked\n';
                    if (autoreadState?.enabled) warnings += '• Autoread is enabled but will be blocked\n';
                }
            } catch(e: any) {}
        }

        await sock.sendMessage(chatId, {
            text: `👻 Stealth mode has been turned *${enabled ? 'ON' : 'OFF'}*\n\n${enabled ? '✓ Bot is now in complete stealth mode\n✓ No presence updates\n✓ No typing indicators' : '✓ Presence updates enabled\n✓ Typing indicators enabled (if autotyping is on)'}${warnings}`
        }, { quoted: message });
    }
};
