#!/usr/bin/env python3
# =============================================================================
# INGERSOLL PAINTING — AUTO PRINT HUB
# File: print_hub.py
# =============================================================================
#
# PURPOSE:
#   This script runs on the home PC (or any always-on Windows computer).
#   When James taps "Send to Home Printer" on a completed bid in the
#   PaintPro app, the bid text is relayed here through ntfy.sh (a free,
#   no-account notification service). This script receives it, formats it
#   as a clean HTML page, opens it in the default browser, and triggers
#   window.print() automatically. Lisa or James just confirms the dialog.
#
# HOW THE FLOW WORKS:
#   Phone (PaintPro app)
#     → Encrypts bid → POST to ntfy.sh/{TOPIC}  (requires internet on phone)
#     → ntfy.sh holds the message
#     → This script is streaming ntfy.sh/{TOPIC}/json (requires internet on PC)
#     → Receives the message, decrypts it, writes a temp HTML file
#     → Opens http://localhost:9191/ in the browser
#     → Browser renders formatted bid + auto-triggers print dialog
#     → Lisa clicks Print (or Cancel)
#
# SETUP — DO THIS ONCE AT HOME:
# ─────────────────────────────
#   Step 1: Install Python 3 (free — download from python.org)
#           Choose "Add Python to PATH" during install.
#
#   Step 2: Open Command Prompt (search "cmd" in Start menu) and run:
#               pip install requests cryptography
#
#   Step 3: Edit the TOPIC line below to match what's in PaintPro.
#           Open PaintPro-ZFold.html, search for PRINT_HUB_TOPIC,
#           copy that same string here.
#           Example: TOPIC = 'ingersoll-print-james2026-abc'
#
#   Step 4: Set the encryption key.
#           In PaintPro → Settings → Print Hub → tap "Generate".
#           Copy the 64-character key shown and paste it as PRINT_SECRET below.
#           This key encrypts bid content in transit — even if someone
#           subscribes to the ntfy.sh topic, they only see ciphertext.
#           Leave PRINT_SECRET = '' to send bids as plain text (less secure).
#
#   Step 5: Run this script once to test it:
#               python print_hub.py
#           You should see "[PrintHub] Listening on ntfy.sh/..."
#           Then tap "Send to Home Printer" on the phone to test.
#
#   Step 6: Set it to auto-start when Windows boots:
#           a. Press Windows+R, type:  shell:startup  and press Enter
#           b. A folder opens. Right-click inside → New → Shortcut
#           c. For the location, enter:
#                  pythonw.exe C:\path\to\print_hub.py
#              (pythonw runs silently, no black console window)
#           d. Name it "PaintPro Print Hub" and click Finish
#           Now it will run automatically every time Windows starts.
#
# REQUIREMENTS:
#   - Python 3.7 or later (python.org)
#   - pip install requests cryptography
#   - Internet connection on the PC
#   - Any web browser (Chrome, Edge, Firefox)
#
# SECURITY NOTE:
#   The PRINT_SECRET key encrypts bid content with AES-256-GCM end-to-end.
#   Anyone who subscribes to the ntfy.sh topic only sees ciphertext.
#   Keep the key private and change it in both places if it's ever exposed.
#   The TOPIC name is a secondary layer — keep it private too.
#
# TROUBLESHOOTING:
#   - "ModuleNotFoundError: requests" → run: pip install requests cryptography
#   - Nothing prints when I tap the button → make sure TOPIC here matches
#     PRINT_HUB_TOPIC in the app exactly (case-sensitive)
#   - Browser opens but shows "Waiting..." → the message may have expired;
#     ntfy.sh holds messages for 12 hours. Try sending again from the app.
#   - "[Decryption failed]" in the browser → PRINT_SECRET here doesn't match
#     the key in PaintPro Settings → Print Hub. Re-copy the key from the app.
#   - Script crashes immediately → check Python version: python --version
#     Must be 3.7 or later.
# =============================================================================

import base64
import json
import os
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    import requests
except ImportError:
    print("[PrintHub] ERROR: 'requests' package not found.")
    print("[PrintHub] Fix: open Command Prompt and run:  pip install requests cryptography")
    input("Press Enter to exit...")
    sys.exit(1)

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    _crypto_ok = True
except ImportError:
    _crypto_ok = False

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
# Must match the PRINT_HUB_TOPIC constant in PaintPro-ZFold.html exactly.
TOPIC = 'ingersoll-print-7h112nufd393'

# Encryption key — 64 hex characters (256-bit AES-GCM key).
# Generate in PaintPro → Settings → Print Hub → tap "Generate", then paste here.
# Leave empty to accept plain-text bids (less secure).
PRINT_SECRET = ''

# Port for the local web server (no need to change this unless 9191 is in use)
PORT = 9191
# ──────────────────────────────────────────────────────────────────────────────

if not TOPIC:
    print("[PrintHub] ERROR: TOPIC is not set.")
    print("[PrintHub] Open print_hub.py and set the TOPIC variable to match")
    print("[PrintHub] the PRINT_HUB_TOPIC constant in PaintPro-ZFold.html.")
    input("Press Enter to exit...")
    sys.exit(1)

if PRINT_SECRET and not _crypto_ok:
    print("[PrintHub] WARNING: PRINT_SECRET is set but 'cryptography' package is missing.")
    print("[PrintHub] Fix: run:  pip install cryptography")
    print("[PrintHub] Continuing — encrypted bids will show a decryption error.\n")


