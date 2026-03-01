export default {
  command: 'clear',
  aliases: ['clr', 'clean'],
  category: 'owner',
  description: 'Clear bot messages from chat',
  usage: '.clear',
  ownerOnly: true,
  
  async handler(sock: any, message: any, args: any, context: any) {
    const { chatId, channelInfo } = context;
    
    try {
      const sent = await sock.sendMessage(chatId, { 
        text: 'Clearing bot messages...',
        ...channelInfo
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await sock.sendMessage(chatId, { delete: sent.key });
      
    } catch(error: any) {
      console.error('Error clearing messages:', error);
      await sock.sendMessage(chatId, { 
        text: 'An error occurred while clearing messages.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
