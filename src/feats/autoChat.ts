import { BaseAgent } from '../structures/BaseAgent.js';
import { logger } from '../utils/logger.js';
import { ranInt } from '../utils/utils.js';
import { TextChannel, Message } from 'discord.js-selfbot-v13';

export class AutoChatManager {
	private agent: BaseAgent;
	private autoChatChannel?: TextChannel;
	private lastChatTime: number = 0;
	private botMessageDelayTime: number = 0; // Thời gian delay khi tin nhắn mới nhất là của bot
	private isProcessingMention: boolean = false;

	constructor(agent: BaseAgent) {
		this.agent = agent;
		this.setupAutoChat();
	}

	private setupAutoChat() {
		// Kiểm tra config và setup channel
		if (this.agent.config.autoChat && this.agent.config.autoChatChannelID) {
			try {
				this.autoChatChannel = this.agent.channels.cache.get(
					this.agent.config.autoChatChannelID,
				) as TextChannel;

				if (this.autoChatChannel) {
					logger.info(
						`[AutoChat] Đã thiết lập auto chat cho kênh: ${this.autoChatChannel.name}`,
					);
					this.setupMessageListener();
				} else {
					logger.warn(
						`[AutoChat] Không tìm thấy kênh chat với ID: ${this.agent.config.autoChatChannelID}`,
					);
				}
			} catch (error) {
				logger.error(`[AutoChat] Lỗi khi thiết lập auto chat: ${error}`);
			}
		}
	}

	private setupMessageListener() {
		if (!this.autoChatChannel) return;

		// Lắng nghe mention và reply
		this.agent.on('messageCreate', async (message: Message) => {
			if (!this.autoChatChannel || !this.agent.config.autoChat) return;
			if (message.channel.id !== this.autoChatChannel.id) return;
			if (message.author.id === this.agent.user?.id) return; // Bỏ qua tin nhắn của chính bot

			// Kiểm tra mention hoặc reply
			const isMentioned = message.mentions.users.has(this.agent.user?.id!);
			const isReply =
				message.reference?.messageId &&
				this.autoChatChannel.messages.cache.get(message.reference.messageId)?.author.id ===
					this.agent.user?.id;

			if (isMentioned || isReply) {
				await this.handleMentionOrReply(message);
			}
		});
	}

	private async handleMentionOrReply(_message: Message) {
		return; // DISABLED: Tạm thời tắt chức năng autochat
	}

	private async sendRandomChat() {
		return; // DISABLED: Tạm thời tắt chức năng autochat
	}

	// Method để gọi từ main loop
	public async checkAndSendRandomChat() {
		if (!this.agent.config.autoChat || !this.autoChatChannel) return;

		const now = Date.now();
		const intervalMs = (this.agent.config.autoChatInterval || 4) * 60 * 1000; // Convert phút thành ms
		const randomDelay = ranInt(-30000, 30000); // Random ±30 giây

		if (now - this.lastChatTime > intervalMs + randomDelay) {
			await this.sendRandomChat();
		}
	}

	// Method để enable/disable auto chat
	public setAutoChat(enabled: boolean, channelId?: string) {
		this.agent.config.autoChat = enabled;

		if (channelId) {
			this.agent.config.autoChatChannelID = channelId;
			this.autoChatChannel = this.agent.channels.cache.get(channelId) as TextChannel;

			if (enabled && this.autoChatChannel) {
				logger.info(`[AutoChat] Đã bật auto chat cho kênh: ${this.autoChatChannel.name}`);
				this.setupMessageListener();
			}
		}

		if (!enabled) {
			logger.info('[AutoChat] Đã tắt auto chat');
		}
	}

	// Method để thay đổi interval
	public setAutoChatInterval(minutes: number) {
		this.agent.config.autoChatInterval = minutes;
		logger.info(`[AutoChat] Đã đặt interval thành ${minutes} phút`);
	}

	// Method để lấy thống kê
	public getStats() {
		const now = Date.now();
		const nextChatTime =
			this.lastChatTime + (this.agent.config.autoChatInterval || 4) * 60 * 1000;
		const timeUntilNextChat = Math.max(0, nextChatTime - now);

		// Kiểm tra delay do tin nhắn bot
		const botDelayRemaining =
			this.botMessageDelayTime > 0 ? Math.max(0, this.botMessageDelayTime - now) : 0;

		return {
			enabled: this.agent.config.autoChat,
			channel: this.autoChatChannel?.name,
			interval: this.agent.config.autoChatInterval,
			lastChatTime: this.lastChatTime,
			timeUntilNextChat: botDelayRemaining > 0 ? botDelayRemaining : timeUntilNextChat,
			isProcessingMention: this.isProcessingMention,
			isBotMessageDelay: botDelayRemaining > 0,
			botDelayRemaining: botDelayRemaining,
		};
	}
}

export default AutoChatManager;
