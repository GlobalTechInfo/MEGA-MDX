import settings from '../settings.js';
import { isSudo } from './index.js';


function cleanJid(jid) {
    if (!jid) return '';
    return jid.split(':')[0].split('@')[0];
}

/**
 * Check if user is owner or sudo
 */
async function isOwnerOrSudo(senderId, sock = null, chatId = null) {
    const ownerNumberClean = cleanJid(settings.ownerNumber);
    const senderIdClean = cleanJid(senderId);

    if (senderIdClean === ownerNumberClean) {
        return true;
    }

    const isSudoUser = await isSudo(senderId);
    if (isSudoUser) {
        return true;
    }

    if (sock && chatId && chatId.endsWith('@g.us') && senderId.includes('@lid')) {
        try {
            const metadata = await sock.groupMetadata(chatId);
            const participants = metadata.participants || [];
            
            const participant = participants.find(p => p.lid === senderId || p.id === senderId);
            
            if (participant) {
                const pRealIdClean = cleanJid(participant.id);
                if (pRealIdClean === ownerNumberClean || await isSudo(participant.id)) {
                    return true;
                }
            }
        } catch(e: any) {
        }
    }
    
    return false;
}

/**
 * Check if user is ONLY owner
 */
function isOwnerOnly(senderId) {
    const ownerNumberClean = cleanJid(settings.ownerNumber);
    const senderIdClean = cleanJid(senderId);
    return senderIdClean === ownerNumberClean;
}

/**
 * Helper for commands to show clean names/numbers
 * Usage: getCleanName(jid, sock)
 */
async function getCleanName(jid, sock) {
    if (!jid) return 'Unknown';
    const cleanNumber = cleanJid(jid);
    
    try {
        if (sock) {
            const contact = await sock.onWhatsApp(jid);
            if (contact && contact[0] && contact[0].exists) {
                return cleanNumber;
            }
        }
    } catch(e: any) {}

    return cleanNumber;
}

export default isOwnerOrSudo;
export { isOwnerOnly };
export { cleanJid };
export { getCleanName };

