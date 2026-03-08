import { describe, it, expect } from 'vitest';
import { DATA_DIR, ASSETS_DIR, TEMP_DIR, SESSION_DIR, dataFile } from '../../lib/paths.js';
import path from 'path';

describe('paths', () => {
    it('DATA_DIR is under cwd', () => {
        expect(DATA_DIR).toBe(path.join(process.cwd(), 'data'));
    });

    it('ASSETS_DIR is under cwd', () => {
        expect(ASSETS_DIR).toBe(path.join(process.cwd(), 'assets'));
    });

    it('TEMP_DIR is under cwd', () => {
        expect(TEMP_DIR).toBe(path.join(process.cwd(), 'temp'));
    });

    it('SESSION_DIR is under cwd', () => {
        expect(SESSION_DIR).toBe(path.join(process.cwd(), 'session'));
    });

    it('dataFile joins filename to DATA_DIR', () => {
        expect(dataFile('banned.json')).toBe(path.join(process.cwd(), 'data', 'banned.json'));
    });

    it('dataFile works with subdirectory', () => {
        expect(dataFile('sub/file.json')).toBe(path.join(process.cwd(), 'data', 'sub', 'file.json'));
    });
});
