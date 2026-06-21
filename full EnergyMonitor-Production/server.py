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
import uuid
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8000
CONTENT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content.json')
ENQUIRIES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'enquiries.json')


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


def load_enquiries():
    if not os.path.exists(ENQUIRIES_FILE):
        return []
    try:
        with open(ENQUIRIES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_enquiries(enquiries):
    with open(ENQUIRIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(enquiries, f, ensure_ascii=False, indent=2)


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
        if self.path.startswith('/api/enquiries'):
            self._send_json(200, load_enquiries())
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
        if self.path.startswith('/api/enquiries/status'):
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length else b'{}'
            try:
                incoming = json.loads(raw.decode('utf-8'))
            except json.JSONDecodeError:
                self._send_json(400, {'error': 'Invalid JSON'})
                return
            target_id = incoming.get('id')
            new_status = incoming.get('status')
            if not target_id or new_status not in ('new', 'contacted', 'closed'):
                self._send_json(400, {'error': 'id and a valid status are required'})
                return
            enquiries = load_enquiries()
            found = False
            for e in enquiries:
                if e.get('id') == target_id:
                    e['status'] = new_status
                    found = True
                    break
            if not found:
                self._send_json(404, {'error': 'Enquiry not found'})
                return
            save_enquiries(enquiries)
            self._send_json(200, {'ok': True})
            return
        if self.path.startswith('/api/enquiries'):
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length else b'{}'
            try:
                incoming = json.loads(raw.decode('utf-8'))
            except json.JSONDecodeError:
                self._send_json(400, {'error': 'Invalid JSON'})
                return
            if not isinstance(incoming, dict):
                self._send_json(400, {'error': 'Expected a JSON object'})
                return
            name = (incoming.get('name') or '').strip()
            phone = (incoming.get('phone') or '').strip()
            if not name or not phone:
                self._send_json(400, {'error': 'name and phone are required'})
                return
            entry = {
                'id': uuid.uuid4().hex[:10],
                'name': name,
                'company': (incoming.get('company') or '').strip(),
                'phone': phone,
                'email': (incoming.get('email') or '').strip(),
                'city': (incoming.get('city') or '').strip(),
                'machines': (incoming.get('machines') or '').strip(),
                'message': (incoming.get('message') or '').strip(),
                'status': 'new',
                'submittedAt': datetime.now().isoformat(timespec='seconds'),
            }
            try:
                enquiries = load_enquiries()
                enquiries.insert(0, entry)  # newest first
                save_enquiries(enquiries)
            except OSError as e:
                self._send_json(500, {'error': str(e)})
                return
            self._send_json(200, {'ok': True, 'entry': entry})
            return
        self._send_json(404, {'error': 'Not found'})

    def do_DELETE(self):
        if self.path.startswith('/api/content'):
            if os.path.exists(CONTENT_FILE):
                os.remove(CONTENT_FILE)
            self._send_json(200, {'ok': True})
            return
        if self.path.startswith('/api/enquiries'):
            from urllib.parse import urlparse, parse_qs
            query = parse_qs(urlparse(self.path).query)
            target_id = query.get('id', [None])[0]
            if target_id:
                enquiries = load_enquiries()
                new_list = [e for e in enquiries if e.get('id') != target_id]
                save_enquiries(new_list)
                self._send_json(200, {'ok': True, 'deleted': target_id})
            else:
                if os.path.exists(ENQUIRIES_FILE):
                    os.remove(ENQUIRIES_FILE)
                self._send_json(200, {'ok': True, 'deleted': 'all'})
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
        msg = args[0] if args else ''
        if '/api/content' in msg or '/api/enquiries' in msg:
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
