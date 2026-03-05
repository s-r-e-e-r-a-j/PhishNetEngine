// Developer: Sreeraj
// GitHub: https://github.com/s-r-e-e-r-a-j

import net from 'net';
import { exec } from 'child_process';
import axios from 'axios';
import fs from 'fs-extra';
import os from 'os';
import util from 'util';

const execPromise = util.promisify(exec);

export const networkUtils = {
    killProcess(name) {
        return new Promise((resolve) => {
            exec(`pkill -f ${name} 2>/dev/null || true`, () => resolve());
        });
    },

    async checkInternet() {
        try {
            await axios.get('https://api.github.com', { timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    },

    async downloadFile(url, outputPath) {
        try {
            
            await execPromise(`curl -L -o ${outputPath} ${url}`);
            return true;
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    },

    checkPort(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port, '0.0.0.0');
        });
    },

    detectPackageManager() {
        if (fs.existsSync('/usr/bin/apt')) return 'apt';
        if (fs.existsSync('/usr/bin/pacman')) return 'pacman';
        if (fs.existsSync('/usr/bin/yum')) return 'yum';
        if (fs.existsSync('/usr/bin/dnf')) return 'dnf';
        return null;
    },

    async installDeps() {
        const pkgManager = this.detectPackageManager();
        if (!pkgManager) return false;

        const deps = ['curl', 'ssh'];
        const missing = [];

        for (const dep of deps) {
            try {
                await exec(`which ${dep}`);
            } catch {
                missing.push(dep);
            }
        }

        if (missing.length === 0) return true;

        const cmd = {
            apt: `sudo apt update >/dev/null 2>&1 && sudo apt install -y ${missing.join(' ')} >/dev/null 2>&1`,
            pacman: `sudo pacman -Sy --noconfirm ${missing.join(' ')} >/dev/null 2>&1`,
            yum: `sudo yum install -y ${missing.join(' ')} >/dev/null 2>&1`,
            dnf: `sudo dnf install -y ${missing.join(' ')} >/dev/null 2>&1`
        }[pkgManager];

        return new Promise((resolve) => {
            exec(cmd, (error) => resolve(!error));
        });
    }
};
