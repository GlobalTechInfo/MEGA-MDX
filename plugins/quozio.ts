import fetch from 'node-fetch';

export default {
  command: 'qmaker',
  aliases: ['qmkr', 'quozio'],
  category: 'tools',
  description: 'Create a quote image from text or replied message',
  usage: '.qmaker <text> or reply to a message',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    let text = args?.join(' ')?.trim();

    try {
      if (!text) {
        const quotedText = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
        if (!quotedText) {
          return await sock.sendMessage(chatId, { text: '*Provide text or reply to a message to create a quote.*' }, { quoted: message });
        }
        text = quotedText;
      }

      const author = message.pushName || message?.key?.participant || 'Anonymous';

      const createRes = await fetch('https://quozio.com/api/v1/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: author,
          quote: text
        })
      });

      const quoteData = await createRes.json() as any;
      if (!quoteData?.quoteId) throw new Error('Quote creation failed');

      const quoteId = quoteData.quoteId;

      const templatesRes = await fetch('https://quozio.com/api/v1/templates');
      const templatesData = await templatesRes.json() as any;
      const templates = templatesData.data;

      if (!templates?.length) throw new Error('No templates found');

      const template = templates[Math.floor(Math.random() * templates.length)];

      const imageRes = await fetch(
        `https://quozio.com/api/v1/quotes/${quoteId}/imageUrls?templateId=${template.templateId}`
      );
      const imageData = await imageRes.json() as any;

      if (!imageData?.medium) throw new Error('Image generation failed');

      await sock.sendMessage(chatId, { image: { url: imageData.medium }, caption: `📝 Quote Created\n\nAuthor: ${author}\n\n${text}` }, { quoted: message });

    } catch(error: any) {
      console.error('Quote plugin error:', error);
      await sock.sendMessage(chatId, { text: '❌ Failed to create quote. Try again later.' }, { quoted: message });
    }
  }
};

