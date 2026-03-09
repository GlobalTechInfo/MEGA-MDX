import type { BotContext } from '../types.js';
import { dataFile } from '../lib/paths.js';
import fs from 'fs';

const chatState = new Map<string, { enabled: boolean; lastActivity: number }>();
const REPLIES_FILE = dataFile('autoreplies.json');

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const low = (s: string) => s.toLowerCase().trim();

function matches(text: string, patterns: (string | RegExp)[]): boolean {
    const t = low(text);
    return patterns.some(p => typeof p === 'string' ? t.includes(p) : p.test(t));
}

function loadCustomReplies(): { trigger: string; response: string; exactMatch: boolean }[] {
    try {
        if (fs.existsSync(REPLIES_FILE)) {
            const data = JSON.parse(fs.readFileSync(REPLIES_FILE, 'utf-8'));
            return data.replies || [];
        }
    } catch {}
    return [];
}

function checkCustomReply(text: string, name: string): string | null {
    const t = low(text);
    for (const r of loadCustomReplies()) {
        const trigger = r.trigger.toLowerCase();
        const hit = r.exactMatch ? t === trigger : t.includes(trigger);
        if (hit) return r.response.replace('{name}', name);
    }
    return null;
}

function tryMath(text: string): string | null {
    const expr = text.match(/[\d\s+\-*/.%()]+/)?.[0]?.trim();
    if (!expr || expr.length < 3) return null;
    try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr})`)();
        if (typeof result === 'number' && isFinite(result)) {
            const formatted = Number.isInteger(result) ? result : parseFloat(result.toFixed(6));
            return `🔢 *${expr.trim()} = ${formatted}*`;
        }
    } catch {}
    return null;
}

const KB: { patterns: (string | RegExp)[]; responses: string[] }[] = [
    {
        patterns: ['hello', 'hi ', 'hey ', 'heyy', 'helo', 'hii', 'hiii', 'good morning',
            'good evening', 'good afternoon', 'salam', 'assalam', 'asslam', 'walaikum',
            'namaste', 'namaskar', 'howdy', "what's up", 'whats up', 'yo ', 'greetings', 'hola'],
        responses: [
            "Hey! 👋 What's on your mind?",
            "Hello there! 😊 How can I help you today?",
            "Hi! Great to hear from you. What do you need?",
            "Hey hey! 🙌 What's up?",
            "Hello! Hope you're having a great day 🌟",
            "Walaikum Assalam! 🌙 How are you?",
            "Namaste! 🙏 How can I assist you?",
        ]
    },
    {
        patterns: ['how are you', 'how r u', 'how ru', 'hru', 'how do you do', 'you ok',
            'you good', 'u ok', 'u good', 'kaisa hai', 'kaisi ho', 'kaise ho', 'kya haal'],
        responses: [
            "I'm doing great, thanks for asking! 😄 What about you?",
            "Running at full speed! ⚡ How can I help?",
            "Better now that you're here! 😊",
            "All systems go! 🚀 What do you need?",
            "Mast hoon yaar! 😎 Tu bata?",
        ]
    },
    {
        patterns: ['who are you', 'what are you', 'your name', 'who made you', 'who created you',
            'who built you', 'are you a bot', 'are you human', 'are you ai', 'are you robot',
            'introduce yourself', 'tell me about yourself', 'tum kaun ho', 'aap kaun'],
        responses: [
            "I'm *MEGA MD* — your offline WhatsApp assistant built by *GlobalTechInfo* 🤖\nNo internet needed for chatting with me!",
            "I'm MEGA MD Bot! 💪 Created by *GlobalTechInfo*.\nFully offline — pure speed, zero API calls!",
            "MEGA MD at your service! 🫡 Built by *GlobalTechInfo*, running 24/7 just for you.",
        ]
    },
    {
        patterns: ['thank you', 'thanks', 'thankyou', 'thx', 'thnx', 'shukriya',
            'dhanyawad', 'thank u', 'thanks a lot', 'much appreciated'],
        responses: [
            "You're welcome! 😊 Anytime!",
            "No problem at all! 🙌",
            "Happy to help! 🌟",
            "My pleasure! 😄",
            "Koi baat nahi! 🙏 Always here for you!",
        ]
    },
    {
        patterns: ['bye', 'goodbye', 'good bye', 'see you', 'see ya', 'cya', 'take care',
            'ttyl', 'gotta go', 'khuda hafiz', 'allah hafiz', 'alvida', 'tata'],
        responses: [
            "Bye! Take care 👋",
            "See you later! 😊",
            "Goodbye! Come back soon 🌟",
            "Allah Hafiz! 🌙",
            "Take care! I'll be here when you need me 💙",
        ]
    },
    {
        patterns: ['good morning', 'gm ', 'morning everyone', 'sabah al khair', 'subah bakhair'],
        responses: [
            "Good morning! ☀️ Rise and shine! Hope your day is amazing!",
            "Good morning! 🌅 Today is a new chance to do something great!",
            "GM! ☀️ Grab that coffee and conquer the day! ☕💪",
            "Subah Bakhair! 🌄 May your day be filled with joy and success!",
        ]
    },
    {
        patterns: ['good night', 'gn ', 'goodnight', 'shab bakhair', 'going to sleep', 'sleeping now'],
        responses: [
            "Good night! 🌙 Sleep well and sweet dreams! 💤",
            "Shab Bakhair! 🌙✨ Rest well, tomorrow is a new day!",
            "GN! 😴 Don't let the bugs bite... unless you're a developer 😄",
        ]
    },
    {
        patterns: ['joke', 'tell me a joke', 'make me laugh', 'something funny', 'crack a joke'],
        responses: [
            "Why don't scientists trust atoms? Because they make up everything! 😂",
            "Why do programmers prefer dark mode? Because light attracts bugs! 🐛😂",
            "I told a joke about construction. I'm still working on it! 🏗️😂",
            "Why did the math book look sad? It had too many problems! 📚😢😂",
            "What do you call cheese that isn't yours? Nacho cheese! 🧀😂",
            "Why did the bicycle fall over? It was two-tired! 🚲😂",
            "What's a computer's favorite snack? Microchips! 💻😂",
            "What do you call a sleeping dinosaur? A dino-snore! 🦕😂",
        ]
    },
    {
        patterns: ['motivate me', 'motivation', 'inspire me', 'i am sad', 'feeling sad',
            'i feel sad', 'i need motivation', 'give up', 'i want to give up',
            'life is hard', 'i am struggling', 'encourage me', 'feeling low', 'i am depressed'],
        responses: [
            "💪 *Don't give up!*\nEvery expert was once a beginner. Every pro was once an amateur. Keep going!",
            "🌟 *You've got this!*\nThe fact that you're still trying makes you stronger than you think.",
            "🔥 *Believe in yourself!*\nYou have survived 100% of your worst days so far. That's a perfect score!",
            "🚀 *Hard times don't last.*\nTough people do. You're tougher than you know!",
            "💡 *Remember:*\nDiamonds are just coal that handled pressure extremely well. So can you!",
        ]
    },
    {
        patterns: ['fact', 'tell me a fact', 'random fact', 'did you know',
            'fun fact', 'something interesting', 'amaze me', 'teach me something'],
        responses: [
            "🧠 *Did you know?*\nHoney never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs still edible!",
            "🐙 *Amazing:*\nOctopuses have 3 hearts, blue blood, and 9 brains (1 central + 1 per arm)!",
            "⚡ *Tech fact:*\nThe first computer bug was an actual bug — a moth stuck in a Harvard computer in 1947!",
            "🌙 *Space fact:*\nA full NASA spacesuit costs $12 million. 70% of that is the backpack and control module!",
            "🐝 *Nature fact:*\nBees can recognize human faces using the same method humans do!",
            "📱 *Tech fact:*\nThe first SMS ever sent said 'Merry Christmas' — on December 3, 1992!",
            "🌍 *Did you know?*\nA day on Venus is longer than a year on Venus. It rotates incredibly slowly!",
        ]
    },
    {
        patterns: ['riddle', 'tell me a riddle', 'give me a riddle', 'brain teaser', 'puzzle me'],
        responses: [
            "🧩 *Riddle:*\nI speak without a mouth and hear without ears. I have no body but come alive with wind.\n_(Answer: An echo)_",
            "🧩 *Riddle:*\nThe more you take, the more you leave behind. What am I?\n_(Answer: Footsteps)_",
            "🧩 *Riddle:*\nI have cities but no houses, mountains but no trees, water but no fish.\n_(Answer: A map)_",
            "🧩 *Riddle:*\nWhat has hands but can't clap?\n_(Answer: A clock)_",
            "🧩 *Riddle:*\nWhat gets wetter as it dries?\n_(Answer: A towel)_",
        ]
    },
    {
        patterns: ['roast me', 'say something mean', 'insult me', 'roast karo', 'be mean'],
        responses: [
            "You asked for it! 😈 You're so slow, you'd lose a race to a parked car!",
            "If laziness was a sport, you'd still be too lazy to compete 😂",
            "I'd roast you harder but my mama said I can't burn trash 🔥😂",
            "You're the reason they put instructions on shampoo bottles 😂",
        ]
    },
    {
        patterns: ['compliment me', 'say something nice', 'praise me', 'be nice to me'],
        responses: [
            "You're literally the best thing since WiFi was invented! 🌟",
            "Your messages always brighten up this chat! ☀️",
            "You're smarter than you think and kinder than you know 🫶",
            "If awesomeness was a currency, you'd be a billionaire 💰✨",
        ]
    },
    {
        patterns: ['you are great', 'you are awesome', 'you are amazing', 'good bot', 'nice bot',
            'best bot', 'love you', 'i love you', 'you rock', 'well done', 'good job', 'superb'],
        responses: [
            "Aww thank you! 😊 You just made my day!",
            "That means a lot! 🥹 You're the best user ever!",
            "Stop it, you're making me blush! 😳",
            "Thanks! 💪 I try my best for you!",
        ]
    },
    {
        patterns: ['you are stupid', 'you are dumb', 'you are useless', 'bad bot',
            'worst bot', 'i hate you', 'hate you', 'shut up', 'you suck', 'useless bot'],
        responses: [
            "Ouch! 😅 I'm trying my best, I promise!",
            "That hurt! 😢 But I'll keep helping you anyway 💪",
            "Okay okay! Tell me what you actually need and I'll nail it 🎯",
        ]
    },
    {
        patterns: ['i am hungry', 'i am starving', 'what should i eat', 'food suggestion',
            'hungry', 'khana', 'khaana', 'suggest food', 'what to eat'],
        responses: [
            "🍕 Pizza is always the answer! Unless the question is 'what's healthy?' 😄",
            "How about some *Biryani*? 🍛 Never goes wrong!",
            "Try making *Maggi* — fast, easy, and hits different at midnight! 🍜",
            "Chai aur biscuit — the ultimate combo! ☕🍪",
        ]
    },
    {
        patterns: ['i am bored', 'feeling bored', 'nothing to do', 'entertain me', 'so bored'],
        responses: [
            "Bored? Try `.trivia` for a quiz! 🎯",
            "Play `.tictactoe` with someone in the group! 🎮",
            "Try `.joke` for some laughs! 😂",
            "How about `.8ball` — ask it a question! 🎱",
        ]
    },
    {
        patterns: ['health tips', 'fitness tips', 'how to lose weight', 'how to stay fit',
            'exercise tips', 'diet tips', 'be healthy'],
        responses: [
            "💪 Start with just 20 minutes of walking daily. Consistency beats intensity!",
            "🥗 Drink water before every meal. Reduces appetite and helps digestion!",
            "😴 Sleep 7-8 hours. Poor sleep ruins diet, exercise, and mental health!",
            "🏃 No gym? 30 pushups + 30 squats + 30 situps daily is a full workout!",
        ]
    },
    {
        patterns: ['study tips', 'how to study', 'i have exam', 'exam tips', 'i cant focus'],
        responses: [
            "📚 Use Pomodoro — 25 min study, 5 min break. Your brain absorbs more!",
            "✏️ Write notes by hand. Handwriting increases memory retention by 34%!",
            "💡 Phone in another room = 20% better concentration. Distance matters!",
            "🧠 Teach what you learned to someone else. If you can explain it, you know it!",
        ]
    },
    {
        patterns: ['mashallah', 'subhanallah', 'alhamdulillah', 'allahu akbar',
            'inshallah', 'bismillah', 'astaghfirullah', 'jazakallah'],
        responses: [
            "Alhamdulillah! 🤲 May Allah bless you!",
            "SubhanAllah! ✨ Glory be to Allah!",
            "Ameen! 🤲 May Allah accept our duas!",
            "JazakAllah Khair! 🌙 May Allah reward you!",
        ]
    },
    {
        patterns: ['i love you', 'i like you', 'will you marry me', 'be my girlfriend',
            'be my boyfriend', 'do you love me', 'can we date'],
        responses: [
            "Aww! 😳 I'm a bot though... but you're sweet!",
            "I appreciate that! But I'm an AI — my heart runs on code 💻❤️",
            "Ha! 😂 Save that love for a real human!",
        ]
    },
    {
        patterns: ['sorry', 'i am sorry', 'my bad', 'forgive me', 'apologies', 'maafi'],
        responses: [
            "No worries at all! 😊",
            "All good! 👍 No need to apologize!",
            "Koi baat nahi! 🙏 All forgiven!",
        ]
    },
    {
        patterns: ['test', 'ping', 'you there', 'are you there', 'you awake', 'online', 'active'],
        responses: [
            "Pong! 🏓 I'm here and ready!",
            "Online and fully operational! ✅",
            "Active and ready! ⚡",
        ]
    },
    {
        patterns: ['how to make money', 'money tips', 'how to earn', 'save money', 'paise kaise kamaye'],
        responses: [
            "💰 Spend less than you earn. Sounds simple, but it's the foundation of wealth!",
            "📈 Start small. Even saving ₹100/day = ₹36,500/year. Consistency beats amount!",
            "🚀 Build skills. The fastest way to earn more is to become more valuable!",
        ]
    },
    {
        patterns: [/^(yes|no|yeah|nah|nope|yep|yup|sure|ok|okay|hmm|hm)$/],
        responses: [
            "Got it! 👍 Anything else?",
            "Okay! 😊 What else can I help with?",
            "Cool! 🙌 What's next?",
        ]
    },
];

function getResponse(text: string, senderName: string): string {
    const t = low(text);

    const custom = checkCustomReply(text, senderName);
    if (custom) return custom;

    if (/what.?time|current time|time (is it|now|please)|time batao|time kya/.test(t)) {
        const now = new Date();
        return `🕐 *Current Time:* ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}\n📅 *Date:* ${now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    }

    if (/what.?date|today.?date|current date|aaj ki date|which day|what day/.test(t)) {
        const now = new Date();
        return `📅 *Today is:* ${now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    }

    const bornMatch = t.match(/born in (\d{4})|birth year.?(\d{4})/);
    if (bornMatch) {
        const year = parseInt(bornMatch[1] || bornMatch[2], 10);
        const age = new Date().getFullYear() - year;
        if (age > 0 && age < 150) return `🎂 If you were born in *${year}*, you are *${age} years old* in ${new Date().getFullYear()}!`;
    }

    if (/\d.*[+\-*/].*\d/.test(t)) {
        const math = tryMath(t);
        if (math) return math;
    }

    for (const entry of KB) {
        if (matches(text, entry.patterns)) {
            return pick(entry.responses).replace('{name}', senderName);
        }
    }

    return pick([
        `Hmm, I'm not sure about that! 🤔 Try asking differently.`,
        "I didn't quite catch that! Could you rephrase? 🙏",
        "That's beyond me right now! Try \`.chatbot\` for AI-powered answers 🤖",
        `Sorry ${senderName}, I didn't get that. Type \`.menu\` for available commands!`,
    ]);
}

