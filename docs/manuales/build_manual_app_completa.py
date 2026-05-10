from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUT_DIR = Path(__file__).resolve().parent
PDF_PATH = OUT_DIR / "Manual_Completo_App_y_Bots_Docks_del_Puerto.pdf"

CHARCOAL = colors.HexColor("#24282E")
INK = colors.HexColor("#1F2328")
MUTED = colors.HexColor("#646B75")
GOLD = colors.HexColor("#A87928")
LIGHT_GOLD = colors.HexColor("#FFF7E6")
BLUE_GRAY = colors.HexColor("#E8EEF5")
LIGHT_GRAY = colors.HexColor("#F6F7F9")
LIGHT_GREEN = colors.HexColor("#EAF4EA")
LIGHT_RED = colors.HexColor("#FDECEC")
RULE = colors.HexColor("#D9DEE7")
NAVY = colors.HexColor("#0F172A")


class Rule(Flowable):
    def __init__(self, color=GOLD, width=1.5, height=9):
        super().__init__()
        self.color = color
        self.width = width
        self.height = height
        self._draw_width = 0

    def wrap(self, availWidth, availHeight):
        self._draw_width = availWidth
        return availWidth, self.height

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.width)
        self.canv.line(0, self.height / 2, self._draw_width, self.height / 2)


