import { Client, Collection, TextChannel } from 'discord.js-selfbot-v13';
import { ranInt } from '../utils/utils.js';
import { AgentOptions, Commands, Configuration } from '../typings/typings.js';
import { logger } from '../utils/logger.js';
import { loadPresence, startAutoPresenceUpdate } from '../feats/presence.js';
import { loadCommands } from '../feats/command.js';
import { commandHandler } from '../handler/commandHandler.js';
import { mentionHandler } from '../handler/mentionHandler.js';
import { avatarHandler } from '../handler/avatarHandler.js';
import { welcomeHandler } from '../handler/welcomeHandler.js';
import { AutoChatManager } from '../feats/autoChat.js';

export class BaseAgent extends Client {
	public config!: Configuration;
	public cache!: Configuration;
	public activeChannel!: TextChannel;
	public autoChatManager?: AutoChatManager;
	private captchaSolverConfigured = false;

	totalTexts = 0;

	public commands: Collection<string, Commands> = new Collection();
	paused = false;

	RETAINED_USERS_IDS: string[] = [];

	constructor({ options }: AgentOptions = {}) {
		super(options);
	}

	public setupCaptchaSolver = async () => {
		if (this.captchaSolverConfigured) {
			logger.debug('[Captcha] Captcha solver already configured');
			return true;
		}

		if (!this.config.captchaService || !this.config.captchaKey) {
			logger.warn(
				'[Captcha] Captcha solver not configured. Avatar changes may fail if captcha is required.',
			);
			logger.warn('[Captcha] Xem hướng dẫn tại: doc/CAPTCHA_SOLVER.md');
			return false;
		}

		try {
			if (this.config.captchaService !== '2captcha') {
				logger.warn(
					`[Captcha] Chỉ hỗ trợ 2captcha. Service ${this.config.captchaService} không được hỗ trợ.`,
				);
				return false;
			}

			// Dynamic import captcha solver package
			const Captcha2 = await import('@2captcha/captcha-solver');
			const CaptchaSolver = Captcha2.default || Captcha2;

			const captchaKey = this.config.captchaKey;

			// Set captcha solver trong CLIENT OPTIONS theo API của discord.js-selfbot-v13
			this.options.captchaSolver = async (captcha: any, userAgent: string) => {
				try {
					logger.info('[Captcha] Discord yêu cầu giải captcha...');
					logger.info(`[Captcha] Sitekey: ${captcha.captcha_sitekey}`);

					const solver = new CaptchaSolver.Solver(captchaKey);

					logger.info('[Captcha] Đang gửi captcha đến 2Captcha...');

					// Giải hCaptcha - chỉ cần 1 object parameter
					const result = await solver.hcaptcha({
						sitekey: captcha.captcha_sitekey,
						pageurl: 'https://discord.com/channels/@me',
						data: captcha.captcha_rqdata,
						userAgent: userAgent,
					});

					logger.sent('[Captcha] ✅ Đã giải captcha thành công!');
					return result.data;
				} catch (error: unknown) {
					logger.error('[Captcha] ❌ Lỗi khi giải captcha:');
					logger.error(error as Error);

					const err = error as Error;
					if (err.message?.includes('ZERO_BALANCE')) {
						logger.error('[Captcha] Tài khoản 2Captcha hết tiền!');
					} else if (err.message?.includes('ERROR_WRONG_USER_KEY')) {
						logger.error('[Captcha] API Key không đúng!');
					}

					throw error;
				}
			};

			this.captchaSolverConfigured = true;
			logger.info(`[Captcha] ✅ Captcha solver configured: ${this.config.captchaService}`);
			logger.info(`[Captcha] API Key: ${this.config.captchaKey.substring(0, 8)}...`);
			return true;
		} catch (error) {
			logger.error('[Captcha] Failed to setup captcha solver:');
			logger.error(error as Error);
			logger.warn('[Captcha] Bạn có thể cần cài: npm install @2captcha/captcha-solver');
			return false;
		}
	};

	public registerEvents = () => {
		this.once('ready', async () => {
			logger.info('Logged in as ' + this.user?.displayName);

			if (this.config.showRPC) {
				loadPresence(this);
				startAutoPresenceUpdate(this); // Bắt đầu auto update presence
			}
			if (this.config.prefix) this.commands = await loadCommands();

			this.activeChannel = this.channels.cache.get(this.config.channelID[0]) as TextChannel;

			// Khởi tạo Auto Chat Manager
			if (this.config.autoChat) {
				this.autoChatManager = new AutoChatManager(this);
				logger.info('[AutoChat] Đã khởi tạo Auto Chat Manager');
			}

			logger.info(`Loaded ${this.commands.size} commands`);
			logger.info(`Running on channel: ${this.activeChannel.name}`);

			this.main();
		});
		commandHandler(this);
		mentionHandler(this);
		avatarHandler(this);
		welcomeHandler(this);
	};

	public checkAccount = (token?: string): Promise<Client> => {
		return new Promise((resolve, reject) => {
			logger.info('Checking account...');
			this.once('ready', () => {
				resolve(this);
			});
			try {
				token ? this.login(token) : this.QRLogin();
			} catch (error) {
				reject(error);
			}
		});
	};

	public main = async () => {
		logger.info('[MAIN] 🚀 Bot đã khởi động - CHỈ CHẠY AUTO CHAT MODE');

		// Vòng lặp chính - chỉ xử lý auto chat
		while (true) {
			// Xử lý Auto Chat
			if (this.autoChatManager) {
				await this.autoChatManager.checkAndSendRandomChat();
			}

			// Chờ trước khi lặp lại
			await this.sleep(ranInt(2000, 5000)); // 2-5 giây
		}
	};

	public setConfig = async (config: Configuration) => {
		this.config = config;
		this.cache = structuredClone(config);

		// Setup captcha solver NGAY SAU KHI set config (TRƯỚC KHI login)
		await this.setupCaptchaSolver();
	};

	public run = (_config?: Configuration) => {
		// Config và handlers đã được setup, không cần làm gì thêm
		// Method này giữ lại để tương thích với code cũ
	};
}
