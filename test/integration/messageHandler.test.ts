import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createMockSock, createMockMessage } from '../mocks/baileys.js';

vi.mock('../../lib/print.js', () => ({ printMessage: vi.fn(async () => {}), printLog: vi.fn(() => {}) }));
vi.mock('../../lib/lightweight_store.js', () => ({ default: { getSetting: vi.fn(async () => null), saveSetting: vi.fn(async () => {}), getBotMode: vi.fn(async () => 'public'), incrementMessageCount: vi.fn(async () => {}), messages: {} } }));
vi.mock('../../lib/logger.js', () => ({ writeErrorLog: vi.fn(() => {}) }));
vi.mock('../../lib/reactions.js', () => ({ addCommandReaction: vi.fn(async () => {}) }));
vi.mock('../../plugins/autoread.js', () => ({ handleAutoread: vi.fn(async () => {}) }));
vi.mock('../../plugins/autotyping.js', () => ({ handleAutotypingForMessage: vi.fn(async () => {}), showTypingAfterCommand: vi.fn(async () => {}) }));
vi.mock('../../plugins/antidelete.js', () => ({ storeMessage: vi.fn(async () => {}), handleMessageRevocation: vi.fn(async () => {}) }));
vi.mock('../../lib/antibadword.js', () => ({ handleBadwordDetection: vi.fn(async () => {}) }));
vi.mock('../../plugins/antilink.js', () => ({ handleLinkDetection: vi.fn(async () => {}) }));
vi.mock('../../plugins/antitag.js', () => ({ handleTagDetection: vi.fn(async () => {}) }));
vi.mock('../../plugins/mention.js', () => ({ handleMentionDetection: vi.fn(async () => {}) }));
vi.mock('../../plugins/chatbot.js', () => ({ handleChatbotResponse: vi.fn(async () => {}) }));
vi.mock('../../plugins/tictactoe.js', () => ({ handleTicTacToeMove: vi.fn(async () => {}), default: { command: 'tictactoe', handler: vi.fn(), aliases: ['ttt'], category: 'games', description: 'test' } }));
vi.mock('../../plugins/autoreply.js', () => ({ handleAutoReply: vi.fn(async () => false) }));
vi.mock('../../plugins/antispam.js', () => ({ handleAntiSpam: vi.fn(async () => false), invalidateGroupCache: vi.fn(() => {}) }));
vi.mock('../../plugins/schedule.js', () => ({ startSchedulerEngine: vi.fn(() => {}) }));
vi.mock('../../lib/isBanned.js', () => ({ isBanned: vi.fn(async () => false) }));
vi.mock('../../lib/index.js', () => ({ isSudo: vi.fn(async () => false) }));
vi.mock('../../config.js', () => ({ default: { ownerNumber: '923001234567@s.whatsapp.net', prefix: ['.'], botName: 'MEGA Bot', botMode: 'public' } }));
vi.mock('../../plugins/welcome.js', () => ({ handleJoinEvent: vi.fn(async () => {}), handleWelcome: vi.fn(async () => {}) }));
vi.mock('../../plugins/goodbye.js', () => ({ default: { handleLeaveEvent: vi.fn(async () => {}) } }));
vi.mock('../../plugins/promote.js', () => ({ default: { handlePromotionEvent: vi.fn(async () => {}) } }));
vi.mock('../../plugins/demote.js', () => ({ default: { handleDemotionEvent: vi.fn(async () => {}) } }));
vi.mock('../../plugins/autostatus.js', () => ({ default: { handleStatusUpdate: vi.fn(async () => {}) } }));
vi.mock('../../plugins/anticall.js', () => ({ default: { readState: vi.fn(async () => ({ enabled: true })) } }));

