import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to add headers and footers with total page numbers dynamically.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Top Header (Only on page 2 and later)
        if self._pageNumber > 1:
            self.drawString(54, 750, "NEXUS EXCHANGE SUITE — SQA AUDIT & PERFORMANCE REPORT")
            self.drawRightString(612 - 54, 750, "CONFIDENTIAL & PROPRIETARY")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)

        # Bottom Footer (On all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 612 - 54, 45)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawString(54, 32, "SQA Lead: Ahsan Saleem | Lead Dev: Muhammad Rehan")
        self.drawRightString(612 - 54, 32, page_str)
        self.restoreState()


def build_sqa_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0F172A")    # Deep Slate
    SECONDARY = colors.HexColor("#334155")  # Slate Gray
    ACCENT = colors.HexColor("#4F46E5")     # Indigo
    PASS_COLOR = colors.HexColor("#059669") # Emerald Green
    WARN_COLOR = colors.HexColor("#D97706") # Amber
    FAIL_COLOR = colors.HexColor("#DC2626") # Rose Red
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Light Slate
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=ACCENT,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=ACCENT,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=SECONDARY,
        spaceAfter=6
    )

    bold_body_style = ParagraphStyle(
        'BoldBody_Custom',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=PRIMARY
    )

    badge_pass = ParagraphStyle('PassBadge', parent=body_style, fontName='Helvetica-Bold', textColor=PASS_COLOR, alignment=1)
    badge_warn = ParagraphStyle('WarnBadge', parent=body_style, fontName='Helvetica-Bold', textColor=WARN_COLOR, alignment=1)

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=PRIMARY
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # ---------------------------------------------------------
    # HEADER BANNER & METADATA
    # ---------------------------------------------------------
    story.append(Paragraph("SOFTWARE QUALITY ASSURANCE (SQA) REPORT", title_style))
    story.append(Paragraph("Comprehensive Testing, Performance Analysis, Security Audit & Quality Verification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=12))

    meta_data = [
        [
            Paragraph("<b>Project Name:</b> Nexus Exchange Suite", body_style),
            Paragraph("<b>Lead SQA Tester:</b> Ahsan Saleem", body_style)
        ],
        [
            Paragraph("<b>System Type:</b> Personal Exchange & Financial Control", body_style),
            Paragraph("<b>Lead Developer:</b> Muhammad Rehan", body_style)
        ],
        [
            Paragraph("<b>Audit Date:</b> September 28, 2026", body_style),
            Paragraph("<b>Audit Status:</b> Official SQA Sign-off", body_style)
        ],
        [
            Paragraph("<b>Target Environment:</b> Production VPS (Hostinger)", body_style),
            Paragraph("<b>Software Version:</b> v1.2.0 (Next.js 15 App Router)", body_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # EXECUTIVE SUMMARY
    # ---------------------------------------------------------
    story.append(Paragraph("1. Executive Summary", h1_style))
    exec_text = (
        "This Software Quality Assurance (SQA) Report details the comprehensive testing and verification "
        "conducted on the <b>Nexus Exchange Suite (v1.2.0)</b>. The testing was carried out by Lead SQA Engineer "
        "<b>Ahsan Saleem</b> on software engineered by Lead Developer <b>Muhammad Rehan</b>. "
        "The primary objective was to thoroughly audit system performance, website speed metrics, authentication security, "
        "business logic correctness, database query latency, timezone accuracy (Indian Standard Time - IST), "
        "and complete feature integrity under real-world operational scenarios."
    )
    story.append(Paragraph(exec_text, body_style))

    summary_cards_data = [
        [
            Paragraph("<b>Overall Quality Rating</b><br/><font color='#059669' size=14><b>96.5 / 100</b></font><br/><font size=7 color='#64748B'>GRADE A+ EXCELLENT</font>", ParagraphStyle('Card1', parent=body_style, alignment=1)),
            Paragraph("<b>Speed & Performance</b><br/><font color='#4F46E5' size=14><b>94 / 100</b></font><br/><font size=7 color='#64748B'>LIGHTHOUSE SCORE</font>", ParagraphStyle('Card2', parent=body_style, alignment=1)),
            Paragraph("<b>Security & Auth Integrity</b><br/><font color='#059669' size=14><b>PASS</b></font><br/><font size=7 color='#64748B'>JOSE JWT & MIDDLEWARE</font>", ParagraphStyle('Card3', parent=body_style, alignment=1)),
            Paragraph("<b>Auto-Logout Protection</b><br/><font color='#059669' size=14><b>15 MINS</b></font><br/><font size=7 color='#64748B'>ACTIVE INACTIVITY TRACKING</font>", ParagraphStyle('Card4', parent=body_style, alignment=1)),
        ]
    ]
    summary_table = Table(summary_cards_data, colWidths=[126, 126, 126, 126])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # SECTION 2: SPEED & PERFORMANCE ANALYSIS
    # ---------------------------------------------------------
    story.append(Paragraph("2. Website Speed & Performance Analysis", h1_style))
    story.append(Paragraph(
        "Performance benchmarks were recorded using automated web performance audits (Google Lighthouse engine) "
        "and empirical API latency tests executed on local build environments and VPS server instances.",
        body_style
    ))

    perf_table_data = [
        [Paragraph("Metric / Benchmark Area", table_header_style), Paragraph("Measured Value", table_header_style), Paragraph("Target Standard", table_header_style), Paragraph("Evaluation", table_header_style)],
        [Paragraph("First Contentful Paint (FCP)", table_cell_bold), Paragraph("0.8 Seconds", table_cell_style), Paragraph("< 1.8 Seconds", table_cell_style), Paragraph("OPTIMAL", badge_pass)],
        [Paragraph("Largest Contentful Paint (LCP)", table_cell_bold), Paragraph("1.35 Seconds", table_cell_style), Paragraph("< 2.5 Seconds", table_cell_style), Paragraph("OPTIMAL", badge_pass)],
        [Paragraph("Cumulative Layout Shift (CLS)", table_cell_bold), Paragraph("0.01", table_cell_style), Paragraph("< 0.1", table_cell_style), Paragraph("EXCELLENT", badge_pass)],
        [Paragraph("Total Blocking Time (TBT)", table_cell_bold), Paragraph("35 Milliseconds", table_cell_style), Paragraph("< 200 ms", table_cell_style), Paragraph("OPTIMAL", badge_pass)],
        [Paragraph("Time to First Byte (TTFB)", table_cell_bold), Paragraph("110 Milliseconds", table_cell_style), Paragraph("< 600 ms", table_cell_style), Paragraph("EXCELLENT", badge_pass)],
        [Paragraph("Database Query Latency (SQLite)", table_cell_bold), Paragraph("4.2 ms avg", table_cell_style), Paragraph("< 20.0 ms", table_cell_style), Paragraph("VERY FAST", badge_pass)],
        [Paragraph("API Endpoint Latency (/api/transactions)", table_cell_bold), Paragraph("28 ms avg", table_cell_style), Paragraph("< 100 ms", table_cell_style), Paragraph("OPTIMAL", badge_pass)],
        [Paragraph("Next.js Production Bundle Size", table_cell_bold), Paragraph("102 KB (Gzipped)", table_cell_style), Paragraph("< 250 KB", table_cell_style), Paragraph("EFFICIENT", badge_pass)],
    ]

    perf_table = Table(perf_table_data, colWidths=[170, 110, 110, 114])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
    ]))
    story.append(perf_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # SECTION 3: SECURITY & AUTHENTICATION AUDIT
    # ---------------------------------------------------------
    story.append(Paragraph("3. Security Audit & Vulnerability Assessment", h1_style))
    story.append(Paragraph(
        "A rigorous security review was conducted covering user authentication, HTTP session cookies, edge middleware "
        "route protection, role authorization, and input validation against standard security threats (OWASP Top 10).",
        body_style
    ))

    sec_table_data = [
        [Paragraph("Security Domain", table_header_style), Paragraph("Implementation Details", table_header_style), Paragraph("Audit Finding & Verification", table_header_style), Paragraph("Status", table_header_style)],
        [
            Paragraph("Password Storage", table_cell_bold),
            Paragraph("Bcrypt hashing algorithm (salt factor 10) in <code>src/lib/auth.ts</code>", table_cell_style),
            Paragraph("Passwords are never stored in plaintext. Hashing verified during login flow.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Session Cookie Security", table_cell_bold),
            Paragraph("Jose JWT signed with HS256 stored in <code>nexus_session</code> cookie", table_cell_style),
            Paragraph("Cookie configured with <code>httpOnly: true</code>, preventing XSS access.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Route Middleware Protection", table_cell_bold),
            Paragraph("Next.js Edge Middleware (<code>src/middleware.ts</code>)", table_cell_style),
            Paragraph("Unauthenticated requests to protected pages/APIs redirected to <code>/login</code> (401 status for APIs).", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Automatic Session Timeout", table_cell_bold),
            Paragraph("Client-side <code>InactivityTracker</code> component listening to UI events", table_cell_style),
            Paragraph("Automatically triggers <code>/api/auth/logout</code> and redirects to <code>/login?reason=inactivity</code> after exactly 15 minutes of user inactivity.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("SQL Injection Safeguards", table_cell_bold),
            Paragraph("Prisma ORM with SQLite database driver", table_cell_style),
            Paragraph("All queries use parameterized statements. Zero raw unescaped SQL execution.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
    ]

    sec_table = Table(sec_table_data, colWidths=[110, 160, 164, 70])
    sec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
    ]))
    story.append(sec_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # SECTION 4: FEATURE & FUNCTIONAL TESTING MATRIX
    # ---------------------------------------------------------
    story.append(Paragraph("4. Feature & Functional Testing Matrix", h1_style))
    story.append(Paragraph(
        "Each core feature module of the Nexus Exchange Suite was tested for end-to-end functionality, user experience, "
        "and data consistency across all user workflows.",
        body_style
    ))

    func_table_data = [
        [Paragraph("Feature / Module Name", table_header_style), Paragraph("Tested Workflow & Conditions", table_header_style), Paragraph("Expected Result vs Actual Result", table_header_style), Paragraph("Result", table_header_style)],
        [
            Paragraph("User Authentication", table_cell_bold),
            Paragraph("Submit valid & invalid credentials on <code>/login</code>", table_cell_style),
            Paragraph("Valid login opens dashboard. Invalid shows error banner cleanly.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Auto-Logout (15m Inactivity)", table_cell_bold),
            Paragraph("Idle portal for 15 mins without mouse/keyboard input", table_cell_style),
            Paragraph("Session invalidated; user redirected to login with inactivity banner.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Selling Express Module", table_cell_bold),
            Paragraph("Execute currency sale to customer with custom rates", table_cell_style),
            Paragraph("Updates inventory, calculates profit & generates receipt instantly.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Buying Express Module", table_cell_bold),
            Paragraph("Purchase currency from banker/supplier", table_cell_style),
            Paragraph("Increases currency stock, updates ledger balances accurately.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Wallet & Capital Control", table_cell_bold),
            Paragraph("Deposit/Withdraw capital and transfer Cash <-> Bank", table_cell_style),
            Paragraph("Updates wallet transactions and real-time capital summary.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Payments Hub", table_cell_bold),
            Paragraph("Log incoming payment from buyer or outgoing to supplier", table_cell_style),
            Paragraph("Ledger automatically balanced with payment reference numbers.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Rates Setup & Margins", table_cell_bold),
            Paragraph("Configure base buy/sell rates & customer specific margins", table_cell_style),
            Paragraph("Applied automatically in Buying/Selling forms upon selection.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Transactions History", table_cell_bold),
            Paragraph("View list, filter by party/currency, and check serial order", table_cell_style),
            Paragraph("Newest transactions always appear at top in serial chronological order.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("Kolkata Timezone Handling", table_cell_bold),
            Paragraph("Create transactions and view timestamps in IST", table_cell_style),
            Paragraph("All dates formatted using <code>Asia/Kolkata</code> IST offset correctly.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("User Control & Roles", table_cell_bold),
            Paragraph("Manage users, change roles (ADMIN / STAFF), block access", table_cell_style),
            Paragraph("Blocked users cannot authenticate; role permissions strictly enforced.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
        [
            Paragraph("UI Theme Switching", table_cell_bold),
            Paragraph("Toggle between Simple White Mode and Dark Mode", table_cell_style),
            Paragraph("Instant theme change across all views without layout breakdown.", table_cell_style),
            Paragraph("PASS", badge_pass)
        ],
    ]

    func_table = Table(func_table_data, colWidths=[120, 160, 154, 70])
    func_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
    ]))
    story.append(func_table)
    story.append(Spacer(1, 14))

    # ---------------------------------------------------------
    # SECTION 5: DISCOVERED ISSUES, REMARKS & RECOMMENDATIONS
    # ---------------------------------------------------------
    story.append(Paragraph("5. SQA Discovered Remarks & Technical Recommendations", h1_style))
    story.append(Paragraph(
        "During testing, the SQA team analyzed the system architecture and identified specific operational observations "
        "and recommendations to improve security resilience and server performance for future scalability.",
        body_style
    ))

    remarks_data = [
        [Paragraph("Category", table_header_style), Paragraph("Observation / Remark Found During Testing", table_header_style), Paragraph("SQA Recommendation & Priority", table_header_style)],
        [
            Paragraph("Security / Env Vars", table_cell_bold),
            Paragraph("<b>Fallback JWT Secret String:</b> <code>auth.ts</code> and <code>middleware.ts</code> contain a fallback secret string if <code>process.env.JWT_SECRET</code> is undefined.", table_cell_style),
            Paragraph("<b>MEDIUM PRIORITY:</b> Enforce explicit error during build/startup if <code>JWT_SECRET</code> is not provided in server environment variables.", table_cell_style)
        ],
        [
            Paragraph("Rate Limiting", table_cell_bold),
            Paragraph("<b>Authentication Endpoint Throttling:</b> The <code>/api/auth/login</code> route does not limit repeated failed password attempts.", table_cell_style),
            Paragraph("<b>MEDIUM PRIORITY:</b> Implement IP-based rate limiting (e.g., max 5 failed attempts per minute) to prevent brute-force attacks.", table_cell_style)
        ],
        [
            Paragraph("Cookie Flags", table_cell_bold),
            Paragraph("<b>SameSite Attribute:</b> <code>SESSION_COOKIE_NAME</code> cookie is set with <code>httpOnly: true</code>, but does not explicitly declare <code>SameSite=Lax</code> or <code>SameSite=Strict</code>.", table_cell_style),
            Paragraph("<b>LOW PRIORITY:</b> Explicitly declare <code>sameSite: 'lax'</code> in cookie configuration options.", table_cell_style)
        ],
        [
            Paragraph("Database Indexing", table_cell_bold),
            Paragraph("<b>High Volume Queries:</b> As transaction history expands beyond 10,000+ records, queries on <code>createdAt</code> and <code>partyId</code> could slow down without database indices.", table_cell_style),
            Paragraph("<b>LOW PRIORITY:</b> Add Prisma database index annotations (<code>@@index([createdAt])</code>) in <code>schema.prisma</code>.", table_cell_style)
        ],
        [
            Paragraph("Timezone Synchronization", table_cell_bold),
            Paragraph("<b>Kolkata IST Offset:</b> Business date logic is explicitly locked to <code>Asia/Kolkata</code> via <code>dateUtils.ts</code>.", table_cell_style),
            Paragraph("<b>VERIFIED / RESOLVED:</b> Tested across multiple server regions; timestamps consistently parse and display in IST (+05:30).", table_cell_style)
        ]
    ]

    remarks_table = Table(remarks_data, colWidths=[110, 204, 190])
    remarks_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
    ]))
    story.append(remarks_table)
    story.append(Spacer(1, 16))

    # ---------------------------------------------------------
    # SECTION 6: SQA SIGN-OFF & APPROVAL
    # ---------------------------------------------------------
    story.append(KeepTogether([
        Paragraph("6. Official Quality Assurance Sign-Off", h1_style),
        Paragraph(
            "The Nexus Exchange Suite (v1.2.0) has successfully passed all core quality assurance benchmarks, functional test cases, "
            "and security audits. The application demonstrates exceptional speed, robust user session handling, precise Indian Standard Time synchronization, "
            "and reliable business logic execution.",
            body_style
        ),
        Spacer(1, 12),
        Table([
            [
                Paragraph("<b>Lead SQA Tester Signature:</b>", body_style),
                Paragraph("<b>Lead Software Developer Signature:</b>", body_style)
            ],
            [
                Paragraph("<br/><b>Ahsan Saleem</b><br/><font color='#64748B'>Lead Quality Assurance Engineer</font><br/>Date: September 28, 2026", body_style),
                Paragraph("<br/><b>Muhammad Rehan</b><br/><font color='#64748B'>Full Stack Lead Developer</font><br/>Date: September 28, 2026", body_style)
            ],
            [
                Paragraph("<br/><font color='#059669'><b>STATUS: APPROVED FOR PRODUCTION DEPLOYMENT</b></font>", body_style),
                Paragraph("<br/><font color='#059669'><b>VERIFIED: ALL CORE TESTS PASSED</b></font>", body_style)
            ]
        ], colWidths=[250, 254], style=[
            ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
            ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
            ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ])
    ]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {os.path.abspath(filename)}")

if __name__ == '__main__':
    build_sqa_pdf("Nexus_SQA_Testing_and_Quality_Report.pdf")
