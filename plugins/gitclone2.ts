import axios from 'axios';

export default {
  command: 'gitclone2',
  aliases: ['githubdl2', 'clone2'],
  category: 'download',
  description: 'Download a GitHub repository as a ZIP file',
  usage: '.gitclone2 <github-link>',

  async handler(sock: any, message: any, args: any, context: any) {
    const { chatId } = context;
    const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;

    try {
      const link = args[0];

      if (!link) {
        return await sock.sendMessage(chatId, {
          text: `❌ *Missing Link!*\n\nExample: .gitclone2 https://github.com/GlobalTechInfo/MEGA-MD`
        }, { quoted: message });
      }

      if (!regex.test(link)) {
        return await sock.sendMessage(chatId, { text: '⚠️ *Invalid GitHub link!*' }, { quoted: message });
      }

      // eslint-disable-next-line prefer-const
      let [_, user, repo] = link.match(regex) || [];
      repo = repo.replace(/.git$/, '');

      const url = `https://api.github.com/repos/${user}/${repo}/zipball`;

      const { default: _axios } = await import('axios');
      const _response = _axios.head;
      const headRes = await axios.head(url);
      const contentDisposition = headRes.headers['content-disposition'];

      let filename = `${repo}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/attachment; filename=(.*)/);
        if (match) filename = match[1];
      }

      await sock.sendMessage(chatId, { text: `✳️ *Wait, sending repository...*` }, { quoted: message });

      await sock.sendMessage(chatId, {
        document: { url: url },
        fileName: filename,
        mimetype: 'application/zip',
        caption: `📦 *Repository:* ${user}/${repo}\n✨ *Cloned by MEGA-MD*`
      }, { quoted: message });

    } catch(err: any) {
      console.error('Gitclone Error:', err);
      await sock.sendMessage(chatId, { text: '❌ *Failed to download the repository.* Make sure it is public.' }, { quoted: message });
    }
  }
};
