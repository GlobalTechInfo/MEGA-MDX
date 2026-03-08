import type { BotContext } from '../types.js';
import axios from 'axios';
import config from '../config.js';

const AI_APIS = [
    (q: string) => `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
    (q: string) => `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
    (q: string) => `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`
];

const askAI = async (query: string): Promise<string> => {
    for (const apiUrl of AI_APIS) {
        try {
            const { data } = await axios.get(apiUrl(query), { timeout: 15000 });
            const response = data?.data?.response;
            if (response && typeof response === 'string' && response.trim()) {
                return response.trim();
            }
        } catch {
            continue;
        }
    }
    throw new Error('All AI APIs failed');
};

export default {
    command: 'gpt',
    aliases: ['ai', 'chat', 'ask', 'mistral', 'llama'],
    category: 'ai',
    description: 'Ask a question to AI',
    usage: `${config.prefix}gpt <question>`,

    async handler(sock: any, message: any, args: string[], context: BotContext) {
        const { chatId } = context;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(
                chatId,
                { text: '🤖 *AI Assistant*\n\nUsage: `${config.prefix}gpt <your question>`\nExample: `${config.prefix}gpt explain quantum physics`' },
                { quoted: message }
            );
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } });

            const answer = await askAI(query);

            await sock.sendMessage(chatId, { text: answer }, { quoted: message });

        } catch (error: any) {
            console.error('AI Command Error:', error.message);
            await sock.sendMessage(
                chatId,
                { text: '❌ Failed to get AI response. Please try again later.' },
                { quoted: message }
            );
        }
    }
};
