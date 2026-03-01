export default {
  command: 'getpp',
  aliases: ['dlpp', 'profilepic', 'getdp'],
  category: 'general',
  description: 'Get user profile picture',
  usage: '.getpp @user or reply or number',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    let target;
    let displayName = 'Unknown';
    let displayNumber = '';

    const quoted = message.message?.extendedTextMessage?.contextInfo;
    
    if (quoted?.mentionedJid?.[0]) {
      target = quoted.mentionedJid[0];
    } else if (quoted?.participant) {
      target = quoted.participant;
      if (quoted.pushName) displayName = quoted.pushName;
    } else if (args[0]) {
      const input = args[0].replace(/[^0-9]/g, '');
      if (input.length >= 10) {
        target = input + '@s.whatsapp.net';
      } else {
        return await sock.sendMessage(chatId, { 
          text: '❌ Invalid number. Use format: 923051234567 or +923051234567' 
        }, { quoted: message });
      }
    } else {
      target = message.key.participant || message.key.remoteJid;
    }

    try {
      let realJid = target;

      if (target.endsWith('@lid') && isGroup) {
        const metadata = await sock.groupMetadata(chatId);
        const participant = metadata.participants.find(p => p.lid === target || p.id === target);
        if (participant?.id) {
           realJid = participant.id;
        }
      }

      const cleanNumber = realJid.replace(/@s\.whatsapp\.net|@lid/g, '').split(':')[0];
      displayNumber = `+${cleanNumber}`;

      if (displayName === 'Unknown') {
        try {
          const name = await sock.getName(realJid);
          if (name && !name.startsWith('+')) displayName = name;
        } catch(e: any) {}
      }

      let ppUrl = null;
      try {
        ppUrl = await sock.profilePictureUrl(realJid, 'image');
      } catch(e: any) {
        return await sock.sendMessage(chatId, { 
          text: `❌ No profile picture found for *${displayName}* (${displayNumber})` 
        }, { quoted: message });
      }

      if (ppUrl) {
        await sock.sendMessage(chatId, { 
          image: { url: ppUrl },
          caption: `📸 *Profile Picture*\n\n👤 *Name:* ${displayName}\n📱 *Number:* ${displayNumber}`
        }, { quoted: message });
      }

    } catch(error: any) {
      console.error('GetPP Error:', error);
      await sock.sendMessage(chatId, { 
        text: '❌ Failed to fetch profile picture.' 
      }, { quoted: message });
    }
  }
};
