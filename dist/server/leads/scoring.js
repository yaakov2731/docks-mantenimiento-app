"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularScore = calcularScore;
exports.getTemperature = getTemperature;
const URGENT_KEYWORDS = ['lo antes posible', 'asap', 'inmediato', 'urgente', 'este mes'];
const NEAR_KEYWORDS = ['próximo mes', 'proximo mes', 'un mes', '1 mes', '30 días', '30 dias', 'dos meses', '2 meses', '60 días', '60 dias'];
const MEDIUM_KEYWORDS = ['3 meses', 'tres meses', '90 días', '90 dias'];
const FAR_KEYWORDS = ['más adelante', 'mas adelante', 'todavía no', 'todavia no', 'evaluando', 'estoy viendo', 'no sé', 'no se'];
const ESPACIO_PUNTOS = {
    'Local': 20,
    'Stand / Módulo': 15,
    'Espacio exterior': 10,
    'No lo tengo claro todavía': 5,
};
const SEGUIMIENTO_PUNTOS = {
    'Quiere coordinar una visita': 25,
    'Prefiere llamada': 15,
    'Prefiere recibir información por WhatsApp': 5,
};
function isGastronomiaGenerica(rubro) {
    const r = rubro.toLowerCase();
    return r.includes('gastronomía') || r.includes('gastronomia') ||
        r.includes('restaurante') || r.includes('comida') || r.includes('food');
}
function scoreDesde(texto) {
    const t = texto.toLowerCase();
    if (URGENT_KEYWORDS.some(k => t.includes(k)))
        return 25;
    if (NEAR_KEYWORDS.some(k => t.includes(k)))
        return 20;
    if (MEDIUM_KEYWORDS.some(k => t.includes(k)))
        return 10;
    if (FAR_KEYWORDS.some(k => t.includes(k)))
        return 0;
    return 10;
}
function calcularScore(input) {
    let score = 0;
    if (input.rubro && !isGastronomiaGenerica(input.rubro))
        score += 20;
    const ig = input.instagramOrWeb?.trim() ?? '';
    if (ig && ig !== 'No tiene')
        score += 10;
    score += ESPACIO_PUNTOS[input.tipoEspacio ?? ''] ?? 0;
    score += scoreDesde(input.desdeCuando ?? '');
    score += SEGUIMIENTO_PUNTOS[input.seguimiento ?? ''] ?? 0;
    return Math.min(100, score);
}
function getTemperature(score) {
    if (score >= 75)
        return 'hot';
    if (score >= 50)
        return 'warm';
    if (score >= 25)
        return 'cold';
    return 'not_fit';
}
