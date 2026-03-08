import yts from 'yt-search';
import axios from 'axios';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';

const wait = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

interface DownloadData {
    downloadUrl: string;
    title: string;
    thumbnail: string;
}

const downloadWithRetry = async (url: string, retries = 3): Promise<DownloadData> => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: { apiKey: API_KEY, format: 'mp3', url },
                timeout: 90000
            });
            if (data?.data?.downloadUrl) return data.data as DownloadData;
            throw new Error('No download URL');
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`Download attempt ${i + 1} failed, retrying in 5s...`);
            await wait(5000);
        }
    }
    throw new Error('All download attempts failed');
};

export default {
    command: 'play',
    aliases: ['plays', 'music'],
    category: 'music',
    description: 'Search and download a song as MP3 from YouTube',
    usage: '.play <song name>',

    async handler(sock: any, message: any, args: string[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) return sock.sendMessage(
            chatId,
            { text: '*Which song do you want to play?*\nUsage: .play <song name>' },
            { quoted: message }
        );

        try {
            await sock.sendMessage(chatId, { text: '🔍 *Searching...*' }, { quoted: message });

            const { videos } = await yts(query);
            if (!videos?.length) return sock.sendMessage(
                chatId,
                { text: '❌ *No results found!*' },
                { quoted: message }
            );

            const video = videos[0];
            await sock.sendMessage(chatId, {
                text: `✅ *Found:* ${video.title}\n⏱️ ${video.timestamp}\n👤 ${video.author.name}\n\n⏳ *Downloading... (this may take up to 30s)*`
            }, { quoted: message });

            const songData = await downloadWithRetry(video.url);

            let thumbnailBuffer: Buffer | undefined;
            try {
                const img = await axios.get(songData.thumbnail, { responseType: 'arraybuffer', timeout: 15000 });
                thumbnailBuffer = Buffer.from(img.data);
            } catch { /* no thumbnail */ }

            await sock.sendMessage(chatId, {
                audio: { url: songData.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${songData.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: songData.title,
                        body: `${video.author.name} • ${video.timestamp}`,
                        thumbnail: thumbnailBuffer,
                        mediaType: 2,
                        sourceUrl: video.url
                    }
                }
            }, { quoted: message });

        } catch (err: any) {
            console.error('Play error:', err.message);
            const reason = err.response?.status === 408
                ? 'Download timed out. Try again in a moment.'
                : err.response?.status === 429
                    ? 'Rate limited. Wait a minute.'
                    : err.message;
            await sock.sendMessage(chatId, { text: `❌ *Failed:* ${reason}` }, { quoted: message });
        }
    }
};
