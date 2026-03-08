import type { BotContext } from '../types.js';
import { promises as fs } from 'fs';
import path from 'path';

export default {
  command: 'getfile',
  aliases: ['readfile', 'viewfile'],
  category: 'owner',
  description: 'Read and display file contents from bot directory',
  usage: '.getfile <filename>',
  ownerOnly: 'true',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const chatId = context.chatId || message.key.remoteJid;
    const filename = args.join(' ').trim();

    try {
      if (!filename) {
        return await sock.sendMessage(chatId, {
          text: `*📄 Get File*\n\n*Usage:*\n.getfile <filename>\n\n*Examples:*\n• .getfile index.js\n• .getfile plugins/ping.js\n• .getfile settings.js\n• .getfile package.json`
        }, { quoted: message });
      }

      // Check project root first, then dist/ for compiled files
      let filePath = path.join(process.cwd(), filename);
      try {
        await fs.access(filePath);
      } catch {
        // Try dist/ for .js files
        const distPath = path.join(process.cwd(), 'dist', filename);
        try {
          await fs.access(distPath);
          filePath = distPath;
        } catch { /* will fail below */ }
      }

      try {
        await fs.access(filePath);
      } catch {
        return await sock.sendMessage(chatId, {
          text: `❌ *File not found!*\n\nNo file named "${filename}" exists.\n\n*Tip:* Use relative path from bot root directory.`
        }, { quoted: message });
      }

      const fileContent = await fs.readFile(filePath, 'utf8');

      if (!fileContent || fileContent.length === 0) {
        return await sock.sendMessage(chatId, {
          text: `⚠️ *File is empty*\n\nThe file "${filename}" has no content.`
        }, { quoted: message });
      }

      if (fileContent.length > 60000) {
        return await sock.sendMessage(chatId, {
          text: `❌ *File too large!*\n\nThe file "${filename}" is too large to display (${Math.round(fileContent.length / 1024)}KB).\n\n*Limit:* 60KB\n\n*Tip:* Use a file manager or split the file.`
        }, { quoted: message });
      }

      const stats = await fs.stat(filePath);
      const fileSize = (stats.size / 1024).toFixed(2);
      const lastModified = stats.mtime.toLocaleString();

      const caption = `📄 *File: ${filename}*\n\n` +
                     `📊 *Size:* ${fileSize} KB\n` +
                     `📅 *Modified:* ${lastModified}\n` +
                     `📝 *Lines:* ${fileContent.split('\n').length}\n\n` +
                     `\`\`\`${fileContent}\`\`\``;

      await sock.sendMessage(chatId, {
        text: caption
      }, { quoted: message });

    } catch(error: any) {
      console.error('GetFile Error:', error);

      await sock.sendMessage(chatId, {
        text: `❌ *Error reading file*\n\n*Error:* ${error.message}\n\n*Possible reasons:*\n• File is corrupted\n• No read permissions\n• Invalid file path`
      }, { quoted: message });
    }
  }
};
