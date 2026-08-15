from __future__ import annotations

from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


INK = colors.HexColor("#17322D")
INK_SOFT = colors.HexColor("#36534D")
ACCENT = colors.HexColor("#C8F05A")
MINT = colors.HexColor("#EAF5EF")
CREAM = colors.HexColor("#F7F4EC")
LINE = colors.HexColor("#D8E2DD")
PEACH = colors.HexColor("#FFF0E7")
WHITE = colors.white


def _text(value: Any) -> str:
    if value is None:
        return ""
    return escape(str(value)).replace("\n", "<br/>")


def _list_text(items: list[str]) -> str:
    return "<br/>".join(f"- {_text(item)}" for item in items if item)


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9,
            leading=12, textColor=INK_SOFT, spaceAfter=5, uppercase=True,
        ),
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=28,
            leading=32, textColor=INK, alignment=TA_LEFT, spaceAfter=10,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle", parent=base["Normal"], fontName="Helvetica", fontSize=12,
            leading=17, textColor=INK_SOFT, spaceAfter=16,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=20,
            leading=24, textColor=INK, spaceBefore=4, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=14,
            leading=18, textColor=INK, spaceBefore=9, spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=11,
            leading=14, textColor=INK, spaceBefore=4, spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2,
            leading=13, textColor=INK_SOFT, spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small", parent=base["BodyText"], fontName="Helvetica", fontSize=7.7,
            leading=10, textColor=INK_SOFT,
        ),
        "small_bold": ParagraphStyle(
            "small_bold", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=7.8,
            leading=10, textColor=INK,
        ),
        "table": ParagraphStyle(
            "table", parent=base["BodyText"], fontName="Helvetica", fontSize=7.4,
            leading=9.6, textColor=INK,
        ),
        "table_bold": ParagraphStyle(
            "table_bold", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=7.6,
            leading=9.8, textColor=INK,
        ),
        "table_header": ParagraphStyle(
            "table_header", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=7.6,
            leading=9.8, textColor=WHITE,
        ),
        "callout": ParagraphStyle(
            "callout", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5,
            leading=12, textColor=INK, leftIndent=2, rightIndent=2,
        ),
        "center": ParagraphStyle(
            "center", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=10,
            leading=14, textColor=INK, alignment=TA_CENTER,
        ),
    }


def _header_footer(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFillColor(INK_SOFT)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 10.5 * mm, "trainingsprofil - persönlicher Trainingsplan")
    canvas.drawRightString(width - 18 * mm, 10.5 * mm, f"Seite {doc.page}")
    canvas.restoreState()


