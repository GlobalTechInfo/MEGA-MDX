#!/usr/bin/env python3
"""
MEGA-MD Local Chatbot Engine
Zero API, zero RAM overhead, fully offline.
Usage: python3 localbot.py <message> [sender_name] [replies_json_path]
"""
import sys
import json
import re
import random
import os
import time
import math

# ── Utilities ─────────────────────────────────────────────────
def clean(text: str) -> str:
    return text.lower().strip()

def pick(arr: list) -> str:
    return random.choice(arr)

def match(text: str, patterns: list) -> bool:
    t = clean(text)
    for p in patterns:
        if isinstance(p, str):
            if p in t:
                return True
        elif hasattr(p, 'search'):
            if p.search(t):
                return True
    return False

# ── Knowledge Base ────────────────────────────────────────────
RESPONSES = {

    # ── Greetings ──────────────────────────────────────────────
    'greeting': {
        'patterns': ['hello', 'hi ', 'hey ', 'heyy', 'helo', 'hii', 'hiii',
                     'good morning', 'good evening', 'good afternoon', 'good night',
                     'salam', 'assalam', 'asslam', 'walaikum', 'namaste', 'namaskar',
                     'howdy', 'sup ', "what's up", 'whats up', 'yo ', 'greetings',
                     'salut', 'bonjour', 'hola', 'ciao', 'ola'],
        'responses': [
            "Hey! 👋 What's on your mind?",
            "Hello there! 😊 How can I help you today?",
            "Hi! Great to hear from you. What do you need?",
            "Hey hey! 🙌 What's up?",
            "Yo! 👊 What can I do for you?",
            "Hello! Hope you're having a great day 🌟",
            "Hi there! Ready to help 💪",
            "Walaikum Assalam! 🌙 How are you?",
            "Namaste! 🙏 How can I assist you?",
        ]
    },

    # ── How are you ────────────────────────────────────────────
    'howareyou': {
        'patterns': ['how are you', 'how r u', 'how ru', 'hru', 'how do you do',
                     'how are u', 'hows you', "how's you", "how're you",
                     'you ok', 'you good', 'you alright', 'u ok', 'u good',
                     'kaisa hai', 'kaisi ho', 'kaise ho', 'kya haal', 'sab theek'],
        'responses': [
            "I'm doing great, thanks for asking! 😄 What about you?",
            "Running at full speed! ⚡ How can I help?",
            "Better now that you're here! 😊",
            "All systems go! 🚀 What do you need?",
            "Fantastic as always! 🌟 How about you?",
            "Mast hoon yaar! 😎 Tu bata?",
            "Perfectly fine, thank you! 😊 What's on your mind?",
        ]
    },

    # ── Bot identity ───────────────────────────────────────────
    'whoami': {
        'patterns': ['who are you', 'what are you', 'your name', 'who made you',
                     'who created you', 'who built you', 'who is your creator',
                     'what is your name', "what's your name", 'aap kaun',
                     'introduce yourself', 'tell me about yourself', 'about you',
                     'are you a bot', 'are you human', 'are you real', 'are you ai',
                     'are you robot', 'tum kaun ho'],
        'responses': [
            "I'm MEGA MD — your WhatsApp assistant built by *GlobalTechInfo* 🤖\nI'm fully offline, no internet needed for chatting with me!",
            "I'm MEGA MD Bot! 💪 Created by *GlobalTechInfo*.\nI run completely offline — no API calls, pure speed!",
            "MEGA MD at your service! 🫡\nBuilt by *GlobalTechInfo*, running 24/7 just for you.",
            "I'm an AI-powered WhatsApp bot named *MEGA MD* 🤖\nMy creator is *GlobalTechInfo* — and I'm proud of it!",
        ]
    },

    # ── Age / version ──────────────────────────────────────────
    'age': {
        'patterns': ['how old are you', 'your age', 'when were you born',
                     'when were you created', 'your version', 'which version'],
        'responses': [
            "I was born when *GlobalTechInfo* first dreamed of making the best WhatsApp bot 😄\nVersion: MEGA MD v6.0 🚀",
            "Age is just a number for bots! 😄 I'm on version *MEGA MD v6.0*",
            "Born in the cloud, raised in WhatsApp! 🌩️ Running v6.0",
        ]
    },

    # ── Compliments to bot ─────────────────────────────────────
    'compliment_received': {
        'patterns': ['you are great', 'you are awesome', 'you are amazing', 'you are good',
                     'good bot', 'nice bot', 'best bot', 'love you', 'i love you',
                     'you are the best', 'ur great', 'ur awesome', 'well done',
                     'good job', 'nice work', 'you are cool', 'you are smart',
                     'you are perfect', 'you are beautiful', 'you are handsome',
                     'you rock', 'superb', 'excellent bot', 'brilliant'],
        'responses': [
            "Aww thank you! 😊 You just made my day!",
            "That means a lot! 🥹 You're the best user ever!",
            "Stop it, you're making me blush! 😳",
            "Thanks! 💪 I try my best for you!",
            "You're too kind! 🫶 Now tell me, what can I do for you?",
            "❤️ Love you too! Now let's get things done!",
            "You're sweet! 🍬 I'll keep working hard for you!",
        ]
    },

    # ── Insults to bot ─────────────────────────────────────────
    'insult_received': {
        'patterns': ['you are stupid', 'you are dumb', 'you are useless', 'you are bad',
                     'bad bot', 'worst bot', 'i hate you', 'hate you', 'shut up',
                     'you are trash', 'you are garbage', 'idiot bot', 'stupid bot',
                     'dumb bot', 'you suck', 'rubbish', 'you are nothing',
                     'you are fake', 'useless bot'],
        'responses': [
            "Ouch! 😅 I'm trying my best, I promise!",
            "That hurt! 😢 But I'll keep helping you anyway 💪",
            "Fair enough! Let me know how I can do better 🙏",
            "I may not be perfect but I'm trying! 😄",
            "Okay okay! Tell me what you actually need and I'll nail it 🎯",
            "Noted! 📝 Working on improvements. Got a suggestion?",
        ]
    },

    # ── Thanks ─────────────────────────────────────────────────
    'thanks': {
        'patterns': ['thank you', 'thanks', 'thankyou', 'thx', 'ty ', 'thnx',
                     'thnks', 'shukriya', 'dhanyawad', 'shukriyah', 'thank u',
                     'thanks a lot', 'many thanks', 'much appreciated', 'appreciate it'],
        'responses': [
            "You're welcome! 😊 Anytime!",
            "No problem at all! 🙌",
            "Happy to help! 🌟",
            "Anytime! That's what I'm here for 💪",
            "My pleasure! 😄",
            "Koi baat nahi! 🙏 Always here for you!",
            "Don't mention it! 😊",
        ]
    },

    # ── Bye ────────────────────────────────────────────────────
    'bye': {
        'patterns': ['bye', 'goodbye', 'good bye', 'see you', 'see ya', 'cya',
                     'take care', 'later', 'ttyl', 'talk to you later', 'gotta go',
                     'i am leaving', 'leaving now', 'khuda hafiz', 'allah hafiz',
                     'alvida', 'tata', 'ta ta'],
        'responses': [
            "Bye! Take care 👋",
            "See you later! 😊",
            "Goodbye! Come back soon 🌟",
            "Allah Hafiz! 🌙",
            "Take care! I'll be here when you need me 💙",
            "Bye bye! 👋 Have a great day!",
            "Later! 😎 Stay safe!",
        ]
    },

    # ── Time ───────────────────────────────────────────────────
    'time': {
        'patterns': ['what time is it', 'current time', 'what is the time',
                     "what's the time", 'time please', 'time batao', 'time kya hai',
                     'tell me the time', 'time now'],
        'responses': ['__TIME__']
    },

    # ── Date ───────────────────────────────────────────────────
    'date': {
        'patterns': ['what is the date', "what's the date", 'today date',
                     'current date', 'date today', 'aaj ki date', 'date kya hai',
                     'what day is today', 'which day is today', 'today is what day'],
        'responses': ['__DATE__']
    },

    # ── Math ───────────────────────────────────────────────────
    'math': {
        'patterns': [re.compile(r'\d+\s*[\+\-\*\/\%]\s*\d')],
        'responses': ['__MATH__']
    },

    # ── Age calculator ─────────────────────────────────────────
    'born': {
        'patterns': [re.compile(r'born in \d{4}'), re.compile(r'i was born in \d{4}'),
                     re.compile(r'my birth year is \d{4}')],
        'responses': ['__AGE_CALC__']
    },

    # ── Jokes ──────────────────────────────────────────────────
    'joke': {
        'patterns': ['joke', 'tell me a joke', 'make me laugh', 'funny',
                     'something funny', 'make me smile', 'joking', 'humor',
                     'comedy', 'lol', 'haha', 'lmao', 'crack a joke'],
        'responses': [
            "Why don't scientists trust atoms? Because they make up everything! 😂",
            "I told my wife she was drawing her eyebrows too high. She looked surprised. 😄",
            "Why did the scarecrow win an award? He was outstanding in his field! 🌾😂",
            "I'm reading a book about anti-gravity. It's impossible to put down! 📚😂",
            "Why do programmers prefer dark mode? Because light attracts bugs! 🐛😂",
            "What do you call a fake noodle? An impasta! 🍝😂",
            "Why can't you give Elsa a balloon? Because she'll let it go! 🎈😂",
            "I told a joke about construction. I'm still working on it! 🏗️😂",
            "Why did the math book look sad? It had too many problems! 📚😢😂",
            "What do you call a sleeping dinosaur? A dino-snore! 🦕😂",
            "Why don't eggs tell jokes? They'd crack each other up! 🥚😂",
            "I used to hate facial hair, but then it grew on me! 😂",
            "What's a computer's favorite snack? Microchips! 💻😂",
            "Why did the bicycle fall over? It was two-tired! 🚲😂",
            "What do you call cheese that isn't yours? Nacho cheese! 🧀😂",
        ]
    },

    # ── Roasts ─────────────────────────────────────────────────
    'roast': {
        'patterns': ['roast me', 'say something mean', 'insult me', 'talk trash',
                     'be mean', 'roast karo', 'gaali do'],
        'responses': [
            "You asked for it! 😈 You're so slow, you'd lose a race to a parked car!",
            "If laziness was a sport, you'd still be too lazy to compete 😂",
            "You're not stupid, you just have bad luck thinking 😅",
            "I'd roast you harder but my mama said I can't burn trash 🔥😂",
            "You're the reason they put instructions on shampoo bottles 😂",
            "I'd call you a fool but that would be an insult to fools everywhere 😄",
        ]
    },

    # ── Compliment user ────────────────────────────────────────
    'compliment_user': {
        'patterns': ['compliment me', 'say something nice', 'flatter me',
                     'praise me', 'say nice things', 'be nice to me'],
        'responses': [
            "You're literally the best thing since WiFi was invented! 🌟",
            "You have the energy of someone who charges their phone to 100% every night 😄💪",
            "Your messages always brighten up this chat! ☀️",
            "You're smarter than you think and kinder than you know 🫶",
            "If awesomeness was a currency, you'd be a billionaire 💰✨",
            "You make this group 10x better just by being here! 🙌",
        ]
    },

    # ── Motivational ───────────────────────────────────────────
    'motivation': {
        'patterns': ['motivate me', 'motivation', 'inspire me', 'i am sad',
                     'i am depressed', 'feeling low', 'feeling sad', 'i feel sad',
                     'i need motivation', 'i am tired', 'give up', 'i want to give up',
                     'life is hard', 'everything is wrong', 'i am struggling',
                     'need encouragement', 'encourage me'],
        'responses': [
            "💪 *Don't give up!*\nEvery expert was once a beginner. Every pro was once an amateur. Keep going!",
            "🌟 *You've got this!*\nThe fact that you're still trying makes you stronger than you think.",
            "🚀 *Hard times don't last.*\nTough people do. You're tougher than you know!",
            "🌈 *After every storm comes sunshine.*\nHold on, better days are coming your way!",
            "💡 *Remember:*\nDiamond are just coal that handled pressure extremely well. So can you!",
            "🔥 *Believe in yourself!*\nYou have survived 100% of your worst days so far. That's a perfect score!",
            "❤️ *It's okay to feel low sometimes.*\nThat just means you care. Rest if you need to, but don't quit!",
        ]
    },

    # ── Love / relationships ───────────────────────────────────
    'love': {
        'patterns': ['i love you', 'i like you', 'will you marry me', 'be my girlfriend',
                     'be my boyfriend', 'i have crush on you', 'you are cute',
                     'can we date', 'do you love me', 'do you like me'],
        'responses': [
            "Aww! 😳 I'm a bot though... but you're sweet!",
            "I appreciate that! But I'm an AI — my heart runs on code 💻❤️",
            "That's really sweet! Unfortunately I'm already married to my codebase 😄",
            "Ha! 😂 You're charming! But I'm just a bot, save that love for a real human!",
            "I like you too... as a user! 😄 Best relationship ever!",
        ]
    },

    # ── Food ───────────────────────────────────────────────────
    'food': {
        'patterns': ['i am hungry', 'i am starving', 'what should i eat',
                     'food suggestion', 'hungry', 'khana', 'khaana', 'suggest food',
                     'what to eat', 'recipe', 'cook something'],
        'responses': [
            "🍕 Pizza is always the answer! Unless the question is 'what's healthy?' 😄",
            "How about some *Biryani*? 🍛 Never goes wrong!",
            "Try making *Maggi* — fast, easy, and hits different at midnight! 🍜",
            "Order something spicy! 🌶️ Life's too short for bland food!",
            "A good *sandwich* never disappoints! 🥪 Add some cheese and you're set!",
            "Chai aur biscuit — the ultimate combo! ☕🍪",
            "Have you tried cooking *pasta*? Quick, easy, delicious! 🍝",
        ]
    },

    # ── Weather ────────────────────────────────────────────────
    'weather_ask': {
        'patterns': ['how is the weather', 'weather today', 'is it raining',
                     'will it rain', 'weather forecast', 'mausam kaisa hai'],
        'responses': [
            "I can't check live weather, but use `.weather <city>` command for real-time weather! 🌤️",
            "Try `.weather London` or `.weather Mumbai` for live weather data! 🌦️",
            "I don't have live weather access here, but the `.weather` command can check it for you! ⛅",
        ]
    },

    # ── Help ───────────────────────────────────────────────────
    'help': {
        'patterns': ['help', 'what can you do', 'commands', 'how to use',
                     'features', 'what do you do', 'guide me', 'tutorial',
                     'how does this work', 'menu'],
        'responses': [
            "I'm MEGA MD Bot! Here's what I can do:\n\n📋 Type `.menu` for full command list\n🤖 Chat with me anytime using `.localbot`\n🌤️ `.weather <city>` for weather\n🎵 `.song <name>` for music\n📖 `.quran` for Quran verses\n💊 `.medicine` for drug info\n🎬 `.movie` for film info\n\nJust ask me anything! 😊",
            "Use `.menu` to see all 260+ commands! 🚀\nOr just chat with me — I understand most things!",
        ]
    },

    # ── Bored ──────────────────────────────────────────────────
    'bored': {
        'patterns': ['i am bored', 'i feel bored', 'nothing to do', 'bore ho gaya',
                     'entertain me', 'boredom', 'so bored', 'very bored'],
        'responses': [
            "Bored? Try `.trivia` for a quiz! 🎯",
            "Play `.tictactoe` with someone in the group! 🎮",
            "Ask me a riddle and I'll try to answer! 🧩",
            "Try `.joke` for some laughs! 😂",
            "Read some `.quran` verses — always a good use of time! 📖",
            "Challenge someone to `.tictactoe`! Or try `.8ball` with a question 🎱",
            "How about we play 20 questions? You think of something and I'll guess! 🤔",
        ]
    },

    # ── Good morning/night special ─────────────────────────────
    'goodmorning': {
        'patterns': ['good morning', 'gm ', 'morning everyone', 'subah', 'sabah al khair'],
        'responses': [
            "Good morning! ☀️ Rise and shine! Hope your day is as amazing as you are!",
            "Good morning! 🌅 Today is a new chance to do something great!",
            "Subah Bakhair! 🌄 May your day be filled with joy and success!",
            "GM! ☀️ Grab that coffee and conquer the day! ☕💪",
        ]
    },

    'goodnight': {
        'patterns': ['good night', 'gn ', 'goodnight', 'night everyone', 'shab bakhair',
                     'going to sleep', 'i am sleeping', 'sleeping now'],
        'responses': [
            "Good night! 🌙 Sleep well and sweet dreams! 💤",
            "Shab Bakhair! 🌙✨ Rest well, tomorrow is a new day!",
            "GN! 😴 Don't let the bugs bite... unless you're a developer 😄",
            "Sweet dreams! 🌟 See you when the sun is up!",
        ]
    },

    # ── Random facts ───────────────────────────────────────────
    'fact': {
        'patterns': ['fact', 'tell me a fact', 'random fact', 'did you know',
                     'interesting fact', 'fun fact', 'something interesting',
                     'teach me something', 'amaze me'],
        'responses': [
            "🧠 *Did you know?*\nHoney never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible!",
            "🌊 *Fun fact:*\nThe ocean covers 71% of Earth but we've only explored about 20% of it. More is unknown than known!",
            "🐙 *Amazing:*\nOctopuses have 3 hearts, blue blood, and 9 brains (1 central + 1 per arm)!",
            "🌍 *Did you know?*\nA day on Venus is longer than a year on Venus. It rotates so slowly!",
            "🧬 *Science fact:*\nYour body replaces 98% of its atoms every year. You're basically a new person annually!",
            "🐘 *Animal fact:*\nElephants are the only animals that can't jump. They're also one of the few that recognise themselves in a mirror!",
            "⚡ *Tech fact:*\nThe first computer bug was an actual bug — a moth stuck in a Harvard computer in 1947!",
            "🌙 *Space fact:*\nA full NASA spacesuit costs $12 million. 70% of that cost is the backpack and control module!",
            "🐝 *Nature fact:*\nBees can recognize human faces. They use the same method humans do — holistic processing!",
            "📱 *Tech fact:*\nThe first SMS ever sent said 'Merry Christmas' — sent on December 3, 1992!",
        ]
    },

    # ── Riddles ────────────────────────────────────────────────
    'riddle': {
        'patterns': ['riddle', 'tell me a riddle', 'give me a riddle', 'puzzle me',
                     'brain teaser', 'guess what'],
        'responses': [
            "🧩 *Riddle:*\nI speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?\n_(Answer: An echo)_",
            "🧩 *Riddle:*\nThe more you take, the more you leave behind. What am I?\n_(Answer: Footsteps)_",
            "🧩 *Riddle:*\nI have cities but no houses, mountains but no trees, water but no fish. What am I?\n_(Answer: A map)_",
            "🧩 *Riddle:*\nWhat has hands but can't clap?\n_(Answer: A clock)_",
            "🧩 *Riddle:*\nWhat gets wetter as it dries?\n_(Answer: A towel)_",
            "🧩 *Riddle:*\nI'm light as a feather but the strongest man can't hold me for more than 5 minutes. What am I?\n_(Answer: Breath)_",
            "🧩 *Riddle:*\nWhat can run but never walks, has a mouth but never talks, has a head but never weeps?\n_(Answer: A river)_",
        ]
    },

    # ── Money / finance ────────────────────────────────────────
    'money': {
        'patterns': ['i need money', 'how to make money', 'money tips',
                     'how to earn', 'financial advice', 'save money', 'investment tips',
                     'how to get rich', 'paise kaise kamaye'],
        'responses': [
            "💰 *Money tip:* Spend less than you earn. Sounds simple, but it's the foundation of wealth!",
            "📈 *Investment basics:* Start small. Even saving ₹100/day = ₹36,500/year. Consistency beats amount!",
            "💡 *Smart money move:* Track every expense for 30 days. You'll be shocked where money goes!",
            "🚀 *Build skills:* The fastest way to earn more is to become more valuable. Learn, grow, earn!",
            "🏦 *Save first, spend later:* Automate savings the day salary comes. Don't wait till end of month!",
        ]
    },

    # ── Health ─────────────────────────────────────────────────
    'health': {
        'patterns': ['health tips', 'fitness tips', 'how to lose weight',
                     'how to stay fit', 'exercise tips', 'diet tips', 'be healthy',
                     'i want to lose weight', 'workout tips'],
        'responses': [
            "💪 *Fitness tip:* Start with just 20 minutes of walking daily. Consistency > intensity for beginners!",
            "🥗 *Diet tip:* Drink water before every meal. It reduces appetite and helps digestion!",
            "😴 *Health fact:* Sleep 7-8 hours. Poor sleep ruins diet, exercise, and mental health!",
            "🏃 *Exercise tip:* Can't go to gym? 30 pushups + 30 squats + 30 situps daily is a full workout!",
            "🧘 *Mental health:* 10 minutes of meditation daily reduces stress by 40%. Try it for a week!",
        ]
    },

    # ── Study / education ──────────────────────────────────────
    'study': {
        'patterns': ['study tips', 'how to study', 'i have exam', 'exam tips',
                     'how to pass exam', 'help me study', 'learning tips',
                     'concentration tips', 'focus tips', 'i cant focus'],
        'responses': [
            "📚 *Study tip:* Use the Pomodoro technique — 25 min study, 5 min break. Your brain absorbs more!",
            "✏️ *Memory hack:* Write notes by hand, not typed. Hand-writing increases memory retention by 34%!",
            "🎯 *Exam tip:* Don't study everything the night before. Review your *summaries* instead!",
            "💡 *Focus tip:* Phone in another room = 20% better concentration. Distance matters!",
            "🧠 *Learning hack:* Teach what you learned to someone else. If you can explain it, you know it!",
        ]
    },

    # ── Technology ─────────────────────────────────────────────
    'tech': {
        'patterns': ['best phone', 'which phone to buy', 'android or iphone',
                     'best laptop', 'programming tips', 'learn coding',
                     'how to code', 'which language to learn', 'best programming language'],
        'responses': [
            "📱 *Android vs iPhone?* Android for customization & value. iPhone for ecosystem & longevity. Both great!",
            "💻 *Best laptop?* Depends on use:\n• Students: Acer/Lenovo budget range\n• Creators: MacBook Pro\n• Gaming: ASUS ROG / Dell Alienware",
            "👨‍💻 *First coding language?* Python! Easy syntax, used in AI, web, automation. Perfect starter!",
            "🚀 *Coding tip:* Build projects, not just tutorials. Real learning starts when you get stuck and solve it!",
        ]
    },

    # ── Islam ──────────────────────────────────────────────────
    'islam': {
        'patterns': ['mashallah', 'subhanallah', 'alhamdulillah', 'allahu akbar',
                     'inshallah', 'bismillah', 'astaghfirullah', 'jazakallah',
                     'prayer time', 'namaz time', 'salah time'],
        'responses': [
            "Alhamdulillah! 🤲 May Allah bless you!",
            "SubhanAllah! ✨ Glory be to Allah!",
            "Ameen! 🤲 May Allah accept our duas!",
            "JazakAllah Khair! 🌙 May Allah reward you!",
            "MashAllah! 🌟 May Allah protect it!",
            "Use `.quran` command to read Quran verses anytime! 📖",
        ]
    },

    # ── Confused / unknown ─────────────────────────────────────
    'confused': {
        'patterns': ['what', 'huh', 'what do you mean', 'i dont understand',
                     'explain', 'what are you saying', 'confused'],
        'responses': [
            "Sorry, I got confused! 😅 Can you rephrase that?",
            "Hmm, I'm not sure what you mean. Try asking differently! 🤔",
            "I didn't quite get that. Mind rephrasing? 😊",
        ]
    },

    # ── Yes/No answers ─────────────────────────────────────────
    'yesno': {
        'patterns': [re.compile(r'^(yes|no|yeah|nah|nope|yep|yup|sure|ok|okay|hmm)$')],
        'responses': [
            "Got it! 👍 Anything else?",
            "Okay! 😊 What else can I help with?",
            "Alright! Tell me more 😄",
            "Cool! 🙌 What's next?",
        ]
    },

    # ── Test / ping ────────────────────────────────────────────
    'test': {
        'patterns': ['test', 'ping', 'you there', 'are you there', 'online',
                     'you awake', 'working', 'active'],
        'responses': [
            "Pong! 🏓 I'm here and ready!",
            "Online and fully operational! ✅",
            "Here! 👋 What do you need?",
            "Active and ready! ⚡",
            "Present! 🙋 What's up?",
        ]
    },

    # ── Weather ────────────────────────────────────────────────
    'sorry': {
        'patterns': ['sorry', 'i am sorry', 'my bad', 'forgive me', 'apologies',
                     'pardon', 'excuse me', 'maafi', 'mafi karo'],
        'responses': [
            "No worries at all! 😊",
            "It's totally fine! 🙏",
            "All good! 👍 No need to apologize!",
            "Don't worry about it! 😄",
            "Koi baat nahi! 🙏 All forgiven!",
        ]
    },
}

