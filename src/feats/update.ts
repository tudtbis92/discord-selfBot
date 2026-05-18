import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { confirm } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { exec, execSync, spawn } from 'node:child_process';
import { promisify } from 'node:util';

class selfUpdate {
	baseHeaders = {
		'User-Agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537',
	};

	constructor() {
		this.checkUpdate = this.checkUpdate.bind(this);
	}

	public async checkUpdate() {
		logger.info('Checking for update...');

		const pkg = JSON.parse(
			fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
		) as { version: string };
		const currentVersion = pkg.version;

		const response: { data: { version: string } } = await axios.get(
			'https://github.com/Kyou-Izumi/advanced-discord-owo-tool-farm/raw/refs/heads/main/package.json',
			{
				headers: this.baseHeaders,
			},
		);
		const latestVersion = response.data.version;

		if (currentVersion < latestVersion) {
			logger.info(`New version available: v${latestVersion} (current: v${currentVersion})`);

			const result = await confirm({
				message: 'Would you like to update?',
				default: true,
			});
			if (result) {
				logger.info('Updating...');
				await this.performUpdate();

				logger.info('Installing libraries...');
				await this.installDependencies();

				logger.info('Update completed!');
				this.restart();
			}
		} else {
			logger.info(`You are running the latest version: ${currentVersion}`);
		}
	}

	private performUpdate = async () => {
		if (fs.existsSync('.git')) {
			try {
				execSync('git --version');
				logger.info('Git detected, updating with Git!');
				await this.gitUpdate();
			} catch {
				logger.warn('Git is not installed or not in PATH — skipping auto-update.');
			}
		} else {
			logger.warn('No .git directory found — skipping auto-update.');
		}
	};

	public gitUpdate = (): Promise<void> => {
		try {
			logger.debug('Stashing local changes...');
			execSync('git stash');
			logger.debug('Pulling latest changes from Git...');
			execSync('git pull --force');
			logger.debug('Resetting to latest commit...');
			execSync('git reset --hard');
		} catch (error) {
			logger.error('Error updating with Git:');
			logger.error(error as Error);
		}
		return Promise.resolve();
	};



	private installDependencies = async () => {
		logger.info('Installing dependencies...');
		try {
			await promisify(exec)('npm install');
			logger.info('Dependencies installed successfully.');
		} catch (error) {
			logger.error('Error installing dependencies:');
			logger.error(error as Error);
		}
	};

	private restart = () => {
		const child = spawn('start', ['cmd.exe', '/K', 'npm start'], {
			cwd: process.cwd(),
			shell: true,
			detached: true,
			stdio: 'ignore',
		});
		child.unref();
		process.exit(1);
	};
}

const updater = new selfUpdate();
export const checkUpdate = (): Promise<void> => {
	return updater.checkUpdate();
};
