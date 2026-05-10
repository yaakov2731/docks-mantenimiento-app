const DSEP = '─────────────────────────'

export function buildEventosWelcome(): string {
  return [
    `*DOCKS EVENTOS*`,
    `_Salón exclusivo · Tigre, Buenos Aires_`,
    DSEP,
    `*1 ·* Consultar por mi evento`,
    `*2 ·* Coordinar visita al salón`,
    `*3 ·* Ubicación y horarios`,
    DSEP,
    `_Escribí el número de tu opción_`,
  ].join('\n')
}

export function buildEventosMainMenu(): string {
  return [
    `*DOCKS EVENTOS*`,
    `_Salón exclusivo · Tigre, Buenos Aires_`,
    DSEP,
    `*1 ·* Consultar por mi evento`,
    `*2 ·* Coordinar visita al salón`,
    `*3 ·* Ubicación y horarios`,
    `*0 ·* Salir`,
    DSEP,
    `_Escribí el número de tu opción_`,
  ].join('\n')
}

export function buildEventosHelp(): string {
  return [
    `*Ayuda — Docks Eventos*`,
    DSEP,
    `· Escribí el *número* de la opción`,
    `· *menú* vuelve al inicio`,
    `· La sesión se reinicia a los 15 min sin actividad`,
    ``,
    `📞 011 5483-5710`,
    `📸 @dockseventostigre`,
    DSEP,
    `_0 · Volver_`,
  ].join('\n')
}

export function buildUbicacionInfo(): string {
  return [
    `*Ubicación y horarios — Docks Eventos*`,
    DSEP,
    `📍 *Pedro Guareschi 22* · Tigre Centro`,
    `Dentro de Docks del Puerto`,
    `🚗 Estacionamiento gratuito · 🚂 8 min de Estación Tigre`,
    `📱 Buscá *"Docks del Puerto Tigre"* en Maps`,
    ``,
    `*Atención:* Lun–Vie 9–18 h · Sáb 10–14 h`,
    `*Eventos:* Viernes a Domingos y feriados`,
    `📞 011 5483-5710`,
    DSEP,
    `*1 ·* Consultar por mi evento`,
    `*2 ·* Coordinar visita al salón`,
    `*0 ·* Volver`,
  ].join('\n')
}

export function buildSalirMessage(): string {
  return [
    `*Hasta luego.*`,
    `Escribinos cuando lo necesites.`,
    `_Docks Eventos · Tigre_ ✨`,
  ].join('\n')
}

export { DSEP }
