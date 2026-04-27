"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const db_1 = require("./db");
(0, vitest_1.describe)('fetchWithTimeout', () => {
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('normalizes request-like objects before delegating to fetch', async () => {
        const fetchMock = vitest_1.vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
        const headers = new Headers({ authorization: 'Bearer test' });
        const requestLike = {
            url: 'https://example.test/v2/pipeline',
            method: 'POST',
            headers,
            body: '{"requests":[]}',
        };
        await (0, db_1.fetchWithTimeout)(requestLike);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledWith('https://example.test/v2/pipeline', vitest_1.expect.objectContaining({
            method: 'POST',
            headers,
            body: '{"requests":[]}',
        }));
    });
});
