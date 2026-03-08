const teddyUsers = {};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    command: 'teddy',
    aliases: [],
    category: 'fun',
    description: 'Send an animated teddy with cute emojis',
    usage: '.teddy',
    async handler(sock: any, message: any, args: any, context: any) {
        const chatId = context.chatId || message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;

        if (teddyUsers[sender]) return;
        teddyUsers[sender] = true;

        const teddyEmojis = [
            '❤','💕','😻','🧡','💛','💚','💙','💜','🖤','❣',
            '💞','💓','💗','💖','💘','💝','💟','♥','💌','🙂',
            '🤗','😌','😉','🤗','😊','🎊','🎉','🎁','🎈'
        ];

        try {
            const pingMsg = await sock.sendMessage(chatId, { text: `(\\_/)\n( •.•)\n/>🤍` }, { quoted: message });

            for (let i = 0; i < teddyEmojis.length; i++) {
                await sleep(500);

                await sock.relayMessage(
                    chatId,
                    {
                        protocolMessage: {
                            key: pingMsg.key,
                            type: 14,
                            editedMessage: {
                                conversation: `(\\_/)\n( •.•)\n/>${teddyEmojis[i]}`
                            }
                        }
                    },
                    {}
                );
            }
        } catch(err: any) {
            console.error('Error in teddy command:', err);
            try {
                await sock.sendMessage(chatId, { text: '❌ Something went wrong while sending teddy emojis.' }, { quoted: message });
            } catch {}
        } finally {
            delete teddyUsers[sender];
        }
    }
};
