import fetch from 'node-fetch';

export default {
  command: 'pokedex',
  aliases: ['pokemon', 'poke'],
  category: 'info',
  description: 'Get information about a Pokémon',
  usage: '.pokedex <pokemon name>',
  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const text = args.join(' ').trim();
    if (!text) {
      return await sock.sendMessage(chatId, {
        text: '*Please provide a Pokémon name to search for.*\nExample: `.pokedex pikachu`'
      }, { quoted: message });
    }

    try {
      const url = `https://some-random-api.com/pokemon/pokedex?pokemon=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const json = await res.json() as any as any;
      if (!res.ok) throw json.error || 'Unknown error';

      const messageText = `
*≡ Name:* ${json.name}
*≡ ID:* ${json.id}
*≡ Type:* ${Array.isArray(json.type) ? json.type.join(', ') : json.type}
*≡ Abilities:* ${Array.isArray(json.abilities) ? json.abilities.join(', ') : json.abilities}
*≡ Species:* ${Array.isArray(json.species) ? json.species.join(', ') : json.species}
*≡ Height:* ${json.height}
*≡ Weight:* ${json.weight}
*≡ Experience:* ${json.base_experience}
*≡ Description:* ${json.description}
      `.trim();
      await sock.sendMessage(chatId, { text: messageText, quoted: message });
    } catch(error: any) {
      console.error('Pokedex Command Error:', error);
      await sock.sendMessage(chatId, { text: `❌ Error: ${error}` }, { quoted: message });
    }
  }
};
