#!/usr/bin/env node
import { PhishNetEngine } from './engine/index.js';
import chalk from 'chalk';

const engine = new PhishNetEngine();

process.on('SIGINT', () => {
    engine.cleanup();
});

engine.run().catch(e => {
    console.log(chalk.red('[!] Error:'), e.message);
    process.exit(1);
});
