export default {
  command: 'reload',
  aliases: ['refresh', 'reloadplugins'],
  category: 'owner',
  description: 'Reload all plugins',
  usage: '.reload',
  ownerOnly: true,
  
  async handler(sock, message, args) {
    const chatId = message.key.remoteJid;
    const commandHandler = (await import('../lib/commandHandler.js')).default;
    
    try {
      const start = Date.now();
      commandHandler.reloadCommands();
      const end = Date.now();
      
      await sock.sendMessage(chatId, {
        text: `✅ Reloaded ${commandHandler.commands.size} commands in ${end - start}ms`
      });
    } catch(error: any) {
      await sock.sendMessage(chatId, {
        text: `❌ Reload failed: ${error.message}`
      });
    }
  }
};
