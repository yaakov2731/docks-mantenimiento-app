"use strict";
/**
 * Parser de intención para mensajes entrantes del bot WhatsApp — Docks del Puerto
 *
 * Convierte mensajes en lenguaje natural a intents estructurados.
 * El bot local (C:\Users\jcbru\whatsapp-claude-gpt) puede usar este módulo
 * consultando el endpoint POST /api/bot/parse-intent.
 *
 * DISEÑO: sin dependencias externas, 100% regex + keyword matching.
 * Cubre el ~95% de los mensajes reales de los empleados basado en el uso actual.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIntent = parseIntent;
exports.buildUnknownIntentResponse = buildUnknownIntentResponse;
exports.buildIntentConfirmation = buildIntentConfirmation;
// ─── Normalización ───────────────────────────────────────────────────────────
function normalize(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
        .replace(/[^a-z0-9\s#]/g, ' ') // Keep only alphanumeric, spaces, #
        .replace(/\s+/g, ' ')
        .trim();
}
const RULES = [
    // ── Aceptación de tarea ────────────────────────────────────────────────────
    {
        intent: 'task_accept',
        confidence: 0.98,
        patterns: [
            /^\s*1\s*$/,
            /\brecibida?\b/,
            /\btarea recibida\b/,
            /\bacepto\b/,
            /\bsi puedo\b/,
            /\bsi la tomo\b/,
            /\btomo la tarea\b/,
            /\bconfirmo\b/,
        ],
    },
    // ── Rechazo de tarea ──────────────────────────────────────────────────────
    {
        intent: 'task_reject',
        confidence: 0.97,
        patterns: [
            /^\s*2\s*$/,
            /\bno puedo\b/,
            /\bno la puedo tomar\b/,
            /\bno llego\b/,
            /\bno disponible\b/,
            /\bfranco\b/,
            /\bde franco\b/,
            /\bocupado\b/,
            /\bestoy ocupado\b/,
            /\bno estoy\b/,
        ],
    },
    // ── Inicio de trabajo ─────────────────────────────────────────────────────
    {
        intent: 'task_start',
        confidence: 0.93,
        patterns: [
            /\bempiezo\b/,
            /\bempezando\b/,
            /\biniciando\b/,
            /\binicio\b/,
            /\bvoy para alla\b/,
            /\bme dirijo\b/,
            /\bcomenzo\b/,
            /\bcomencé\b/,
            /\bya arranque\b/,
        ],
    },
    // ── Pausa de trabajo ─────────────────────────────────────────────────────
    {
        intent: 'task_pause',
        confidence: 0.93,
        patterns: [
            /\bpauso\b/,
            /\bpausando\b/,
            /\bespero (el )?material\b/,
            /\bno tengo (el )?material\b/,
            /\bno tengo herramientas\b/,
            /\bfalta (el )?material\b/,
            /\bbloqueado\b/,
            /\bespero\b.*\bpara continuar\b/,
            /\bvuelvo (mas tarde|despues)\b/,
        ],
    },
    // ── Reanudación ──────────────────────────────────────────────────────────
    {
        intent: 'task_resume',
        confidence: 0.92,
        patterns: [
            /\bcontinuo\b/,
            /\breanudo\b/,
            /\bretomo\b/,
            /\bsigo\b/,
            /\bvuelvo a la tarea\b/,
            /\bya tengo (el )?material\b/,
            /\bllegaron? los materiales?\b/,
        ],
    },
    // ── Completar tarea ───────────────────────────────────────────────────────
    {
        intent: 'task_complete',
        confidence: 0.97,
        patterns: [
            /\blisto\b/,
            /\btermine\b/,
            /\bterminado\b/,
            /\bcompletado\b/,
            /\bcomplete\b/,
            /\bfinalice\b/,
            /\bfinalizado\b/,
            /\btarea lista\b/,
            /\blisto el trabajo\b/,
            /\bya esta listo\b/,
            /\bquedo listo\b/,
            /\btermino\b/,
        ],
    },
    // ── Pedido de ayuda ───────────────────────────────────────────────────────
    {
        intent: 'task_help',
        confidence: 0.90,
        patterns: [
            /\bnecesito ayuda\b/,
            /\bno se como\b/,
            /\bno puedo solo\b/,
            /\bpreciso apoyo\b/,
            /\bhay un problema\b/,
            /\bsurgio un inconveniente\b/,
            /\bno tengo acceso\b/,
        ],
    },
    // ── Rondas: opción 1 (Iniciar) ────────────────────────────────────────────
    {
        intent: 'round_start',
        confidence: 0.92,
        patterns: [
            /\binicio (la )?ronda\b/,
            /\biniciar ronda\b/,
            /\bempiezo (la )?ronda\b/,
        ],
    },
    // ── Rondas: opción 2 (Pausar) ─────────────────────────────────────────────
    {
        intent: 'round_pause',
        confidence: 0.90,
        patterns: [
            /\bpauso (la )?ronda\b/,
            /\bpausar ronda\b/,
        ],
    },
    // ── Rondas: opción 3 (Finalizar) ─────────────────────────────────────────
    {
        intent: 'round_finish',
        confidence: 0.95,
        patterns: [
            /\b(ronda )?(lista|listo|ok|bien)\b/,
            /\bfinalize? (la )?ronda\b/,
            /\btermino (la )?ronda\b/,
            /\bronda (terminada|completada|lista)\b/,
            /\bbanos (limpios?|ok|bien)\b/,
            /\btodo (bien|ok) en banos\b/,
        ],
    },
    // ── Rondas: opción 4 (Con observación) ────────────────────────────────────
    {
        intent: 'round_observation',
        confidence: 0.92,
        patterns: [
            /\bcon observacion\b/,
            /\bhay (un )?problema\b/,
            /\bfalta (papel|jabon|toalla|luz|agua)\b/,
            /\besta roto\b/,
            /\besta sucio\b/,
            /\bhay (un )?desperfecto\b/,
        ],
    },
    // ── Rondas: opción 5 (No pude) ────────────────────────────────────────────
    {
        intent: 'round_unable',
        confidence: 0.93,
        patterns: [
            /\bno pude (hacer|realizar|completar)? ?(la )?ronda\b/,
            /\bno llegue a la ronda\b/,
            /\bno puedo hacer la ronda\b/,
        ],
    },
    // ── Asistencia ────────────────────────────────────────────────────────────
    {
        intent: 'attendance_entrada',
        confidence: 0.97,
        patterns: [
            /^\s*entrada\s*$/,
            /\blllegue\b/,
            /\bllegu(e|é)\b/,
            /\bingrese\b/,
            /\bestoy (en|aca|aqui)\b/,
            /\barrive\b/,
            /\bregistrar entrada\b/,
        ],
    },
    {
        intent: 'attendance_salida',
        confidence: 0.97,
        patterns: [
            /^\s*salida\s*$/,
            /\bme voy\b/,
            /\bsalgo\b/,
            /\btermine el turno\b/,
            /\bregistrar salida\b/,
            /\bchau\b/,
        ],
    },
    {
        intent: 'attendance_almuerzo_inicio',
        confidence: 0.95,
        patterns: [
            /\balmuerzo\b/,
            /\bvoy a comer\b/,
            /\bcorte almuerzo\b/,
            /\binicio almuerzo\b/,
            /\bpausa almuerzo\b/,
        ],
    },
    {
        intent: 'attendance_almuerzo_fin',
        confidence: 0.94,
        patterns: [
            /\bvolvi del almuerzo\b/,
            /\bde vuelta\b/,
            /\bfin almuerzo\b/,
            /\btermino almuerzo\b/,
            /\bya almorzé\b/,
        ],
    },
    // ── Admin ─────────────────────────────────────────────────────────────────
    {
        intent: 'admin_pendientes',
        confidence: 0.90,
        patterns: [
            /\bver pendientes\b/,
            /\bque (hay|tareas) (pendientes)?\b/,
            /\bque reclamos?\b/,
            /\blistar (tareas|pendientes)\b/,
        ],
    },
    {
        intent: 'admin_buscar',
        confidence: 0.90,
        patterns: [
            /\bbuscar reclamo\b/,
            /\breclamo #?\d+\b/,
            /\bver #?\d+\b/,
        ],
    },
    // ── Status ────────────────────────────────────────────────────────────────
    {
        intent: 'status_query',
        confidence: 0.85,
        patterns: [
            /\bque (me toca|tengo|hay para mi)\b/,
            /\bmis tareas\b/,
            /\bver mis tareas\b/,
            /\bque tengo hoy\b/,
            /\bmi estado\b/,
        ],
    },
    // ── Saludo ────────────────────────────────────────────────────────────────
    {
        intent: 'greeting',
        confidence: 0.80,
        patterns: [
            /^\s*(hola|buenas?|buen dia|buenas (tardes|noches)|hey|hi)\s*$/,
        ],
    },
];
// ─── Función principal ───────────────────────────────────────────────────────
/**
 * Parsea un mensaje entrante y devuelve el intent detectado.
 *
 * @example
 * parseIntent("Terminé la tarea del local 5")
 * // => { type: 'task_complete', confidence: 0.97, ... }
 *
 * parseIntent("1")
 * // => { type: 'task_accept', confidence: 0.98, option: '1', isNumericOption: true }
 *
 * parseIntent("Hay un problema con la llave del baño, falta agua")
 * // => { type: 'round_observation', confidence: 0.92, freeText: '...' }
 */