def decrypt_bid(text):
    """Decrypt an enc:<iv>:<ct> message. Falls back to plaintext if no secret set."""
    if not text.startswith('enc:'):
        return text  # plaintext fallback (no key set in app)
    if not PRINT_SECRET:
        return '[Encrypted bid received but PRINT_SECRET is not set in print_hub.py.\nSet PRINT_SECRET to the key shown in PaintPro → Settings → Print Hub.]'
    if not _crypto_ok:
        return '[Encrypted bid received but the "cryptography" package is not installed.\nRun: pip install cryptography]'
    try:
        _, iv_b64, ct_b64 = text.split(':', 2)
        iv  = base64.b64decode(iv_b64)
        ct  = base64.b64decode(ct_b64)
        key = bytes.fromhex(PRINT_SECRET)
        return AESGCM(key).decrypt(iv, ct, None).decode('utf-8')
    except Exception as exc:
        return f'[Decryption failed — check that PRINT_SECRET matches the key in PaintPro Settings]\n\n{exc}'


# Shared state — holds the most recently received bid text
latest_bid = {'text': ''}

# ─── HTML TEMPLATE ────────────────────────────────────────────────────────────
PAGE_CSS = """
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    max-width: 680px;
    margin: 32px auto;
    padding: 0 24px;
    color: #111;
    line-height: 1.6;
    font-size: 13px;
  }
  .company  { font-size: 20px; font-weight: bold; text-transform: uppercase;
               letter-spacing: 2px; border-bottom: 2px solid #111;
               padding-bottom: 8px; margin-bottom: 12px; }
  .meta     { margin-bottom: 16px; color: #333; }
  .section  { font-size: 11px; text-transform: uppercase; letter-spacing: 2px;
               color: #888; margin: 16px 0 6px; }
  pre       { font-family: Georgia, serif; white-space: pre-wrap;
               font-size: 13px; line-height: 1.7; }
  .total    { font-size: 15px; font-weight: bold; margin-top: 12px;
               padding-top: 8px; border-top: 1px solid #333; }
  .footer   { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc;
               font-size: 11px; color: #888; text-align: center; }
  @media print {
    body { margin: 0; }
    .no-print { display: none; }
  }
"""

def build_page(text):
    """Convert plain-text bid into a print-ready HTML page."""
    safe = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Ingersoll Painting — Bid</title>
  <style>{PAGE_CSS}</style>
</head>
<body onload="window.print()">
  <p class="no-print" style="background:#2baae1;color:#fff;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-family:sans-serif;font-size:13px">
    Print dialog should open automatically. If not, press Ctrl+P.
  </p>
  <pre>{safe}</pre>
  <div class="footer">Ingersoll Painting LLC &mdash; Family Owned Since 1978 &mdash; (315) 952-8259</div>
</body>
</html>"""

WAITING_PAGE = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>PaintPro Print Hub</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
height:100vh;margin:0;background:#0d1117;color:#e2e8f0;text-align:center}</style>
</head><body>
<div>
  <div style="font-size:32px;margin-bottom:12px">🖨️</div>
  <div style="font-size:18px;font-weight:bold">PaintPro Print Hub is running</div>
  <div style="margin-top:8px;color:#6b7a8d">Waiting for a print job from the PaintPro app...</div>
</div>
</body></html>"""


# ─── LOCAL WEB SERVER ─────────────────────────────────────────────────────────
class PrintHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if latest_bid['text']:
            body = build_page(latest_bid['text'])
        else:
            body = WAITING_PAGE
        encoded = body.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', len(encoded))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, fmt, *args):
        pass  # Suppress default request logging


# ─── NTFY.SH LISTENER ─────────────────────────────────────────────────────────
def run_listener():
    """Stream messages from ntfy.sh and trigger the browser to print each one."""
    url = f'https://ntfy.sh/{TOPIC}/json'
    enc_status = '🔒 encrypted' if PRINT_SECRET else '⚠ plaintext (no PRINT_SECRET set)'
    while True:
        try:
            print(f'[PrintHub] Listening on ntfy.sh/{TOPIC}...')
            print(f'[PrintHub] Encryption: {enc_status}')
            with requests.get(url, stream=True, timeout=None) as r:
                for raw_line in r.iter_lines(decode_unicode=True):
                    if not raw_line:
                        continue
                    try:
                        evt = json.loads(raw_line)
                    except json.JSONDecodeError:
                        continue
                    if evt.get('event') != 'message':
                        continue  # ignore keepalive / open events
                    msg = evt.get('message', '').strip()
                    if not msg:
                        continue
                    msg = decrypt_bid(msg)
                    latest_bid['text'] = msg
                    client_name = msg.split('\n')[1].replace('Estimate for:', '').strip() \
                                  if len(msg.split('\n')) > 1 else '...'
                    print(f'[PrintHub] Print job received — {client_name}')
                    webbrowser.open(f'http://localhost:{PORT}/')
        except KeyboardInterrupt:
            print('\n[PrintHub] Stopped.')
            break
        except Exception as exc:
            print(f'[PrintHub] Connection lost ({exc}). Retrying in 5s...')
            time.sleep(5)


# ─── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', PORT), PrintHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f'[PrintHub] Local server started at http://localhost:{PORT}/')
    print(f'[PrintHub] Topic: ntfy.sh/{TOPIC}')
    print(f'[PrintHub] Ready — waiting for print jobs from PaintPro app')
    print(f'[PrintHub] Press Ctrl+C to stop\n')
    run_listener()