describe('handleMessages', () => {
    let handleMessages: any;
    let sock: any;

    beforeAll(async () => {
        const mod = await import('../../lib/messageHandler.js');
        handleMessages = mod.handleMessages;
    });

    beforeEach(() => { sock = createMockSock(); vi.clearAllMocks(); });

    it('ignores non-notify events', async () => {
        await handleMessages(sock, { messages: [], type: 'append' });
        expect(sock.sendMessage).not.toHaveBeenCalled();
    });

    it('ignores null messages', async () => {
        await handleMessages(sock, { messages: [null], type: 'notify' });
        expect(sock.sendMessage).not.toHaveBeenCalled();
    });

    it('ignores messages without message field', async () => {
        const msg = createMockMessage({ text: 'hello' });
        delete (msg as any).message;
        await handleMessages(sock, { messages: [msg], type: 'notify' });
        expect(sock.sendMessage).not.toHaveBeenCalled();
    });

    it('processes a valid message without crashing', async () => {
        const msg = createMockMessage({ text: 'hello', isGroup: false });
        await expect(handleMessages(sock, { messages: [msg], type: 'notify' })).resolves.not.toThrow();
    });

    it('calls storeMessage for every valid message', async () => {
        const { storeMessage } = await import('../../plugins/antidelete.js');
        const msg = createMockMessage({ text: 'hello' });
        await handleMessages(sock, { messages: [msg], type: 'notify' });
        expect(storeMessage).toHaveBeenCalled();
    });

    it('calls handleAutoread for every valid message', async () => {
        const { handleAutoread } = await import('../../plugins/autoread.js');
        const msg = createMockMessage({ text: 'hello' });
        await handleMessages(sock, { messages: [msg], type: 'notify' });
        expect(handleAutoread).toHaveBeenCalled();
    });

    it('sends error response when command handler throws', async () => {
        const commandHandler = await import('../../lib/commandHandler.js');
        commandHandler.default.registerCommand({
            command: 'crashtest',
            aliases: [],
            category: 'test',
            description: 'test',
            async handler() { throw new Error('Intentional crash'); }
        });
        const msg = createMockMessage({ text: '.crashtest', isGroup: false, senderId: '923001234567@s.whatsapp.net' });
        await handleMessages(sock, { messages: [msg], type: 'notify' });
        const last = sock._lastMessage();
        expect(last?.content?.text).toBeTruthy();
    });

    it('does not respond to banned users with commands', async () => {
        const { isBanned } = await import('../../lib/isBanned.js');
        vi.mocked(isBanned).mockResolvedValueOnce(true);
        const msg = createMockMessage({ text: '.ping', isGroup: false });
        await handleMessages(sock, { messages: [msg], type: 'notify' });
        const cmdReplies = sock._sent.filter((s: any) => s.content?.text?.toLowerCase().includes('pong'));
        expect(cmdReplies).toHaveLength(0);
    });

    it('does not crash on malformed message structure', async () => {
        await expect(handleMessages(sock, { messages: [{ key: {} }], type: 'notify' })).resolves.not.toThrow();
    });
});

describe('handleGroupParticipantUpdate', () => {
    let handleGroupParticipantUpdate: any;
    let sock: any;

    beforeAll(async () => {
        const mod = await import('../../lib/messageHandler.js');
        handleGroupParticipantUpdate = mod.handleGroupParticipantUpdate;
    });

    beforeEach(() => { sock = createMockSock(); vi.clearAllMocks(); });

    it('handles add without crashing', async () => {
        await expect(handleGroupParticipantUpdate(sock, {
            id: '120363000000000001@g.us', participants: ['923001111111@s.whatsapp.net'],
            action: 'add', author: '923009999999@s.whatsapp.net',
        })).resolves.not.toThrow();
    });

    it('handles remove without crashing', async () => {
        await expect(handleGroupParticipantUpdate(sock, {
            id: '120363000000000001@g.us', participants: ['923001111111@s.whatsapp.net'],
            action: 'remove', author: '923009999999@s.whatsapp.net',
        })).resolves.not.toThrow();
    });

    it('handles promote without crashing', async () => {
        await expect(handleGroupParticipantUpdate(sock, {
            id: '120363000000000001@g.us', participants: ['923001111111@s.whatsapp.net'],
            action: 'promote', author: '923009999999@s.whatsapp.net',
        })).resolves.not.toThrow();
    });

    it('handles demote without crashing', async () => {
        await expect(handleGroupParticipantUpdate(sock, {
            id: '120363000000000001@g.us', participants: ['923001111111@s.whatsapp.net'],
            action: 'demote', author: '923009999999@s.whatsapp.net',
        })).resolves.not.toThrow();
    });

    it('invalidates group cache on any update', async () => {
        const { invalidateGroupCache } = await import('../../plugins/antispam.js');
        await handleGroupParticipantUpdate(sock, {
            id: '120363000000000001@g.us', participants: [], action: 'add', author: '',
        });
        expect(invalidateGroupCache).toHaveBeenCalledWith('120363000000000001@g.us');
    });
});

describe('handleCall', () => {
    let handleCall: any;
    let sock: any;

    beforeAll(async () => {
        const mod = await import('../../lib/messageHandler.js');
        handleCall = mod.handleCall;
    });

    beforeEach(() => { sock = createMockSock(); vi.clearAllMocks(); });

    it('warns caller when anticall enabled', async () => {
        await handleCall(sock, [{ id: 'call-1', from: '923001111111@s.whatsapp.net' }]);
        expect(sock.sendMessage).toHaveBeenCalledWith(
            '923001111111@s.whatsapp.net',
            expect.objectContaining({ text: expect.stringContaining('Anticall') })
        );
    });

    it('rejects call via rejectCall', async () => {
        await handleCall(sock, [{ id: 'call-1', from: '923001111111@s.whatsapp.net' }]);
        expect(sock.rejectCall).toHaveBeenCalledWith('call-1', '923001111111@s.whatsapp.net');
    });

    it('does not crash on empty calls array', async () => {
        await expect(handleCall(sock, [])).resolves.not.toThrow();
    });

    it('handles call without id gracefully', async () => {
        await expect(handleCall(sock, [{ from: '923001111111@s.whatsapp.net' }])).resolves.not.toThrow();
    });
});
