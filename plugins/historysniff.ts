export default {
  command: 'chhistory',
  aliases: ['oldposts', 'chlist'],
  category: 'tools',
  description: 'Fetch IDs of previous channel posts',
  usage: '.chhistory <ChannelJID>',

  async handler(sock, message, args) {
    const chatId = message.key.remoteJid;
    const jid = args[0]

    await sock.sendMessage(chatId, { text: '📚 *Fetching channel history...*' });

    try {
      const result = await sock.query({
        tag: 'iq',
        attrs: {
          to: jid,
          type: 'get',
          xmlns: 'newsletter',
        },
        content: [
          {
            tag: 'messages',
            attrs: { type: 'updates', count: '15' }
          }
        ]
      });

      const messages = result.content?.[0]?.content || [];
      if (messages.length === 0) return await sock.sendMessage(chatId, { text: '📭 No history found.' });

      let list = `📂 *Recent Posts for:* ${jid}\n\n`;

      messages.forEach((node, index) => {
        const srvId = node.attrs?.server_id || node.attrs?.id;

        let txt = "Media/Image/Other";
        try {
          const msgData = node.content?.[0]?.content?.[0];
          txt = msgData?.content?.[0]?.content || "Post " + srvId;
        } catch(e: any) {}

        list += `${index + 1}. *Text:* ${txt.slice(0, 30)}...\n   *ID:* \`${srvId}\`\n\n`;
      });

      list += `*Usage:* .multitap ${jid} | [ID] | 🔥 | 100`;

      await sock.sendMessage(chatId, { text: list });

    } catch(err: any) {
      console.error(err);
      await sock.sendMessage(chatId, { text: '❌ Failed to fetch history. Check JID.' });
    }
  }
};
