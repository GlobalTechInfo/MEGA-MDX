import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

let notesDB = {};

async function getUserNotes(userId) {
  if (HAS_DB) {
    const notes = await store.getSetting(userId, 'notes');
    return notes || [];
  } else {
    return notesDB[userId] || [];
  }
}

async function saveUserNotes(userId, notes) {
  if (HAS_DB) {
    await store.saveSetting(userId, 'notes', notes);
  } else {
    notesDB[userId] = notes;
  }
}

export default {
  command: 'notes',
  aliases: ['note'],
  category: 'menu',
  description: 'Store, view, and delete your personal notes',
  usage: '.notes <add|all|del|delall> [text|ID]',
  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid;
    try {
      const action = args[0] ? args[0].toLowerCase() : null;
      const content = args.slice(1).join(" ").trim();

      const menuText = `
╭───── *『 NOTES 』* ───◆
┃ Store notes for later use
┃ Storage: ${HAS_DB ? 'Database 🗄️' : 'Memory 📁'}
┃
┃ ● Add Note
┃    .notes add your text here
┃
┃ ● Get All Notes
┃    .notes all
┃
┃ ● Delete Note
┃    .notes del noteID
┃
┃ ● Delete All Notes
┃    .notes delall
╰━━━━━━━━━━━━━━━━━──⊷`;

      if (!action) {
        return await sock.sendMessage(chatId, { text: menuText }, { quoted: message });
      }
      if (action === 'add') {
        if (!content) {
          return await sock.sendMessage(chatId, {
            text: "*Please write a note to save.*\nExample: .notes add buy milk"
          }, { quoted: message });
        }
        
        const userNotes = await getUserNotes(sender);
        const newID = userNotes.length + 1;
        userNotes.push({ id: newID, text: content, createdAt: Date.now() });
        await saveUserNotes(sender, userNotes);

        return await sock.sendMessage(chatId, {
          text: `✅ Note saved.\nID: ${newID}\nStorage: ${HAS_DB ? 'Database' : 'Memory'}`
        }, { quoted: message });
      }
      if (action === 'all') {
        const userNotes = await getUserNotes(sender);
        if (userNotes.length === 0) {
          return await sock.sendMessage(chatId, { text: "*You have no notes saved.*" }, { quoted: message });
        }

        const list = userNotes.map(n => `${n.id}. ${n.text}`).join("\n");
        return await sock.sendMessage(chatId, { 
          text: `*📝 Your Notes:*\n\n${list}\n\n_Total: ${userNotes.length} notes_` 
        }, { quoted: message });
      }
      if (action === 'del') {
        const id = parseInt(args[1]);
        const userNotes = await getUserNotes(sender);
        
        if (!id || !userNotes.find(n => n.id === id)) {
          return await sock.sendMessage(chatId, {
            text: "Invalid note ID.\nExample: .notes del 1"
          }, { quoted: message });
        }
        
        const filteredNotes = userNotes.filter(n => n.id !== id);
        await saveUserNotes(sender, filteredNotes);
        
        return await sock.sendMessage(chatId, { text: `*✅ Note ID ${id} deleted.*` }, { quoted: message });
      }
      if (action === 'delall') {
        const userNotes = await getUserNotes(sender);
        if (userNotes.length === 0) {
          return await sock.sendMessage(chatId, { text: "*You have no notes to delete.*" }, { quoted: message });
        }
        
        await saveUserNotes(sender, []);
        return await sock.sendMessage(chatId, { text: "*✅ All notes deleted successfully.*" }, { quoted: message });
      }
      return await sock.sendMessage(chatId, { text: menuText }, { quoted: message });

    } catch(err: any) {
      console.error("Notes Command Error:", err);
      await sock.sendMessage(chatId, { text: "❌ Error in notes module." }, { quoted: message });
    }
  }
};
