// Developer: Sreeraj
// GitHub: https://github.com/s-r-e-e-r-a-j

import { spawn } from 'child_process';
import { utils } from '../utils/index.js';
import chalk from 'chalk';

export class ServeoHandler {
    constructor() {
        this.proc = null;
        this.url = null;
        this.ssh = null;
    }

    async install() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            exec('which ssh', (err) => resolve(!err));
        });
    }

    async start(port) {
        await utils.killProcess('ssh');

        return new Promise((resolve, reject) => {
            console.log(chalk.gray('[i] Connecting to Serveo.net...'));
            
            this.ssh = spawn('ssh', [
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'LogLevel=QUIET',
                '-R', `80:localhost:${port}`,
                'serveo.net'
            ]);
            
            let resolved = false;
            
            this.ssh.stdout.on('data', (data) => {
                const str = data.toString();
                console.log(chalk.gray(`[serveo] ${str.trim()}`));
                
                const match = str.match(/https:\/\/[a-zA-Z0-9\-]+\.serveousercontent\.com/);
                if (match && !resolved) {
                    resolved = true;
                    this.url = match[0];
                    console.log(chalk.green(`[+] Tunnel URL: ${this.url}`));
                    resolve(this.url);
                }
            });

            this.ssh.stderr.on('data', (data) => {
                const str = data.toString();
                console.log(chalk.gray(`[serveo] ${str.trim()}`));
                
                const match = str.match(/https:\/\/[a-zA-Z0-9\-]+\.serveousercontent\.com/);
                if (match && !resolved) {
                    resolved = true;
                    this.url = match[0];
                    console.log(chalk.green(`[+] Tunnel URL: ${this.url}`));
                    resolve(this.url);
                }
            });

            this.ssh.on('error', (error) => {
                if (!resolved) {
                    reject(new Error(`SSH error: ${error.message}`));
                }
            });

            setTimeout(() => {
                if (!resolved) {
                    this.ssh.kill();
                    reject(new Error('Timeout waiting for Serveo.net URL'));
                }
            }, 15000);
        });
    }

    stop() {
        if (this.ssh) {
            this.ssh.kill();
            this.ssh = null;
        }
    }
}