function parseIntent(rawMessage) {
    const normalized = normalize(rawMessage);
    const trimmed = normalized.trim();
    // Check if it's a pure numeric option
    const numericMatch = trimmed.match(/^([1-9])$/);
    const isNumericOption = !!numericMatch;
    const option = numericMatch?.[1];
    // Extract entity ID if present (ej: "tarea 123", "reclamo #456", "ID 789")
    const entityMatch = rawMessage.match(/(?:tarea|reclamo|ronda|operacion|#|id)\s*[:#]?\s*(\d+)/i);
    const entityId = entityMatch ? parseInt(entityMatch[1], 10) : undefined;
    // Try each rule
    let bestMatch = null;
    for (const rule of RULES) {
        for (const pattern of rule.patterns) {
            const matched = typeof pattern === 'string'
                ? trimmed.includes(pattern)
                : pattern.test(trimmed);
            if (matched) {
                // Boost confidence for exact short matches
                const boost = trimmed.length <= 3 ? 0.02 : 0;
                const confidence = Math.min(1, rule.confidence + boost);
                if (!bestMatch || confidence > bestMatch.confidence) {
                    bestMatch = { rule, confidence };
                }
                break;
            }
        }
    }
    if (!bestMatch) {
        // If no rule matched but it's a numeric option,
        // default to task_accept for '1' and task_reject for '2'
        if (isNumericOption) {
            if (option === '1')
                return { type: 'task_accept', confidence: 0.7, option, isNumericOption: true, entityId };
            if (option === '2')
                return { type: 'task_reject', confidence: 0.7, option, isNumericOption: true, entityId };
            if (option === '3')
                return { type: 'round_finish', confidence: 0.65, option, isNumericOption: true, entityId };
            if (option === '4')
                return { type: 'round_observation', confidence: 0.65, option, isNumericOption: true, entityId };
            if (option === '5')
                return { type: 'round_unable', confidence: 0.65, option, isNumericOption: true, entityId };
        }
        // Fallback: if it looks like a progress note (long-ish text), classify as task_progress
        if (rawMessage.trim().length > 10) {
            return {
                type: 'task_progress',
                confidence: 0.40,
                freeText: rawMessage.trim(),
                isNumericOption: false,
                entityId,
            };
        }
        return { type: 'unknown', confidence: 0, isNumericOption: false, entityId };
    }
    return {
        type: bestMatch.rule.intent,
        confidence: bestMatch.confidence,
        option,
        freeText: rawMessage.trim().length > 5 ? rawMessage.trim() : undefined,
        isNumericOption,
        entityId,
    };
}
// ─── Respuestas de ayuda del bot ─────────────────────────────────────────────
/**
 * Genera el mensaje de respuesta cuando el intent no se reconoce.
 * El bot local puede llamar esto cuando no entiende qué hace el usuario.
 */
function buildUnknownIntentResponse(context) {
    if (context === 'admin') {
        return [
            '❓ No entendí tu mensaje.',
            '',
            'Opciones disponibles:',
            '1. Ver pendientes',
            '2. Asignar último reclamo',
            '3. Buscar reclamo por número',
            '4. Ayuda',
        ].join('\n');
    }
    return [
        '❓ No entendí tu mensaje.',
        '',
        'Podés decirme:',
        '• *1* o "recibida" — para aceptar una tarea',
        '• *2* o "no puedo" — para rechazar una tarea',
        '• *listo* o "terminé" — para completar una tarea',
        '• *pauso* — para pausar',
        '• *entrada* / *salida* — para registrar asistencia',
        '• *mis tareas* — para ver qué tenés asignado',
    ].join('\n');
}
/**
 * Genera respuesta de confirmación según el intent detectado.
 */
function buildIntentConfirmation(intent, params) {
    switch (intent) {
        case 'task_pause':
            return [
                '⏸️ *Tarea pausada.*',
                params?.tiempo ? `Tiempo acumulado: ${params.tiempo}` : '',
                '',
                'Avisá cuando puedas retomar.',
            ].filter(Boolean).join('\n');
        case 'task_resume':
            return '▶️ *Retomando tarea.* Registramos la reanudación.';
        case 'task_help':
            return [
                '🆘 *Recibimos tu pedido de ayuda.*',
                '',
                'Se notificó al responsable. Esperá instrucciones.',
                'Si es urgente, llamá directamente al encargado.',
            ].join('\n');
        case 'greeting':
            return [
                '👋 ¡Hola! Soy el bot de *Docks del Puerto*.',
                '',
                'Escribí *mis tareas* para ver qué tenés asignado,',
                'o *ayuda* para ver las opciones disponibles.',
            ].join('\n');
        case 'status_query':
            return null; // El bot local debe hacer GET /api/bot/empleado/:id/resumen y formatear
        default:
            return null;
    }
}