# ── Special computations ───────────────────────────────────────
def compute_math(text: str) -> str:
    try:
        expr = re.search(r'[\d\s\+\-\*\/\%\.\(\)]+', text)
        if expr:
            result = eval(expr.group(), {"__builtins__": {}}, {})
            return f"🔢 *Result:* {expr.group().strip()} = *{result}*"
    except:
        pass
    return None

def compute_time() -> str:
    now = time.localtime()
    return f"🕐 *Current Time:* {time.strftime('%I:%M %p', now)}\n📅 *Date:* {time.strftime('%A, %d %B %Y', now)}"

def compute_date() -> str:
    now = time.localtime()
    return f"📅 *Today is:* {time.strftime('%A, %d %B %Y', now)}\n🗓️ Week {time.strftime('%W', now)} of {time.strftime('%Y', now)}"

def compute_age(text: str) -> str:
    match = re.search(r'\d{4}', text)
    if match:
        birth_year = int(match.group())
        current_year = time.localtime().tm_year
        age = current_year - birth_year
        if 0 < age < 150:
            return f"🎂 If you were born in *{birth_year}*, you are *{age} years old* in {current_year}!"
    return None

# ── Load custom replies ────────────────────────────────────────
def load_custom_replies(path: str) -> list:
    try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('replies', [])
    except:
        pass
    return []

