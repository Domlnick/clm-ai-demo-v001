#!/usr/bin/env python3
"""시연용 가상 계약서 PDF 생성.

결과 화면 좌측 원문 패널(`/samples/catalyst-supply-contract.pdf`)에서 보여 주는 파일입니다.
조항 내용은 `src/lib/data.ts` 의 ANALYSIS_OCR, `src/lib/contracts.ts` 의 C-24817 과 같습니다.

    .venv/bin/python scripts/generate_sample_contract.py
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "samples" / "catalyst-supply-contract.pdf"
FONT_PATH = Path("/System/Library/Fonts/Supplemental/AppleGothic.ttf")

DOC_ID = "C-24817"
TITLE = "촉매 공급계약서"
SUBTITLE = "여수 제2공장 수첨탈황 촉매 공급 (최종본 v3)"

OVERVIEW = [
    ["문서번호", "C-24817"],
    ["발주자", "GS칼텍스 주식회사 (가상)"],
    ["공급자", "한화솔루션 주식회사 (가상)"],
    ["계약기간", "2026.09.01 - 2029.08.31 (3년)"],
    ["계약금액", "3,820,000,000원 (VAT 별도)"],
]

CLAUSES = [
    ("제1조 (목적)", "본 계약은 발주자의 여수 제2공장 수첨탈황 설비에 사용되는 촉매의 공급에 관한 사항을 정함을 목적으로 한다."),
    ("제2조 (당사자)", "발주자는 GS칼텍스 주식회사, 공급자는 한화솔루션 주식회사로 한다. 본 문서의 회사명은 모두 시연을 위한 가상 명칭이다."),
    ("제3조 (계약기간)", "계약기간은 2026년 9월 1일부터 2029년 8월 31일까지 3년으로 하며, 자동갱신 조항은 두지 아니한다."),
    ("제4조 (계약금액)", "총 계약금액은 금 삼십팔억이천만원정(3,820,000,000원)으로 하고 부가가치세는 별도로 한다. 연간 단가는 원자재 시세에 연동하되 변동폭은 ±5%를 넘지 아니한다."),
    ("제5조 (납품 및 검수)", "공급자는 발주자가 지정한 일정에 따라 납품하며, 발주자의 검수 완료일을 인도일로 본다."),
    ("제6조 (대금지급)", "발주자는 검수 완료 후 익월 말일에 현금으로 대금을 지급한다."),
    ("제7조 (포장 및 운송)", "촉매의 포장·운송·상차 비용은 공급자가 부담하며, 하차 이후의 관리 책임은 발주자에게 있다."),
    ("제8조 (손해배상)", "공급자의 손해배상 한도는 본 계약금액의 100%를 초과하지 아니한다. 다만 고의 또는 중과실의 경우에는 그러하지 아니하다."),
    ("제9조 (비밀정보)", "비밀정보 유출로 인한 손해는 제8조의 한도 적용에서 예외로 한다."),
    ("제10조 (불가항력)", "천재지변 등 당사자의 통제를 벗어난 사유로 인한 이행 지연은 책임을 면한다. 다만 지체 없이 상대방에게 통지하여야 한다."),
    ("제11조 (검사 및 시험)", "발주자는 납품된 촉매에 대하여 성능 시험을 실시할 수 있으며, 기준 미달 시 공급자는 무상으로 교체한다."),
    ("제12조 (지연배상)", "납품 지연 시 지연일수 1일당 계약금액의 0.1%를 배상한다. 지연배상금의 상한은 정하지 아니한다."),
    ("제13조 (계약해지)", "중대한 계약 위반이 시정 요구 후 30일 이내에 해소되지 않으면 상대방은 계약을 해지할 수 있다."),
    ("제14조 (지식재산권)", "본 계약 이행 과정에서 공급자가 제공한 기술자료의 지식재산권은 공급자에게 유보된다."),
    ("제15조 (품질보증)", "납품일로부터 24개월간 품질을 보증하며, 하자 발생 시 무상 교체한다."),
    ("제16조 (안전·환경)", "공급자는 촉매 취급에 관한 안전자료(MSDS)를 제공하고 관련 법령을 준수한다."),
    ("제17조 (권리의무 양도)", "당사자는 상대방의 사전 서면 동의 없이 본 계약상 권리와 의무를 제3자에게 양도할 수 없다."),
    ("제18조 (계약의 변경)", "본 계약의 변경은 당사자가 서면으로 합의한 경우에만 효력이 있다."),
    ("제19조 (비밀유지)", "계약 종료 후 3년간 비밀유지 의무가 존속한다."),
    ("제20조 (통지)", "본 계약에 따른 통지는 서면 또는 전자우편으로 하며, 상대방이 지정한 주소로 발송한다."),
    ("제21조 (완전합의)", "본 계약은 목적 사항에 관한 당사자 간 완전한 합의이며, 이전의 구두 합의에 우선한다."),
    ("제22조 (준거법·분쟁해결)", "대한민국 법률에 따르며 서울중앙지방법원을 전속 관할법원으로 한다."),
]

CLAUSES_PER_PAGE = 2


def total_pages() -> int:
    """표지 1장 + 조항 페이지"""
    return 1 + (len(CLAUSES) + CLAUSES_PER_PAGE - 1) // CLAUSES_PER_PAGE


def decorate_page(canvas, document):
    canvas.saveState()
    width, height = A4
    canvas.setFont("AppleGothic", 8)
    canvas.setFillColor(colors.HexColor("#6B838E"))
    canvas.drawString(22 * mm, height - 17 * mm, f"{DOC_ID}  |  GS칼텍스 법무 계약서 AI 데모")
    canvas.drawRightString(width - 22 * mm, 14 * mm, f"{document.page} / {total_pages()}")
    canvas.setStrokeColor(colors.HexColor("#D6E0E3"))
    canvas.line(22 * mm, height - 20 * mm, width - 22 * mm, height - 20 * mm)
    canvas.setFillColor(colors.Color(0.06, 0.43, 0.51, alpha=0.08))
    canvas.setFont("AppleGothic", 28)
    canvas.translate(width / 2, height / 2)
    canvas.rotate(32)
    canvas.drawCentredString(0, 0, "시연용 가상 계약서")
    canvas.restoreState()


def build_pdf() -> Path:
    if not FONT_PATH.exists():
        raise FileNotFoundError(f"Korean font not found: {FONT_PATH}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("AppleGothic", str(FONT_PATH)))

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "ContractTitle", parent=styles["Title"], fontName="AppleGothic", fontSize=22, leading=30,
        textColor=colors.HexColor("#16222B"), alignment=TA_CENTER, spaceAfter=10 * mm,
    )
    subtitle = ParagraphStyle(
        "Subtitle", parent=styles["Normal"], fontName="AppleGothic", fontSize=9, leading=15,
        textColor=colors.HexColor("#6B838E"), alignment=TA_CENTER,
    )
    heading = ParagraphStyle(
        "ClauseHeading", parent=styles["Heading2"], fontName="AppleGothic", fontSize=13, leading=20,
        textColor=colors.HexColor("#0A4E5D"), spaceBefore=5 * mm, spaceAfter=3 * mm,
    )
    body = ParagraphStyle(
        "ClauseBody", parent=styles["BodyText"], fontName="AppleGothic", fontSize=10.5, leading=19,
        textColor=colors.HexColor("#263942"), wordWrap="CJK", spaceAfter=5 * mm,
    )
    right = ParagraphStyle("Right", parent=body, alignment=TA_RIGHT, fontSize=9, textColor=colors.HexColor("#6B838E"))

    document = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4,
        rightMargin=24 * mm, leftMargin=24 * mm, topMargin=28 * mm, bottomMargin=24 * mm,
        title=TITLE, author="GS Caltex Legal AI Prototype",
    )

    story = [Spacer(1, 22 * mm), Paragraph(TITLE, title), Paragraph(SUBTITLE, subtitle), Spacer(1, 15 * mm)]

    table = Table(OVERVIEW, colWidths=[34 * mm, 105 * mm], rowHeights=12 * mm)
    table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "AppleGothic"),
            ("FONTSIZE", (0, 0), (-1, -1), 9.5),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#3E5560")),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EDF2F3")),
            ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#16222B")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D6E0E3")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ])
    )
    story.extend([
        table, Spacer(1, 13 * mm),
        Paragraph("본 문서는 제품 시연을 위해 작성된 가상 계약서이며 실제 법률관계를 발생시키지 않습니다.", subtitle),
        PageBreak(),
    ])

    for i, (clause_title, clause_body) in enumerate(CLAUSES):
        if i % CLAUSES_PER_PAGE == 0:
            story.append(Paragraph("계약 조건", heading))
        story.extend([Paragraph(clause_title, heading), Paragraph(clause_body, body)])
        last = i == len(CLAUSES) - 1
        if last:
            story.extend([
                Spacer(1, 10 * mm),
                Paragraph("2026년 8월 8일", right),
                Spacer(1, 6 * mm),
                Paragraph("발주자: GS칼텍스 주식회사 (가상)  대표이사  홍 길 동", right),
                Paragraph("공급자: 한화솔루션 주식회사 (가상)  대표이사  김 촉 매", right),
            ])
        elif i % CLAUSES_PER_PAGE == CLAUSES_PER_PAGE - 1:
            story.append(PageBreak())

    document.build(story, onFirstPage=decorate_page, onLaterPages=decorate_page)
    return OUTPUT


if __name__ == "__main__":
    path = build_pdf()
    print(f"{path}  ({path.stat().st_size // 1024} KB, {total_pages()} pages)")
