import { BaseAgent } from '../structures/BaseAgent.js';
import { geminiService } from '../structures/GeminiService.js';
import { logger } from '../utils/logger.js';
import { ranInt } from '../utils/utils.js';
import { TextChannel, Message } from 'discord.js-selfbot-v13';

export class AutoChatManager {
	private agent: BaseAgent;
	private autoChatChannel?: TextChannel;
	private lastChatTime: number = 0;
	private isProcessing: boolean = false;

	private queue: Array<{ message: Message; receivedAt: number }> = [];
	private lastProcessed: Map<string, number> = new Map();

	private readonly MAX_QUEUE = 3;
	private readonly DEDUP_WINDOW_MS = 10_000;

	constructor(agent: BaseAgent) {
		this.agent = agent;
		this.setupAutoChat();
	}

	private setupAutoChat() {
		if (this.agent.config.autoChat && this.agent.config.autoChatChannelID) {
			try {
				this.autoChatChannel = this.agent.channels.cache.get(
					this.agent.config.autoChatChannelID,
				) as TextChannel | undefined;

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
				logger.error(
					`[AutoChat] Lỗi khi thiết lập auto chat: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	private setupMessageListener() {
		if (!this.autoChatChannel) return;

		this.agent.on('messageCreate', (message: Message) => {
			if (!this.autoChatChannel || !this.agent.config.autoChat) return;
			if (message.channel.id !== this.autoChatChannel.id) return;
			if (message.author.id === this.agent.user?.id) return;

			if (this.isTrigger(message)) {
				this.enqueueTrigger(message);
				void this.processQueue();
			}
		});
	}

	private isTrigger(message: Message): boolean {
		if (message.channel.id !== this.autoChatChannel?.id) return false;
		if (message.author.id === this.agent.user?.id) return false;

		const botIDs = new Set<string>(this.agent.config.autoChatBotIDs ?? []);
		if (!botIDs.has(message.author.id)) return false;

		const isMentioned = this.agent.user?.id
			? message.mentions.users.has(this.agent.user.id)
			: false;

		const refId = message.reference?.messageId;
		const isReply =
			refId !== undefined &&
			this.autoChatChannel.messages.cache.get(refId)?.author.id ===
				this.agent.user?.id;

		return isMentioned || isReply;
	}

	private enqueueTrigger(message: Message): boolean {
		const senderId = message.author.id;
		const now = Date.now();
		const botIDs = new Set<string>(this.agent.config.autoChatBotIDs ?? []);
		if (!botIDs.has(senderId)) return false;

		const lastTime = this.lastProcessed.get(senderId);
		if (lastTime !== undefined && now - lastTime < this.DEDUP_WINDOW_MS) {
			const existingIndex = this.queue.findIndex((entry) => entry.message.author.id === senderId);
			if (existingIndex !== -1) {
				this.queue[existingIndex] = { message, receivedAt: now };
				return false;
			}
		}

		if (this.queue.length >= this.MAX_QUEUE) {
			this.queue.shift();
		}

		this.queue.push({ message, receivedAt: now });
		this.lastProcessed.set(senderId, now);
		return true;
	}

	private async simulateBurstTyping(channel: TextChannel, durationMs: number): Promise<void> {
		const start = Date.now();
		const state = { aborted: false };

		try {
			while (Date.now() - start < durationMs) {
				if (state.aborted) {
					return;
				}
				await channel.sendTyping();
				await new Promise<void>((resolve) => {
					const timer = setTimeout(resolve, ranInt(1000, 3000));
					const checkAbort = setInterval(() => {
						if (state.aborted) {
							clearTimeout(timer);
							clearInterval(checkAbort);
							resolve();
						}
					}, 500);
				});
			}
		} finally {
			state.aborted = true;
		}
	}

	private parseAndValidateMentions(text: string, knownBotIDs: Set<string>): { cleanedText: string; mentionIDs: string[] } {
		const mentionRegex = /<@!?(\d+)>/g;
		const matches = [...text.matchAll(mentionRegex)];
		const validMentions: string[] = [];

		for (const match of matches) {
			const id = match[1];
			if (knownBotIDs.has(id)) {
				validMentions.push(id);
			}
		}

		const cleanedText = text
			.replace(/<@!?\d+>/g, (fullMatch) => {
				const idMatch = fullMatch.match(/<@!?(\d+)>/);
				if (idMatch && knownBotIDs.has(idMatch[1])) {
					return fullMatch;
				}
				return '';
			})
			.replace(/\s{2,}/g, ' ')
			.trim();

		return { cleanedText, mentionIDs: validMentions };
	}

	private async sendResponse(trigger: Message, text: string, validMentions: string[]): Promise<void> {
		const channel = this.autoChatChannel;
		if (!channel) return;

		const chunks = text.length > 100
			? this.splitLongResponse(text)
			: [text];

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			if (!chunk) continue;

			if (i === 0) {
				if (validMentions.length === 0) {
					await trigger.reply({
						content: chunk,
						allowedMentions: { repliedUser: false },
					});
				} else {
					await channel.send({
						content: chunk,
						allowedMentions: { users: validMentions },
					});
				}
			} else {
				await channel.send({
					content: chunk,
					allowedMentions: { users: validMentions },
				});
			}

			if (i < chunks.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, ranInt(2000, 5000)));
			}
		}
	}

	private splitLongResponse(text: string): string[] {
		const lines = text.split(/\n+/).map((l) => l.trim()).filter((l) => l);
		const chunks: string[] = [];

		for (const line of lines) {
			if (line.length <= 100) {
				chunks.push(line);
			} else {
				const sentences = line.split(/([.!?]+\s*)/).filter((s) => s.trim());
				let current = '';
				for (let i = 0; i < sentences.length; i += 2) {
					const sentence = (sentences[i] || '') + (sentences[i + 1] || '');
					if ((current + sentence).length > 100 || (current.split(/[.!?]/).length > 2 && current.trim())) {
						if (current.trim()) chunks.push(current.trim());
						current = sentence;
					} else {
						current += sentence;
					}
				}
				if (current.trim()) chunks.push(current.trim());
			}
		}

		return chunks.length > 0 ? chunks : [text];
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing) return;

		const trigger = this.queue.shift();
		if (!trigger) return;

		this.isProcessing = true;

		const botIDs = new Set<string>(this.agent.config.autoChatBotIDs ?? []);

		try {
			const geminiPromise = geminiService.generateResponseWithInstruction(
				trigger.message.content,
				'',
			);

			const typingDuration = ranInt(5000, 15000);
			const typingPromise = this.simulateBurstTyping(
				trigger.message.channel as TextChannel,
				typingDuration,
			);

			const [response] = await Promise.all([geminiPromise, typingPromise.catch(() => '')]);

			const { cleanedText, mentionIDs } = this.parseAndValidateMentions(response, botIDs);
			await this.sendResponse(trigger.message, cleanedText, mentionIDs);
		} catch {
			logger.error('[AutoChat] Gemini response failed');
		} finally {
			this.isProcessing = false;
			void this.processQueue();
		}
	}

	private sendRandomChat(): Promise<void> {
		return Promise.resolve();
	}

	public async checkAndSendRandomChat() {
		if (!this.agent.config.autoChat || !this.autoChatChannel) return;

		const now = Date.now();
		const intervalMs = (this.agent.config.autoChatInterval || 4) * 60 * 1000;
		const randomDelay = ranInt(-30000, 30000);

		if (now - this.lastChatTime > intervalMs + randomDelay) {
			await this.sendRandomChat();
		}
	}

	public setAutoChat(enabled: boolean, channelId?: string) {
		this.agent.config.autoChat = enabled;

		if (channelId) {
			this.agent.config.autoChatChannelID = channelId;
			this.autoChatChannel = this.agent.channels.cache.get(channelId) as
				| TextChannel
				| undefined;

			if (enabled && this.autoChatChannel) {
				logger.info(`[AutoChat] Đã bật auto chat cho kênh: ${this.autoChatChannel.name}`);
				this.setupMessageListener();
			}
		}

		if (!enabled) {
			logger.info('[AutoChat] Đã tắt auto chat');
		}
	}

	public setAutoChatInterval(minutes: number) {
		this.agent.config.autoChatInterval = minutes;
		logger.info(`[AutoChat] Đã đặt interval thành ${String(minutes)} phút`);
	}

	public getStats() {
		const now = Date.now();
		const nextChatTime =
			this.lastChatTime + (this.agent.config.autoChatInterval || 4) * 60 * 1000;
		const timeUntilNextChat = Math.max(0, nextChatTime - now);

		return {
			enabled: this.agent.config.autoChat,
			channel: this.autoChatChannel?.name,
			interval: this.agent.config.autoChatInterval,
			lastChatTime: this.lastChatTime,
			timeUntilNextChat,
			isProcessing: this.isProcessing,
			queueLength: this.queue.length,
		};
	}
}

export default AutoChatManager;
