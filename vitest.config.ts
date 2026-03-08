import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        testTimeout: 120000,
        hookTimeout: 60000,
        coverage: {
            provider: 'v8',
            reporter: ['text-summary', 'lcov', 'html'],
            reportsDirectory: './coverage',
            include: ['lib/**/*.ts'],
            exclude: [
                'lib/myfunc2.ts',
                'lib/exif.ts',
                'lib/converter.ts',
                'lib/session.ts',
                'lib/uploader.ts',
                'lib/uploadImage.ts',
                'dist/**',
                'node_modules/**',
            ],
            // Thresholds reflect reality: most lib functions require
            // a live Baileys socket to exercise. Coverage grows as
            // more unit tests are added over time.
            thresholds: {
                lines: 13,
                functions: 9,
                branches: 12,
                statements: 13,
            }
        }
    }
});
