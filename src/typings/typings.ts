import { ClientOptions, Message } from 'discord.js-selfbot-v13';
import { BaseAgent } from '../structures/BaseAgent.js';

export type AgentOptions = {
	options?: ClientOptions;
};

export type Commands = {
	name: string;
	description: string;
	execute: (agent: BaseAgent, message: Message, ...args: string[]) => any;
};

export const defaultConfig: Configuration = {
	username: '',
	token: '',
	guildID: '',
	channelID: [''],
	prefix: '!',

	// Auto Chat mặc định
	autoChat: false,
	autoChatInterval: 4, // 4 phút

	// Auto Chat Personality (Phase 4)
	autoChatCharacter: undefined,
	autoChatCharacterName: undefined,
	autoChatBotIDs: undefined,
};

export interface Configuration {
	username: string;
	token: string;
	guildID: string;
	channelID: string[];
	adminID?: string;
	prefix?: string;

	// Auto Chat với Gemini AI
	autoChatChannelID?: string;
	autoChat?: boolean;
	autoChatInterval?: number; // phút

	// Auto Chat Personality (Phase 4)
	autoChatCharacter?: string; // filename in src/config/personalities/ (e.g., "huong.txt")
	autoChatCharacterName?: string; // display name for regex prefix cleaning (e.g., "Hương Nguyễn")
	autoChatBotIDs?: string[]; // all 5 bot user IDs (identical across configs)

	// Avatar Update Channel
	avatarUpdateChannelID?: string;

	// Gemini API Configuration
	geminiApiKey?: string;
	geminiApiKeys?: string[];
	geminiModels?: string[];

	// Redis Cache Configuration
	redisUri?: string;
}
