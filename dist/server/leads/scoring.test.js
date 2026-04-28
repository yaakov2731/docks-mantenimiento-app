"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scoring_1 = require("./scoring");
(0, vitest_1.describe)('calcularScore', () => {
    (0, vitest_1.it)('score máximo con todos los criterios óptimos', () => {
        const score = (0, scoring_1.calcularScore)({
            rubro: 'Indumentaria / Moda',
            instagramOrWeb: '@mimarca',
            tipoEspacio: 'Local',
            desdeCuando: 'lo antes posible',
            seguimiento: 'Quiere coordinar una visita',
        });
        (0, vitest_1.expect)(score).toBe(100); // 20+10+20+25+25
    });
    (0, vitest_1.it)('gastronomía no suma puntos de rubro', () => {
        const score = (0, scoring_1.calcularScore)({
            rubro: 'Gastronomía',
            instagramOrWeb: '@resto',
            tipoEspacio: 'Local',
            desdeCuando: 'lo antes posible',
            seguimiento: 'Quiere coordinar una visita',
        });
        (0, vitest_1.expect)(score).toBe(80); // 0+10+20+25+25
    });
    (0, vitest_1.it)('sin instagram/web no suma los 10 puntos de ig', () => {
        const score = (0, scoring_1.calcularScore)({
            rubro: 'Belleza / Estética',
            instagramOrWeb: 'No tiene',
            tipoEspacio: 'Stand / Módulo',
            desdeCuando: 'lo antes posible',
            seguimiento: 'Quiere coordinar una visita',
        });
        (0, vitest_1.expect)(score).toBe(85); // 20+0+15+25+25
    });
    (0, vitest_1.it)('plazo "más adelante" no suma puntos de tiempo', () => {
        const score = (0, scoring_1.calcularScore)({
            rubro: 'Deco / Hogar',
            instagramOrWeb: '',
            tipoEspacio: 'No lo tengo claro todavía',
            desdeCuando: 'más adelante, todavía no lo sé',
            seguimiento: 'Prefiere recibir información por WhatsApp',
        });
        (0, vitest_1.expect)(score).toBe(30); // 20+0+5+0+5
    });
    (0, vitest_1.it)('texto libre no reconocido en desdeCuando da 10 puntos neutros', () => {
        const score = (0, scoring_1.calcularScore)({
            rubro: 'Arte / Artesanías',
            instagramOrWeb: '',
            tipoEspacio: 'Espacio exterior',
            desdeCuando: 'cuando tenga el dinero listo',
            seguimiento: 'Prefiere llamada',
        });
        (0, vitest_1.expect)(score).toBe(55); // 20+0+10+10+15
    });
    (0, vitest_1.it)('score nunca supera 100', () => {
        const score = (0, scoring_1.calcularScore)({
            rubro: 'Moda',
            instagramOrWeb: '@algo',
            tipoEspacio: 'Local',
            desdeCuando: 'lo antes posible',
            seguimiento: 'Quiere coordinar una visita',
        });
        (0, vitest_1.expect)(score).toBeLessThanOrEqual(100);
    });
});
(0, vitest_1.describe)('getTemperature', () => {
    (0, vitest_1.it)('75+ es hot', () => (0, vitest_1.expect)((0, scoring_1.getTemperature)(75)).toBe('hot'));
    (0, vitest_1.it)('74 es warm', () => (0, vitest_1.expect)((0, scoring_1.getTemperature)(74)).toBe('warm'));
    (0, vitest_1.it)('50 es warm', () => (0, vitest_1.expect)((0, scoring_1.getTemperature)(50)).toBe('warm'));
    (0, vitest_1.it)('49 es cold', () => (0, vitest_1.expect)((0, scoring_1.getTemperature)(49)).toBe('cold'));
    (0, vitest_1.it)('25 es cold', () => (0, vitest_1.expect)((0, scoring_1.getTemperature)(25)).toBe('cold'));
    (0, vitest_1.it)('24 es not_fit', () => (0, vitest_1.expect)((0, scoring_1.getTemperature)(24)).toBe('not_fit'));
    (0, vitest_1.it)('0 es not_fit', () => (0, vitest_1.expect)((0, scoring_1.getTemperature)(0)).toBe('not_fit'));
});
