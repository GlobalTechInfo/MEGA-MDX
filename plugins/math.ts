import type { BotContext } from '../types.js';
const mathGames = {};

const modes = {
  noob: [-3, 3, -3, 3, '+-', 15000],
  easy: [-10, 10, -10, 10, '*/+-', 20000],
  normal: [-40, 40, -20, 20, '*/+-', 40000],
  hard: [-100, 100, -70, 70, '*/+-', 60000],
  extreme: [-999999, 999999, -999999, 999999, '*/', 99999],
  impossible: [-99999999999, 99999999999, -99999999999, 999999999999, '*/', 30000],
  impossible2: [-999999999999999, 999999999999999, -999, 999, '/', 30000],
};

const operators = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷',
};

export default {
  command: 'math',
  aliases: ['maths', 'ganit'],
  category: 'games',
  description: 'Solve math problems',
  usage: '.math',

  async handler(sock, message, args) {
    const chatId = message.key.remoteJid;

    if (mathGames[chatId]) {
      return sock.sendMessage(chatId, { text: '⚠️ Solve the current problem first!' }, { quoted: mathGames[chatId].msg });
    }

    const mode = args[0]?.toLowerCase();
    if (!mode || !(mode in modes)) {
      return sock.sendMessage(chatId, {
        text: `🧮 *Available Difficulties:*\n\n${Object.keys(modes).join(' | ')}\n\n_Example: .math normal_`
      }, { quoted: message });
    }

    const math = genMath(mode);
    const text = `▢ HOW MUCH IS IT *${math.str}*=\n\n_Time:_ ${(math.time / 1000).toFixed(2)} seconds`;

    const sentMsg = await sock.sendMessage(chatId, { text }, { quoted: message });

    mathGames[chatId] = {
      msg: sentMsg,
      math,
      attempts: 4,
      timeout: setTimeout(() => {
        if (mathGames[chatId]) {
          sock.sendMessage(chatId, { text: `⏳ *Time is up!*\nThe answer was: *${math.result}*` }, { quoted: mathGames[chatId].msg });
          delete mathGames[chatId];
        }
      }, math.time)
    };

    if (!this.initialized) {
      this.initialized = true;
      sock.ev.on('messages.upsert', async (upsert) => {
        const m = upsert.messages[0];
        if (!m.message || m.key.fromMe) return;

        const chat = m.key.remoteJid;
        if (!mathGames[chat]) return;

        const body = (m.message.conversation || m.message.extendedTextMessage?.text || "").trim();
        if (!/^-?[0-9]+(\.[0-9]+)?$/.test(body)) return;

        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
        if (!/^▢ HOW MUCH IS IT/i.test(quotedText)) return;

        const game = mathGames[chat];
        if (body === game.math.result) {
          clearTimeout(game.timeout);
          delete mathGames[chat];
          await sock.sendMessage(chat, { text: `✅ *Correct answer!*\n\nYou won the game.` }, { quoted: m });
        } else {
          game.attempts--;
          if (game.attempts <= 0) {
            clearTimeout(game.timeout);
            delete mathGames[chat];
            await sock.sendMessage(chat, { text: `❌ *Game Over!*\n\nThe correct answer was: *${game.math.result}*` }, { quoted: m });
          } else {
            await sock.sendMessage(chat, { text: `❎ *Wrong answer!*\n\nYou have ${game.attempts} attempts left.` }, { quoted: m });
          }
        }
      });
    }
  }
};

function genMath(mode) {
  const [a1, a2, b1, b2, ops, time] = modes[mode];
  let a = randomInt(a1, a2);
  const b = randomInt(b1, b2);
  const op = pickRandom([...ops]);
  let result = new Function(`return ${a} ${op.replace('/', '*')} ${b < 0 ? `(${b})` : b}`)();
  if (op === '/') [a, result] = [result, a];
  return { str: `${a} ${operators[op]} ${b}`, mode, time, result };
}

function randomInt(from, to) {
  if (from > to) [from, to] = [to, from];
  return Math.floor(Math.random() * (Math.floor(to) - Math.ceil(from) + 1) + Math.ceil(from));
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
  }

