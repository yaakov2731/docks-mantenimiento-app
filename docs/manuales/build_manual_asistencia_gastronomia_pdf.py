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
PDF_PATH = OUT_DIR / "Manual_Empleados_Gastronomia_Asistencia_Docks.pdf"

CHARCOAL = colors.HexColor("#272B30")
INK = colors.HexColor("#1F2328")
MUTED = colors.HexColor("#656D76")
GOLD = colors.HexColor("#AE812E")
LIGHT_GOLD = colors.HexColor("#FFF7E6")
LIGHT_GREEN = colors.HexColor("#EAF4EA")
LIGHT_GRAY = colors.HexColor("#F6F7F9")
BLUE_GRAY = colors.HexColor("#E8EEF5")
RULE = colors.HexColor("#D9DEE7")


class Rule(Flowable):
    def __init__(self, color=GOLD, width=1.5):
        super().__init__()
        self.color = color
        self.width = width
        self.height = 8
        self._draw_width = 0

    def wrap(self, availWidth, availHeight):
        self._draw_width = availWidth
        return availWidth, self.height

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.width)
        self.canv.line(0, 4, self._draw_width, 4)


def styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="Kicker",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=GOLD,
            spaceAfter=4,
            uppercase=True,
        )
    )
    base.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=29,
            textColor=CHARCOAL,
            alignment=TA_LEFT,
            spaceAfter=6,
        )
    )
    base.add(
        ParagraphStyle(
            name="Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11.5,
            leading=15,
            textColor=MUTED,
            spaceAfter=12,
        )
    )
    base.add(
        ParagraphStyle(
            name="Meta",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=GOLD,
            spaceAfter=14,
        )
    )
    base.add(
        ParagraphStyle(
            name="H1x",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15.5,
            leading=19,
            textColor=CHARCOAL,
            spaceBefore=14,
            spaceAfter=7,
        )
    )
    base.add(
        ParagraphStyle(
            name="Bodyx",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=14,
            textColor=INK,
            spaceAfter=6,
        )
    )
    base.add(
        ParagraphStyle(
            name="Small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=MUTED,
        )
    )
    base.add(
        ParagraphStyle(
            name="Cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            textColor=INK,
        )
    )
    base.add(
        ParagraphStyle(
            name="CellBold",
            parent=base["Cell"],
            fontName="Helvetica-Bold",
            textColor=CHARCOAL,
        )
    )
    base.add(
        ParagraphStyle(
            name="CenterSmall",
            parent=base["Small"],
            alignment=TA_CENTER,
        )
    )
    return base


def p(text, style):
    return Paragraph(text, style)


def bullet_list(items, style):
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=0) for item in items],
        bulletType="bullet",
        start=None,
        leftIndent=16,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=7,
        bulletColor=GOLD,
        spaceAfter=6,
    )


def numbered_list(items, style):
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=0) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=10,
        bulletColor=GOLD,
        spaceAfter=8,
    )


def note_box(title, body, style, fill=LIGHT_GOLD):
    table = Table(
        [[p(f"<b>{title}</b><br/>{body}", style)]],
        colWidths=[6.5 * inch],
        hAlign="CENTER",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#E4C77B")),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return [table, Spacer(1, 9)]


def flow_table(style):
    data = [
        [
            p("<font size='17' color='#AE812E'><b>1</b></font><br/><b>Enviar mensaje</b><br/><font color='#656D76'>Abrir el bot de WhatsApp.</font>", style),
            p("<font size='17' color='#AE812E'><b>2</b></font><br/><b>Elegir asistencia</b><br/><font color='#656D76'>Entrar al menú de fichada.</font>", style),
            p("<font size='17' color='#AE812E'><b>3</b></font><br/><b>Registrar acción</b><br/><font color='#656D76'>Entrada, almuerzo o salida.</font>", style),
            p("<font size='17' color='#AE812E'><b>4</b></font><br/><b>Revisar respuesta</b><br/><font color='#656D76'>Confirmar que diga registrado.</font>", style),
        ]
    ]
    table = Table(data, colWidths=[1.58 * inch] * 4, hAlign="CENTER")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.white),
                ("BACKGROUND", (1, 0), (1, 0), LIGHT_GRAY),
                ("BACKGROUND", (2, 0), (2, 0), colors.white),
                ("BACKGROUND", (3, 0), (3, 0), LIGHT_GRAY),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def action_table(cell, bold):
    data = [
        [p("<b>Acción</b>", bold), p("<b>Cuándo usarla</b>", bold), p("<b>Resultado</b>", bold)],
        [p("<b>Entrada</b>", cell), p("Cuando llegás al local y estás listo para empezar.", cell), p("Marca inicio del día.", cell)],
        [p("<b>Inicio de almuerzo</b>", cell), p("Cuando parás para almorzar.", cell), p("El tiempo deja de contar como trabajo.", cell)],
        [p("<b>Fin de almuerzo</b>", cell), p("Cuando volvés a trabajar.", cell), p("El sistema retoma el conteo.", cell)],
        [p("<b>Salida</b>", cell), p("Cuando termina tu turno.", cell), p("Cierra el registro del día.", cell)],
    ]
    table = Table(data, colWidths=[1.55 * inch, 3.08 * inch, 1.85 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLUE_GRAY),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def problem_table(cell, bold):
    data = [[p("<b>Situación</b>", bold), p("<b>Qué hacer</b>", bold)]]
    rows = [
        ("El bot no responde", "Esperá un minuto y reenviá <b>menu</b>. Si sigue igual, avisá al encargado."),
        ("Me equivoqué de opción", "Mandá <b>0</b> para volver o <b>menu</b> para empezar de nuevo."),
        ("No aparece mi nombre", "Avisá al encargado. Tu número debe estar dado de alta."),
        ("Fiché mal", "No lo arregles mandando mensajes repetidos. Avisá al encargado."),
        ("Cambié de local", "Avisá antes de fichar para que el registro entre al local correcto."),
    ]
    for left, right in rows:
        data.append([p(f"<b>{left}</b>", cell), p(right, cell)])
    table = Table(data, colWidths=[2.05 * inch, 4.43 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLUE_GRAY),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def page_footer(canvas, doc):
    canvas.saveState()
    width, _ = letter
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 0.43 * inch, "Docks del Puerto | Guía de asistencia gastronomía")
    canvas.drawRightString(width - doc.rightMargin, 0.43 * inch, f"Página {doc.page}")
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 0.58 * inch, width - doc.rightMargin, 0.58 * inch)
    canvas.restoreState()


