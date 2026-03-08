import { describe, it, expect } from 'vitest';
import { isBanned } from '../../lib/isBanned.js';
import fs from 'fs';
import path from 'path';

const TEST_BANNED_FILE = path.join(process.cwd(), 'data', 'banned.json');

describe('isBanned', () => {
    it('returns false when no banned file exists', async () => {
        if (fs.existsSync(TEST_BANNED_FILE)) {
            const orig = fs.readFileSync(TEST_BANNED_FILE, 'utf8');
            fs.unlinkSync(TEST_BANNED_FILE);
            const result = await isBanned('nobody@s.whatsapp.net');
            fs.writeFileSync(TEST_BANNED_FILE, orig);
            expect(result).toBe(false);
        } else {
            expect(await isBanned('nobody@s.whatsapp.net')).toBe(false);
        }
    });

    it('returns false for user not in banned list', async () => {
        const orig = fs.existsSync(TEST_BANNED_FILE) ? fs.readFileSync(TEST_BANNED_FILE, 'utf8') : null;
        fs.mkdirSync(path.dirname(TEST_BANNED_FILE), { recursive: true });
        fs.writeFileSync(TEST_BANNED_FILE, '["999@s.whatsapp.net"]');
        const result = await isBanned('123@s.whatsapp.net');
        if (orig) fs.writeFileSync(TEST_BANNED_FILE, orig); else fs.unlinkSync(TEST_BANNED_FILE);
        expect(result).toBe(false);
    });

    it('returns true for banned user', async () => {
        const orig = fs.existsSync(TEST_BANNED_FILE) ? fs.readFileSync(TEST_BANNED_FILE, 'utf8') : null;
        fs.mkdirSync(path.dirname(TEST_BANNED_FILE), { recursive: true });
        fs.writeFileSync(TEST_BANNED_FILE, '["123@s.whatsapp.net"]');
        const result = await isBanned('123@s.whatsapp.net');
        if (orig) fs.writeFileSync(TEST_BANNED_FILE, orig); else fs.unlinkSync(TEST_BANNED_FILE);
        expect(result).toBe(true);
    });
});
