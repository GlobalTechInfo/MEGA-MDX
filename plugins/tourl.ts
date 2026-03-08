import { downloadMediaMessage } from '@whiskeysockets/baileys';
import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

async function getMediaBuffer(msg: any, sock: any) {
  return await downloadMediaMessage(
    msg,
    'buffer',
    {},
    {
      logger: sock.logger,
      reuploadRequest: sock.updateMediaMessage
    }
  )
}

function getQuotedMessage(message: any) {
  const ctx = message.message?.extendedTextMessage?.contextInfo
  if (!ctx?.quotedMessage) return null

  return {
    key: {
      remoteJid: message.key.remoteJid,
      fromMe: false,
      id: ctx.stanzaId,
      participant: ctx.participant
    },
    message: ctx.quotedMessage
  }
}

export default {
  command: 'tourl',
  aliases: ['mediaurl', 'upload'],
  category: 'tools',
  description: 'Upload media and get a URL.',
  usage: '.tourl (reply to media or send media with caption)',

  async handler(sock: any, message: any) {
    const chatId = message.key.remoteJid

    try {
      let targetMsg = null

      if (
        message.message?.imageMessage ||
        message.message?.videoMessage ||
        message.message?.audioMessage ||
        message.message?.stickerMessage ||
        message.message?.documentMessage
      ) {
        targetMsg = message
      }
      if (!targetMsg) {
        const quoted = getQuotedMessage(message)
        if (quoted) targetMsg = quoted
      }
      if (!targetMsg) {
        return sock.sendMessage(
          chatId,
          { text: 'Reply to a media or send media with `.tourl`' },
          { quoted: message }
        )
      }

      const buffer = await getMediaBuffer(targetMsg, sock)
      if (!buffer) throw new Error('Failed to download media')

      if (buffer.length > 10 * 1024 * 1024) {
        return sock.sendMessage(
          chatId,
          { text: '✴️ Media exceeds 10 MB limit.' },
          { quoted: message }
        )
      }

      const type = await fileTypeFromBuffer(buffer)
      if (!type) throw new Error('Could not detect file type')

      const form = new FormData()
      form.append('reqtype', 'fileupload')
      form.append('fileToUpload', buffer, `upload.${type.ext}`)

      const res = await axios.post(
        'https://catbox.moe/user/api.php',
        form,
        { headers: form.getHeaders() }
      )

      const url = res.data
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        throw new Error('Invalid upload URL')
      }

      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2)

      await sock.sendMessage(
        chatId,
        { text: `✅ Upload Successful\n🔗 ${url}\n💾 ${sizeMB} MB` },
        { quoted: message }
      )

    } catch(e: any) {
      console.error('Catbox upload error:', e)
      await sock.sendMessage(
        chatId,
        { text: `❌ Upload failed: ${e.message}` },
        { quoted: message }
      )
    }
  }
}
