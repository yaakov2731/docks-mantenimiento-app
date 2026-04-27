"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const const_1 = require("../shared/const");
(0, vitest_1.describe)('LOCALES_PLANTA_BAJA', () => {
    (0, vitest_1.it)('includes every numbered planta baja local in the expected ranges without gaps', () => {
        const numberedLocals = const_1.LOCALES_PLANTA_BAJA
            .filter(local => /^Local \d+$/.test(local))
            .map(local => Number(local.replace('Local ', '')));
        const expectedLocals = [
            ...Array.from({ length: 222 }, (_, index) => index + 1),
            ...Array.from({ length: 5 }, (_, index) => 257 + index),
        ];
        (0, vitest_1.expect)(numberedLocals).toEqual(expectedLocals);
    });
});
