export default {
  command: 'bfdecode',
  aliases: ['brun', 'bfread'],
  category: 'tools',
  description: 'Decode/Run Brainfuck code',
  usage: 'Reply to BF code with .bfdecode',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;

    try {
      let code = args?.join('') || "";

      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (quoted) {
        code = quoted.conversation || 
               quoted.extendedTextMessage?.text || 
               quoted.imageMessage?.caption || 
               quoted.videoMessage?.caption || 
               "";
      }

      code = code.trim();

      if (!code) {
        return await sock.sendMessage(chatId, { text: '*Please reply to a Brainfuck code or provide it after the command.*' }, { quoted: message });
      }

      const bf = code.replace(/[^><+\-.,[\]]/g, '');
      const tape = new Uint8Array(30000);
      let ptr = 0, pc = 0, output = "", steps = 0;
      const maxSteps = 100000;

      while (pc < bf.length && steps < maxSteps) {
        const char = bf[pc];
        if (char === '>') ptr++;
        else if (char === '<') ptr--;
        else if (char === '+') tape[ptr]++;
        else if (char === '-') tape[ptr]--;
        else if (char === '.') output += String.fromCharCode(tape[ptr]);
        else if (char === '[') {
          if (tape[ptr] === 0) {
            let depth = 1;
            while (depth > 0) {
              pc++;
              if (bf[pc] === '[') depth++;
              if (bf[pc] === ']') depth--;
            }
          }
        } else if (char === ']') {
          if (tape[ptr] !== 0) {
            let depth = 1;
            while (depth > 0) {
              pc--;
              if (bf[pc] === ']') depth++;
              if (bf[pc] === '[') depth--;
            }
          }
        }
        pc++;
        steps++;
      }

      await sock.sendMessage(chatId, { text: `*🔓 Decoded Result:* \n\n${output || "_No output generated_"}` }, { quoted: message });

    } catch(err: any) {
      console.error('BF Error:', err);
      await sock.sendMessage(chatId, { text: '❌ Error reading quoted message.' });
    }
  }
};

