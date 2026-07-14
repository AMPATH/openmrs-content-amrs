from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


OUT = Path("output/pdf/summary_trip_report_amrs.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

styles = getSampleStyleSheet()
title = ParagraphStyle("title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=13,
                       leading=15, alignment=TA_CENTER, spaceAfter=5)
label = ParagraphStyle("label", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.4,
                       leading=10)
body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica", fontSize=8.2,
                      leading=10.2, alignment=TA_LEFT)
section = ParagraphStyle("section", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5,
                         leading=10.2)


def p(text, style=body):
    return Paragraph(text, style)


doc = SimpleDocTemplate(
    str(OUT), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
    topMargin=14 * mm, bottomMargin=14 * mm,
)

rows = [
    [p("Prepared by", label), p("________________________________________")],
    [p("Signature", label), p("________________________________________")],
    [p("Date", label), p("________________________________________")],
    [p("Travel Dates", label), p("From 08/07/2027 To 10/07/2027")],
    [p("Travel From", label), p("Eldoret")],
    [p("To", label), p("Machakos")],
    [p("Persons Contacted/<br/>Co-travellers", label), p("Social Health Authority (SHA), Digital Health Authority (DHA), AMPATH development team, Safaricom, Tech Savanna, and Uasin Gishu County representatives.")],
    [p("Purpose/Objectives", label), p("To participate in the SHA Claims Hackathon and support finalization, validation, and refinement of AMRS claims workflows for Primary Health Care (PHC) and maternity services.")],
    [p("Executive Summary", label), p("The AMPATH development team participated in the SHA Claims Hackathon in Machakos from 8-10 July 2027. The engagement brought together SHA, DHA, county representatives, Safaricom, Tech Savanna, and implementing partners to address priority AMRS claims requirements. The team reviewed and refined PHC and maternity claims workflows, identified outstanding system gaps, and strengthened alignment with SHA claims standards in preparation for efficient claims submission and reimbursement.")],
    [p("Activities, Accomplishments and Deliverables", label), p(
        "1. Participated in the SHA Claims Hackathon in Machakos with SHA, DHA, county, and technical partner teams.<br/><br/>"
        "2. Reviewed the AMRS PHC claims workflow and maternity claims process against SHA requirements.<br/><br/>"
        "3. Identified and prioritized gaps affecting claims capture, validation, submission, and processing.<br/><br/>"
        "4. Provided technical support to refine AMRS workflows and ensure readiness for HMIS-based claims processing.<br/><br/>"
        "5. Collaborated with stakeholders to validate claims-related requirements and agree on implementation priorities.<br/><br/>"
        "6. Documented outstanding enhancements for follow-up by the AMPATH development team.<br/><br/>"
        "7. Strengthened coordination among SHA, DHA, Uasin Gishu County, AMPATH, Safaricom, and Tech Savanna.<br/><br/>"
        "8. Agreed to continue testing and validating the improved claims workflows before full implementation."
    )],
]

table = Table(rows, colWidths=[49 * mm, 130 * mm], repeatRows=0)
table.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#737373")),
    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E8EEF3")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))

doc.build([Paragraph("SUMMARY TRIP REPORT", title), table])
print(OUT)
