#!/usr/bin/env python3
"""Render docs/school-admin-mobile-handoff.md to a styled PDF."""

import os
import markdown
from xhtml2pdf import pisa

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MD_PATH = os.path.join(BASE_DIR, "school-admin-mobile-handoff.md")
PDF_PATH = os.path.join(BASE_DIR, "SmartTrack_School_Admin_Mobile_Handoff.pdf")

CSS = """
@page {
    size: A4;
    margin: 2cm 1.8cm;
    @frame footer_frame {
        -pdf-frame-content: footer_content;
        bottom: 1cm; margin-left: 1.8cm; margin-right: 1.8cm; height: 1cm;
    }
}
body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 9.5pt;
    color: #262626;
    line-height: 1.5;
}
h1 {
    font-size: 20pt;
    color: #ffffff;
    background-color: #0f4c81;
    padding: 10px 14px;
    margin: 0 0 14px 0;
}
h2 {
    font-size: 13pt;
    color: #ffffff;
    background-color: #0f4c81;
    padding: 6px 10px;
    margin: 18px 0 8px 0;
}
h3 {
    font-size: 11pt;
    color: #0f4c81;
    margin: 12px 0 4px 0;
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 2px;
}
p { margin: 4px 0; }
strong { color: #0f4c81; }
ul, ol { margin: 4px 0 8px 18px; padding: 0; }
li { margin: 2px 0; }
code {
    font-family: Courier, monospace;
    font-size: 8pt;
    background-color: #f0f4f8;
    color: #a6122f;
    padding: 1px 3px;
}
pre {
    font-family: Courier, monospace;
    font-size: 7.5pt;
    background-color: #f5f7fa;
    border: 0.5px solid #d0d7de;
    padding: 8px;
    margin: 6px 0 10px 0;
    line-height: 1.35;
}
pre code { background-color: transparent; color: #1a1a1a; padding: 0; }
table {
    border-collapse: collapse;
    width: 100%;
    margin: 6px 0 12px 0;
}
th {
    background-color: #e8eef5;
    color: #0f4c81;
    font-size: 8pt;
    text-align: left;
    padding: 4px 6px;
    border: 0.5px solid #b9c6d6;
}
td {
    font-size: 8pt;
    padding: 4px 6px;
    border: 0.5px solid #d0d7de;
    vertical-align: top;
}
hr { border: none; border-top: 1px solid #d0d7de; margin: 14px 0; }
#footer_content {
    font-size: 7.5pt;
    color: #8a8a8a;
    text-align: center;
}
"""

FOOTER_HTML = (
    '<div id="footer_content">SmartTrack - School-Admin Mobile Handoff | '
    'Page <pdf:pagenumber /> of <pdf:pagecount /></div>'
)


# Base-14 Helvetica (used by xhtml2pdf/reportlab) doesn't reliably cover
# arrows/smart-quotes outside WinAnsi — swap them for plain ASCII so nothing
# renders as a missing-glyph box.
ASCII_REPLACEMENTS = {
    "→": "->", "←": "<-", "–": "-", "—": "-",
    "‘": "'", "’": "'", "“": '"', "”": '"',
    "…": "...", " ": " ",
}


def sanitize(text):
    for src, dest in ASCII_REPLACEMENTS.items():
        text = text.replace(src, dest)
    return text


def build_pdf():
    with open(MD_PATH, "r", encoding="utf-8") as f:
        md_text = sanitize(f.read())

    body_html = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "sane_lists"],
    )

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>{CSS}</style></head>
<body>
{FOOTER_HTML}
{body_html}
</body>
</html>"""

    with open(PDF_PATH, "wb") as out:
        result = pisa.CreatePDF(html, dest=out)

    if result.err:
        raise RuntimeError(f"PDF generation failed with {result.err} error(s)")
    return PDF_PATH


if __name__ == "__main__":
    path = build_pdf()
    print(f"PDF generated: {path}")