def make_styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle("Kicker", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=GOLD, spaceAfter=4))
    s.add(ParagraphStyle("CoverTitle", parent=s["Title"], fontName="Helvetica-Bold", fontSize=25, leading=30, textColor=CHARCOAL, alignment=TA_LEFT, spaceAfter=8))
    s.add(ParagraphStyle("Subtitle", parent=s["Normal"], fontName="Helvetica", fontSize=11.2, leading=15, textColor=MUTED, spaceAfter=12))
    s.add(ParagraphStyle("Meta", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=GOLD, spaceAfter=14))
    s.add(ParagraphStyle("H1x", parent=s["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=CHARCOAL, spaceBefore=14, spaceAfter=7))
    s.add(ParagraphStyle("H2x", parent=s["Heading2"], fontName="Helvetica-Bold", fontSize=12.2, leading=15, textColor=GOLD, spaceBefore=9, spaceAfter=5))
    s.add(ParagraphStyle("Bodyx", parent=s["Normal"], fontName="Helvetica", fontSize=9.7, leading=12.8, textColor=INK, spaceAfter=5))
    s.add(ParagraphStyle("Small", parent=s["Normal"], fontName="Helvetica", fontSize=8.2, leading=10.4, textColor=MUTED, spaceAfter=3))
    s.add(ParagraphStyle("Cell", parent=s["Normal"], fontName="Helvetica", fontSize=8.5, leading=10.7, textColor=INK))
    s.add(ParagraphStyle("CellSmall", parent=s["Normal"], fontName="Helvetica", fontSize=7.8, leading=9.7, textColor=INK))
    s.add(ParagraphStyle("CellBold", parent=s["Cell"], fontName="Helvetica-Bold", textColor=CHARCOAL))
    s.add(ParagraphStyle("Center", parent=s["Cell"], alignment=TA_CENTER))
    return s


def P(text, style):
    return Paragraph(text, style)


def bullets(items, style):
    return ListFlowable(
        [ListItem(P(item, style), leftIndent=0) for item in items],
        bulletType="bullet",
        leftIndent=15,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=6,
        bulletColor=GOLD,
        spaceAfter=6,
    )


def nums(items, style):
    return ListFlowable(
        [ListItem(P(item, style), leftIndent=0) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=9,
        bulletColor=GOLD,
        spaceAfter=6,
    )


def note(title, body, style, fill=LIGHT_GOLD, border=colors.HexColor("#E4C77B")):
    t = Table([[P(f"<b>{title}</b><br/>{body}", style)]], colWidths=[6.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return [t, Spacer(1, 8)]


def table(data, widths, header=True, small=False):
    st = TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, RULE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])
    if header:
        st.add("BACKGROUND", (0, 0), (-1, 0), BLUE_GRAY)
        st.add("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold")
    t = Table(data, colWidths=[w * inch for w in widths], repeatRows=1 if header else 0)
    t.setStyle(st)
    return t


def section(title, s):
    return [P(title, s["H1x"]), Rule(color=RULE, width=0.8, height=6)]


def footer(canvas, doc):
    canvas.saveState()
    width, _ = letter
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 0.43 * inch, "Docks del Puerto | Manual completo app y bots")
    canvas.drawRightString(width - doc.rightMargin, 0.43 * inch, f"Pagina {doc.page}")
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 0.58 * inch, width - doc.rightMargin, 0.58 * inch)
    canvas.restoreState()


def build_pdf():
    s = make_styles()
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        rightMargin=0.85 * inch,
        leftMargin=0.85 * inch,
        topMargin=0.72 * inch,
        bottomMargin=0.72 * inch,
        title="Manual completo app y bots - Docks del Puerto",
        author="Docks del Puerto",
    )

    story = []
    story.append(P("MANUAL OPERATIVO INTERNO", s["Kicker"]))
    story.append(P("Sistema Docks del Puerto<br/>App web y bots de WhatsApp", s["CoverTitle"]))
    story.append(P("Guia completa de modulos, roles, pantallas y menus: asistencia, tareas, reclamos, leads, cobranzas, gastronomia, bot publico, bot comercial, bot admin y bot de empleados.", s["Subtitle"]))
    story.append(P(f"Version: {date.today().strftime('%d/%m/%Y')} | Uso interno", s["Meta"]))
    story.append(Rule())
    story.extend(note("Objetivo", "Que cada responsable sepa que modulo usar, que datos carga cada pantalla y que puede hacer cada bot. Este manual no reemplaza permisos internos: cada usuario ve solo lo que su rol tiene habilitado.", s["Bodyx"]))

    story.extend(section("Mapa general del sistema", s))
    story.append(table([
        [P("<b>Area</b>", s["CellBold"]), P("<b>Para que sirve</b>", s["CellBold"]), P("<b>Usuarios principales</b>", s["CellBold"])],
        [P("Panel web", s["CellBold"]), P("Operacion diaria, reclamos, asistencia, empleados, reportes, leads y configuracion.", s["Cell"]), P("Admin, empleados, ventas, cobranzas", s["Cell"])],
        [P("Bot publico", s["CellBold"]), P("Atiende a personas no registradas: alquileres, visitas, ubicacion, asesor comercial y reclamos de locatarios.", s["Cell"]), P("Publico externo y locatarios", s["Cell"])],
        [P("Bot admin", s["CellBold"]), P("Gestion rapida desde WhatsApp: reclamos, operacion diaria, rondas y comercial.", s["Cell"]), P("Admin / gerente", s["Cell"])],
        [P("Bot empleados", s["CellBold"]), P("Tareas, asistencia, almuerzo, salida y rondas asignadas.", s["Cell"]), P("Operativos", s["Cell"])],
        [P("Bot ventas", s["CellBold"]), P("Bandeja, mis leads, nuevo lead, estado y notas comerciales.", s["Cell"]), P("Equipo comercial", s["Cell"])],
        [P("Bot gastronomia", s["CellBold"]), P("Fichada por local gastronomico y sincronizacion con Asistencia_App para sueldos.", s["Cell"]), P("Empleados de gastronomia", s["Cell"])],
    ], [1.35, 3.35, 1.8]))

    roles_block = [
        P("Roles y accesos", s["H1x"]),
        table([
        [P("<b>Rol</b>", s["CellBold"]), P("<b>Acceso principal</b>", s["CellBold"]), P("<b>Notas</b>", s["CellBold"])],
        [P("Admin", s["CellBold"]), P("Dashboard, asistencia, operaciones, tareas, gastronomia, leads, historial, empleados, configuracion, cobranzas.", s["Cell"]), P("Gestion completa del sistema.", s["Cell"])],
        [P("Empleado", s["CellBold"]), P("Dashboard, mis tareas, historial y formulario publico.", s["Cell"]), P("El trabajo diario se maneja principalmente desde WhatsApp.", s["Cell"])],
        [P("Ventas", s["CellBold"]), P("Leads Alquiler.", s["Cell"]), P("Gestion comercial de prospectos asignados.", s["Cell"])],
        [P("Cobranzas", s["CellBold"]), P("Modulo Cobranzas.", s["Cell"]), P("Acceso directo a /cobranzas.", s["Cell"])],
    ], [1.25, 3.2, 2.05]),
    ]
    story.append(KeepTogether(roles_block))

    story.extend(section("Panel web: modulos principales", s))
    web_rows = [
        ("Formulario publico", "/", "Carga inicial de reclamos o consultas desde una pantalla abierta."),
        ("Dashboard", "/dashboard", "Resumen general de actividad, indicadores y estado operativo."),
        ("Asistencia", "/asistencia", "Control administrativo de entrada, salida, almuerzo, turnos, resumen e impresion."),
        ("Operaciones", "/operaciones", "Vista de control operativo, rondas y gestion diaria del equipo."),
        ("Tareas operativas", "/tareas-operativas", "Tareas manuales u operativas: creacion, seguimiento y estado."),
        ("Mis tareas", "/tareas", "Listado de tareas/reclamos asignados al usuario."),
        ("Gastronomia", "/gastronomia/personal", "Personal, asistencia y liquidacion del polo gastronomico."),
        ("Leads Alquiler", "/leads", "Bandeja comercial: estado, asignacion, seguimiento y notas."),
        ("Historial", "/historial", "Consulta historica de actividad y movimientos."),
        ("Empleados", "/empleados", "Alta, edicion y control de empleados y datos de WhatsApp."),
        ("Configuracion", "/configuracion", "Parametros del sistema y comportamiento del bot."),
        ("Bot Comercial", "/bot-comercial", "Control y estado de flujos comerciales/autorespuesta."),
        ("Cobranzas", "/cobranzas", "Panel de cobranza y seguimiento administrativo."),
    ]
    story.append(table(
        [[P("<b>Modulo</b>", s["CellBold"]), P("<b>Ruta</b>", s["CellBold"]), P("<b>Uso</b>", s["CellBold"])]] +
        [[P(a, s["CellBold"]), P(b, s["CellSmall"]), P(c, s["Cell"])] for a, b, c in web_rows],
        [1.65, 1.45, 3.4],
    ))

    story.append(P("Gastronomia y sueldos", s["H1x"]))
    story.append(table([
        [P("<b>Pantalla / hoja</b>", s["CellBold"]), P("<b>Uso correcto</b>", s["CellBold"])],
        [P("Personal", s["CellBold"]), P("Mantener empleados, local/sector y datos necesarios para que el bot identifique la fichada.", s["Cell"])],
        [P("Asistencia", s["CellBold"]), P("Revisar movimientos reales de entrada, salida y almuerzo.", s["Cell"])],
        [P("Liquidacion", s["CellBold"]), P("Controlar dias trabajados y montos a pagar por periodo/local.", s["Cell"])],
        [P("Asistencia_App", s["CellBold"]), P("Fuente real de Google Sheets donde el bot registra asistencia.", s["Cell"])],
        [P("Planificacion", s["CellBold"]), P("Solo planear la semana. No debe usarse como fuente real de pago.", s["Cell"])],
        [P("Sueldos_*", s["CellBold"]), P("Lee automaticamente Asistencia_App y marca dias trabajados por local.", s["Cell"])],
    ], [1.85, 4.65]))

    story.extend(note("Regla de datos", "No borrar registros productivos ni modificar planillas de sueldos sin revisar el impacto. La asistencia real se origina en app/bot y se sincroniza a Google Sheets.", s["Bodyx"], fill=LIGHT_GREEN, border=colors.HexColor("#8AB98A")))

    story.append(PageBreak())
    story.extend(section("Bot publico y comercial", s))
    story.append(P("Este bot atiende a personas no registradas. Su objetivo es convertir consultas en leads accionables y derivar locatarios que necesitan ayuda.", s["Bodyx"]))
    story.append(table([
        [P("<b>Opcion</b>", s["CellBold"]), P("<b>Flujo</b>", s["CellBold"]), P("<b>Datos que pide / resultado</b>", s["CellBold"])],
        [P("1", s["Center"]), P("Quiero alquilar un local", s["CellBold"]), P("7 preguntas: nombre, marca, rubro, Instagram/web, tipo de espacio, fecha de inicio y forma de seguimiento. Calcula score y temperatura.", s["Cell"])],
        [P("2", s["Center"]), P("Coordinar visita", s["CellBold"]), P("Pide nombre, marca/rubro y preferencia horaria. Crea lead y notifica admins.", s["Cell"])],
        [P("3", s["Center"]), P("Como llegar / horarios", s["CellBold"]), P("Muestra direccion, link de Google Maps y horario. Permite pasar a visita o asesor.", s["Cell"])],
        [P("4", s["Center"]), P("Hablar con asesor comercial", s["CellBold"]), P("Pide nombre y consulta. Crea lead de asesor comercial.", s["Cell"])],
        [P("5", s["Center"]), P("Soy locatario / necesito ayuda", s["CellBold"]), P("Pide nombre/local y descripcion del problema. Crea reclamo/lead para derivacion.", s["Cell"])],
        [P("0", s["Center"]), P("Salir", s["CellBold"]), P("Cierra el flujo actual.", s["Cell"])],
    ], [0.65, 2.0, 3.85]))

    story.append(P("Preguntas del flujo alquiler", s["H2x"]))
    story.append(nums([
        "Nombre y apellido.",
        "Nombre de marca o comercio.",
        "Rubro: indumentaria, calzado, deco, belleza, infantil, arte, regalos u otro.",
        "Instagram o pagina web.",
        "Tipo de espacio: local, stand/modulo, exterior o no definido.",
        "Desde cuando quiere comenzar.",
        "Seguimiento: visita, llamada o informacion por WhatsApp.",
    ], s["Bodyx"]))

    story.append(P("Resultado comercial", s["H2x"]))
    story.append(bullets([
        "El sistema registra el lead en el panel.",
        "Clasifica el interes como caliente, tibio, frio o no apto.",
        "Notifica a administradores con resumen y urgencia.",
        "El equipo puede asignarlo a ventas desde el panel o desde el bot admin.",
    ], s["Bodyx"]))

    story.append(PageBreak())
    story.extend(section("Bot admin / gerente", s))
    story.append(P("Menu principal admin", s["H2x"]))
    story.append(table([
        [P("<b>Opcion</b>", s["CellBold"]), P("<b>Area</b>", s["CellBold"]), P("<b>Que permite hacer</b>", s["CellBold"])],
        [P("1", s["Center"]), P("Reclamos", s["CellBold"]), P("Ver pendientes, urgentes sin asignar, sin asignar y SLA vencidos.", s["Cell"])],
        [P("2", s["Center"]), P("Operacion diaria", s["CellBold"]), P("Ver estado general del dia y asignar tarea a empleado.", s["Cell"])],
        [P("3", s["Center"]), P("Rondas de banos", s["CellBold"]), P("Ver rondas, sin asignar, por empleado, asignar, reasignar o liberar.", s["Cell"])],
        [P("4", s["Center"]), P("Comercial", s["CellBold"]), P("Ver leads sin asignar, asignar vendedor y activar/desactivar autorespuesta.", s["Cell"])],
        [P("0", s["Center"]), P("Ayuda", s["CellBold"]), P("Muestra comandos globales y uso del bot.", s["Cell"])],
    ], [0.65, 1.7, 4.15]))

    story.append(P("Reclamos desde el bot admin", s["H2x"]))
    story.append(table([
        [P("<b>Pantalla</b>", s["CellBold"]), P("<b>Acciones</b>", s["CellBold"])],
        [P("Lista", s["CellBold"]), P("Pendientes, urgentes sin asignar, sin asignar, SLA vencidos. Paginacion con 8/9.", s["Cell"])],
        [P("Detalle", s["CellBold"]), P("Asignar empleado, cambiar prioridad, ver descripcion completa o cancelar reclamo.", s["Cell"])],
        [P("Asignacion", s["CellBold"]), P("Lista empleados activos, confirma asignacion y notifica al empleado por WhatsApp.", s["Cell"])],
        [P("Prioridad", s["CellBold"]), P("Baja, media, alta o urgente.", s["Cell"])],
    ], [1.55, 4.95]))

    story.append(P("Operacion diaria y tareas", s["H2x"]))
    story.append(bullets([
        "Estado general: reclamos abiertos, urgentes, SLA vencidos, tareas operativas, empleados activos, bot conectado y mensajes en cola.",
        "Nueva tarea: elegir empleado, escribir descripcion, elegir prioridad y confirmar.",
        "Al confirmar, se crea la tarea operativa y se notifica al empleado si tiene WhatsApp registrado.",
    ], s["Bodyx"]))

    story.append(PageBreak())
    story.extend(section("Bot admin: rondas y comercial", s))
    story.append(P("Rondas de banos", s["H2x"]))
    story.append(table([
        [P("<b>Opcion</b>", s["CellBold"]), P("<b>Funcion</b>", s["CellBold"]), P("<b>Detalle</b>", s["CellBold"])],
        [P("1", s["Center"]), P("Ver rondas del dia", s["CellBold"]), P("Lista todas las ocurrencias visibles del dia.", s["Cell"])],
        [P("2", s["Center"]), P("Ver sin asignar", s["CellBold"]), P("Filtra rondas sin responsable actual.", s["Cell"])],
        [P("3", s["Center"]), P("Ver por empleado", s["CellBold"]), P("Muestra asignadas y en curso por empleado.", s["Cell"])],
        [P("4", s["Center"]), P("Crear desde app", s["CellBold"]), P("Aclara que las programaciones nuevas se crean desde Operaciones en web.", s["Cell"])],
        [P("Detalle", s["Center"]), P("Asignar / reasignar / liberar", s["CellBold"]), P("Gestiona responsable actual de la ronda del dia.", s["Cell"])],
    ], [0.75, 2.0, 3.75]))

    story.append(P("Comercial desde bot admin", s["H2x"]))
    story.append(table([
        [P("<b>Funcion</b>", s["CellBold"]), P("<b>Uso</b>", s["CellBold"])],
        [P("Leads sin asignar", s["CellBold"]), P("Muestra leads disponibles, telefono, rubro, estado, fecha y tiempo sin respuesta.", s["Cell"])],
        [P("Detalle de lead", s["CellBold"]), P("Permite asignar a vendedor.", s["Cell"])],
        [P("Elegir vendedor", s["CellBold"]), P("Lista usuarios con rol sales.", s["Cell"])],
        [P("Confirmar", s["CellBold"]), P("Asigna lead y notifica al vendedor por WhatsApp.", s["Cell"])],
        [P("Bot autorespuesta", s["CellBold"]), P("Activar/desactivar seguimientos automaticos y ver delays configurados.", s["Cell"])],
    ], [2.0, 4.5]))

    story.extend(note("Uso recomendado del bot admin", "Usarlo para decisiones rapidas desde el celular. Para creacion masiva, revision historica o edicion fina, usar el panel web.", s["Bodyx"]))

    story.append(PageBreak())
    story.extend(section("Bot de empleados operativos", s))
    story.append(P("Menu principal empleado", s["H2x"]))
    story.append(table([
        [P("<b>Opcion</b>", s["CellBold"]), P("<b>Modulo</b>", s["CellBold"]), P("<b>Uso</b>", s["CellBold"])],
        [P("1", s["Center"]), P("Ver mi tarea actual", s["CellBold"]), P("Muestra la tarea mas importante: pendiente de aceptar, en progreso, pausada o pendiente.", s["Cell"])],
        [P("2", s["Center"]), P("Ver todas mis tareas", s["CellBold"]), P("Lista reclamos y tareas operativas asignadas.", s["Cell"])],
        [P("3", s["Center"]), P("Registrar asistencia", s["CellBold"]), P("Entrada, salida, inicio/fin de almuerzo y resumen del dia.", s["Cell"])],
        [P("4", s["Center"]), P("Control de banos", s["CellBold"]), P("Rondas asignadas, iniciar, pausar, finalizar o informar desvio.", s["Cell"])],
        [P("0", s["Center"]), P("Ayuda", s["CellBold"]), P("Comandos globales.", s["Cell"])],
    ], [0.65, 1.9, 3.95]))

    story.append(P("Tareas y reclamos del empleado", s["H2x"]))
    story.append(table([
        [P("<b>Estado</b>", s["CellBold"]), P("<b>Acciones disponibles</b>", s["CellBold"])],
        [P("Pendiente de confirmacion", s["CellBold"]), P("Aceptar e iniciar, rechazar/no puedo tomarla, ver detalle completo.", s["Cell"])],
        [P("En progreso", s["CellBold"]), P("Finalizar, pausar, agregar nota o reportar problema.", s["Cell"])],
        [P("Pausada", s["CellBold"]), P("Retomar, completar o agregar nota.", s["Cell"])],
        [P("Pendiente", s["CellBold"]), P("Iniciar tarea o ver detalle.", s["Cell"])],
    ], [2.1, 4.4]))

    story.append(P("Motivos de pausa / problema", s["H2x"]))
    story.append(bullets([
        "Pausa: espera de materiales, almuerzo, requiere mas personal, sin acceso al local u otro motivo.",
        "Problema: materiales, ayuda de otro empleado, acceso bloqueado, problema electrico/tecnico u otra nota.",
        "Las notas quedan registradas en el historial de la tarea.",
    ], s["Bodyx"]))

    story.append(PageBreak())
    story.extend(section("Bot empleados: asistencia y rondas", s))
    story.append(P("Asistencia", s["H2x"]))
    story.append(table([
        [P("<b>Opcion</b>", s["CellBold"]), P("<b>Accion</b>", s["CellBold"]), P("<b>Regla</b>", s["CellBold"])],
        [P("1", s["Center"]), P("Registrar entrada", s["CellBold"]), P("Abre turno. En entrada puede autoasignar tareas del pool.", s["Cell"])],
        [P("2", s["Center"]), P("Registrar salida", s["CellBold"]), P("Cierra turno. Si esta en almuerzo, primero debe finalizar almuerzo.", s["Cell"])],
        [P("3", s["Center"]), P("Inicio de almuerzo", s["CellBold"]), P("Solo si hay turno activo y no hay almuerzo activo.", s["Cell"])],
        [P("4", s["Center"]), P("Fin de almuerzo", s["CellBold"]), P("Solo si hay almuerzo activo.", s["Cell"])],
        [P("5", s["Center"]), P("Resumen del dia", s["CellBold"]), P("Entrada, salida, tiempo trabajado y almuerzo.", s["Cell"])],
    ], [0.65, 1.9, 3.95]))

    story.append(P("Rondas para empleados", s["H2x"]))
    story.append(table([
        [P("<b>Estado ronda</b>", s["CellBold"]), P("<b>Acciones</b>", s["CellBold"])],
        [P("Pendiente", s["CellBold"]), P("Iniciar ronda o informar que no pudo hacerla.", s["Cell"])],
        [P("En progreso", s["CellBold"]), P("Pausar, finalizar, finalizar con observacion o no pude hacerla.", s["Cell"])],
        [P("Pausada", s["CellBold"]), P("Reanudar, finalizar, finalizar con observacion o no pude hacerla.", s["Cell"])],
        [P("Observaciones", s["CellBold"]), P("Falta papel/toallas, falta jabon, desperfecto, suciedad excesiva u observacion libre.", s["Cell"])],
        [P("No pude hacerla", s["CellBold"]), P("Ocupado con otra tarea, almuerzo/no disponible u otro motivo.", s["Cell"])],
    ], [1.9, 4.6]))

    story.append(P("Comandos globales del bot", s["H2x"]))
    story.append(bullets([
        "<b>0</b>: vuelve al menu anterior.",
        "<b>menu</b> o <b>inicio</b>: vuelve al menu principal.",
        "La sesion se reinicia si no hay respuesta durante unos minutos.",
        "Conviene responder con numeros cuando el bot muestra opciones.",
    ], s["Bodyx"]))

    story.append(PageBreak())
    story.extend(section("Bot gastronomia", s))
    story.append(P("El bot de gastronomia registra asistencia por local y sincroniza con Google Sheets para liquidacion.", s["Bodyx"]))
    story.append(table([
        [P("<b>Opcion</b>", s["CellBold"]), P("<b>Accion</b>", s["CellBold"]), P("<b>Impacto</b>", s["CellBold"])],
        [P("1", s["Center"]), P("Entrada", s["CellBold"]), P("Registra entrada en app y escribe/actualiza Asistencia_App.", s["Cell"])],
        [P("2", s["Center"]), P("Salida", s["CellBold"]), P("Registra salida y cierra el turno del dia.", s["Cell"])],
        [P("3", s["Center"]), P("Inicio almuerzo", s["CellBold"]), P("Marca corte de almuerzo.", s["Cell"])],
        [P("4", s["Center"]), P("Fin almuerzo", s["CellBold"]), P("Marca vuelta al trabajo.", s["Cell"])],
        [P("0", s["Center"]), P("Volver", s["CellBold"]), P("Regresa al menu anterior.", s["Cell"])],
    ], [0.65, 1.65, 4.2]))

    story.append(P("Locales / hojas de sueldos", s["H2x"]))
    story.append(table([
        [P("<b>Local</b>", s["CellBold"]), P("<b>Hoja de sueldo</b>", s["CellBold"]), P("<b>Fuente</b>", s["CellBold"])],
        [P("UMO Grill", s["CellBold"]), P("Sueldos_UMO", s["Cell"]), P("Asistencia_App", s["Cell"])],
        [P("Trento Cafe", s["CellBold"]), P("Sueldos_TRENTO", s["Cell"]), P("Asistencia_App", s["Cell"])],
        [P("Brooklyn", s["CellBold"]), P("Sueldos_BROOKLYN", s["Cell"]), P("Asistencia_App", s["Cell"])],
        [P("Heladeria", s["CellBold"]), P("Sueldos_HELADERIA", s["Cell"]), P("Asistencia_App", s["Cell"])],
        [P("Inflables", s["CellBold"]), P("Sueldos_INFLABLES", s["Cell"]), P("Asistencia_App", s["Cell"])],
    ], [1.7, 2.2, 2.6]))

    story.extend(note("Condicion para que marque sueldos", "El local, empleado y fecha deben coincidir. Si el nombre del empleado no coincide con la hoja de sueldos, el dia puede no marcarse automaticamente.", s["Bodyx"], fill=LIGHT_GREEN, border=colors.HexColor("#8AB98A")))

    story.append(PageBreak())
    story.extend(section("Bot ventas", s))
    story.append(table([
        [P("<b>Opcion</b>", s["CellBold"]), P("<b>Modulo</b>", s["CellBold"]), P("<b>Uso</b>", s["CellBold"])],
        [P("1", s["Center"]), P("Bandeja de entrada", s["CellBold"]), P("Muestra leads nuevos propios y leads libres para tomar.", s["Cell"])],
        [P("2", s["Center"]), P("Registrar nuevo lead", s["CellBold"]), P("Wizard de 4 pasos: nombre, telefono, rubro, comentario.", s["Cell"])],
        [P("3", s["Center"]), P("Todos mis leads", s["CellBold"]), P("Lista leads asignados con estado y tiempo de respuesta.", s["Cell"])],
        [P("0", s["Center"]), P("Ayuda", s["CellBold"]), P("Uso general del bot.", s["Cell"])],
    ], [0.65, 1.9, 3.95]))

    story.append(P("Detalle de lead para ventas", s["H2x"]))
    story.append(table([
        [P("<b>Accion</b>", s["CellBold"]), P("<b>Resultado</b>", s["CellBold"])],
        [P("Marcar como contactado", s["CellBold"]), P("Actualiza estado a contactado y guarda tiempo de respuesta.", s["Cell"])],
        [P("Marcar que visito", s["CellBold"]), P("Pasa el lead a estado visito.", s["Cell"])],
        [P("Cerrar", s["CellBold"]), P("Marca negocio concretado/cerrado.", s["Cell"])],
        [P("Descartar", s["CellBold"]), P("Saca el lead del flujo activo.", s["Cell"])],
        [P("Agregar nota", s["CellBold"]), P("Guarda informacion comercial adicional.", s["Cell"])],
        [P("Tomar lead libre", s["CellBold"]), P("Asigna el lead al vendedor si sigue disponible.", s["Cell"])],
    ], [2.1, 4.4]))

    story.append(P("Nuevo lead por ventas", s["H2x"]))
    story.append(nums([
        "Nombre del interesado.",
        "Telefono o WhatsApp, o sin dato.",
        "Rubro: gastronomia, indumentaria, belleza, retail, deporte, servicios u otro.",
        "Comentario adicional o listo.",
        "Confirmar y guardar.",
    ], s["Bodyx"]))

    story.append(PageBreak())
    story.extend(section("Cobranzas, historial y configuracion", s))
    story.append(table([
        [P("<b>Modulo</b>", s["CellBold"]), P("<b>Uso operativo</b>", s["CellBold"]), P("<b>Cuidado</b>", s["CellBold"])],
        [P("Cobranzas", s["CellBold"]), P("Seguimiento administrativo de pagos/cobros segun rol collections o admin.", s["Cell"]), P("No modificar registros sin respaldo.", s["Cell"])],
        [P("Historial", s["CellBold"]), P("Consultar movimientos, tareas y registros pasados.", s["Cell"]), P("Usar para auditoria antes de corregir.", s["Cell"])],
        [P("Empleados", s["CellBold"]), P("Alta y edicion de usuarios, especialidad, WhatsApp, activo/inactivo y rol.", s["Cell"]), P("El WhatsApp correcto habilita bot.", s["Cell"])],
        [P("Configuracion", s["CellBold"]), P("Parametros del sistema, bot y comportamiento operativo.", s["Cell"]), P("Cambios impactan produccion.", s["Cell"])],
        [P("Impresiones", s["CellBold"]), P("Reclamos y asistencia para archivo o entrega.", s["Cell"]), P("Verificar periodo antes de imprimir.", s["Cell"])],
    ], [1.5, 3.25, 1.75]))

    story.append(P("Buenas practicas generales", s["H1x"]))
    story.append(bullets([
        "Usar el panel web para revisiones completas y el bot para acciones rapidas.",
        "No borrar datos productivos. Cancelar, pausar, liberar o reasignar deja mejor trazabilidad.",
        "Mantener empleados y numeros de WhatsApp actualizados.",
        "En reclamos urgentes, asignar responsable y revisar SLA.",
        "En leads calientes, contactar rapido y dejar nota.",
        "En gastronomia, revisar nombres/locales antes del cierre de pago.",
        "Ante una fichada incorrecta, corregir desde administracion; no pedir al empleado que mande mensajes repetidos.",
    ], s["Bodyx"]))

    story.extend(note("Cierre del dia recomendado", "Revisar asistencia, tareas en progreso/pausadas, rondas vencidas, reclamos urgentes, leads nuevos sin respuesta y registros de gastronomia antes de liquidar o cerrar la jornada.", s["Bodyx"], fill=LIGHT_RED, border=colors.HexColor("#D98C8C")))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(PDF_PATH)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    build_pdf()
