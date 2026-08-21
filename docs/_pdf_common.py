"""Shared HTML/PDF rendering helpers for the SmartTrack Postman-collection docs.

Used by generate_api_docs_pdf.py (full collection) and
generate_role_api_docs_pdf.py (per-role splits) so both stay in sync.
"""

import markdown
from xhtml2pdf import pisa

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
    margin: 14px 0 4px 0;
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 2px;
}
h4 {
    font-size: 9.5pt;
    color: #262626;
    margin: 8px 0 3px 0;
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
    margin: 4px 0 10px 0;
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
.method {
    font-family: Courier, monospace;
    font-weight: bold;
    padding: 1px 6px;
    color: #ffffff;
    border-radius: 2px;
}
.method-GET { background-color: #2f9e44; }
.method-POST { background-color: #1c7ed6; }
.method-PATCH { background-color: #f08c00; }
.method-PUT { background-color: #f08c00; }
.method-DELETE { background-color: #e03131; }
.tag {
    font-family: Courier, monospace;
    font-size: 7.5pt;
    background-color: #fff3bf;
    color: #7a5c00;
    padding: 1px 5px;
    border-radius: 2px;
}
hr { border: none; border-top: 1px solid #d0d7de; margin: 14px 0; }
#footer_content {
    font-size: 7.5pt;
    color: #8a8a8a;
    text-align: center;
}
"""

# Base-14 Helvetica (used by xhtml2pdf/reportlab) doesn't reliably cover
# arrows/smart-quotes outside WinAnsi -- swap them for plain ASCII so nothing
# renders as a missing-glyph box.
ASCII_REPLACEMENTS = {
    "→": "->", "←": "<-", "–": "-", "—": "-",
    "'": "'", "'": "'", """: '"', """: '"',
    "…": "...", " ": " ",
}


def footer_html(title):
    return (
        f'<div id="footer_content">{esc(title)} | '
        'Page <pdf:pagenumber /> of <pdf:pagecount /></div>'
    )


def sanitize(text):
    if text is None:
        return ""
    for src, dest in ASCII_REPLACEMENTS.items():
        text = text.replace(src, dest)
    return text


def esc(text):
    """Minimal HTML escaping for text dropped into raw HTML (not markdown)."""
    text = sanitize(text)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_url(url_obj):
    if isinstance(url_obj, str):
        return url_obj
    if not isinstance(url_obj, dict):
        return ""
    raw = url_obj.get("raw")
    if raw:
        return raw
    host = url_obj.get("host") or []
    path = url_obj.get("path") or []
    query = url_obj.get("query") or []
    url = "/".join(str(part).strip("/") for part in [*host, *path] if part)
    query_string = "&".join(
        f"{q.get('key', '')}={q.get('value', '')}" for q in query if q.get("key")
    )
    return f"{url}?{query_string}" if query_string else url


def build_query_table(url_obj):
    if not isinstance(url_obj, dict):
        return ""
    query = url_obj.get("query") or []
    if not query:
        return ""
    rows = "".join(
        f"<tr><td><code>{esc(q.get('key',''))}</code></td>"
        f"<td>{esc(q.get('value',''))}</td></tr>"
        for q in query
    )
    return (
        "<table><tr><th>Query Param</th><th>Example Value</th></tr>"
        f"{rows}</table>"
    )


def build_header_table(headers):
    if not headers:
        return ""
    rows = "".join(
        f"<tr><td><code>{esc(h.get('key',''))}</code></td>"
        f"<td><code>{esc(h.get('value',''))}</code></td></tr>"
        for h in headers
    )
    return (
        "<table><tr><th>Header</th><th>Value</th></tr>"
        f"{rows}</table>"
    )


def build_body_block(request):
    body = request.get("body")
    if not body:
        return ""
    raw = body.get("raw")
    if not raw:
        return ""
    formatted = sanitize(raw)
    return (
        '<h4>Request Body</h4>'
        f'<pre><code>{esc(formatted)}</code></pre>'
    )


def response_shape(item):
    request = item.get("request", {})
    method = request.get("method", "GET").upper()
    url = build_url(request.get("url", {}))
    path = url.split("?", 1)[0].rstrip("/")
    resource = path.rsplit("/", 1)[-1]

    if method == "DELETE" or path.endswith("/logout"):
        return 204, ""
    if path.endswith("/auth/login"):
        return 200, '{\n  "user": {\n    "id": "USR-12345",\n    "name": "Jane Doe",\n    "email": "user@example.com",\n    "phone": "+971500000000",\n    "role": "driver",\n    "school_id": "SCH-001",\n    "school_name": "Greenfield International",\n    "avatar": "https://example.com/avatar.jpg",\n    "fcm_token": "demo-device-token",\n    "created_at": "2023-01-01T00:00:00.000Z",\n    "last_login": "2023-01-02T08:00:00.000Z"\n  },\n  "token": "<jwt>"\n}'
    if path.endswith("/auth/me"):
        return 200, '{\n  "user": {\n    "id": "USR-12345",\n    "name": "Jane Doe",\n    "email": "user@example.com",\n    "phone": "+971500000000",\n    "role": "driver",\n    "school_id": "SCH-001",\n    "school_name": "Greenfield International",\n    "avatar": "https://example.com/avatar.jpg",\n    "fcm_token": "demo-device-token",\n    "created_at": "2023-01-01T00:00:00.000Z",\n    "last_login": "2023-01-02T08:00:00.000Z"\n  }\n}'
    if path.endswith("/auth/forgot-password"):
        return 200, '{\n  "message": "A verification code has been sent to your email",\n  "devOtp": "<otp>"\n}'
    if path.endswith("/auth/verify-otp"):
        return 200, '{\n  "verified": true\n}'
    if path.endswith("/auth/reset-password"):
        return 200, '{\n  "message": "Password reset successfully"\n}'
    if path.endswith("/auth/change-password"):
        return 200, '{\n  "message": "Password updated successfully"\n}'
    if path.endswith("/auth/fcm-token"):
        return 200, '{\n  "user": {\n    "id": "USR-12345",\n    "name": "Jane Doe",\n    "email": "user@example.com",\n    "phone": "+971500000000",\n    "role": "driver",\n    "school_id": "SCH-001",\n    "school_name": "Greenfield International",\n    "avatar": "https://example.com/avatar.jpg",\n    "fcm_token": "demo-device-token",\n    "created_at": "2023-01-01T00:00:00.000Z",\n    "last_login": "2023-01-02T08:00:00.000Z"\n  }\n}'
    if path.endswith("/unread-count"):
        return 200, '{\n  "count": 0\n}'
    if path.endswith("/read-all"):
        return 200, '{\n  "message": "Notifications marked as read"\n}'
    if "/qr/" in path:
        return 200, '{\n  "type": "<student|bus|route>",\n  "entity": { ... }\n}'

    plural_keys = {
        "students": "students", "drivers": "drivers", "buses": "buses",
        "routes": "routes", "trips": "trips", "attendance": "records",
        "leave": "leave", "lost-found": "items", "guest-trips": "trips",
        "notifications": "notifications", "tickets": "tickets",
    }
    singular_keys = {
        "students": "student", "drivers": "driver", "buses": "bus",
        "routes": "route", "trips": "trip", "attendance": "record",
        "leave": "leave", "lost-found": "item", "guest-trips": "trip",
        "notifications": "notification", "tickets": "ticket",
    }
    if method == "GET" and path.count("/") <= 3:
        key = plural_keys.get(resource, resource)
        return 200, f'{{\n  "{key}": []\n}}'
    key = singular_keys.get(resource, resource.rstrip("s"))
    if method == "POST" and not path.endswith("/scan") and not path.endswith("/bulk"):
        return 201, f'{{\n  "{key}": {{ ... }}\n}}'
    if method in {"POST", "PATCH", "PUT"}:
        return 200, f'{{\n  "{key}": {{ ... }}\n}}'
    return 200, "{\n  \"message\": \"Request completed successfully\"\n}"


def build_response_block(item):
    responses = item.get("response") or []
    if responses:
        response = responses[0]
        status = response.get("status") or response.get("code") or "Example"
        body = response.get("body") or ""
        return (
            '<h4>Response Example</h4>'
            f'<p><strong>{esc(str(status))}</strong></p>'
            + (f'<pre><code>{esc(body)}</code></pre>' if body else '<p>No response body (204).</p>')
        )

    status, body = response_shape(item)
    return (
        '<h4>Response Example</h4>'
        f'<p><strong>{status}</strong></p>'
        + (f'<pre><code>{esc(body)}</code></pre>' if body else '<p>No response body.</p>')
    )


def build_test_note(item):
    events = item.get("event") or []
    scripts = []
    for e in events:
        if e.get("listen") == "test":
            exec_lines = e.get("script", {}).get("exec") or []
            scripts.extend(exec_lines)
    if not scripts:
        return ""
    joined = "\n".join(scripts)
    return (
        '<h4>Auto-Captured Variables (test script)</h4>'
        f'<pre><code>{esc(joined)}</code></pre>'
    )


def render_request(item, index_label, base_url=""):
    name = item.get("name", "Untitled Request")
    request = item.get("request", {})
    method = request.get("method", "GET")
    url_obj = request.get("url", {})
    url = build_url(url_obj).replace("{{baseUrl}}", str(base_url or "{{baseUrl}}"))
    description = request.get("description", "") or item.get("description", "")
    headers = request.get("header") or []

    tag = ""
    lname = name
    if "[NEW]" in lname:
        tag = '<span class="tag">NEW</span> '
    elif "[CHANGED]" in lname:
        tag = '<span class="tag">CHANGED</span> '

    html = [f'<h3>{index_label} {tag}{esc(name)}</h3>']
    html.append(
        f'<p><span class="method method-{esc(method)}">{esc(method)}</span> '
        f'<code>{esc(url)}</code></p>'
    )
    if description:
        html.append(f"<p>{esc(description)}</p>")

    auth_headers = [h for h in headers if h.get("key", "").lower() != "content-type"]
    if auth_headers:
        html.append("<h4>Request Headers</h4>")
        html.append(build_header_table(auth_headers))

    html.append(build_query_table(url_obj))
    html.append(build_body_block(request))
    html.append(build_response_block(item))
    html.append(build_test_note(item))

    return "\n".join(h for h in html if h)


def render_folder(folder, base_url=""):
    name = folder.get("name", "Untitled Folder")
    items = folder.get("item", [])
    parts = [f"<h2>{esc(name)}</h2>"]
    for i, item in enumerate(items, start=1):
        parts.append(render_request(item, f"{i}.", base_url=base_url))
    return "\n".join(parts)


def build_variables_table(variables):
    rows = []
    for v in variables:
        key = v.get("key", "")
        value = v.get("value", "")
        display_value = value if value else "<em>(captured at runtime)</em>"
        rows.append(
            f"<tr><td><code>{esc(key)}</code></td><td>{display_value}</td></tr>"
        )
    return (
        "<table><tr><th>Variable</th><th>Default / Notes</th></tr>"
        + "".join(rows)
        + "</table>"
    )


def build_toc(items):
    rows = "".join(
        f"<li>{esc(folder.get('name',''))} "
        f"<em>({len(folder.get('item', []))} requests)</em></li>"
        for folder in items
    )
    return f"<ul>{rows}</ul>"


def build_html(collection, description_override=None):
    info = collection.get("info", {})
    title = info.get("name", "API Documentation")
    description = description_override if description_override is not None else info.get("description", "")
    variables = collection.get("variable", [])
    items = collection.get("item", [])

    base_url = "{{base_url}}"

    parts = []
    parts.append(f"<h1>{esc(title)}</h1>")
    parts.append(f"<p><strong>Base URL:</strong> <code>{esc(base_url)}</code></p>")
    if description:
        desc_html = markdown.markdown(sanitize(description))
        parts.append(desc_html)

    parts.append("<h2>Contents</h2>")
    parts.append(build_toc(items))

    parts.append("<h2>Collection Variables</h2>")
    parts.append(
        "<p>Seeded demo accounts and IDs used throughout this reference. "
        "Values left blank are captured automatically at runtime (tokens, ids, "
        "QR codes) rather than fixed ahead of time.</p>"
    )
    parts.append(build_variables_table(variables))

    for folder in items:
        parts.append(render_folder(folder, base_url=base_url))

    return "\n".join(parts)


def build_pdf(collection, pdf_path, footer_title=None, description_override=None):
    info = collection.get("info", {})
    title_for_footer = footer_title or info.get("name", "API Documentation")

    body_html = build_html(collection, description_override=description_override)

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><style>{CSS}</style></head>
<body>
{footer_html(title_for_footer)}
{body_html}
</body>
</html>"""

    with open(pdf_path, "wb") as out:
        result = pisa.CreatePDF(html, dest=out)

    if result.err:
        raise RuntimeError(f"PDF generation failed with {result.err} error(s)")
    return pdf_path
