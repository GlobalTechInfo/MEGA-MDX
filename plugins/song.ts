import type { BotContext } from '../types.js';
import axios from 'axios';
import yts from 'yt-search';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';

const wait = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

interface DownloadData {
    downloadUrl: string;
    title: string;
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
    command: 'song',
    aliases: ['music', 'audio', 'mp3'],
    category: 'music',
    description: 'Download song from YouTube (MP3)',
    usage: '.song <song name | youtube link>',

    async handler(sock: any, message: any, args: string[], context: BotContext) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) return sock.sendMessage(
            chatId,
            { text: '🎵 *Song Downloader*\n\nUsage:\n.song <song name | YouTube link>' },
            { quoted: message }
        );

        try {
            let video: { url: string; title?: string; timestamp?: string; thumbnail?: string };

            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                video = { url: query };
            } else {
                const { videos } = await yts(query);
                if (!videos?.length) return sock.sendMessage(
                    chatId,
                    { text: '❌ No results found.' },
                    { quoted: message }
                );
                video = videos[0];
            }

            if (video.thumbnail) {
                await sock.sendMessage(chatId, {
                    image: { url: video.thumbnail },
                    caption: `🎶 *${video.title || query}*\n⏱ ${video.timestamp || ''}\n\n⏳ Downloading... *(may take up to 30s)*`
                }, { quoted: message });
            }

            const audio = await downloadWithRetry(video.url);

            await sock.sendMessage(chatId, {
                audio: { url: audio.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${audio.title || video.title || 'song'}.mp3`,
                ptt: false
            }, { quoted: message });

        } catch (err: any) {
            console.error('Song plugin error:', err.message);
            const reason = err.response?.status === 408
                ? 'Download timed out. Try again.'
                : err.message;
            await sock.sendMessage(chatId, { text: `❌ Failed: ${reason}` }, { quoted: message });
        }
    }
};
