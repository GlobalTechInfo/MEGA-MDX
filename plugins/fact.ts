import axios from 'axios';
export default {command:'fact',aliases:['randomfact','uselessfact'],category:'fun',description:'Get a random interesting fact',usage:'.fact',async handler(sock: any, message: any, args: any, context: any = {}){
const chatId=context.chatId||message.key.remoteJid;
try{
const r=await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
await sock.sendMessage(chatId,{text:r.data.text},{quoted:message});
}catch(e: any) {
console.error('Error fetching fact:',e);
await sock.sendMessage(chatId,{text:'Sorry, I could not fetch a fact right now.'},{quoted:message});
}}};

