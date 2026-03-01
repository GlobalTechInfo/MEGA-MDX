import QRCode from 'qrcode';

export default {
  command: 'qrcode',
  aliases: ['qr'],
  category: 'tools',
  description: 'Generate a QR code from text',
  usage: '.qrcode <text>',

  async handler(sock: any, message: any, args: any, context: any = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const text = args?.join(' ')?.trim();

    if (!text) {
      return await sock.sendMessage(chatId, { text: '*Provide text to generate QR*\nExample: .qrcode Hello World' }, { quoted: message });
    }

    try {
      const qr = await QRCode.toDataURL(text.slice(0, 2048), {
        errorCorrectionLevel: 'H',
        scale: 8
      });

      await sock.sendMessage(chatId, { image: { url: qr }, caption: '✅ QR Code Generated' }, { quoted: message });
    } catch(err: any) {
      console.error('QR plugin error:', err);
      await sock.sendMessage(chatId, { text: '❌ Failed to generate QR code.' }, { quoted: message });
    }}
};

