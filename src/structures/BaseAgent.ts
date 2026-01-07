import {
	Client,
	Collection,
	CollectorFilter,
	Message,
	TextChannel,
} from "discord.js-selfbot-v13";
import { ranInt } from "../utils/utils.js";
import {
	AgentOptions,
	Commands,
	Configuration,
} from "../typings/typings.js";
import { logger } from "../utils/logger.js";
import { loadPresence, startAutoPresenceUpdate } from "../feats/presence.js";
import { loadCommands } from "../feats/command.js";
import { commandHandler } from "../handler/commandHandler.js";
import { mentionHandler } from "../handler/mentionHandler.js";
import { avatarHandler } from "../handler/avatarHandler.js";
import { AutoChatManager } from "../feats/autoChat.js";

export class BaseAgent extends Client {
	public config!: Configuration;
	public cache!: Configuration;
	public activeChannel!: TextChannel;
	public autoChatManager?: AutoChatManager;

	totalTexts = 0;

	public commands: Collection<string, Commands> = new Collection();
	paused = false;

	RETAINED_USERS_IDS: string[] = []

	constructor({ options }: AgentOptions = {}) {
		super(options);
	}

	public setupCaptchaSolver = async () => {
		if (!this.config.captchaService || !this.config.captchaKey) {
			logger.warn("[Captcha] Captcha solver not configured. Avatar changes may fail if captcha is required.");
			logger.warn("[Captcha] Xem hướng dẫn tại: doc/CAPTCHA_SOLVER.md");
			return false;
		}

		try {
			// Dynamic import cho ES modules
			const Captcha = await import('@2captcha/captcha-solver');
			const CaptchaSolver = Captcha.default || Captcha;
			
			let solver: any;
			switch (this.config.captchaService) {
				case "2captcha":
					// @ts-ignore
					solver = new CaptchaSolver.Solver(this.config.captchaKey);
					// @ts-ignore
					this.captchaSolver = async (captcha: any) => {
						try {
							logger.info("[Captcha] Đang giải captcha với 2Captcha...");
							const result = await solver.hcaptcha(captcha.captcha_sitekey, 'discord.com', {
								data: captcha.captcha_rqdata,
							});
							logger.sent("[Captcha] Đã giải captcha thành công!");
							return result.data;
						} catch (error) {
							logger.error("[Captcha] Lỗi khi giải captcha:");
							logger.error(error as Error);
							throw error;
						}
					};
					break;
				case "capmonster":
				case "anti-captcha":
				case "custom":
					logger.warn(`[Captcha] Service ${this.config.captchaService} chưa được implement đầy đủ.`);
					logger.warn("[Captcha] Khuyên dùng 2captcha để có kết quả tốt nhất.");
					return false;
				default:
					logger.warn(`[Captcha] Unknown service: ${this.config.captchaService}`);
					return false;
			}

			logger.info(`[Captcha] ✅ Captcha solver configured: ${this.config.captchaService}`);
			return true;
		} catch (error) {
			logger.error("[Captcha] Failed to setup captcha solver:");
			logger.error(error as Error);
			logger.warn("[Captcha] Bạn có thể cần cài: npm install @2captcha/captcha-solver");
			return false;
		}
	}

	public registerEvents = () => {
		this.once("ready", async () => {
			logger.info("Logged in as " + this.user?.displayName);

			if (this.config.showRPC) {
				loadPresence(this);
				startAutoPresenceUpdate(this); // Bắt đầu auto update presence
			}
			if (this.config.prefix) this.commands = await loadCommands();

			this.activeChannel = this.channels.cache.get(
				this.config.channelID[0]
			) as TextChannel;

			// Khởi tạo Auto Chat Manager
			if (this.config.autoChat) {
				this.autoChatManager = new AutoChatManager(this);
				logger.info("[AutoChat] Đã khởi tạo Auto Chat Manager");
			}			

			logger.info(`Loaded ${this.commands.size} commands`);
			logger.info(`Running on channel: ${this.activeChannel.name}`);


			this.main();
		});
		commandHandler(this);
		mentionHandler(this);
		avatarHandler(this);
	};

	public checkAccount = (token?: string): Promise<Client> => {
		return new Promise((resolve, reject) => {
			logger.info("Checking account...");
			this.once("ready", () => {
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
		logger.info("[MAIN] 🚀 Bot đã khởi động - CHỈ CHẠY AUTO CHAT MODE");
		
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

	public run = async (config: Configuration) => {
		this.config = config;
		this.cache = structuredClone(config);
		
		// Setup captcha solver TRƯỚC KHI login
		await this.setupCaptchaSolver();
		
		this.registerEvents();
		this.emit("ready", this.user?.client!)
	}
}
