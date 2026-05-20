import { input, select } from '@inquirer/prompts';
import { BaseAgent } from './BaseAgent.js';
import { Configuration } from '../typings/typings.js';

export class InquirerConfig {
	private static async getToken(defaultValue?: string): Promise<string> {
		return input({
			message: 'Enter Discord token:',
			default: defaultValue,
			validate: (value) => value.length > 0 || 'Token cannot be empty',
		});
	}

	private static async getGuildID(defaultValue?: string): Promise<string> {
		return input({
			message: 'Enter Guild ID:',
			default: defaultValue,
			validate: (value) => value.length > 0 || 'Guild ID cannot be empty',
		});
	}

	private static async getChannelID(defaultValue?: string[]): Promise<string[]> {
		const channelID = await input({
			message: 'Enter Channel ID(s) (comma-separated for multiple):',
			default: defaultValue?.join(', '),
			validate: (value) => value.length > 0 || 'Channel ID cannot be empty',
		});
		return channelID.split(',').map((id) => id.trim()).filter(Boolean);
	}

	private static async getPrefix(defaultValue?: string): Promise<string> {
		return input({
			message: 'Enter command prefix:',
			default: defaultValue || '!',
		});
	}

	private static async getAutoChat(defaultValue?: boolean): Promise<boolean> {
		const response = await select({
			message: 'Enable Auto Chat?',
			choices: [
				{ name: 'Yes', value: true },
				{ name: 'No', value: false },
			],
			default: defaultValue ?? false,
		});
		return response;
	}

	private static async getAutoChatInterval(defaultValue?: number): Promise<number> {
		const interval = await input({
			message: 'Auto Chat interval (minutes):',
			default: defaultValue !== undefined ? String(defaultValue) : '4',
			validate: (value) => {
				const num = parseInt(value);
				return (!isNaN(num) && num > 0) || 'Must be a positive number';
			},
		});
		return parseInt(interval);
	}

	private static async getAutoChatCharacter(defaultValue?: string): Promise<string> {
		return input({
			message: 'Personality file name (e.g., huong.txt):',
			default: defaultValue || 'huong.txt',
			validate: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Must be a valid filename (letters, numbers, dots, hyphens, underscores only)';
				}
				return /^[a-zA-Z0-9._-]+$/.test(value) || 'Must be a valid filename (letters, numbers, dots, hyphens, underscores only)';
			},
		});
	}

	private static async getAutoChatCharacterName(defaultValue?: string): Promise<string> {
		return input({
			message: 'Character display name (e.g., Hương Nguyễn):',
			default: defaultValue || 'Hương Nguyễn',
			validate: (value) => {
				return value.trim().length > 0 || 'Character name cannot be empty';
			},
		});
	}

	private static async getAutoChatBotIDs(defaultValue?: string[]): Promise<string[]> {
		const ids = await input({
			message: 'Bot user IDs (comma-separated, all 5 bots):',
			default: defaultValue?.join(', ') || '',
			validate: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Must contain at least one valid Discord user ID (17-19 digits)';
				}
				const parts = value.split(',').map((id) => id.trim()).filter(Boolean);
				const validSnowflake = /^\d{17,19}$/;
				const hasValid = parts.some((id) => validSnowflake.test(id));
				return hasValid || 'Must contain at least one valid Discord user ID (17-19 digits)';
			},
		});
		return ids.split(',').map((id) => id.trim()).filter(Boolean);
	}

	private static async getAutoChatChannelID(defaultValue?: string): Promise<string> {
		return input({
			message: 'Auto Chat channel ID:',
			default: defaultValue || '',
			validate: (value) => {
				return value.trim().length > 0 || 'Auto Chat channel ID cannot be empty';
			},
		});
	}

	static async create(agent: BaseAgent, defaultConfig?: Partial<Configuration>): Promise<Configuration> {
		console.log('\n📝 Configuration Setup\n');

		const token = await this.getToken(defaultConfig?.token);
		const guildID = await this.getGuildID(defaultConfig?.guildID);
		const channelID = await this.getChannelID(defaultConfig?.channelID);
		const prefix = await this.getPrefix(defaultConfig?.prefix);
		const autoChat = await this.getAutoChat(defaultConfig?.autoChat);
		const autoChatInterval = autoChat ? await this.getAutoChatInterval(defaultConfig?.autoChatInterval) : 4;
		const autoChatCharacter = autoChat ? await this.getAutoChatCharacter(defaultConfig?.autoChatCharacter) : undefined;
		const autoChatCharacterName = autoChat ? await this.getAutoChatCharacterName(defaultConfig?.autoChatCharacterName) : undefined;
		const autoChatBotIDs = autoChat ? await this.getAutoChatBotIDs(defaultConfig?.autoChatBotIDs) : undefined;
		const autoChatChannelID = autoChat ? await this.getAutoChatChannelID(defaultConfig?.autoChatChannelID) : undefined;

		return {
			username: agent.user?.username || '',
			token,
			guildID,
			channelID,
			prefix,
			autoChat,
			autoChatInterval,
			autoChatCharacter,
			autoChatCharacterName,
			autoChatBotIDs,
			autoChatChannelID,
		};
	}
}

export default InquirerConfig.create;
