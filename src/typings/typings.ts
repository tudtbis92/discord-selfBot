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
	showRPC: true,

	// Auto Chat mặc định
	autoChat: false,
	autoChatInterval: 4, // 4 phút
};

export interface Configuration {
	username: string;
	token: string;
	guildID: string;
	channelID: string[];
	adminID?: string;
	prefix?: string;
	showRPC: boolean;

	// Auto Chat với Gemini AI
	autoChatChannelID?: string;
	autoChat?: boolean;
	autoChatInterval?: number; // phút

	// Avatar Update Channel
	avatarUpdateChannelID?: string;

	// Gemini API Configuration
	geminiApiKey?: string;
	geminiApiKeys?: string[];

	// Redis Cache Configuration
	redisUri?: string;
}
