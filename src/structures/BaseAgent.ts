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

	public setupCaptchaSolver = () => {
		if (!this.config.captchaService || !this.config.captchaKey) {
			logger.warn("Captcha solver not configured. Avatar changes may fail if captcha is required.");
			return;
		}

		try {
			const captchaOptions: any = {
				captchaRetryLimit: this.config.captchaRetry || 3,
			};

			switch (this.config.captchaService) {
				case "2captcha":
					captchaOptions.captchaService = "2captcha";
					captchaOptions.captchaKey = this.config.captchaKey;
					break;
				case "capmonster":
					captchaOptions.captchaService = "capmonster";
					captchaOptions.captchaKey = this.config.captchaKey;
					break;
				case "anti-captcha":
					captchaOptions.captchaService = "anti-captcha";
					captchaOptions.captchaKey = this.config.captchaKey;
					break;
				case "custom":
					captchaOptions.captchaService = "custom";
					captchaOptions.captchaKey = this.config.captchaKey;
					break;
				default:
					logger.warn(`Unknown captcha service: ${this.config.captchaService}`);
					return;
			}

			// @ts-ignore - captchaSolver không có trong type definition
			this.options.captchaSolver = captchaOptions;
			logger.info(`Captcha solver configured: ${this.config.captchaService}`);
		} catch (error) {
			logger.error("Failed to setup captcha solver:");
			logger.error(error as Error);
		}
	}

	public registerEvents = () => {
		this.once("ready", async () => {
			logger.info("Logged in as " + this.user?.displayName);

			// Setup captcha solver
			this.setupCaptchaSolver();

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

	public run = (config: Configuration) => {
		this.config = config;
		this.cache = structuredClone(config);
		this.registerEvents();
		this.emit("ready", this.user?.client!)
	}
}
