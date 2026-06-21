#!/usr/bin/env python3
"""
PowerGrid Pro — local network content server
-----------------------------------------------
Serves website.html and admin.html, and stores admin edits in
content.json on disk so EVERY device on the same WiFi network
sees the same content — not just the browser that saved it.

USAGE:
  1. Put this file in the same folder as website.html and admin.html
  2. Run:  python3 server.py
  3. On the SAME computer, open:      http://localhost:8000/website.html
                                       http://localhost:8000/admin.html
  4. On ANY OTHER device on the same WiFi, find this computer's local
     IP address (see instructions printed when you run this script)
     and open:  http://<that-ip>:8000/website.html

No installation needed — this only uses Python's built-in libraries.
"""

import json
import os
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8000
CONTENT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content.json')


def get_local_ip():
    """Best-effort guess at this machine's LAN IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


class ContentHandler(SimpleHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/api/content'):
            data = {}
            if os.path.exists(CONTENT_FILE):
                try:
                    with open(CONTENT_FILE, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except (json.JSONDecodeError, OSError):
                    data = {}
            self._send_json(200, data)
            return
        # Default: serve static files (website.html, admin.html, etc.)
        super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/content'):
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length else b'{}'
            try:
                incoming = json.loads(raw.decode('utf-8'))
            except json.JSONDecodeError:
                self._send_json(400, {'error': 'Invalid JSON'})
                return
            try:
                with open(CONTENT_FILE, 'w', encoding='utf-8') as f:
                    json.dump(incoming, f, ensure_ascii=False, indent=2)
            except OSError as e:
                self._send_json(500, {'error': str(e)})
                return
            self._send_json(200, {'ok': True})
            return
        self._send_json(404, {'error': 'Not found'})

    def do_DELETE(self):
        if self.path.startswith('/api/content'):
            if os.path.exists(CONTENT_FILE):
                os.remove(CONTENT_FILE)
            self._send_json(200, {'ok': True})
            return
        self._send_json(404, {'error': 'Not found'})

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        # Quieter console output — comment this out if you want full request logs.
        if '/api/content' in (args[0] if args else ''):
            print('[content]', format % args)


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    ip = get_local_ip()
    server = HTTPServer(('0.0.0.0', PORT), ContentHandler)

    print('=' * 60)
    print('  PowerGrid Pro content server is running')
    print('=' * 60)
    print(f'  On THIS computer:')
    print(f'    Website:  http://localhost:{PORT}/website.html')
    print(f'    Admin:    http://localhost:{PORT}/admin.html')
    print()
    print(f'  On OTHER devices on the SAME WiFi:')
    print(f'    Website:  http://{ip}:{PORT}/website.html')
    print(f'    Admin:    http://{ip}:{PORT}/admin.html')
    print()
    print('  Press Ctrl+C to stop the server.')
    print('=' * 60)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping server...')
        server.shutdown()


if __name__ == '__main__':
    main()
