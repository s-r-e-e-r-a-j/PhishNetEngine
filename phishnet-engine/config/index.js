import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __appdir = path.resolve(__dirname, '..');

export const CONFIG = {
    host: '0.0.0.0',
    port: 3000,
    version: '1.0.0',
    adminUser: 'admin',
    adminPass: crypto.randomBytes(4).toString('hex'),
    adminToken: crypto.randomBytes(8).toString('hex'),
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    paths: {
        server: path.join(__appdir, '.server'),
        data: path.join(__appdir, 'data'),
        sites: path.join(__appdir, 'sites'),
        logs: path.join(__appdir, 'logs'),
        temp: path.join(__appdir, 'temp')
    }
};

export const BOT_AGENTS = [
    'bot', 'crawler', 'scanner', 'curl', 'wget', 
    'python', 'nikto', 'nmap', 'sqlmap', 'zgrab', 'masscan'
];
