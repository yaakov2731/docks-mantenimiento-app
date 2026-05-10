const DSEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

export function buildEventosWelcome(): string {
  return [
    `✨ *DOCKS EVENTOS — Tigre*`,
    DSEP,
    `Salón exclusivo para eventos sociales`,
    `y corporativos en Docks del Puerto.`,
    DSEP,
    `🎂  *1*  Consultar por un evento`,
    `💎  *2*  Paquetes y precios`,
    `📅  *3*  Coordinar visita`,
    `📸  *4*  Eventos realizados`,
    `📍  *5*  Ubicación`,
    `🕐  *6*  Horarios`,
    DSEP,
    `👆 _Respondé con el número de tu opción_`,
  ].join('\n')
}

export function buildEventosMainMenu(): string {
  return [
    `✨ *DOCKS EVENTOS — Tigre*`,
    DSEP,
    `🎂  *1*  Consultar por un evento`,
    `💎  *2*  Paquetes y precios`,
    `📅  *3*  Coordinar visita`,
    `📸  *4*  Eventos realizados`,
    `📍  *5*  Ubicación`,
    `🕐  *6*  Horarios`,
    ``,
    `0️⃣  Salir`,
    DSEP,
    `👆 _Elegí una opción_`,
  ].join('\n')
}

export function buildEventosHelp(): string {
  return [
    `❓ *Ayuda — Docks Eventos*`,
    DSEP,
    `• Ingresá el *número* de la opción`,
    `• *0* vuelve al menú anterior`,
    `• *menú* te trae al inicio`,
    `• 15 min sin actividad reinicia la sesión`,
    ``,
    `📞 *011 5483-5710*`,
    `📸 *@dockseventostigre*`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildUbicacionInfo(): string {
  return [
    `📍 *Ubicación — Docks Eventos*`,
    DSEP,
    `🏢 *Pedro Guareschi 22*`,
    `Tigre Centro, Buenos Aires`,
    `Dentro de *Docks del Puerto*`,
    ``,
    `🚗 Estacionamiento gratuito`,
    `🚂 8 min desde Estación Tigre`,
    ``,
    `📱 Buscá *"Docks del Puerto Tigre"* en Maps`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildPaquetesInfo(): string {
  return [
    `💎 *Paquetes — Docks Eventos*`,
    DSEP,
    ``,
    `🥉 *ESENCIAL* — hasta 100 invitados`,
    `Salón + ambientación + coordinador`,
    ``,
    `🥈 *PREMIUM* — hasta 250 invitados`,
    `Salón + catering + DJ + iluminación`,
    `+ ambientación + coordinación integral`,
    ``,
    `🥇 *ALL-INCLUSIVE* — hasta 400+`,
    `Espacio completo + gastronomía de autor`,
    `+ barra libre + música en vivo + foto/video`,
    `+ coordinación + wedding planner`,
    ``,
    DSEP,
    `_Precios según fecha, invitados y servicios._`,
    ``,
    `🎂  *1*  Consultar por tu evento`,
    `📅  *3*  Coordinar visita`,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildGaleriaInfo(): string {
  return [
    `📸 *Eventos realizados — Docks Eventos*`,
    DSEP,
    `Más de *200 eventos* con éxito:`,
    ``,
    `💒 Bodas · 🎂 Cumpleaños · 🎀 15 años`,
    `🏢 Corporativos · ✡️ Bar/Bat Mitzvá`,
    ``,
    `⭐ _"El lugar superó nuestras expectativas"_`,
    `⭐ _"Organizaron todo impecable"_`,
    ``,
    `📸 Más fotos en *@dockseventostigre*`,
    DSEP,
    `🎂  *1*  Consultar por tu evento`,
    `📅  *3*  Coordinar visita`,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildServiciosInfo(): string {
  return [
    `🎯 *Servicios — Docks Eventos*`,
    DSEP,
    `💒 Bodas · 🎂 Cumpleaños · 🎀 15 años`,
    `✡️ Bar/Bat Mitzvá · 🏢 Corporativos`,
    `🎉 Aniversarios y celebraciones`,
    ``,
    `*Incluye:*`,
    `• Catering y asado premium`,
    `• Ambientación y decoración`,
    `• Sonido e iluminación profesional`,
    `• DJ y música en vivo (opcional)`,
    `• Coordinación integral`,
    `• Estacionamiento`,
    DSEP,
    `📅  *3*  Coordinar visita`,
    `🎂  *1*  Consultar por tu evento`,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildHorariosInfo(): string {
  return [
    `🕐 *Horarios — Docks Eventos*`,
    DSEP,
    `📞 Lunes a Viernes 9:00–18:00`,
    `📞 Sábados 10:00–14:00`,
    `📱 WhatsApp: 24/7 (respondemos en horario laboral)`,
    ``,
    `🎉 Eventos: Viernes a Domingos y Feriados`,
    ``,
    `📞 *011 5483-5710*`,
    DSEP,
    `0️⃣  Volver`,
  ].join('\n')
}

export function buildSalirMessage(): string {
  return [
    `👋 *Hasta luego.*`,
    `Escribinos cuando necesites.`,
    `_Docks Eventos · Tigre_ ✨`,
  ].join('\n')
}

export { DSEP }
