import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

import { logger } from './src/utils/logger.js';
import { Configuration, defaultConfig } from './src/typings/typings.js';

import { BaseAgent } from './src/structures/BaseAgent.js';
import InquirerConfig from './src/structures/Inquirer.js';

const program = new Command();
const agent = new BaseAgent();

process
	.on('unhandledRejection', (error) => {
		logger.error(error as Error);
		logger.log('runtime', 'Unhandled promise rejection');
	})
	.on('uncaughtException', (error) => {
		logger.error(error as Error);
		logger.log('runtime', 'Uncaught exception');
	});

program
	.name('BKI Advanced Discord OwO Selfbot')
	.description('BKI Kyou Izumi Advanced Discord OwO Selfbot')
	.version(JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version || '3.0.0');

program
	.option('-g, --generate <filename>', 'Generate new data file for autorun')
	.option('-i, --import <filename>', 'Import data file for autorun')
	.option('-d, --debug', 'Enable debug mode')
	.option('-u, --update', 'Whether to update directly (without prompt)')
	.action(async () => {
		if (program.opts().debug) {
			logger.logger.level = 'debug';
			logger.info('Debug mode enabled!');
		}

		if (program.opts()?.generate) {
			const filename =
				typeof program.opts().generate === 'string'
					? program.opts().generate
					: 'autorun.json';
			if (fs.existsSync(filename) && fs.statSync(filename).size > 0) {
				return logger.error(
					`File ${filename} already exists and is not empty!\nPlease remove it or specify another filename.`,
				);
			}

			fs.writeFileSync(filename, JSON.stringify(defaultConfig, null, 4));
			logger.info(`File generated: ${path.resolve(filename)}`);
			return;
		}

		if (program.opts()?.import) {
			if (!fs.existsSync(program.opts().import))
				return logger.error(`File ${program.opts().import} does not exist!`);
			if (path.extname(program.opts().import) !== '.json')
				return logger.error(`File ${program.opts().import} is not a JSON file!`);

			// Load central/shared config if exists
			let sharedConfig: Partial<Configuration> = {};
			const sharedFiles = ['shared.json', 'config.json'];
			for (const file of sharedFiles) {
				const fullPath = path.resolve(file);
				if (path.resolve(program.opts().import) === fullPath) {
					continue;
				}
				if (fs.existsSync(fullPath)) {
					try {
						sharedConfig = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
						logger.info(`Loaded central configuration from: ${file}`);
						break;
					} catch (error) {
						logger.error(new Error(`Failed to parse central configuration file ${file}: ${error instanceof Error ? error.message : String(error)}`));
					}
				}
			}

			const specificConfig = JSON.parse(
				fs.readFileSync(path.resolve(program.opts().import), 'utf-8'),
			) as Configuration;

			const data = {
				...sharedConfig,
				...specificConfig,
			} as Configuration;

			if (!data) return logger.error(`File ${program.opts().import} is empty!`);

			try {
				// Setup config trước
				await agent.setConfig(data);

				// Register events TRƯỚC KHI login (để ready handler được đăng ký)
				agent.registerEvents();

				// Login (ready event sẽ fire và setup captcha solver)
				await agent.checkAccount(data.token);

				// Chỉ register thêm các handler sau khi login
				agent.run();
			} catch (error) {
				logger.error(error as Error);
				logger.error('Failed to import data file');
			}
		} else {
			// Load central/shared config for defaults if exists
			let sharedConfig: Partial<Configuration> = {};
			const sharedFiles = ['shared.json', 'config.json'];
			for (const file of sharedFiles) {
				const fullPath = path.resolve(file);
				if (fs.existsSync(fullPath)) {
					try {
						sharedConfig = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
						logger.info(`Loaded central configuration for interactive defaults from: ${file}`);
						break;
					} catch (error) {
						logger.error(new Error(`Failed to parse central configuration file ${file}: ${error instanceof Error ? error.message : String(error)}`));
					}
				}
			}

			const config = await InquirerConfig(agent, sharedConfig);
			const data = {
				...sharedConfig,
				...config,
			} as Configuration;
			await agent.setConfig(data);

			// Register events TRƯỚC KHI login
			agent.registerEvents();

			// Login
			await agent.checkAccount(data.token);

			// Chỉ register thêm các handler sau khi login
			agent.run();
		}
	});

program.parse(process.argv);
