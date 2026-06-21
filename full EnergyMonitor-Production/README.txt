╔══════════════════════════════════════════════════════╗
║   SMART ENERGY MONITOR — Production Package          ║
║   Jay Jay Mill / PowerGrid Pro                       ║
╚══════════════════════════════════════════════════════╝

FILES IN THIS PACKAGE:
──────────────────────
  index.html    → Main energy dashboard (Chart.js live monitoring)
  styles.css    → All dashboard styles (industrial dark theme)
  app.js        → Dashboard logic (live data, charts, PDF/Excel export)
  website.html  → Public marketing/info website
  admin.html    → Content management admin panel
  server.py     → Local network server (Python, no install needed)
  README.txt    → This file

═══════════════════════════════════════════════
  TWO WAYS TO OPEN — CHOOSE ONE:
═══════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MODE 1 — SIMPLE (same computer, local only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Just double-click:
    • index.html    → Energy dashboard
    • website.html  → Public website
    • admin.html    → Admin panel

  ⚠️  Admin edits save to your browser only (localStorage).
  ⚠️  Other devices on the same WiFi WON'T see changes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MODE 2 — SERVER (all devices on same WiFi)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Step 1: Open Terminal / Command Prompt
  Step 2: Go to this folder:
            cd path/to/this/folder

  Step 3: Run:
            python3 server.py        (Mac / Linux)
            python server.py         (Windows)

  Step 4: Open in browser:
            http://localhost:8000/index.html    ← Dashboard
            http://localhost:8000/website.html  ← Website
            http://localhost:8000/admin.html    ← Admin Panel

  Step 5: Other devices on same WiFi:
            The terminal will show your IP, e.g.:
            http://192.168.1.105:8000/index.html

  ✅  Admin edits sync to ALL devices automatically.
  ✅  content.json saves all changes to disk.
  Press Ctrl+C to stop the server.

═══════════════════════════════════════════════
  ADMIN PANEL LOGIN:
═══════════════════════════════════════════════
  Username: admin
  Password: admin123

  Features:
  • Edit website text (hero, products, pricing, contact)
  • Change theme colors (live preview)
  • Update WhatsApp button number
  • Preview the live website
  • Reset all content to defaults
  • View customer enquiries submitted from the website's
    "Request a Free Energy Audit" form (Customer Enquiries
    tab — Server Mode only, see below)

═══════════════════════════════════════════════
  CUSTOMER ENQUIRIES (Server Mode only):
═══════════════════════════════════════════════
  When someone fills out "Request a Free Energy Audit" on
  website.html, their details (name, company, phone, email,
  city, machine count, message) are saved to enquiries.json
  on this computer — visible to Admin → Customer Enquiries
  on ANY device on the same WiFi.

  ⚠️  This requires server.py to be running (Mode 2 below).
      In Mode 1 (double-click files), the form still shows
      a success message, but the enquiry can't be saved
      anywhere — there's a warning on the website telling
      the visitor to also reach out via WhatsApp/phone.

  From the Customer Enquiries tab you can:
    • See all leads, newest first, with a "new" count badge
    • Mark each as New / Contacted / Closed
    • One-tap WhatsApp or Call the customer
    • Delete individual enquiries or clear all

  ⚠️  IMPORTANT — Admin edits (text/colors/WhatsApp number)
      ALSO require Server Mode to persist properly and sync
      across devices. In Mode 1 (file:// — double-clicking
      admin.html), edits only save to that one browser's
      localStorage, which is why they can appear to vanish
      after a refresh or when reopened differently. Always
      use Mode 2 (server.py running) for real, durable saves.

═══════════════════════════════════════════════
  DASHBOARD FEATURES:
═══════════════════════════════════════════════
  • Live 3-phase voltage & current monitoring (R/Y/B)
  • Real-time power, energy, power factor, frequency
  • Interactive Chart.js graphs (24h trend)
  • Bill analysis & energy reports
  • PDF export (jsPDF)
  • Excel export (SheetJS/XLSX)
  • CSV export
  • Alert system (critical/warning/info)
  • Built-in AI support chat

═══════════════════════════════════════════════
  REQUIREMENTS:
═══════════════════════════════════════════════
  • Python 3.7+ (for server mode — pre-installed on Mac/Linux)
  • Windows: download from https://python.org
  • Internet connection (for Google Fonts + Chart.js CDN)
    OR run offline if fonts/CDN cached

