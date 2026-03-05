// Developer: Sreeraj
// GitHub: https://github.com/s-r-e-e-r-a-j

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { CONFIG } from '../config/index.js';
import { utils } from '../utils/index.js';

export class CloudflaredHandler {
    constructor() {
        this.proc = null;
        this.url = null;
        this.bin = path.join(CONFIG.paths.server, 'cloudflared');
    }

    async install() {
        if (fs.existsSync(this.bin)) {
            return true;
        }
        
        console.log('[i] Downloading cloudflared...');
        
        try {
            const url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
            
            await utils.downloadFile(url, this.bin);
            fs.chmodSync(this.bin, '755');
            
            console.log('[+] Cloudflared installed successfully');
            return true;
        } catch (error) {
            console.log('[!] Failed to download cloudflared:', error.message);
            console.log('[i] Please install manually:');
            console.log(`   curl -L -o ${this.bin} https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64`);
            console.log(`   chmod +x ${this.bin}`);
            return false;
        }
    }

    async start(port) {
        await utils.killProcess('cloudflared');
        
        const installed = await this.install();
        if (!installed) {
            throw new Error('Cloudflared not installed');
        }

        return new Promise((resolve, reject) => {
            const logFile = path.join(CONFIG.paths.server, 'cf.log');
            
            console.log('[i] Starting cloudflared tunnel...');
            
            this.proc = spawn(this.bin, [
                'tunnel',
                '--url', `http://localhost:${port}`,
                '--logfile', logFile,
                '--no-autoupdate'
            ]);
            
            let out = '';
            let resolved = false;
            
            this.proc.stdout.on('data', (data) => {
                const str = data.toString();
                out += str;
                
                const match = out.match(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/);
                if (match && !resolved) {
                    resolved = true;
                    this.url = match[0];
                    console.log(`[+] Tunnel URL: ${this.url}`);
                    resolve(this.url);
                }
            });

            this.proc.stderr.on('data', (data) => {
                const str = data.toString();
                
                const match = str.match(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/);
                if (match && !resolved) {
                    resolved = true;
                    this.url = match[0];
                    console.log(`[+] Tunnel URL: ${this.url}`);
                    resolve(this.url);
                }
            });

            this.proc.on('error', (error) => {
                if (!resolved) {
                    reject(new Error(`Cloudflared error: ${error.message}`));
                }
            });

            setTimeout(() => {
                if (!resolved) {
                    reject(new Error('Cloudflared timeout'));
                }
            }, 15000);
        });
    }

    stop() {
        if (this.proc) {
            this.proc.kill();
            this.proc = null;
        }
    }
}
