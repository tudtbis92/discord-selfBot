import { Client, Collection, TextChannel } from 'discord.js-selfbot-v13';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ranInt } from '../utils/utils.js';
import { AgentOptions, Commands, Configuration } from '../typings/typings.js';
import { logger } from '../utils/logger.js';
import { loadCommands } from '../feats/command.js';
import { commandHandler } from '../handler/commandHandler.js';
import { mentionHandler } from '../handler/mentionHandler.js';
import { avatarHandler } from '../handler/avatarHandler.js';
import { welcomeHandler } from '../handler/welcomeHandler.js';
import { AutoChatManager } from '../feats/autoChat.js';
import { geminiService } from './GeminiService.js';

// ESM __dirname equivalent for personality file path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BaseAgent extends Client {
	public config!: Configuration;
	public cache!: Configuration;
	public activeChannel!: TextChannel;
	public autoChatManager?: AutoChatManager;

	totalTexts = 0;

	public commands: Collection<string, Commands> = new Collection();
	paused = false;

	RETAINED_USERS_IDS: string[] = [];

	constructor({ options }: AgentOptions = {}) {
		super(options);
	}

	/**
	 * Callback xử lý sự kiện 'ready' của client.
	 * Handles client initialization post login.
	 *
	 * @private
	 * @returns {Promise<void>} Resolves when ready handlers are set up
	 */
	private onReady = async (): Promise<void> => {
		logger.info(`Logged in as ${this.user?.displayName ?? 'Unknown user'}`);


		if (this.config.prefix) {
			this.commands = await loadCommands();
		}

		this.activeChannel = this.channels.cache.get(this.config.channelID[0]) as TextChannel;

		// Khởi tạo Auto Chat Manager
		if (this.config.autoChat) {
			// Validate personality filename (path traversal mitigation T-04-01)
			if (this.config.autoChatCharacter) {
				const filenameValid = /^[a-zA-Z0-9._-]+$/.test(this.config.autoChatCharacter);
				if (!filenameValid) {
					logger.error(`[AutoChat] Invalid personality filename: ${this.config.autoChatCharacter}. Disabling AutoChat.`);
					this.config.autoChat = false;
				} else {
					const personalityPath = path.resolve(__dirname, '../config/personalities', this.config.autoChatCharacter);
					try {
						const personalityText = fs.readFileSync(personalityPath, 'utf-8');

						// Resolve bot display names for mention mapping (per D-08)
						let mentionMapping = '';
						if (this.config.autoChatBotIDs?.length) {
							const mappings: string[] = [];
							for (const id of this.config.autoChatBotIDs) {
								try {
									const user = await this.users.fetch(id);
									mappings.push(`- ${user.displayName}: <@${id}>`);
								} catch {
									mappings.push(`- Unknown User: <@${id}>`);
								}
							}
							mentionMapping = `\n\nCác thành viên bạn có thể tương tác và @mention:\n${mappings.join('\n')}`;
						}

						// Compose and inject full system instruction
						const fullInstruction = personalityText + mentionMapping;
						geminiService.setSystemInstruction(fullInstruction, this.config.autoChatCharacterName || '');
						logger.info('[AutoChat] Personality loaded and system instruction set');
					} catch {
						logger.error(`[AutoChat] Personality file not found: ${personalityPath}. Disabling AutoChat.`);
						this.config.autoChat = false;
					}
				}
			}

			// Only create AutoChatManager if autoChat is still enabled
			if (this.config.autoChat) {
				this.autoChatManager = new AutoChatManager(this);
				logger.info('[AutoChat] Đã khởi tạo Auto Chat Manager');
			}
		}

		logger.info(`Loaded ${String(this.commands.size)} commands`);
		if (this.activeChannel) {
			logger.info(`Running on channel: ${this.activeChannel.name}`);
		} else {
			logger.warn(`Channel with ID ${this.config.channelID[0]} not found or bot lacks access.`);
		}

		void this.main();
	};

	/**
	 * Đăng ký tất cả sự kiện và các handlers cho agent.
	 * Registers event listeners and handlers.
	 *
	 * @public
	 * @returns {void}
	 */
	public registerEvents = (): void => {
		this.once('ready', () => {
			void this.onReady();
		});
		void commandHandler(this);
		mentionHandler(this);
		void avatarHandler(this);
		welcomeHandler(this);
	};

	/**
	 * Kiểm tra đăng nhập tài khoản bằng token hoặc QR code.
	 * Checks and resolves account login via token or QR code.
	 *
	 * @public
	 * @param {string} [token] Token tài khoản Discord (tùy chọn)
	 * @returns {Promise<Client>} Trả về Client sau khi login thành công
	 */
	public checkAccount = (token?: string): Promise<Client> => {
		return new Promise((resolve, reject) => {
			logger.info('Checking account...');
			this.once('ready', () => {
				resolve(this);
			});
			try {
				if (token) {
					void this.login(token);
				} else {
					void this.QRLogin();
				}
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	};

	/**
	 * Vòng lặp chính xử lý tác vụ auto chat định kỳ.
	 * Main execution loop managing periodic auto chat behavior.
	 *
	 * @public
	 * @returns {Promise<never>} Vòng lặp vô hạn không trả về
	 */
	public main = async (): Promise<never> => {
		logger.info('[MAIN] 🚀 Bot đã khởi động - CHỈ CHẠY AUTO CHAT MODE');

		// Vòng lặp chính - chỉ xử lý auto chat
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			// Xử lý Auto Chat
			if (this.autoChatManager) {
				await this.autoChatManager.checkAndSendRandomChat();
			}

			// Chờ trước khi lặp lại
			await this.sleep(ranInt(2000, 5000)); // 2-5 giây
		}
	};

	/**
	 * Thiết lập cấu hình Configuration cho agent.
	 * Sets configurations for the agent.
	 *
	 * @public
	 * @param {Configuration} config Đối tượng Configuration cấu hình
	 * @returns {Promise<void>}
	 */
	public setConfig = async (config: Configuration): Promise<void> => {
		this.config = config;
		this.cache = structuredClone(config);

		// Cập nhật API keys cho GeminiService từ config
		const apiKeys = config.geminiApiKeys || (config.geminiApiKey ? [config.geminiApiKey] : []);
		if (apiKeys.length > 0) {
			geminiService.setApiKeys(apiKeys);
		}
	};

	/**
	 * Hàm khởi chạy agent.
	 * Runs the agent setup.
	 *
	 * @public
	 * @deprecated Hàm này đã lỗi thời và được giữ lại để tương thích ngược. Cấu hình đã được xử lý tự động.
	 * @returns {void}
	 */
	public run = (): void => {
		// Config và handlers đã được setup, không cần làm gì thêm
		// Method này giữ lại để tương thích với code cũ
	};
}
