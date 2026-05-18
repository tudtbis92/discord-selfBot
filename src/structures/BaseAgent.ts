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

	/**
	 * Xử lý khi Discord yêu cầu giải captcha bằng dịch vụ 2Captcha.
	 * Resolves captcha using 2Captcha solver package.
	 *
	 * @private
	 * @param {object} captcha Object chứa thông tin captcha từ Discord
	 * @param {string} userAgent UserAgent gửi đi từ Client
	 * @param {string} captchaKey Key API của 2Captcha
	 * @param {any} CaptchaSolver Package giải Captcha được import động
	 * @returns {Promise<string>} Kết quả token đã giải của captcha
	 */
	private async handleCaptchaChallenge(
		captcha: { captcha_sitekey: string; captcha_rqdata?: string },
		userAgent: string,
		captchaKey: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		CaptchaSolver: any,
	): Promise<string> {
		try {
			logger.info('[Captcha] Discord yêu cầu giải captcha...');
			logger.info(`[Captcha] Sitekey: ${captcha.captcha_sitekey}`);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
			const solver = new CaptchaSolver.Solver(captchaKey);

			logger.info('[Captcha] Đang gửi captcha đến 2Captcha...');

			// Giải hCaptcha - chỉ cần 1 object parameter
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
			const result = await solver.hcaptcha({
				sitekey: captcha.captcha_sitekey,
				pageurl: 'https://discord.com/channels/@me',
				data: captcha.captcha_rqdata,
				userAgent: userAgent,
			});

			logger.sent('[Captcha] ✅ Đã giải captcha thành công!');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return result.data as string;
		} catch (error: unknown) {
			logger.error('[Captcha] ❌ Lỗi khi giải captcha:');
			logger.error(error as Error);

			const err = error as Error;
			if (err.message.includes('ZERO_BALANCE')) {
				logger.error('[Captcha] Tài khoản 2Captcha hết tiền!');
			} else if (err.message.includes('ERROR_WRONG_USER_KEY')) {
				logger.error('[Captcha] API Key không đúng!');
			}

			throw error;
		}
	}

	/**
	 * Thiết lập bộ giải captcha tự động.
	 * Sets up the automated captcha solver using 2captcha service.
	 *
	 * @public
	 * @returns {Promise<boolean>} Trả về true nếu thiết lập thành công
	 */
	public setupCaptchaSolver = async (): Promise<boolean> => {
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
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			const CaptchaSolver = Captcha2.default || Captcha2;

			const captchaKey = this.config.captchaKey;

			// Set captcha solver trong CLIENT OPTIONS theo API của discord.js-selfbot-v13
			this.options.captchaSolver = async (
				captcha: { captcha_sitekey: string; captcha_rqdata?: string },
				userAgent: string,
			) => {
				return this.handleCaptchaChallenge(captcha, userAgent, captchaKey, CaptchaSolver);
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

	/**
	 * Callback xử lý sự kiện 'ready' của client.
	 * Handles client initialization post login.
	 *
	 * @private
	 * @returns {Promise<void>} Resolves when ready handlers are set up
	 */
	private onReady = async (): Promise<void> => {
		logger.info(`Logged in as ${this.user?.displayName ?? 'Unknown user'}`);

		if (this.config.showRPC) {
			void loadPresence(this);
			startAutoPresenceUpdate(this); // Bắt đầu auto update presence
		}
		if (this.config.prefix) {
			this.commands = await loadCommands();
		}

		this.activeChannel = this.channels.cache.get(this.config.channelID[0]) as TextChannel;

		// Khởi tạo Auto Chat Manager
		if (this.config.autoChat) {
			this.autoChatManager = new AutoChatManager(this);
			logger.info('[AutoChat] Đã khởi tạo Auto Chat Manager');
		}

		logger.info(`Loaded ${String(this.commands.size)} commands`);
		logger.info(`Running on channel: ${this.activeChannel.name}`);

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

		// Setup captcha solver NGAY SAU KHI set config (TRƯỚC KHI login)
		await this.setupCaptchaSolver();
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
