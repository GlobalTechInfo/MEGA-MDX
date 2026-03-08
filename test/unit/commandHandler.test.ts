import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs.watch and fs.readdirSync to avoid side effects
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        watch: vi.fn(),
        readdirSync: vi.fn(() => []),
        existsSync: vi.fn(() => true),
    };
});

describe('CommandHandler', () => {
    let handler: any;

    beforeEach(async () => {
        const mod = await import('../../lib/commandHandler.js');
        handler = mod.default;
    });

    it('exports a CommandHandler instance', () => {
        expect(handler).toBeTruthy();
        expect(typeof handler.loadCommands).toBe('function');
        expect(typeof handler.getCommand).toBe('function');
    });

    it('has empty commands map initially', () => {
        expect(handler.commands).toBeInstanceOf(Map);
    });

    it('registerCommand adds command', () => {
        handler.registerCommand({ command: 'ping', aliases: ['p'], category: 'general', description: 'test', async handler() {} });
        expect(handler.commands.has('ping')).toBe(true);
    });

    it('registerCommand registers aliases', () => {
        handler.registerCommand({ command: 'test', aliases: ['t', 'tst'], category: 'general', description: 'test', async handler() {} });
        expect(handler.aliases.has('t')).toBe(true);
        expect(handler.aliases.has('tst')).toBe(true);
    });

    it('getCommand finds by prefix', () => {
        handler.registerCommand({ command: 'hello', aliases: [], category: 'general', description: 'test', async handler() {} });
        const result = handler.getCommand('.hello', ['.']);
        expect(result).toBeTruthy();
        expect(result.command).toBe('hello');
    });

    it('getCommand finds by alias', () => {
        handler.registerCommand({ command: 'sticker', aliases: ['s', 'stk'], category: 'media', description: 'test', async handler() {} });
        const result = handler.getCommand('.s', ['.']);
        expect(result).toBeTruthy();
    });

    it('getCommand returns null for unknown command', () => {
        const result = handler.getCommand('.unknowncmd123', ['.']);
        expect(result).toBeNull();
    });

    it('toggleCommand disables and re-enables', () => {
        handler.registerCommand({ command: 'mute', aliases: [], category: 'admin', description: 'test', async handler() {} });
        handler.toggleCommand('mute');
        expect(handler.disabledCommands.has('mute')).toBe(true);
        handler.toggleCommand('mute');
        expect(handler.disabledCommands.has('mute')).toBe(false);
    });

    it('getCommandsByCategory returns correct commands', () => {
        handler.registerCommand({ command: 'fun1', aliases: [], category: 'fun', description: 'test', async handler() {} });
        handler.registerCommand({ command: 'fun2', aliases: [], category: 'fun', description: 'test', async handler() {} });
        const cmds = handler.getCommandsByCategory('fun');
        expect(cmds.length).toBeGreaterThanOrEqual(2);
    });

    it('findSuggestion returns close match', () => {
        handler.registerCommand({ command: 'sticker', aliases: [], category: 'media', description: 'test', async handler() {} });
        const suggestion = handler.findSuggestion('sticke');
        expect(suggestion).toBe('sticker');
    });
});
