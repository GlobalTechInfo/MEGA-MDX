import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const PLUGINS_DIR = path.join(process.cwd(), 'dist/plugins');

describe('Plugin Loading', () => {
    let pluginFiles: string[] = [];
    const loadedPlugins: { file: string; mod: any }[] = [];
    const errors: { file: string; error: string }[] = [];

    beforeAll(async () => {
        pluginFiles = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
        for (const file of pluginFiles) {
            try {
                const mod = await import(path.join(PLUGINS_DIR, file));
                loadedPlugins.push({ file, mod: mod.default || mod });
            } catch (e: any) {
                errors.push({ file, error: e.message });
            }
        }
    }, 60000);

    it('has plugins directory', () => expect(fs.existsSync(PLUGINS_DIR)).toBe(true));
    it('has more than 100 plugins', () => expect(pluginFiles.length).toBeGreaterThan(100));

    it('ALL plugins load without errors', () => {
        if (errors.length > 0) console.error('Failed plugins:', errors);
        expect(errors).toEqual([]);
    });

    it('every plugin has a default export', () => {
        const missing = loadedPlugins.filter(p => !p.mod);
        expect(missing.map(p => p.file)).toEqual([]);
    });

    it('every plugin has a command field', () => {
        const missing = loadedPlugins.filter(p => p.mod && !p.mod.command);
        expect(missing.map(p => p.file)).toEqual([]);
    });

    it('every plugin has a handler function', () => {
        const missing = loadedPlugins.filter(p => p.mod?.command && typeof p.mod.handler !== 'function');
        expect(missing.map(p => p.file)).toEqual([]);
    });

    it('every plugin has a category', () => {
        const missing = loadedPlugins.filter(p => p.mod?.command && !p.mod.category);
        expect(missing.map(p => p.file)).toEqual([]);
    });

    it('every plugin has a description', () => {
        const missing = loadedPlugins.filter(p => p.mod?.command && !p.mod.description);
        expect(missing.map(p => p.file)).toEqual([]);
    });

    it('no duplicate command names', () => {
        const seen = new Map<string, string>();
        const dupes: string[] = [];
        for (const { file, mod } of loadedPlugins) {
            if (!mod?.command) continue;
            if (seen.has(mod.command)) {
                dupes.push(`${file} duplicates '${mod.command}' from ${seen.get(mod.command)}`);
            } else {
                seen.set(mod.command, file);
            }
        }
        expect(dupes).toEqual([]);
    });

    it('aliases are arrays', () => {
        const invalid = loadedPlugins.filter(p =>
            p.mod?.aliases !== undefined && !Array.isArray(p.mod.aliases)
        );
        expect(invalid.map(p => p.file)).toEqual([]);
    });

    it('ownerOnly/groupOnly/adminOnly are booleans if present', () => {
        const invalid = loadedPlugins.filter(p => {
            const m = p.mod;
            if (!m) return false;
            return (m.ownerOnly !== undefined && typeof m.ownerOnly !== 'boolean') ||
                   (m.groupOnly !== undefined && typeof m.groupOnly !== 'boolean') ||
                   (m.adminOnly !== undefined && typeof m.adminOnly !== 'boolean');
        });
        expect(invalid.map(p => p.file)).toEqual([]);
    });

    it('cooldown is a number if present', () => {
        const invalid = loadedPlugins.filter(p =>
            p.mod?.cooldown !== undefined && typeof p.mod.cooldown !== 'number'
        );
        expect(invalid.map(p => p.file)).toEqual([]);
    });
});
