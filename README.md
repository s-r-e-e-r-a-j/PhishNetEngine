# PhishNet Engine
A powerful, modular credential harvesting framework for authorized security testing.

**PhishNetEngine** is like a game engine, but for creating phishing tools. Just as a game engine provides the physics, rendering, and mechanics to build games, PhishNetEngine provides the server, tunneling, data capture, and admin panel to build credential harvesting tools.

## Legal Disclaimer
**This tool is for authorized security testing and educational purposes ONLY.**
   - Only use on systems you own or have explicit written permission to test
   - Unauthorized use for phishing or credential harvesting is ILLEGAL
   - Users are solely responsible for compliance with all applicable laws
   - The developers assume no liability and are not responsible for misuse

## Features
- **Host Any Website** - Drop your HTML/CSS/JS files and they're live instantly
- **Captures ALL Form Data** - Every field, any name, all values saved (email, password, 2FA, payment, custom fields)
- **Secure Admin Panel** - Random credentials, session management, brute force protection
- **Multiple Projects** - Create and switch between different phishing sites
- **Tunnel Support** - Cloudflared and Serveo.net for instant public HTTPS URLs
- **Real-time Dashboard** - View captures with filtering, search, and export options
- **Custom Field Detection** - Shows both common and custom form fields in purple
- **Linux Optimized** - Works on Debian/Ubuntu, Arch, RHEL/CentOS, Fedora
- **Bot Filtering** - Blocks scanners and crawlers automatically
- **Rate Limiting** - 30 requests per minute per IP
- **Export Options** - JSON (all data) and CSV (dynamic columns)

## Requirements
- **OS**: Linux (Ubuntu/Debian, Arch, RHEL/CentOS, Fedora)
- **Node.js**: 14.x or higher
- **Dependencies**: curl, ssh (auto-installed if missing)

## Installation
```bash
# Clone the repository
git clone https://github.com/s-r-e-e-r-a-j/PhishNetEngine.git

# Go to the PhishNetEngine directory 
cd PhishNetEngine

# Go to the phishnet-engine directory
cd phishnet-engine

# Install dependencies
npm install

```

## Quick Start

```bash
# Run the engine
node phishnetengine

# Follow the interactive menu:
# 1. Choose "Create new project"
# 2. Enter project name (e.g., "facebook-login")
# 3. Enter site name (e.g., "facebook")  
# 4. Enter endpoints (e.g., "/login,/auth,/2fa")

# stop it press ctrl+c

#  NOW add your cloned website files
cp -r /path/to/your/cloned/site/* sites/facebook-login/

# Run the engine again
node phishnetengine

# 5. Choose "Load existing project"
# 6. Select your project (e.g., "facebook-login")
# 7. Select tunnel method (Cloudflared or Serveo)

# Access your site via the public URL shown
# Access admin panel at: http://localhost:3000/admin-RANDOMTOKEN

# Admin panel username, password, and link also shown in terminal

```

## Project Structure 

```text
phishnet-engine/
├── phishnetengine.js   # Main entry point
├── config/   # Configuration files
├── utils/    # Utility functions
├── handlers/  # Tunnel handlers (cloudflared, serveo)
├── panels/  # Admin panel
├── engine/  # Core engine
├── sites/   # YOUR WEBSITE PROJECTS GO HERE
│   └── your-project/  # Each project folder
│       ├── config.json   # Project settings (MANDATORY)
│       ├── index.html   # Your website files
│       ├── css/  # CSS files
│       ├── js/  # JavaScript files
│       └── img/   # Images
├── data/    # Captured data (captures.dat)
├── .server/  # Tunnel binaries (cloudflared)

```
