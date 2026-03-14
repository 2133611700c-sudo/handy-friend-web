#!/usr/bin/env python3
"""Generate professional PDF report: AI 2026-2030 Research Report"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# ── Colors ──
BLUE_DARK = HexColor('#1a237e')
BLUE_MED = HexColor('#283593')
BLUE_LIGHT = HexColor('#e8eaf6')
GRAY_LIGHT = HexColor('#f5f5f5')
GRAY_MED = HexColor('#9e9e9e')
GRAY_DARK = HexColor('#424242')
RED_ACCENT = HexColor('#c62828')
GREEN_ACCENT = HexColor('#2e7d32')
ORANGE_ACCENT = HexColor('#e65100')

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'AI-RESEARCH-REPORT-2026-2030.pdf')

def create_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'ReportTitle', parent=styles['Title'],
        fontSize=22, leading=28, alignment=TA_CENTER,
        textColor=BLUE_DARK, spaceAfter=4*mm,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        'ReportSubtitle', parent=styles['Normal'],
        fontSize=13, leading=17, alignment=TA_CENTER,
        textColor=GRAY_DARK, spaceAfter=8*mm,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'MetaInfo', parent=styles['Normal'],
        fontSize=9, leading=12, alignment=TA_LEFT,
        textColor=GRAY_DARK, spaceAfter=2*mm,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'PartHeader', parent=styles['Heading1'],
        fontSize=16, leading=22, textColor=white,
        fontName='Helvetica-Bold', spaceBefore=10*mm, spaceAfter=6*mm,
        backColor=BLUE_DARK, borderPadding=(4*mm, 4*mm, 4*mm, 4*mm),
        leftIndent=0, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'SectionHeader', parent=styles['Heading2'],
        fontSize=13, leading=17, textColor=BLUE_DARK,
        fontName='Helvetica-Bold', spaceBefore=6*mm, spaceAfter=3*mm,
        borderWidth=0, leftIndent=0
    ))
    styles['BodyText'].fontSize = 10
    styles['BodyText'].leading = 14
    styles['BodyText'].textColor = black
    styles['BodyText'].fontName = 'Helvetica'
    styles['BodyText'].spaceAfter = 3*mm
    styles['BodyText'].alignment = TA_JUSTIFY
    styles.add(ParagraphStyle(
        'BoldBody', parent=styles['Normal'],
        fontSize=10, leading=14, textColor=black,
        fontName='Helvetica-Bold', spaceAfter=2*mm
    ))
    styles.add(ParagraphStyle(
        'Bullet', parent=styles['Normal'],
        fontSize=10, leading=14, textColor=black,
        fontName='Helvetica', leftIndent=8*mm, spaceAfter=1.5*mm,
        bulletIndent=3*mm
    ))
    styles.add(ParagraphStyle(
        'SubBullet', parent=styles['Normal'],
        fontSize=9.5, leading=13, textColor=GRAY_DARK,
        fontName='Helvetica', leftIndent=14*mm, spaceAfter=1*mm,
        bulletIndent=9*mm
    ))
    styles.add(ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontSize=9, leading=12, textColor=black,
        fontName='Helvetica', alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'TableCellBold', parent=styles['Normal'],
        fontSize=9, leading=12, textColor=black,
        fontName='Helvetica-Bold', alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontSize=9, leading=12, textColor=white,
        fontName='Helvetica-Bold', alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        'Quote', parent=styles['Normal'],
        fontSize=10, leading=14, textColor=BLUE_DARK,
        fontName='Helvetica-BoldOblique', leftIndent=10*mm, rightIndent=10*mm,
        spaceBefore=3*mm, spaceAfter=3*mm
    ))
    styles.add(ParagraphStyle(
        'SmallText', parent=styles['Normal'],
        fontSize=8, leading=11, textColor=GRAY_DARK,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        'SourceItem', parent=styles['Normal'],
        fontSize=8.5, leading=12, textColor=GRAY_DARK,
        fontName='Helvetica', leftIndent=4*mm, spaceAfter=1*mm
    ))
    styles.add(ParagraphStyle(
        'CodeBlock', parent=styles['Normal'],
        fontSize=9, leading=13, textColor=black,
        fontName='Courier', leftIndent=6*mm, spaceAfter=3*mm,
        backColor=GRAY_LIGHT, borderPadding=(3*mm, 3*mm, 3*mm, 3*mm)
    ))
    return styles


def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    s = create_styles()
    header_cells = [Paragraph(h, s['TableHeader']) for h in headers]
    data = [header_cells]
    for row in rows:
        data.append([Paragraph(str(c), s['TableCell']) for c in row])

    if col_widths is None:
        col_widths = [170*mm / len(headers)] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4*mm),
        ('TOPPADDING', (0, 0), (-1, 0), 3*mm),
        ('BACKGROUND', (0, 1), (-1, -1), white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, GRAY_LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_MED),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
        ('TOPPADDING', (0, 1), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 2*mm),
    ]))
    return t


def build_story():
    s = create_styles()
    story = []

    # ═══════════════════════════════════════════
    # TITLE PAGE
    # ═══════════════════════════════════════════
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph(
        'ANALYTICAL REPORT',
        s['ReportTitle']
    ))
    story.append(Paragraph(
        'ARTIFICIAL INTELLIGENCE 2026-2030',
        ParagraphStyle('BigTitle', parent=s['ReportTitle'], fontSize=26, leading=32)
    ))
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width='60%', thickness=2, color=BLUE_DARK, spaceAfter=6*mm))
    story.append(Paragraph(
        'Development Prospects, Key Directions,<br/>Professional Adaptation, and Risks',
        s['ReportSubtitle']
    ))
    story.append(Spacer(1, 15*mm))

    meta_data = [
        ['Date:', 'March 6, 2026'],
        ['Sources:', 'Consensus.app (4 Pro queries, 79 peer-reviewed sources),\nSemantic Scholar (30+ papers), ResearchGate (10+ publications),\nWEF, IMF, HBR, Microsoft Research, International AI Safety Report 2026'],
        ['Methodology:', 'Multi-platform analysis of scientific publications\nand expert reports with Consensus Pro AI synthesis'],
        ['Total sources:', '120+ peer-reviewed papers and institutional reports'],
    ]
    meta_table = Table(meta_data, colWidths=[35*mm, 135*mm])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), GRAY_DARK),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
    ]))
    story.append(meta_table)
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════
    story.append(Paragraph('TABLE OF CONTENTS', s['PartHeader']))
    story.append(Spacer(1, 4*mm))

    toc_items = [
        'PART 1. How AI Will Develop in 2026-2030',
        '    1.1 Development Trajectory',
        '    1.2 Four Key Research Directions (Consensus Pro)',
        '    1.3 Four Labor Market Scenarios (WEF Davos 2026)',
        '    1.4 Key Technology Trends 2026',
        'PART 2. Most Relevant Directions',
        '    2.1 Top-10 Directions from Scientific Publications',
        '    2.2 Fastest-Growing Skills (WEF + IMF)',
        '    2.3 12 Key AI Competencies (Nawrin et al. 2025)',
        'PART 3. How to Develop Skills Alongside AI',
        '    3.1 Four Future Skill Clusters (Consensus Pro)',
        '    3.2 Strategic Formula: T-shaped + AI',
        '    3.3 Concrete Action Plan (3 Levels)',
        '    3.4 Seven Rules for Everyone',
        '    3.5 Salary Premium for AI Skills',
        'PART 4. Risks and Concerns',
        '    4.1 Three Risk Categories (AI Safety Report 2026)',
        '    4.2 Deep Risk Analysis (Consensus Pro)',
        '    4.3 Warning Signals from Academia',
        '    4.4 Market Risks',
        '    4.5 Scale of Reskilling Problem',
        'PART 5. Strategy for Non-Technical Individuals',
        '    5.1 Key Conclusion (Consensus Pro)',
        '    5.2 How Work Is Changing',
        '    5.3 Skills That Do Not Become Obsolete',
        '    5.4 Four Concrete Strategies',
        '    5.5 Three Horizons Action Plan',
        'PART 6. Platform Comparison Summary',
        'SOURCES',
    ]
    for item in toc_items:
        if item.startswith('PART') or item == 'SOURCES':
            story.append(Paragraph(item, s['BoldBody']))
        else:
            story.append(Paragraph(item, ParagraphStyle('TOCsub', parent=s['BodyText'],
                                                         fontSize=9, leftIndent=4*mm, spaceAfter=1*mm,
                                                         textColor=GRAY_DARK)))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # PART 1
    # ═══════════════════════════════════════════
    story.append(Paragraph('PART 1. HOW AI WILL DEVELOP IN 2026-2030', s['PartHeader']))

    story.append(Paragraph('1.1 Development Trajectory', s['SectionHeader']))
    story.append(Paragraph(
        'According to the International AI Safety Report 2026, the current trajectory of AI progress through 2030 '
        'is uncertain, but existing trends are compatible with continued improvement. AI developers have announced '
        '<b>hundreds of billions of dollars</b> in data center investments.',
        s['BodyText']
    ))
    story.append(Paragraph('<b>Three scenarios through 2030:</b>', s['BoldBody']))
    for b in [
        '<b>Slowdown/plateau</b> -- due to data or energy deficit',
        '<b>Continuation of current pace</b> -- steady model improvement',
        '<b>Dramatic acceleration</b> -- if AI systems begin to accelerate AI research itself',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))
    story.append(Paragraph(
        'According to Epoch Research, companies can continue scaling systems through 2030; '
        'the main constraints are electricity availability and chip manufacturing capacity.',
        s['BodyText']
    ))

    story.append(Paragraph('1.2 Four Key Research Directions (Consensus Pro, 20 sources)', s['SectionHeader']))
    story.append(Paragraph(
        'Consensus AI synthesis based on 20 peer-reviewed papers identified 4 major directions:',
        s['BodyText']
    ))
    story.append(make_table(
        ['#', 'Direction', 'Essence', 'Key Factors'],
        [
            ['1', 'Agentic & Multi-Agent AI', 'Autonomous systems capable of planning, reasoning, and acting', 'Coordination of multiple AI agents, task orchestration'],
            ['2', 'Multimodal & Domain-Specific', 'AI working with text+images+audio+video simultaneously', 'Industry specialization (healthcare, law, finance)'],
            ['3', 'AI-Driven Scientific Discovery', 'AI accelerating scientific processes in physics, chemistry, biology', 'Experiment automation, hypothesis generation'],
            ['4', 'Trustworthiness & Green AI', 'Safe, transparent, energy-efficient AI', 'Carbon footprint reduction, ethical application'],
        ],
        col_widths=[8*mm, 38*mm, 62*mm, 62*mm]
    ))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph('1.3 Four Labor Market Scenarios (WEF, Davos 2026)', s['SectionHeader']))
    story.append(make_table(
        ['Scenario', 'Description'],
        [
            ['Supercharged Progress', 'Exponential AI growth + workforce readiness. People become "agent orchestrators." Many jobs disappear but new ones emerge quickly'],
            ['Age of Displacement', 'AI outpaces people\'s ability to adapt. Economy races ahead technologically but fractures socially'],
            ['Co-Pilot Economy', 'Incremental AI progress + broad AI literacy. AI as "co-pilot," not replacement'],
            ['Stalled Progress', 'Slow AI progress + skill shortage. Conservative adoption'],
        ],
        col_widths=[40*mm, 130*mm]
    ))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph('1.4 Key Technology Trends 2026', s['SectionHeader']))
    story.append(Paragraph('According to Microsoft Research:', s['BodyText']))
    for b in [
        '<b>AI as discovery partner</b> -- actively participating in scientific discoveries in physics, chemistry, biology',
        '<b>AI agents as digital colleagues</b> -- AI agents acting as "teammates," not just tools',
        '<b>AI in scientific research</b> -- automating literature reviews, data analysis, hypothesis generation',
        '<b>Multimodal AI</b> -- integrating text, visuals, voice, video into unified systems',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # PART 2
    # ═══════════════════════════════════════════
    story.append(Paragraph('PART 2. MOST RELEVANT DIRECTIONS', s['PartHeader']))

    story.append(Paragraph('2.1 Top-10 Directions from Scientific Publications', s['SectionHeader']))
    story.append(make_table(
        ['#', 'Direction', 'Growth Potential', 'Source'],
        [
            ['1', 'AI Safety & Alignment', 'Critical', 'AI Safety Report 2026, arXiv, Consensus'],
            ['2', 'AI Agents & Orchestration', 'Very High', 'WEF, Microsoft, Semantic Scholar, Consensus'],
            ['3', 'Human-AI Collaboration', 'Very High', 'Semantic Scholar (Westover 2025), Consensus'],
            ['4', 'AI in Healthcare', 'Very High', 'Ueda et al. 2025'],
            ['5', 'Prompt Engineering & Workflow Automation', 'High', 'Nawrin et al. 2025'],
            ['6', 'Cybersecurity + AI', 'High', 'WEF Future of Jobs Report'],
            ['7', 'Green Economy + AI', 'High', 'WEF, IMF, Consensus'],
            ['8', 'AI in Education', 'High', 'ResearchGate, Semantic Scholar'],
            ['9', 'RAG (Retrieval-Augmented Generation)', 'High', 'Nawrin et al. 2025'],
            ['10', 'AI Ethics & Governance', 'Growing', 'arXiv (Roytburg & Miller 2025), Consensus'],
        ],
        col_widths=[8*mm, 48*mm, 30*mm, 84*mm]
    ))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph('2.2 Fastest-Growing Skills (WEF + IMF)', s['SectionHeader']))
    for i, skill in enumerate([
        'AI and Big Data -- skill #1 by growth rate',
        'Networks and Cybersecurity',
        'Technological Literacy',
        'Creative Thinking (a human skill!)',
        'Resilience and Flexibility',
        'Leadership and Social Influence',
    ], 1):
        story.append(Paragraph(f'<b>{i}.</b> {skill}', s['Bullet']))
    story.append(Paragraph(
        '<b>Important:</b> skills change <b>66% faster</b> in professions most affected by AI.',
        s['BodyText']
    ))

    story.append(Paragraph('2.3 12 Key AI Competencies for the Workforce (Nawrin et al. 2025)', s['SectionHeader']))
    comps = [
        'Prompt Engineering', 'AI Workflow Automation', 'AI Agents (creation & management)',
        'RAG (Retrieval-Augmented Generation)', 'Multimodal AI', 'Fine-Tuning models',
        'AI Assistants', 'Voice AI & Avatars', 'AI Tool Stacking',
        'Continuous AI Literacy', 'AI Ethics', 'AI Content Evaluation'
    ]
    for i, c in enumerate(comps, 1):
        story.append(Paragraph(f'{i}. {c}', s['Bullet']))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # PART 3
    # ═══════════════════════════════════════════
    story.append(Paragraph('PART 3. HOW TO DEVELOP SKILLS ALONGSIDE AI', s['PartHeader']))

    story.append(Paragraph('3.1 Four Future Skill Clusters (Consensus Pro, 20 sources)', s['SectionHeader']))
    story.append(make_table(
        ['Cluster', 'Skills', 'Why It Matters'],
        [
            ['A. Technical & AI Literacy', 'Understanding AI, basic data literacy, ability to work with AI tools', 'Foundation for any work with AI; no need to be a programmer'],
            ['B. Advanced Cognitive Skills', 'Critical thinking, complex problem solving, systems analysis', 'AI does not replace the ability to interpret and make decisions'],
            ['C. Human & Interpersonal Skills', 'Communication, leadership, ethical judgment, empathy', 'Resistant to automation; growing demand'],
            ['D. Self-Management & Adaptability', 'Lifelong learning, flexibility, tolerance for uncertainty', 'Continuous reskilling is key to labor market survival'],
        ],
        col_widths=[42*mm, 64*mm, 64*mm]
    ))

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph('3.2 Strategic Formula: T-shaped + AI', s['SectionHeader']))
    story.append(Paragraph(
        '<b>PROFESSIONAL VALUE = Deep Expertise (vertical) + AI Literacy (horizontal) + Human Skills (superstructure)</b>',
        s['Quote']
    ))
    story.append(Paragraph('Based on: Bastos et al. 2025, Sunkar 2025', s['SmallText']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('3.3 Concrete Action Plan', s['SectionHeader']))

    story.append(Paragraph('<b>Level 1: Basic AI Literacy (now - 3 months)</b>', s['BoldBody']))
    for b in [
        'Master at least 3 AI tools in your profession',
        'Learn proper prompt engineering',
        'Understand what AI can and cannot do',
        'Be able to critically evaluate AI-generated content',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('<b>Level 2: AI Integration (3-12 months)</b>', s['BoldBody']))
    for b in [
        'Automate routine tasks through AI agents',
        'Master AI Tool Stacking -- combining multiple AI tools',
        'Learn RAG and working with your own data + AI',
        'Become an "orchestrator" of AI agents in your field',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('<b>Level 3: Strategic Advantage (12+ months)</b>', s['BoldBody']))
    for b in [
        'Use AI to create new products/services',
        'Develop Human-AI Collaboration skills (AI as "teammate")',
        'Become an AI ethics expert in your niche',
        'Teach others to work with AI (courses, mentoring)',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('3.4 Seven Rules for Everyone (HBR, IMF, WEF)', s['SectionHeader']))
    rules = [
        ("Don't fear, learn", '85% of employers plan priority reskilling by 2030'),
        ('Develop what AI cannot', 'creativity, empathy, leadership, adaptability'),
        ('Master AI as a tool', 'workers with advanced AI skills earn <b>56% more</b> (PwC)'),
        ('Become "AI-enhanced"', 'not a programmer, but someone who amplifies their work through AI'),
        ('Continuous learning', 'skills expire faster than ever; need 4-8 hours of learning per week'),
        ('Network effect', 'join professional communities (ResearchGate, Semantic Scholar, LinkedIn Learning)'),
        ('Act now', '120 million workers worldwide risk becoming obsolete without reskilling'),
    ]
    for i, (title, desc) in enumerate(rules, 1):
        story.append(Paragraph(f'<b>{i}. {title}</b> -- {desc}', s['Bullet']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('3.5 Salary Premium for AI Skills', s['SectionHeader']))
    story.append(make_table(
        ['AI Skill Level', 'Salary Premium'],
        [
            ['Basic (using ChatGPT)', '+10-15%'],
            ['Intermediate (automation, prompts)', '+25-35%'],
            ['Advanced (agents, RAG, fine-tuning)', '+56% (PwC)'],
        ],
        col_widths=[90*mm, 80*mm]
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # PART 4
    # ═══════════════════════════════════════════
    story.append(Paragraph('PART 4. RISKS AND CONCERNS', s['PartHeader']))

    story.append(Paragraph('4.1 Three Risk Categories (International AI Safety Report 2026)', s['SectionHeader']))

    story.append(Paragraph('<b>A. Malicious Use:</b>', s['BoldBody']))
    for b in ['Criminal activity with AI', 'Manipulation and disinformation', 'Cyberattacks',
              'Biological/chemical weapons (lowering access barriers)']:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('<b>B. Errors and Failures:</b>', s['BoldBody']))
    for b in ['AI system reliability problems', 'Loss of control over systems', 'Algorithmic biases']:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('<b>C. Systemic Risks:</b>', s['BoldBody']))
    for b in ['Mass job displacement', 'Social stratification',
              'Gradual loss of human control ("Gradual Disempowerment")']:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('4.2 Deep Risk Analysis (Consensus Pro, 20 sources)', s['SectionHeader']))
    story.append(make_table(
        ['Category', 'Description', 'Criticality'],
        [
            ['Alignment & Misalignment', 'Misalignment of AI and human goals is the DEFAULT state of ML systems. Difficulty grows with capabilities', 'Critical'],
            ['Malicious Use', 'Paradox: alignment progress makes AI a more controllable tool, including for attackers', 'High'],
            ['Job Displacement', 'Mass automation of routine cognitive and manual tasks by 2030', 'High'],
            ['Existential Threats', 'Scenarios of losing control over superintelligent systems; ~40% of experts rate catastrophe probability >10%', 'Long-term'],
            ['Social Inequality', 'AI widens the gap between those who adapted and the rest', 'Systemic'],
        ],
        col_widths=[38*mm, 100*mm, 32*mm]
    ))

    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        '<b>Key Alignment Paradox:</b> The better we teach AI to "obey," the more effective it becomes '
        'as a tool for malicious actors. Progress in safety creates new vulnerabilities.',
        s['Quote']
    ))

    story.append(Paragraph('4.3 Warning Signals from Academia', s['SectionHeader']))
    story.append(Paragraph('<b>Future of Life Institute (2025 AI Safety Index):</b>', s['BoldBody']))
    for b in [
        'Companies claim AGI achievement within 2-5 years',
        '<b>No company</b> received a score above D in safety planning',
        'Reviewers called this gap "deeply disturbing"',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('<b>Expert Survey (arXiv, 2025):</b>', s['BoldBody']))
    for b in [
        'Median forecast: AI surpasses humans by 2061',
        '10% of experts think it will happen by 2026',
        '~40% estimate probability of catastrophic consequences >10%',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('4.4 Market Risks', s['SectionHeader']))
    for b in [
        'Only <b>1 in 50</b> AI investments delivers transformational value (Gartner)',
        'Only <b>1 in 5</b> delivers any measurable ROI',
        '20% of organizations use AI to "flatten" structure, eliminating >50% of middle management positions',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('4.5 Scale of the Reskilling Problem', s['SectionHeader']))
    for b in [
        '<b>59%</b> of the global workforce needs training by 2030',
        '<b>120 million</b> workers risk being left without reskilling',
        '<b>80%</b> of engineers must upskill by 2027 just to keep up with GenAI',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # PART 5
    # ═══════════════════════════════════════════
    story.append(Paragraph('PART 5. STRATEGY FOR NON-TECHNICAL INDIVIDUALS', s['PartHeader']))

    story.append(Paragraph('5.1 Key Conclusion (Consensus Pro, 19 sources)', s['SectionHeader']))
    story.append(Paragraph(
        'AI automates routine tasks but INCREASES the value of uniquely human, adaptive, '
        'and AI-complementary skills rather than eliminating the need for humans.',
        s['Quote']
    ))

    story.append(Paragraph('5.2 How Work Is Changing', s['SectionHeader']))
    for b in [
        'AI accelerates automation of <b>both manual and cognitive routine labor</b> -- demand for low-skill repetitive roles falls',
        '<b>New roles emerge</b> around AI use, ethics, data literacy, and human-AI coordination (not just coding!)',
        'AI <b>augments</b> workers: takes routine so people can focus on judgment, creativity, and people work',
    ]:
        story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))

    story.append(Paragraph('5.3 Skills That Do Not Become Obsolete', s['SectionHeader']))
    story.append(make_table(
        ['Skill', 'Why Resistant to Automation', 'Importance'],
        [
            ['Critical Thinking & Problem Solving', 'Needed to interpret AI outputs, spot errors, make final decisions', 'Critical'],
            ['Social & Communication Skills', 'Human interaction, collaboration, leadership resist automation', 'Critical'],
            ['Adaptability & Lifelong Learning', 'Continuous reskilling directly linked to AI adaptation success', 'Critical'],
            ['Ethical Judgment & Responsibility', 'Growing need for fairness, privacy, and accountability around AI', 'High'],
        ],
        col_widths=[45*mm, 80*mm, 45*mm]
    ))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('5.4 Four Concrete Strategies', s['SectionHeader']))

    strategies = [
        ('a) Become "AI-literate," not an AI engineer',
         ['Learn the basics: what AI can and cannot do, typical workplace applications',
          'This reduces fear and improves collaboration with technical teams',
          'Accessible online courses and micro-credentials for non-tech professions']),
        ('b) Build complementary strengths, not replaceable tasks',
         ['Focus on roles that INTERPRET AI results, INTEGRATE them into decisions, and COMMUNICATE to others',
          'Develop domain expertise + ability to use AI tools in that domain']),
        ('c) Commit to lifelong, flexible learning',
         ['Continuous upskilling and reskilling is the KEY to resilience in the AI economy',
          'Short workplace-oriented programs and employer-provided training are effective paths']),
        ('d) Strengthen your bargaining power',
         ['"Star" performers combine strong domain knowledge with strategic AI use; AI widens gaps in their favor',
          'Seek organizations that offer digital skills training and support innovation-friendly cultures']),
    ]
    for title, bullets in strategies:
        story.append(Paragraph(f'<b>{title}</b>', s['BoldBody']))
        for b in bullets:
            story.append(Paragraph(b, s['Bullet'], bulletText='\u2022'))
        story.append(Spacer(1, 1*mm))

    story.append(Paragraph('5.5 Three Horizons Action Plan', s['SectionHeader']))

    horizons = [
        ('HORIZON 1 (now - 6 months)', [
            'Master 3-5 AI tools in your area',
            'Complete a prompt engineering course',
            'Start using AI daily at work',
            'Subscribe to Semantic Scholar / ResearchGate for your topics',
            'Understand the basics: what AI can and cannot do'
        ]),
        ('HORIZON 2 (6-18 months)', [
            'Master AI agents and automation',
            'Learn AI Tool Stacking',
            'Develop a unique combination: your expertise + AI',
            'Build a portfolio of AI-enhanced projects',
            'Become an AI "interpreter" on your team'
        ]),
        ('HORIZON 3 (18-36 months)', [
            'Become an AI leader in your niche',
            'Teach others (courses, mentoring, consulting)',
            'Participate in AI governance in your industry',
            'Build products/services powered by AI',
            'Shape ethical standards in your field'
        ]),
    ]
    for title, items in horizons:
        story.append(Paragraph(f'<b>{title}</b>', s['BoldBody']))
        for item in items:
            story.append(Paragraph(item, s['Bullet'], bulletText='\u2022'))
        story.append(Spacer(1, 2*mm))

    story.append(Paragraph('<b>TOP-5 Actions Right Now:</b>', s['BoldBody']))
    actions = [
        'Register on Semantic Scholar -- create a Research Feed for your interests',
        'Take a free prompt engineering course (DeepLearning.AI, Coursera)',
        'Start using an AI assistant at work (Claude, ChatGPT, Copilot) every day',
        'Define your niche -- what unique expertise AI cannot replace',
        'Dedicate 4-8 hours per week to learning and experimenting with AI',
    ]
    for i, a in enumerate(actions, 1):
        story.append(Paragraph(f'<b>{i}.</b> {a}', s['Bullet']))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # PART 6
    # ═══════════════════════════════════════════
    story.append(Paragraph('PART 6. PLATFORM COMPARISON SUMMARY', s['PartHeader']))

    story.append(Paragraph('6.1 Consensus.app -- AI Synthesis (79 peer-reviewed sources)', s['SectionHeader']))
    story.append(make_table(
        ['#', 'Query', 'Result', 'Sources'],
        [
            ['1', 'AI Research Directions 2026-2030', '4 major directions: Agentic AI, Multimodal, AI for Science, Green AI & Alignment', '20'],
            ['2', 'Skills for Professional Development', '4 skill clusters: Technical literacy, Cognitive, Interpersonal, Adaptability', '20'],
            ['3', 'AI Safety Risks Through 2030', 'Alignment as default problem, safety paradox, existential threats', '20'],
            ['4', 'Strategies for Non-Technical Individuals', '"AI literacy, not AI engineering"; 4 strategies for maximizing human value', '19'],
        ],
        col_widths=[8*mm, 42*mm, 90*mm, 18*mm]
    ))
    story.append(Paragraph('<b>Rating: 10/10</b> -- Best platform. Full AI synthesis with citations, structured conclusions, tables.', s['BodyText']))

    story.append(Paragraph('6.2 Semantic Scholar -- Scientific Papers with TLDR (30+ papers)', s['SectionHeader']))
    story.append(make_table(
        ['#', 'Query', 'Result'],
        [
            ['1', 'AI workforce transformation 2025-2030', '10 papers with TLDR annotations, authors, year'],
            ['2', 'AI risks safety alignment 2025-2030', '10 papers on risks, alignment, existential threats'],
            ['3', 'Human-AI collaboration professional skills', '10 papers on skills, adaptation, AI collaboration'],
        ],
        col_widths=[8*mm, 60*mm, 102*mm]
    ))
    story.append(Paragraph('<b>Rating: 9/10</b> -- Excellent TLDRs, direct paper links, convenient filtering.', s['BodyText']))

    story.append(Paragraph('6.3 ResearchGate -- Researcher Publications (10+)', s['SectionHeader']))
    story.append(Paragraph('<b>Rating: 6/10</b> -- Minimal data, metadata only (title, authors, year, citations). Requires manual navigation to each paper.', s['BodyText']))

    story.append(Paragraph('6.4 Institutional Reports (WebSearch)', s['SectionHeader']))
    story.append(Paragraph('12+ reports from WEF, IMF, HBR, Microsoft, Gartner, Brookings, Stanford, Future of Life Institute.', s['BodyText']))
    story.append(Paragraph('<b>Rating: 8/10</b> -- Practical data and figures complementing academic sources.', s['BodyText']))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # SOURCES
    # ═══════════════════════════════════════════
    story.append(Paragraph('SOURCES', s['PartHeader']))

    story.append(Paragraph('<b>Consensus.app -- AI Synthesis (79 peer-reviewed papers)</b>', s['BoldBody']))
    consensus_queries = [
        'Query 1: "What are the most important AI research directions 2026-2030?" -- 20 sources',
        'Query 2: "What professional skills should individuals develop alongside AI through 2030?" -- 20 sources',
        'Query 3: "What are the most significant risks of AI development through 2030?" -- 20 sources',
        'Query 4: "How can non-technical individuals prepare for AI economic transformation?" -- 19 sources',
    ]
    for q in consensus_queries:
        story.append(Paragraph(q, s['SourceItem']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('<b>Scientific Publications (Semantic Scholar &amp; ResearchGate)</b>', s['BoldBody']))
    papers = [
        'Chhibber, Rajkumar, Dassanayake (2025) -- "Will AI Reshape the Global Workforce by 2030?"',
        'Sunkar (2025) -- "Professional Adaptation and Success in the AI Era"',
        'Goncalves da Silva (2025) -- "Future Competencies &amp; Skills Development Cycle"',
        'Basu (2025) -- "AI and the Transformation of the Job Market"',
        'Bastos, Amorim, Rodrigues (2025) -- "Professional Revolution in the Age of AI"',
        'Nawrin et al. (2025) -- "Comprehensive Framework for Future-ready AI Competencies"',
        'Westover (2025) -- "When AI Becomes the Teammate"',
        'Ueda et al. (2025) -- "Artificial Superintelligence Alignment in Healthcare"',
        'Roytburg &amp; Miller (2025) -- "Mind the Gap! Pathways Towards Unifying AI Safety and Ethics"',
        'Rishita (2025) -- "Disentangling Fiction from Frameworks: Instrumental Convergence"',
        'Portocarrero Ramos et al. (2025) -- "AI Skills and Employability of University Graduates"',
        'Haider, Majeed, Irfan (2025) -- "Digital Literacy in the Era of AI"',
        'Mykytas (2025) -- "The Role of AI in Economic Transformation"',
        'Lehong Shi et al. (2025) -- "Global Perspectives on AI Competence Development"',
    ]
    for p in papers:
        story.append(Paragraph(p, s['SourceItem']))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph('<b>Institutional Reports &amp; Analytics</b>', s['BoldBody']))
    reports = [
        'International AI Safety Report 2026',
        'WEF: Four Ways AI Could Reshape Jobs by 2030',
        'WEF: Invest in the Workforce for the AI Age',
        'WEF: Jobs and Skills Transformation at Davos 2026',
        'IMF: New Skills and AI Are Reshaping the Future of Work',
        'HBR: 9 Trends Shaping Work in 2026 and Beyond',
        'Microsoft: 7 AI Trends to Watch in 2026',
        'Future of Life Institute: 2025 AI Safety Index',
        'Brookings: Are AI Existential Risks Real?',
        'Stanford: The AI Dilemma -- Growth vs Existential Risk',
        'arXiv: Why Do Experts Disagree on P(doom)?',
        '80,000 Hours: AI Safety Reading List',
    ]
    for r in reports:
        story.append(Paragraph(r, s['SourceItem']))

    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width='100%', thickness=1, color=GRAY_MED, spaceAfter=4*mm))
    story.append(Paragraph(
        'Report prepared based on analysis of 79 peer-reviewed scientific publications via Consensus AI synthesis, '
        '30+ papers from Semantic Scholar and ResearchGate, and 12 institutional reports from WEF, IMF, Brookings, '
        'Stanford, Microsoft Research, and International AI Safety Report 2026.',
        ParagraphStyle('Footer', parent=s['SmallText'], alignment=TA_CENTER, textColor=GRAY_DARK)
    ))

    return story


def add_page_number(canvas_obj, doc):
    """Add page number and header/footer."""
    page_num = canvas_obj.getPageNumber()
    canvas_obj.saveState()

    # Footer line
    canvas_obj.setStrokeColor(GRAY_MED)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(20*mm, 15*mm, A4[0] - 20*mm, 15*mm)

    # Page number
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.setFillColor(GRAY_DARK)
    canvas_obj.drawCentredString(A4[0] / 2, 10*mm, f'- {page_num} -')

    # Header (skip page 1)
    if page_num > 1:
        canvas_obj.setFont('Helvetica', 7)
        canvas_obj.setFillColor(GRAY_MED)
        canvas_obj.drawString(20*mm, A4[1] - 12*mm, 'AI RESEARCH REPORT 2026-2030')
        canvas_obj.drawRightString(A4[0] - 20*mm, A4[1] - 12*mm, 'March 2026')
        canvas_obj.line(20*mm, A4[1] - 14*mm, A4[0] - 20*mm, A4[1] - 14*mm)

    canvas_obj.restoreState()


def main():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
        title='AI Research Report 2026-2030',
        author='Research Analysis',
        subject='Artificial Intelligence Development 2026-2030',
    )

    story = build_story()
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f'PDF generated: {OUTPUT_PATH}')
    print(f'Size: {os.path.getsize(OUTPUT_PATH) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
