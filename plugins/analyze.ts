import type { BotContext } from '../types.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getBin } from '../lib/compile.js';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const WA_LIMIT = 60000;

function getQuoted(message: any) {
    return message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

async function sendResult(sock: any, chatId: any, channelInfo: any, message: any, text: string, filename: string) {
    if (text.length > WA_LIMIT) {
        const tmpFile = path.join(process.cwd(), 'temp', filename);
        fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
        fs.writeFileSync(tmpFile, text);
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(tmpFile),
            mimetype: 'text/plain',
            fileName: filename,
            caption: '📈 Result too large for WhatsApp, sent as file.',
            ...channelInfo
        }, { quoted: message });
        try { fs.unlinkSync(tmpFile); } catch {}
    } else {
        await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
    }
}

export default {
    command: 'analyze',
    aliases: ['textanalyze', 'textanalyser', 'analyse', 'readability'],
    category: 'utility',
    description: 'Deep text analysis: reading level, sentiment, word stats (C++ powered)',
    usage: '${prefix}analyze <text or reply to any message/file>',

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const { chatId, channelInfo } = context;

        const binPath = getBin('analyze');
        if (!fs.existsSync(binPath)) {
            return await sock.sendMessage(chatId, {
                text: `❌ Analyze binary not available on this server (g++ not installed or not yet compiled).`,
                ...channelInfo
            }, { quoted: message });
        }

        const quoted = getQuoted(message);
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
        const hasDoc = !!quoted?.documentMessage;

        const textInput = args.join(' ').trim() || quotedText;

        if (!textInput && !hasDoc) {
            return await sock.sendMessage(chatId, {
                text: `📈 *Text Analyzer*\n\n` +
                      `*Usage:* \`.analyze <paste any text>\`\n\n` +
                      `*Or reply to:*\n` +
                      `• Any text message\n` +
                      `• A .txt or document file\n\n` +
                      `*Output includes:*\n` +
                      `📊 Word/sentence/paragraph count\n` +
                      `📖 Flesch Reading Ease score & level\n` +
                      `😊 Sentiment analysis (positive/negative/neutral)\n` +
                      `⏱️ Reading time estimate\n` +
                      `🏆 Top 20 keywords`,
                ...channelInfo
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { text: '🔍 Analyzing...', ...channelInfo }, { quoted: message });

        const tempDir = path.join(process.cwd(), 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const id = Date.now();

        try {
            let stdout: string;

            if (hasDoc && quoted) {
                const msgObj = { message: { documentMessage: quoted.documentMessage } };
                const buf = await downloadMediaMessage(msgObj as any, 'buffer', {} as any) as Buffer;
                const tmpFile = path.join(tempDir, `analyze_in_${id}.txt`);
                fs.writeFileSync(tmpFile, buf);
                const result = await execAsync(`"${binPath}" --file "${tmpFile}"`, { timeout: 30000 });
                stdout = result.stdout;
                try { fs.unlinkSync(tmpFile); } catch {}
            } else {
                const tmpFile = path.join(tempDir, `analyze_in_${id}.txt`);
                fs.writeFileSync(tmpFile, textInput);
                const result = await execAsync(`"${binPath}" --file "${tmpFile}"`, { timeout: 30000 });
                stdout = result.stdout;
                try { fs.unlinkSync(tmpFile); } catch {}
            }

            const data = JSON.parse(stdout.trim());

            const bar = (score: number) => {
                const filled = Math.round(score / 10);
                return '█'.repeat(filled) + '░'.repeat(10 - filled);
            };

            const fleschBar = bar(data.flesch_score / 10);
            const sentBar = data.sentiment_score >= 0
                ? '🟢'.repeat(Math.min(5, Math.round(data.sentiment_score / 20)))
                : '🔴'.repeat(Math.min(5, Math.round(Math.abs(data.sentiment_score) / 20)));

            const topWordsText = data.top_words?.length
                ? data.top_words.slice(0, 15).map((w: any, i: number) =>
                    `${String(i + 1).padStart(2)}. ${w.word.padEnd(15)} ${w.count}x`
                  ).join('\n')
                : 'N/A';

            const resultText =
                `📈 *Text Analysis Report*\n\n` +
                `━━━━━━ 📊 Counts ━━━━━━\n` +
                `📖 *Words:* ${data.total_words?.toLocaleString()} (${data.unique_words?.toLocaleString()} unique)\n` +
                `📝 *Characters:* ${data.total_chars?.toLocaleString()} (${data.chars_no_spaces?.toLocaleString()} no spaces)\n` +
                `📜 *Sentences:* ${data.sentences}\n` +
                `📄 *Paragraphs:* ${data.paragraphs}\n` +
                `🔤 *Syllables:* ${data.syllables?.toLocaleString()}\n` +
                `📏 *Avg word length:* ${data.avg_word_length} chars\n` +
                `📐 *Avg sentence length:* ${data.avg_sentence_length} words\n` +
                `🔠 *Complex words (>6 chars):* ${data.long_words}\n\n` +
                `━━━━━━ 📖 Readability ━━━━━━\n` +
                `📊 *Flesch Score:* ${data.flesch_score}/100\n` +
                `${fleschBar}\n` +
                `🎓 *Reading Level:* ${data.reading_level}\n` +
                `⏱️ *Reading Time:* ${data.reading_time}\n\n` +
                `━━━━━━ 😊 Sentiment ━━━━━━\n` +
                `${sentBar || '⬜⬜⬜⬜⬜'}\n` +
                `🎭 *Overall:* ${data.sentiment}\n` +
                `✅ *Positive words:* ${data.positive_words}\n` +
                `❌ *Negative words:* ${data.negative_words}\n\n` +
                `━━━━━━ 🏆 Top Keywords ━━━━━━\n` +
                `\`\`\`\n${topWordsText}\n\`\`\``;

            await sendResult(sock, chatId, channelInfo, message, resultText, `analysis_${id}.txt`);

        } catch (error: any) {
            await sock.sendMessage(chatId, {
                text: `❌ Analysis failed: ${error.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};