class TrainingPlanDocTemplate(BaseDocTemplate):
    def __init__(self, buffer: BytesIO, title: str):
        super().__init__(
            buffer,
            pagesize=A4,
            rightMargin=18 * mm,
            leftMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=21 * mm,
            title=title,
            author="trainingsprofil",
            subject="Personalisierter Trainingsplan",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="normal",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(PageTemplate(id="training-plan", frames=[frame], onPage=_header_footer))


def _summary_card(label: str, value: str, styles: dict[str, ParagraphStyle]) -> Table:
    table = Table(
        [[Paragraph(_text(label), styles["small"]), Paragraph(_text(value), styles["h3"])]],
        colWidths=[37 * mm, 47 * mm],
        rowHeights=[18 * mm],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), MINT),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _callout(title: str, items: list[str], styles: dict[str, ParagraphStyle], background=PEACH) -> Table:
    content = [Paragraph(f"<b>{_text(title)}</b>", styles["callout"])]
    if items:
        content.append(Spacer(1, 2 * mm))
        content.append(Paragraph(_list_text(items), styles["callout"]))
    table = Table([[content]], colWidths=[174 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def _week_overview(week: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    rows = [[
        Paragraph("Tag", styles["table_header"]),
        Paragraph("Einheit", styles["table_header"]),
        Paragraph("Dauer", styles["table_header"]),
        Paragraph("Intensität", styles["table_header"]),
    ]]
    for session in week.get("sessions", []):
        rows.append([
            Paragraph(f"{_text(session.get('weekday'))}<br/>{_text(session.get('date'))}", styles["table"]),
            Paragraph(f"<b>{_text(session.get('title'))}</b><br/>{_text(session.get('discipline'))}", styles["table"]),
            Paragraph(f"{_text(session.get('durationMinutes'))} Min.", styles["table"]),
            Paragraph(_text(session.get("intensity", {}).get("rpe", "")), styles["table"]),
        ])
    table = Table(rows, colWidths=[28 * mm, 87 * mm, 24 * mm, 35 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, CREAM]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _strength_table(exercises: list[dict[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    rows = [[
        Paragraph("Übung", styles["table_header"]),
        Paragraph("Sätze / Wiederholungen", styles["table_header"]),
        Paragraph("Pause / RPE", styles["table_header"]),
        Paragraph("Hinweise / Alternativen", styles["table_header"]),
    ]]
    for exercise in exercises:
        notes = exercise.get("notes", [])
        alternatives = [item.get("name", "") for item in exercise.get("alternatives", []) if item.get("name")]
        detail_lines = []
        if exercise.get("pattern"):
            detail_lines.append(f"<font color='#36534D'>{_text(exercise['pattern'])}</font>")
        if exercise.get("equipment"):
            detail_lines.append(_text(", ".join(exercise["equipment"])))
        right = []
        if notes:
            right.append(_list_text(notes))
        if alternatives:
            right.append(f"<b>Alternativen:</b> {_text(', '.join(alternatives))}")
        rows.append([
            Paragraph(f"<b>{_text(exercise.get('name'))}</b><br/>{'<br/>'.join(detail_lines)}", styles["table"]),
            Paragraph(f"{_text(exercise.get('sets'))} x {_text(exercise.get('reps'))}<br/>Tempo: {_text(exercise.get('tempo'))}", styles["table"]),
            Paragraph(f"{_text(exercise.get('restSeconds'))} Sek.<br/>{_text(exercise.get('targetRpe'))}", styles["table"]),
            Paragraph("<br/>".join(right) if right else "-", styles["table"]),
        ])
    table = Table(rows, colWidths=[49 * mm, 39 * mm, 26 * mm, 60 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, CREAM]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _endurance_table(items: list[dict[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    rows = [[
        Paragraph("Abschnitt", styles["table_header"]),
        Paragraph("Umfang", styles["table_header"]),
        Paragraph("Intensität", styles["table_header"]),
        Paragraph("Ausführung", styles["table_header"]),
    ]]
    for item in items:
        rows.append([
            Paragraph(f"<b>{_text(item.get('title'))}</b>", styles["table"]),
            Paragraph(_text(item.get("dose")), styles["table"]),
            Paragraph(_text(item.get("intensity")), styles["table"]),
            Paragraph(_text(item.get("details")), styles["table"]),
        ])
    table = Table(rows, colWidths=[40 * mm, 38 * mm, 28 * mm, 68 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, CREAM]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _session_story(session: dict[str, Any], styles: dict[str, ParagraphStyle]) -> list[Any]:
    intensity = session.get("intensity", {})
    header = Table([
        [
            Paragraph(f"<b>{_text(session.get('weekday'))}, {_text(session.get('date'))}</b><br/>{_text(session.get('discipline'))}", styles["small"]),
            Paragraph(f"<b>{_text(session.get('durationMinutes'))} Min.</b><br/>{_text(intensity.get('rpe'))}", styles["small"]),
        ]
    ], colWidths=[132 * mm, 42 * mm])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), MINT),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story: list[Any] = [
        Spacer(1, 3 * mm),
        header,
        Paragraph(_text(session.get("title")), styles["h2"]),
        Paragraph(f"<b>Ziel:</b> {_text(session.get('objective'))}", styles["body"]),
    ]
    if session.get("coachNote"):
        story.append(Paragraph(f"<b>Coaching:</b> {_text(session.get('coachNote'))}", styles["body"]))

    for block in session.get("blocks", []):
        story.append(Paragraph(_text(block.get("title", "Hauptteil")), styles["h3"]))
        if block.get("instructions"):
            story.append(Paragraph(_text(block["instructions"]), styles["small"]))
        if block.get("exercises"):
            story.append(Spacer(1, 1.5 * mm))
            story.append(_strength_table(block["exercises"], styles))
        elif block.get("items"):
            story.append(Spacer(1, 1.5 * mm))
            story.append(_endurance_table(block["items"], styles))

    if session.get("adaptations"):
        story.append(Spacer(1, 3 * mm))
        story.append(_callout("Persönliche Anpassungen", session["adaptations"], styles, background=PEACH))
    return story


def render_plan_pdf(plan: dict[str, Any]) -> bytes:
    styles = _styles()
    buffer = BytesIO()
    doc = TrainingPlanDocTemplate(buffer, plan.get("title", "Trainingsplan"))
    story: list[Any] = []

    # Cover
    logo = Table([[Paragraph("TP", styles["center"])]], colWidths=[18 * mm], rowHeights=[18 * mm])
    logo.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
        ("BOX", (0, 0), (-1, -1), 0, ACCENT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.extend([
        Spacer(1, 8 * mm),
        logo,
        Spacer(1, 14 * mm),
        Paragraph("DEIN PERSÖNLICHER TRAININGSPLAN", styles["cover_kicker"]),
        Paragraph(_text(plan.get("title")), styles["cover_title"]),
        Paragraph(_text(plan.get("subtitle")), styles["cover_subtitle"]),
    ])

    snapshot = plan.get("athleteSnapshot", {})
    name = snapshot.get("firstName") or "Trainierende Person"
    cards = Table([
        [_summary_card("Für", name, styles), _summary_card("Zeitraum", f"{plan.get('startsOn')} bis {plan.get('endsOn')}", styles)],
        [_summary_card("Ziel", snapshot.get("goal", ""), styles), _summary_card("Umfang", f"{plan.get('sessionsPerWeek')} Einheiten / Woche", styles)],
    ], colWidths=[87 * mm, 87 * mm], hAlign="LEFT")
    cards.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(cards)
    story.append(Spacer(1, 8 * mm))

    if snapshot.get("event"):
        event = snapshot["event"]
        event_details = [item for item in (event.get("name"), event.get("date"), event.get("distance"), event.get("target")) if item]
        story.append(_callout("Konkretes Ziel", [" · ".join(event_details)], styles, background=MINT))
        story.append(Spacer(1, 5 * mm))

    story.append(Paragraph("So ist der Plan gedacht", styles["h2"]))
    for principle in plan.get("principles", []):
        story.append(Paragraph(f"- {_text(principle)}", styles["body"]))
    story.append(Spacer(1, 4 * mm))
    story.append(_callout("Sicherheit", [plan.get("safety", {}).get("disclaimer", "")], styles, background=PEACH))
    story.append(PageBreak())

    # Profile overview
    story.append(Paragraph("Profil und Planlogik", styles["h1"]))
    profile_rows = [
        ["Erfahrung", snapshot.get("experience", "")],
        ["Sportarten", ", ".join(snapshot.get("sports", []))],
        ["Ausstattung", ", ".join(snapshot.get("equipmentSummary", [])) or "Körpergewicht / Basis"],
        ["Planphase", plan.get("subtitle", "")],
    ]
    profile_table = Table([
        [Paragraph(_text(label), styles["small_bold"]), Paragraph(_text(value), styles["body"])]
        for label, value in profile_rows
    ], colWidths=[39 * mm, 135 * mm])
    profile_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("BACKGROUND", (0, 0), (0, -1), MINT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(profile_table)
    story.append(Spacer(1, 5 * mm))
    restriction_summary = snapshot.get("restrictionSummary", [])
    if restriction_summary:
        story.append(_callout("Berücksichtigte Einschränkungen", restriction_summary, styles, background=PEACH))
        story.append(Spacer(1, 4 * mm))
    if plan.get("planNotes"):
        story.append(_callout("Weitere Hinweise", plan["planNotes"], styles, background=CREAM))
        story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Progression über den Block", styles["h2"]))
    for item in plan.get("progressionNotes", []):
        story.append(Paragraph(f"- {_text(item)}", styles["body"]))

    # Weeks
    for week_index, week in enumerate(plan.get("weeks", [])):
        story.append(PageBreak())
        story.append(Paragraph(f"Woche {week.get('weekNumber')}: {_text(week.get('theme'))}", styles["h1"]))
        story.append(Paragraph(_text(week.get("coachNote")), styles["body"]))
        story.append(Paragraph(
            f"Geplanter Umfang: <b>{_text(week.get('targetMinutes'))} Minuten</b> · Belastungsfaktor {_text(week.get('loadFactor'))}",
            styles["body"],
        ))
        story.append(Spacer(1, 2 * mm))
        story.append(_week_overview(week, styles))
        story.append(Spacer(1, 3 * mm))
        story.append(_callout("Erholung in dieser Woche", [week.get("recoveryGuidance", "")], styles, background=CREAM))

        for session in week.get("sessions", []):
            session_story = _session_story(session, styles)
            story.extend(session_story)

    doc.build(story)
    return buffer.getvalue()
