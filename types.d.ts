import type { WASocket } from '@whiskeysockets/baileys';
import type { WAMessage } from '@whiskeysockets/baileys/lib/Types/Message.js';
import type config from './config.js';

export interface ChannelInfo {
    contextInfo: {
        forwardingScore: number;
        isForwarded: boolean;
        forwardedNewsletterMessageInfo: {
            newsletterJid: string;
            newsletterName: string;
            serverMessageId: number;
        };
    };
}

export interface GroupParticipant {
    id: string;
    lid?: string;
    admin?: 'admin' | 'superadmin' | null;
}

export interface BotContext {
    chatId: string;
    senderId: string;
    isGroup: boolean;
    isSenderAdmin: boolean;
    isBotAdmin: boolean;
    senderIsOwnerOrSudo: boolean;
    isOwnerOrSudoCheck: boolean;
    channelInfo: ChannelInfo;
    rawText: string;
    userMessage: string;
    messageText: string;
    config: typeof config;
}

export interface Plugin {
    command: string;
    aliases?: string[];
    category?: string;
    description?: string;
    usage?: string;
    ownerOnly?: boolean;
    strictOwnerOnly?: boolean;
    groupOnly?: boolean;
    adminOnly?: boolean;
    isPrefixless?: boolean;
    cooldown?: number;
    handler: (sock: WASocket, message: WAMessage, args: string[], context: BotContext) => Promise<void | any>;
}

declare global {
    var PAIRING_NUMBER: string | undefined;
    var SESSION_ID: string | undefined;
    var phoneNumber: string | undefined;
    var botname: string | undefined;
    var themeemoji: string | undefined;
    var gc: (() => void) | undefined;
}
