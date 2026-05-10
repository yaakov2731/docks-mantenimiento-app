const DSEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

export function buildEventosWelcome(): string {
  return [
    `🎉 *DOCKS EVENTOS*`,
    `✨ _Salón de eventos · Tigre Centro_`,
    DSEP,
    `El lugar ideal para tu *evento social o corporativo*.`,
    `Salón exclusivo dentro de Docks del Puerto,`,
    `con gastronomía premium y atención personalizada.`,
    DSEP,
    `🎂  *1*  →  Consultar por un evento`,
    `📅  *2*  →  Coordinar una visita al salón`,
    `📍  *3*  →  Ubicación · Cómo llegar`,
    `🎯  *4*  →  Nuestros servicios`,
    `🕐  *5*  →  Horarios de atención`,
    DSEP,
    `_Respondé con el número de tu opción_ 👇`,
  ].join('\n')
}

export function buildEventosMainMenu(): string {
  return [
    `🎉 *DOCKS EVENTOS*`,
    `✨ _Salón de eventos · Tigre Centro_`,
    DSEP,
    `🎂  *1*  →  Consultar por un evento`,
    `📅  *2*  →  Coordinar una visita al salón`,
    `📍  *3*  →  Ubicación · Cómo llegar`,
    `🎯  *4*  →  Nuestros servicios`,
    `🕐  *5*  →  Horarios de atención`,
    DSEP,
    `_Respondé con el número de tu opción_ 👇`,
    `0️⃣   Salir`,
  ].join('\n')
}

export function buildEventosHelp(): string {
  return [
    `❓ *Ayuda — Docks Eventos*`,
    DSEP,
    `• Ingresá el *número* de la opción que querés usar`,
    `• *0* siempre vuelve al menú anterior`,
    `• *menú* o *inicio* te trae al menú principal`,
    `• Si no respondés en 15 minutos, la sesión se reinicia`,
    DSEP,
    `📞 Llamanos: *011 5483-5710*`,
    `📸 Instagram: *@dockseventostigre*`,
    DSEP,
    `0️⃣  Volver al menú principal`,
  ].join('\n')
}

export function buildUbicacionInfo(): string {
  return [
    `📍 *Cómo llegar — Docks Eventos*`,
    DSEP,
    `🏢 *Pedro Guareschi 22*`,
    `B1648 Tigre Centro, Buenos Aires`,
    `Dentro del complejo *Docks del Puerto*`,
    ``,
    `🚗 Estacionamiento amplio y gratuito`,
    `🚂 A 8 min del tren (Estación Tigre)`,
    `🚌 A 1 minuto en auto desde el centro`,
    ``,
    `📱 Buscá *"Docks Eventos Tigre"* en Google Maps`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildServiciosInfo(): string {
  return [
    `🎯 *Nuestros Servicios — Docks Eventos*`,
    DSEP,
    `Organizamos *todo tipo de eventos*:`,
    ``,
    `💒  Bodas y casamientos`,
    `🎂  Cumpleaños y fiestas`,
    `✡️  Bar y Bat Mitzvá`,
    `🎀  Fiestas de 15 años`,
    `🏢  Eventos corporativos`,
    `🎉  Aniversarios y celebraciones`,
    ``,
    `*Nuestro salón incluye:*`,
    `• Espacio a cielo abierto con vista al río`,
    `• Servicio de catering y asado premium`,
    `• Ambientación y decoración temática`,
    `• Sonido e iluminación profesional`,
    `• DJ y música en vivo (opcional)`,
    `• Coordinación integral del evento`,
    `• Estacionamiento para invitados`,
    DSEP,
    `📅 Escribí *2* para coordinar una visita`,
    `🎂 Escribí *1* para consultar por tu evento`,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildHorariosInfo(): string {
  return [
    `🕐 *Horarios de Atención — Docks Eventos*`,
    DSEP,
    `📞 *Consultas telefónicas:*`,
    `Lunes a Viernes: 9:00 a 18:00`,
    `Sábados: 10:00 a 14:00`,
    ``,
    `📱 *WhatsApp:* este chat, 24/7`,
    `_(respondemos en horario laboral)_`,
    ``,
    `🎉 *Eventos:*`,
    `Viernes, Sábados, Domingos y Feriados`,
    `_(horarios flexibles según tu evento)_`,
    ``,
    `📞 *011 5483-5710*`,
    `📸 *@dockseventostigre*`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildSalirMessage(): string {
  return [
    `👋 *Hasta luego.*`,
    ``,
    `Si necesitás ayuda en otro momento, escribinos a este número.`,
    `_Docks Eventos · Tigre 🎉_`,
  ].join('\n')
}

export { DSEP }
