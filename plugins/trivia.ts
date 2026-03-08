import type { BotContext } from '../types.js';
import axios from 'axios';

const triviaGames = {};

export default {
  command: 'trivia',
  aliases: ['quiz'],
  category: 'games',
  description: 'Start a trivia game or answer the question',
  usage: '.trivia [answer]',

  async handler(sock: any, message: any, args: any, context: BotContext) {
    const { chatId, channelInfo } = context;

    if (args.length === 0) {
      if (triviaGames[chatId]) {
        await sock.sendMessage(chatId, {
          text: 'A trivia game is already in progress!',
          ...channelInfo
        }, { quoted: message });
        return;
      }

      try {
        const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
        const questionData = response.data.results[0];

        triviaGames[chatId] = {
          question: questionData.question,
          correctAnswer: questionData.correct_answer,
          options: [...questionData.incorrect_answers, questionData.correct_answer].sort(),
        };

        await sock.sendMessage(chatId, {
          text: `🎯 *Trivia Time!*\n\n*Question:* ${triviaGames[chatId].question}\n\n*Options:*\n${triviaGames[chatId].options.join('\n')}\n\nUse .trivia <answer> to answer!`,
          ...channelInfo
        }, { quoted: message });
      } catch(error: any) {
        await sock.sendMessage(chatId, {
          text: 'Error fetching trivia question. Try again later.',
          ...channelInfo
        }, { quoted: message });
      }
    } else {
      if (!triviaGames[chatId]) {
        await sock.sendMessage(chatId, {
          text: 'No trivia game is in progress. Use .trivia to start one!',
          ...channelInfo
        }, { quoted: message });
        return;
      }

      const game = triviaGames[chatId];
      const answer = args.join(' ');

      if (answer.toLowerCase() === game.correctAnswer.toLowerCase()) {
        await sock.sendMessage(chatId, {
          text: `✅ Correct! The answer is *${game.correctAnswer}*`,
          ...channelInfo
        }, { quoted: message });
      } else {
        await sock.sendMessage(chatId, {
          text: `❌ Wrong! The correct answer was *${game.correctAnswer}*`,
          ...channelInfo
        }, { quoted: message });
      }

      delete triviaGames[chatId];
    }
  }
};
