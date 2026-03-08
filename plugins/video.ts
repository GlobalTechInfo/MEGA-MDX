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
                params: { apiKey: API_KEY, format: '360', url },
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
    command: 'video',
    aliases: ['ytmp4', 'ytvideo', 'ytdl'],
    category: 'download',
    description: 'Download YouTube videos by link or search',
    usage: '.video <youtube link | search query>',

    async handler(sock: any, message: any, args: string[], context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) return sock.sendMessage(
            chatId,
            { text: '🎥 *What video do you want to download?*\nExample:\n.video Alan Walker Faded' },
            { quoted: message }
        );

        try {
            let videoUrl: string;
            let videoTitle: string | undefined;
            let videoThumbnail: string | undefined;

            if (query.startsWith('http://') || query.startsWith('https://')) {
                videoUrl = query;
            } else {
                const { videos } = await yts(query);
                if (!videos?.length) return sock.sendMessage(
                    chatId,
                    { text: '❌ No videos found!' },
                    { quoted: message }
                );
                videoUrl = videos[0].url;
                videoTitle = videos[0].title;
                videoThumbnail = videos[0].thumbnail;
            }

            const validYT = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
            if (!validYT) return sock.sendMessage(
                chatId,
                { text: '❌ Not a valid YouTube link!' },
                { quoted: message }
            );

            const ytId = validYT[1];
            const thumb = videoThumbnail || `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`;

            await sock.sendMessage(chatId, {
                image: { url: thumb },
                caption: `🎬 *${videoTitle || query}*\n⬇️ Downloading... *(may take up to 30s)*`
            }, { quoted: message });

            const videoData = await downloadWithRetry(videoUrl);

            await sock.sendMessage(chatId, {
                video: { url: videoData.downloadUrl },
                mimetype: 'video/mp4',
                fileName: `${videoData.title || videoTitle || 'video'}.mp4`,
                caption: `🎬 *${videoData.title || videoTitle || 'Video'}*\n\n> *_Downloaded by MEGA-MD_*`
            }, { quoted: message });

        } catch (err: any) {
            console.error('[VIDEO] Error:', err.message);
            const reason = err.response?.status === 408
                ? 'Download timed out. Try again.'
                : err.message;
            await sock.sendMessage(chatId, { text: `❌ Download failed!\nReason: ${reason}` }, { quoted: message });
        }
    }
};