export default {
    command: 'localbot',
    aliases: ['lbot', 'offlinebot', 'localai', 'lb'],
    category: 'ai',
    description: 'Built-in offline chatbot — no internet, no API, instant responses',
    usage: '${prefix}localbot on/off\n${prefix}localbot <message>',

    async handler(sock: any, message: any, args: any[], context: BotContext) {
        const { chatId, channelInfo, senderId } = context;
        const senderName = (message.pushName || senderId.split('@')[0] || 'there').split(' ')[0];
        const sub = args[0]?.toLowerCase();

        if (sub === 'on') {
            chatState.set(chatId, { enabled: true, lastActivity: Date.now() });
            return await sock.sendMessage(chatId, {
                text: `🤖 *Local Bot Activated!*\n\n` +
                      `I'm now listening in this chat.\n` +
                      `Just type anything and I'll respond!\n\n` +
                      `_Fully offline • No API • Instant replies_\n\n` +
                      `Type \`.localbot off\` to deactivate.`,
                ...channelInfo
            }, { quoted: message });
        }

        if (sub === 'off') {
            chatState.delete(chatId);
            return await sock.sendMessage(chatId, {
                text: `🤖 Local Bot *deactivated*.\nUse \`.localbot on\` to reactivate.`,
                ...channelInfo
            }, { quoted: message });
        }

        if (sub === 'status') {
            const state = chatState.get(chatId);
            return await sock.sendMessage(chatId, {
                text: `🤖 Local Bot: ${state?.enabled ? '🟢 *Active*' : '🔴 *Inactive*'}`,
                ...channelInfo
            }, { quoted: message });
        }

        const userText = args.join(' ').trim();
        if (!userText) {
            const state = chatState.get(chatId);
            return await sock.sendMessage(chatId, {
                text: `🤖 *MEGA MD Local Bot*\n\n` +
                      `_Zero API • Fully Offline • Instant_\n\n` +
                      `*Chat directly:*\n` +
                      `\`.localbot hello\`\n` +
                      `\`.localbot tell me a joke\`\n` +
                      `\`.localbot motivate me\`\n` +
                      `\`.localbot what time is it\`\n` +
                      `\`.localbot 25 * 4\`\n\n` +
                      `*Auto-reply mode:*\n` +
                      `\`.localbot on\` — respond to ALL messages in this chat\n` +
                      `\`.localbot off\` — stop\n\n` +
                      `*Status:* ${state?.enabled ? '🟢 Active' : '🔴 Inactive'}`,
                ...channelInfo
            }, { quoted: message });
        }

        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
        await sock.sendPresenceUpdate('paused', chatId);

        await sock.sendMessage(chatId, {
            text: getResponse(userText, senderName),
            ...channelInfo
        }, { quoted: message });
    }
};

export async function handleLocalBotMessage(
    sock: any,
    message: any,
    chatId: string,
    text: string,
    senderId: string,
    channelInfo: any
): Promise<boolean> {
    const state = chatState.get(chatId);
    if (!state?.enabled) return false;
    if (!text || /^[.!/]/.test(text.trim())) return false;
    if (Date.now() - state.lastActivity > 86400000) { chatState.delete(chatId); return false; }
    state.lastActivity = Date.now();
    try {
        const senderName = (message.pushName || senderId.split('@')[0] || 'there').split(' ')[0];
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));
        await sock.sendPresenceUpdate('paused', chatId);
        await sock.sendMessage(chatId, { text: getResponse(text, senderName), ...channelInfo }, { quoted: message });
    } catch {}
    return true;
}
