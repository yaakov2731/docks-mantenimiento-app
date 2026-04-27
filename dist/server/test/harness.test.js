"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('vitest server harness', () => {
    (0, vitest_1.it)('boots with the isolated in-memory turso setup', () => {
        (0, vitest_1.expect)(process.env.TURSO_URL).toBe('file::memory:?cache=shared');
        (0, vitest_1.expect)(process.env.TURSO_TOKEN).toBe('test-token');
    });
});