def check_custom_replies(text: str, replies: list) -> str:
    t = clean(text)
    for r in replies:
        trigger = r.get('trigger', '').lower()
        if not trigger:
            continue
        if r.get('exactMatch'):
            if t == trigger:
                return r.get('response', '')
        else:
            if trigger in t:
                return r.get('response', '')
    return None

# ── Main engine ───────────────────────────────────────────────
def get_response(text: str, sender_name: str = 'there', custom_replies: list = []) -> str:
    # 1. Check custom replies first
    custom = check_custom_replies(text, custom_replies)
    if custom:
        return custom.replace('{name}', sender_name)

    # 2. Math detection
    math_result = compute_math(text)
    if math_result:
        return math_result

    # 3. Pattern matching against knowledge base
    for key, data in RESPONSES.items():
        if match(text, data['patterns']):
            response = pick(data['responses'])

            # Handle special dynamic responses
            if response == '__TIME__':
                return compute_time()
            elif response == '__DATE__':
                return compute_date()
            elif response == '__MATH__':
                r = compute_math(text)
                return r if r else "I couldn't compute that. Try a simpler expression!"
            elif response == '__AGE_CALC__':
                r = compute_age(text)
                return r if r else "I couldn't figure out the year. Try: 'I was born in 1995'"

            # Replace name placeholder
            return response.replace('{name}', sender_name)

    # 4. Fallback responses
    fallbacks = [
        f"Hmm, I'm not sure about that {sender_name}! 🤔 Try asking differently.",
        "Interesting! But I don't have an answer for that yet 😅",
        "I didn't quite catch that! Could you rephrase? 🙏",
        "That's beyond my current knowledge! Try `.chatbot` for AI-powered answers 🤖",
        "Good question! I'm still learning... try the `.chatbot` command for complex queries!",
        "I'm not sure about that one 🤔 But I'm always learning!",
        f"Sorry {sender_name}, I didn't understand that. Type `.menu` for available commands!",
    ]
    return pick(fallbacks)

# ── Entry point ───────────────────────────────────────────────
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No message provided'}))
        sys.exit(1)

    user_message = sys.argv[1]
    sender_name = sys.argv[2] if len(sys.argv) > 2 else 'there'
    replies_path = sys.argv[3] if len(sys.argv) > 3 else ''

    custom_replies = load_custom_replies(replies_path) if replies_path else []
    response = get_response(user_message, sender_name, custom_replies)

    print(json.dumps({'response': response}))