def build_pdf():
    s = styles()
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        rightMargin=0.85 * inch,
        leftMargin=0.85 * inch,
        topMargin=0.72 * inch,
        bottomMargin=0.72 * inch,
        title="Manual Empleados Gastronomía - Asistencia Docks",
        author="Docks del Puerto",
    )

    story = []
    story.append(p("GUÍA RÁPIDA PARA EMPLEADOS", s["Kicker"]))
    story.append(p("Cómo fichar asistencia por WhatsApp", s["CoverTitle"]))
    story.append(p("Docks del Puerto - Polo Gastronómico | Entrada, almuerzo, salida y registro en planilla", s["Subtitle"]))
    story.append(p(f"Versión: {date.today().strftime('%d/%m/%Y')}  |  Documento interno", s["Meta"]))
    story.append(Rule())
    story.extend(
        note_box(
            "Objetivo",
            "Que cada empleado registre su asistencia desde WhatsApp de forma simple y correcta. El registro alimenta automáticamente la planilla de asistencia y las hojas de sueldos del local.",
            s["Bodyx"],
        )
    )

    story.append(KeepTogether([p("El circuito completo", s["H1x"]), flow_table(s["CenterSmall"])]))
    story.append(Spacer(1, 7))
    story.append(p("Qué tenés que hacer cada día", s["H1x"]))
    story.append(
        numbered_list(
            [
                "Al llegar al local, escribí al bot y entrá en <b>Registrar asistencia</b>.",
                "Elegí <b>Registrar entrada</b> y esperá la confirmación del bot.",
                "Si parás para almorzar, marcá <b>Inicio de almuerzo</b> antes de cortar.",
                "Cuando volvés del almuerzo, marcá <b>Fin de almuerzo</b>.",
                "Al terminar tu turno, marcá <b>Registrar salida</b>.",
            ],
            s["Bodyx"],
        )
    )
    story.extend(
        note_box(
            "Regla principal",
            "No fiches dos veces la misma acción. Si te equivocaste, avisale al encargado para corregirlo desde administración.",
            s["Bodyx"],
            fill=colors.HexColor("#FFF2CC"),
        )
    )
    story.append(PageBreak())
    story.append(p("Acciones del bot", s["H1x"]))
    story.append(action_table(s["Cell"], s["CellBold"]))

    story.append(p("Cómo usar el bot sin confundirte", s["H1x"]))
    story.append(
        bullet_list(
            [
                "Usá números cuando el bot muestra opciones.",
                "Si querés volver, mandá <b>0</b>.",
                "Si te perdiste, mandá <b>menu</b>.",
                "Leé la respuesta final del bot. Tiene que decir que quedó registrado.",
                "Si trabajás en otro local ese día, avisá antes de fichar.",
            ],
            s["Bodyx"],
        )
    )

    story.append(p("Qué pasa después de fichar", s["H1x"]))
    story.append(p("Cuando fichás, el sistema guarda el movimiento en la app y sincroniza la planilla de Google Sheets.", s["Bodyx"]))
    story.append(
        bullet_list(
            [
                "La pestaña <b>Asistencia_App</b> recibe el registro real.",
                "La pestaña de sueldos del local marca el día trabajado si el empleado y el local coinciden.",
                "<b>Planificación</b> queda solo para organizar la semana, no para liquidar.",
            ],
            s["Bodyx"],
        )
    )
    story.extend(
        note_box(
            "Importante para el pago",
            "Tu nombre debe estar bien cargado. Si el nombre está distinto en la planilla, el día puede no marcarse automáticamente.",
            s["Bodyx"],
            fill=LIGHT_GREEN,
        )
    )

    story.append(PageBreak())
    story.append(p("Errores comunes", s["H1x"]))
    story.append(problem_table(s["Cell"], s["CellBold"]))
    story.append(Spacer(1, 8))
    story.append(p("Checklist antes de irte", s["H1x"]))
    story.append(
        bullet_list(
            [
                "Registré mi salida.",
                "El bot confirmó que la salida quedó registrada.",
                "Avisé cualquier error de fichada al encargado.",
                "No mandé mensajes repetidos para corregir una fichada.",
            ],
            s["Bodyx"],
        )
    )
    story.extend(
        note_box(
            "Contacto interno",
            "Ante dudas o errores de asistencia, hablar con el encargado del local o administración antes del cierre de la jornada.",
            s["Bodyx"],
            fill=LIGHT_GRAY,
        )
    )

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(PDF_PATH)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    build_pdf()
