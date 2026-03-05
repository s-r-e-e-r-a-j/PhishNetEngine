import { spawn } from 'child_process';
import { utils } from '../utils/index.js';

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
            this.ssh = spawn('ssh', [
                '-o', 'StrictHostKeyChecking=no',
                '-R', `80:localhost:${port}`,
                'serveo.net'
            ]);
            
            this.ssh.stderr.on('data', (data) => {
                const str = data.toString();
                const match = str.match(/https:\/\/[a-zA-Z0-9\-]+\.serveousercontent\.com/);
                if (match) {
                    this.url = match[0];
                    resolve(this.url);
                }
            });

            setTimeout(() => {
                if (!this.url) reject(new Error('Timeout'));
            }, 10000);
        });
    }

    stop() {
        if (this.ssh) this.ssh.kill();
    }
}
