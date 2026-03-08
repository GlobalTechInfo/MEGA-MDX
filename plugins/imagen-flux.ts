import axios from 'axios';

const IMAGE_APIS = [
    (p: string) => `https://stable.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
    (p: string) => `https://dalle.stacktoy.workers.dev/?apikey=Suhail&prompt=${encodeURIComponent(p)}`,
    (p: string) => `https://flux.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(p)}`
];

const generateImage = async (prompt: string): Promise<Buffer> => {
    for (const apiUrl of IMAGE_APIS) {
        try {
            const { data } = await axios.get(apiUrl(prompt), {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const buf = Buffer.from(data);
            if (buf[0] === 0x89 || buf[0] === 0xFF) return buf;
        } catch {
            continue;
        }
    }
    throw new Error('All image generation APIs failed');
};

const enhancePrompt = (prompt: string): string => {
    const enhancers = [
        'high quality', 'detailed', 'masterpiece', 'best quality',
        'ultra realistic', '4k', 'highly detailed', 'cinematic lighting'
    ];
    const selected = enhancers
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 2) + 3);
    return `${prompt}, ${selected.join(', ')}`;
};

export default {
    command: 'flux',
    aliases: ['aiimage', 'imagen', 'draw', 'genimage'],
    category: 'ai',
    description: 'Generate an AI image based on your prompt',
    usage: '.flux <prompt>',

    async handler(sock: any, message: any, args: string[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const imagePrompt = args.join(' ').trim();

        if (!imagePrompt) {
            return sock.sendMessage(
                chatId,
                { text: '🎨 *AI Image Generator*\n\nUsage: `.flux <prompt>`\nExample: `.flux a beautiful sunset over mountains`' },
                { quoted: message }
            );
        }

        await sock.sendMessage(chatId, { react: { text: '🎨', key: message.key } });
        await sock.sendMessage(chatId, { text: '🎨 Generating your image... Please wait.' }, { quoted: message });

        try {
            const enhanced = enhancePrompt(imagePrompt);
            const imageBuffer = await generateImage(enhanced);

            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: `🎨 *Generated Image*\n📝 Prompt: _${imagePrompt}_`
            }, { quoted: message });

        } catch (error: any) {
            console.error('Imagine error:', error.message);
            await sock.sendMessage(
                chatId,
                { text: '❌ Failed to generate image. Please try again later.' },
                { quoted: message }
            );
        }
    }
};

