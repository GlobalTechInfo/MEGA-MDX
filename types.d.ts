import type { WASocket, proto, WAMessage } from '@whiskeysockets/baileys';

export interface BotContext {
    chatId: string;
    sender: string;
    isGroup: boolean;
    isOwner: boolean;
    isSudo: boolean;
    isAdmin: boolean;
    isBotAdmin: boolean;
    command: string;
    args: string[];
    text: string;
    prefix: string;
    quoted: any;
    message: WAMessage;
    sock: WASocket;
    store: any;
    pushName: string;
    participants: string[];
    groupMetadata: any;
    [key: string]: any;
}

export interface Plugin {
    command: string | string[];
    aliases?: string[];
    category?: string;
    description?: string;
    usage?: string;
    isOwner?: boolean;
    isAdmin?: boolean;
    isPrefixless?: boolean;
    handler: (sock: WASocket, message: WAMessage, args: string[], context: BotContext) => Promise<void>;
}

declare global {
    var PAIRING_NUMBER: string | undefined;
    var SESSION_ID: string | undefined;
    var phoneNumber: string | undefined;
    var botname: string | undefined;
    var themeemoji: string | undefined;
    var gc: (() => void) | undefined;
}
