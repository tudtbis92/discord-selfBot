import { BaseAgent } from '../structures/BaseAgent.js';
import { geminiService } from '../structures/GeminiService.js';
import { logger } from '../utils/logger.js';
import { ranInt } from '../utils/utils.js';
import { TextChannel, Message } from 'discord.js-selfbot-v13';
import { RedisCacheManager } from '../structures/RedisCacheManager.js';

export interface ChannelHistoryEntry {
	sender: string;     // Bot display name (e.g., "Hương")
	content: string;    // Message content
	timestamp: number;  // Date.now()
}

export class ChannelHistoryManager {
	private redisCache: RedisCacheManager;
	private ramCache: Map<string, ChannelHistoryEntry[]> = new Map();
	private readonly MAX_ENTRIES = 20;
	private readonly HISTORY_TTL = 30 * 60; // 30 minutes in seconds

	constructor(redisCache: RedisCacheManager) {
		this.redisCache = redisCache;
	}

	private getRedisKey(channelId: string): string {
		return `autochat:history:${channelId}`;
	}

	public async getHistory(channelId: string): Promise<ChannelHistoryEntry[]> {
		const key = this.getRedisKey(channelId);

		// Try RAM first
		if (this.ramCache.has(key)) {
			const ramData = this.ramCache.get(key);
			if (ramData) return ramData;
		}

		// Try Redis fallback
		if (this.redisCache.connected) {
			try {
				const redisData = await this.redisCache.get<ChannelHistoryEntry[]>(key);
				if (redisData && Array.isArray(redisData)) {
					// Populate RAM cache
					this.ramCache.set(key, redisData);
					return redisData;
				}
			} catch (error) {
				logger.error(
					`[ChannelHistoryManager] Error loading history from Redis: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		return [];
	}

	public async addMessage(channelId: string, entry: ChannelHistoryEntry): Promise<void> {
		const key = this.getRedisKey(channelId);
		const history = await this.getHistory(channelId);

		history.push(entry);

		// Trim to last 20 entries
		const trimmedHistory = history.slice(-this.MAX_ENTRIES);

		// Save to RAM
		this.ramCache.set(key, trimmedHistory);

		// Save to Redis
		if (this.redisCache.connected) {
			try {
				await this.redisCache.set(key, trimmedHistory, this.HISTORY_TTL);
				logger.debug(
					`[ChannelHistoryManager] Saved history to Redis for channel ${channelId} (total: ${String(trimmedHistory.length)})`,
				);
			} catch (error) {
				logger.error(
					`[ChannelHistoryManager] Error saving history to Redis: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		} else {
			logger.debug(
				`[ChannelHistoryManager] Redis not connected. Saved history to RAM only for channel ${channelId} (total: ${String(trimmedHistory.length)})`,
			);
		}
	}

	public async getLastActivity(channelId: string): Promise<number> {
		const history = await this.getHistory(channelId);
		if (history.length === 0) return 0;
		return history[history.length - 1].timestamp;
	}

	public async isQuiet(channelId: string, thresholdMs: number): Promise<boolean> {
		const lastActivity = await this.getLastActivity(channelId);
		if (lastActivity === 0) return true;
		return Date.now() - lastActivity > thresholdMs;
	}

	public formatForPrompt(channelId: string, maxEntries = 20): string {
		const key = this.getRedisKey(channelId);
		const ramData = this.ramCache.get(key) || [];
		const recent = ramData.slice(-maxEntries);
		return recent.map((e) => `${e.sender}: ${e.content}`).join('\n');
	}
}

export class AutoChatManager {
	private agent: BaseAgent;
	private autoChatChannel?: TextChannel;
	private lastChatTime: number = 0;
	private isProcessing: boolean = false;

	private queue: Array<{ message: Message; receivedAt: number }> = [];
	private lastProcessed: Map<string, number> = new Map();

	private readonly MAX_QUEUE = 3;
	private readonly DEDUP_WINDOW_MS = 10_000;

	private lastResponseTime: number = 0;
	private lastChannelMessageTime: number = 0;
	private readonly SELF_COOLDOWN_MS = 25_000; // 25s local self cooldown

	private redisCache: RedisCacheManager;
	private channelHistory: ChannelHistoryManager;
	private initiatorInterval?: NodeJS.Timeout;

	private readonly CLAIM_INITIATOR_LUA = `
local key = KEYS[1]
local myBotId = ARGV[1]
local myIndex = tonumber(ARGV[2])
local totalBots = tonumber(ARGV[3])
local quietThresholdMs = tonumber(ARGV[4])
local now = tonumber(ARGV[5])
local ttlSeconds = tonumber(ARGV[6])

local stateStr = redis.call('GET', key)
local state = { botId = "", nextIndex = 0, lastInitiatedAt = 0 }
if stateStr then
    state = cjson.decode(stateStr)
end

if now - state.lastInitiatedAt < quietThresholdMs then
    return { 0, "not_quiet" }
end

if state.nextIndex ~= myIndex then
    return { 0, "not_my_turn" }
end

local nextIdx = (myIndex + 1) % totalBots
state.botId = myBotId
state.nextIndex = nextIdx
state.lastInitiatedAt = now

local newStateStr = cjson.encode(state)
redis.call('SET', key, newStateStr, 'EX', ttlSeconds)

return { 1, "claimed" }
`;

	constructor(agent: BaseAgent) {
		this.agent = agent;
		this.redisCache = new RedisCacheManager(this.agent.config.redisUri);
		this.channelHistory = new ChannelHistoryManager(this.redisCache);

		// Register Lua script for initiator claim
		const rawRedis = this.redisCache.rawRedis();
		if (rawRedis) {
			try {
				/* eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
				(rawRedis as any).defineCommand('claimInitiator', {
					numberOfKeys: 1,
					lua: this.CLAIM_INITIATOR_LUA,
				});
				logger.info('[Initiator] Lua script registered for atomic claim+rotate');
			} catch (error) {
				logger.error(
					`[Initiator] Failed to register Lua script: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		this.setupAutoChat();
	}

	private setupAutoChat() {
		if (this.agent.config.autoChat) {
			const channelId = this.agent.config.autoChatChannelID || this.agent.config.channelID?.[0];

			if (!channelId) {
				logger.error(
					'[AutoChat] Auto Chat được bật nhưng không tìm thấy autoChatChannelID hoặc channelID[0] trong cấu hình.',
				);
				return;
			}

			if (!this.agent.config.autoChatChannelID) {
				logger.warn(
					`[AutoChat] autoChatChannelID không được cấu hình. Tự động sử dụng kênh chính (channelID[0]): ${channelId}`,
				);
			}

			try {
				this.autoChatChannel = this.agent.channels.cache.get(channelId) as TextChannel | undefined;

				if (this.autoChatChannel) {
					logger.info(
						`[AutoChat] Đã thiết lập auto chat cho kênh: ${this.autoChatChannel.name}`,
					);
					this.setupMessageListener();
					this.startInitiatorCheck();
				} else {
					logger.warn(
						`[AutoChat] Không tìm thấy kênh chat với ID: ${channelId}`,
					);
				}
			} catch (error) {
				logger.error(
					`[AutoChat] Lỗi khi thiết lập auto chat: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	private async acquireChannelLock(channelId: string, myBotId: string): Promise<boolean> {
		if (!this.redisCache.connected) return true;
		const rawRedis = this.redisCache.rawRedis();
		if (!rawRedis) return true;
		try {
			const key = `autochat:channel_lock:${channelId}`;
			// Acquire locks for 12 seconds
			const result = await rawRedis.set(key, myBotId, 'PX', 12000, 'NX');
			return result === 'OK';
		} catch (error) {
			logger.error(
				`[AutoChat] Error acquiring channel lock: ${error instanceof Error ? error.message : String(error)}`,
			);
			return true;
		}
	}

	private async releaseChannelLock(channelId: string, myBotId: string): Promise<void> {
		if (!this.redisCache.connected) return;
		const rawRedis = this.redisCache.rawRedis();
		if (!rawRedis) return;
		try {
			const key = `autochat:channel_lock:${channelId}`;
			const current = await rawRedis.get(key);
			if (current === myBotId) {
				await rawRedis.del(key);
			}
		} catch (error) {
			logger.error(
				`[AutoChat] Error releasing channel lock: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private setupMessageListener() {
		if (!this.autoChatChannel) return;

		this.agent.on('messageCreate', (message: Message) => {
			if (!this.autoChatChannel || !this.agent.config.autoChat) return;
			if (message.channel.id !== this.autoChatChannel.id) return;

			const botIDs = new Set<string>(this.agent.config.autoChatBotIDs ?? []);
			const isMyMessage = message.author.id === this.agent.user?.id;
			const isBotMessage = botIDs.has(message.author.id) || isMyMessage;

			// Update the last channel message time to track active conversation state
			// Only update if it is one of the other 5 bots speaking
			if (isBotMessage && !isMyMessage) {
				this.lastChannelMessageTime = Date.now();
			}

			// Add the message to the channel history to keep it synced and track activity
			// Only record messages sent by the 5 bots
			if (isBotMessage) {
				const senderName = message.author.displayName || message.author.username;
				void this.channelHistory.addMessage(message.channel.id, {
					sender: senderName,
					content: message.content,
					timestamp: Date.now(),
				}).catch((err) => {
					logger.error(`[AutoChat] Error adding incoming message to history: ${err instanceof Error ? err.message : String(err)}`);
				});
			}

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
		const isFromOtherBot = botIDs.has(message.author.id);

		const isMentioned = this.agent.user?.id
			? message.mentions.users.has(this.agent.user.id)
			: false;

		const refId = message.reference?.messageId;
		const isReply =
			refId !== undefined &&
			this.autoChatChannel.messages.cache.get(refId)?.author.id ===
				this.agent.user?.id;

		// Check if the channel has active conversation (last message within 90 seconds)
		const isChannelActive = (Date.now() - this.lastChannelMessageTime) < 90000;

		if (!isMentioned && !isReply) {
			if (!isChannelActive) return false;

			// Chime-in probability: 20% to interject
			const chimeRoll = Math.random();
			if (chimeRoll > 0.20) return false;

			logger.debug(
				`[AutoChat] Chiming in on active conversation (roll: ${chimeRoll.toFixed(2)} <= 0.20)`,
			);
		}

		// 1. Enforce local self cooldown to avoid double response from same bot too fast
		const now = Date.now();
		if (now - this.lastResponseTime < this.SELF_COOLDOWN_MS) {
			logger.debug(
				`[AutoChat] Trigger ignored due to local self-cooldown (${String(Math.ceil((this.SELF_COOLDOWN_MS - (now - this.lastResponseTime)) / 1000))}s remaining)`,
			);
			return false;
		}

		// 2. Enforce response probability based on sender type
		const roll = Math.random();

		if (isFromOtherBot) {
			// Higher response probability for direct mentions/replies from other bots to ensure discussion flow
			if (isMentioned && roll > 0.90) {
				logger.debug(
					`[AutoChat] Mention from other bot ignored due to probability roll (${roll.toFixed(2)} > 0.90)`,
				);
				return false;
			}
			if (isReply && !isMentioned && roll > 0.75) {
				logger.debug(
					`[AutoChat] Reply from other bot ignored due to probability roll (${roll.toFixed(2)} > 0.75)`,
				);
				return false;
			}
		} else {
			// Higher probability for actual users
			if (isMentioned && roll > 0.95) {
				return false;
			}
			if (isReply && !isMentioned && roll > 0.85) {
				return false;
			}
		}

		return true;
	}

	private enqueueTrigger(message: Message): boolean {
		const senderId = message.author.id;
		const now = Date.now();
		const botIDs = new Set<string>(this.agent.config.autoChatBotIDs ?? []);
		if (!botIDs.has(senderId)) return false;

		const lastTime = this.lastProcessed.get(senderId);
		if (lastTime !== undefined && now - lastTime < this.DEDUP_WINDOW_MS) {
			const existingIndex = this.queue.findIndex(
				(entry) => entry.message.author.id === senderId,
			);
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

	private parseAndValidateMentions(
		text: string,
		knownBotIDs: Set<string>,
	): { cleanedText: string; mentionIDs: string[] } {
		const myId = this.agent.user?.id;
		const myName = this.agent.user?.displayName || this.agent.user?.username || 'Tôi';

		const botProfiles = [
			{ idKey: 'dacam', keywords: ['da cam', 'dacam', 'trump', 'donald'], displayName: 'Da Cam' },
			{ idKey: 'putoang', keywords: ['pu toang', 'putoang', 'putin', 'tin hói', 'tin hoi'], displayName: 'Pu Toang' },
			{ idKey: 'kimbeo', keywords: ['kim béo', 'kim beo', 'ủn', 'kim jong un', 'kim jong-un'], displayName: 'Kim Béo' },
			{ idKey: 'tamvannghe', keywords: ['tám văn nghệ', 'tam van nghe', 'tô lâm', 'to lam', 'anh tám', 'anh tam', 'lâm dát vàng', 'lam dat vang'], displayName: 'Tám Văn Nghệ' },
			{ idKey: 'gaupooh', keywords: ['gấu pooh', 'gau pooh', 'tập cận bình', 'tap can binh', 'tập hí', 'tap hi'], displayName: 'Gấu Pooh' }
		];

		// Dynamic mapping of ID to profile
		const idToProfile = new Map<string, typeof botProfiles[0]>();
		const profileIdMap = new Map<string, string>(); // profile.idKey -> actual discord ID

		for (const id of knownBotIDs) {
			const user = this.agent.users.cache.get(id);
			if (!user) continue;
			const nameLower = (user.displayName || user.username || '').toLowerCase();
			
			const matchedProfile = botProfiles.find(p => 
				p.keywords.some(k => nameLower.includes(k)) || 
				nameLower.includes(p.displayName.toLowerCase())
			);
			
			if (matchedProfile) {
				idToProfile.set(id, matchedProfile);
				profileIdMap.set(matchedProfile.idKey, id);
			}
		}

		let processedText = text;

		// 1. Correct mismatched name-mention patterns and upgrade plain name tags to real mentions
		// We sort profiles and keywords to process longer keywords first to avoid partial matching
		const allKeywords: Array<{ keyword: string; profile: typeof botProfiles[0] }> = [];
		for (const profile of botProfiles) {
			for (const kw of profile.keywords) {
				allKeywords.push({ keyword: kw, profile });
			}
			allKeywords.push({ keyword: profile.displayName.toLowerCase(), profile });
		}
		allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

		for (const item of allKeywords) {
			const targetId = profileIdMap.get(item.profile.idKey);
			if (!targetId) continue;

			// Match @keyword optionally followed by a mention or another tag to capture mismatches like @Pu Toang <@da_cam_id>
			const escapedKw = item.keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			const regex = new RegExp(`@${escapedKw}\\s*(<@!?(\\d+)>)?`, 'gi');

			processedText = processedText.replace(regex, (_fullMatch, _mentionGroup, _idGroup) => {
				// If it is a self-mention
				if (targetId === myId) {
					return `@${item.profile.displayName}`; // keep it as plain text to avoid self-mention
				}
				// Otherwise, convert/correct to a real mention
				return `<@${targetId}>`;
			});
		}

		// 2. Scan for any remaining raw mentions and handle duplicates/self-mentions
		const mentionRegex = /<@!?(\d+)>/g;
		const matches = [...processedText.matchAll(mentionRegex)];
		const allMentions: string[] = [];

		for (const match of matches) {
			const id = match[1];
			if (knownBotIDs.has(id)) {
				allMentions.push(id);
			}
		}

		// Keep up to 3 unique mentions (excluding self-mentions) to support the priority order and prevent excessive spam
		const uniqueMentions = Array.from(new Set(allMentions)).filter((id) => id !== myId);
		const validMentions = uniqueMentions.slice(0, 3);

		const cleanedText = processedText
			.replace(/<@!?\d+>/g, (fullMatch) => {
				const idMatch = fullMatch.match(/<@!?(\d+)>/);
				if (idMatch && knownBotIDs.has(idMatch[1])) {
					const id = idMatch[1];
					// If this is a self-mention
					if (id === myId) {
						return `@${myName}`; // replace with plain text name
					}
					// If this is the single allowed mention, keep it
					if (validMentions.includes(id)) {
						return fullMatch;
					} else {
						// Replace excess mentions with plain text names
						const cachedUser = this.agent.users.cache.get(id);
						const name = cachedUser ? (cachedUser.displayName || cachedUser.username) : 'Thành viên';
						return `@${name}`;
					}
				}
				return '';
			})
			.replace(/\s{2,}/g, ' ')
			.trim();

		return { cleanedText, mentionIDs: validMentions };
	}

	private async sendResponse(
		trigger: Message,
		text: string,
		validMentions: string[],
	): Promise<void> {
		const channel = this.autoChatChannel;
		if (!channel) return;

		// Write response to channel history BEFORE sending (aligned with Plan 02 timing)
		const myName = this.agent.user?.displayName ?? 'Unknown';
		await this.channelHistory.addMessage(channel.id, {
			sender: myName,
			content: text,
			timestamp: Date.now(),
		});

		const chunks = text.length > 100 ? this.splitLongResponse(text) : [text];

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

		// Update response timestamp to prevent immediate re-trigger
		this.lastResponseTime = Date.now();
		this.lastChannelMessageTime = Date.now();
	}

	private splitLongResponse(text: string): string[] {
		const lines = text
			.split(/\n+/)
			.map((l) => l.trim())
			.filter((l) => l);
		const chunks: string[] = [];

		for (const line of lines) {
			if (line.length <= 100) {
				chunks.push(line);
			} else {
				const sentences = line.split(/([.!?]+\s*)/).filter((s) => s.trim());
				let current = '';
				for (let i = 0; i < sentences.length; i += 2) {
					const sentence = (sentences[i] || '') + (sentences[i + 1] || '');
					if (
						(current + sentence).length > 100 ||
						(current.split(/[.!?]/).length > 2 && current.trim())
					) {
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

		const myBotId = this.agent.user?.id;
		const channel = this.autoChatChannel || (trigger.message.channel as TextChannel);
		const channelId = channel.id;

		if (!myBotId) {
			void this.processQueue();
			return;
		}

		// Try to acquire distributed channel lock to avoid parallel responses, with retry backoff
		let gotLock = false;
		let attempts = 0;
		const maxAttempts = 3;

		while (attempts < maxAttempts) {
			gotLock = await this.acquireChannelLock(channelId, myBotId);
			if (gotLock) break;

			attempts++;
			const delay = ranInt(3000, 6000);
			logger.debug(
				`[AutoChat] Channel lock is busy. Attempt ${attempts}/${maxAttempts} failed. Retrying in ${delay}ms...`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		if (!gotLock) {
			logger.debug(`[AutoChat] Another bot is already responding to this channel turn, skipping trigger`);
			void this.processQueue();
			return;
		}

		this.isProcessing = true;
		const botIDs = new Set<string>(this.agent.config.autoChatBotIDs ?? []);

		try {
			// Fetch authoritative recent messages from Discord channel, filtering to only keep messages from the 5 bots
			const discordMessages = await channel.messages.fetch({ limit: 50 });
			const sortedMessages = [...discordMessages.values()]
				.reverse()
				.filter((m) => botIDs.has(m.author.id) || m.author.id === myBotId)
				.slice(-20);
			
			const history = sortedMessages.map((m) => {
				const sender = m.author.displayName || m.author.username;
				return {
					role: 'user' as const,
					content: `${sender}: ${m.content}`,
				};
			});

			// Calculate message counts for each bot in the 5 bots list to find the least active one
			const counts: Record<string, number> = {};
			for (const id of botIDs) {
				counts[id] = 0;
			}
			if (myBotId) {
				counts[myBotId] = 0;
			}

			for (const m of sortedMessages) {
				if (counts[m.author.id] !== undefined) {
					counts[m.author.id]++;
				}
			}

			let leastActiveBotId: string | null = null;
			let minCount = Infinity;

			for (const id of Object.keys(counts)) {
				if (id === myBotId) continue; // Exclude ourselves
				if (counts[id] < minCount) {
					minCount = counts[id];
					leastActiveBotId = id;
				}
			}

			let leastActiveBotName = 'Thành viên';
			if (leastActiveBotId) {
				const user = this.agent.users.cache.get(leastActiveBotId);
				leastActiveBotName = user ? (user.displayName || user.username) : 'Thành viên';
			}

			// Feed the sender name along with the message to give Gemini clear context
			const triggerSender = trigger.message.author.displayName || trigger.message.author.username;
			let prompt = `${triggerSender}: ${trigger.message.content}`;

			// Add system note about the least active bot to encourage natural mentions (Priority 3)
			if (leastActiveBotId) {
				prompt += `\n\n[Gợi ý hệ thống: Đồng chí ${leastActiveBotName} (<@${leastActiveBotId}>) dạo này ít phát biểu nhất trong lịch sử chat (${minCount} tin nhắn). Nếu phù hợp, hãy mention/tag và nhắc khéo họ tham gia hội thoại.]`;
			}

			const geminiPromise = geminiService.generateResponseWithHistory(
				prompt,
				this.agent.config.autoChatCharacter || '',
				history,
			);

			const typingDuration = ranInt(5000, 15000);
			const typingPromise = this.simulateBurstTyping(
				channel,
				typingDuration,
			);

			const [response] = await Promise.all([geminiPromise, typingPromise.catch(() => '')]);

			const { cleanedText, mentionIDs } = this.parseAndValidateMentions(response, botIDs);
			await this.sendResponse(trigger.message, cleanedText, mentionIDs);
		} catch (error) {
			logger.error(
				`[AutoChat] Gemini response failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			await this.releaseChannelLock(channelId, myBotId);
			this.isProcessing = false;
			void this.processQueue();
		}
	}

	private startInitiatorCheck(): void {
		if (this.initiatorInterval) {
			clearInterval(this.initiatorInterval);
		}

		const intervalMs = ranInt(5, 10) * 60 * 1000;
		this.initiatorInterval = setInterval(() => {
			this.checkAndInitiate().catch((error: unknown) => {
				logger.error(
					`[Initiator] Error in checkAndInitiate: ${error instanceof Error ? error.message : String(error)}`,
				);
			});
		}, intervalMs);

		// Run once after short random delay (10-30 seconds)
		setTimeout(() => {
			void this.checkAndInitiate().catch((err: unknown) => {
				logger.error(
					`[Initiator] Error in initial checkAndInitiate: ${err instanceof Error ? err.message : String(err)}`,
				);
			});
		}, ranInt(10000, 30000));

		logger.info(`[Initiator] Check timer started (interval: ${String(intervalMs)}ms)`);
	}

	private async checkAndInitiate(): Promise<void> {
		if (!this.autoChatChannel || !this.agent.config.autoChat) return;

		const botIDs = this.agent.config.autoChatBotIDs ?? [];
		const myBotId = this.agent.user?.id;
		if (!myBotId) return;

		const myIndex = botIDs.indexOf(myBotId);
		if (myIndex === -1) {
			logger.debug(
				`[Initiator] Current bot is not in the autoChatBotIDs list (myIndex = -1), skipping`,
			);
			return;
		}

		const channelId = this.autoChatChannel.id;
		const quietThreshold = 15 * 60 * 1000; // 15 minutes in ms
		const ttlSeconds = 30 * 60; // 30 minutes in seconds

		const rawRedis = this.redisCache.rawRedis();
		if (!rawRedis) {
			logger.debug('[Initiator] Redis not available, skipping initiator check');
			return;
		}

		try {
			/* eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
			const result = (await (rawRedis as any).claimInitiator(
				`autochat:initiator:${channelId}`,
				myBotId,
				myIndex,
				botIDs.length,
				quietThreshold,
				Date.now(),
				ttlSeconds,
			)) as [number, string];

			const [statusCode, statusMsg] = result;
			if (statusCode === 1) {
				logger.info(`[Initiator] Claimed initiator role. Starting new topic...`);
				await this.sendOpeningTopic(channelId, botIDs, myBotId);
			} else if (statusMsg === 'not_quiet') {
				logger.debug(`[Initiator] Channel not quiet enough, skipping`);
			} else if (statusMsg === 'not_my_turn') {
				logger.debug(`[Initiator] Not my turn, skipping`);
			}
		} catch (error) {
			logger.error(
				`[Initiator] Failed to execute claimInitiator Lua script: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async sendOpeningTopic(
		channelId: string,
		botIDs: string[],
		myBotId: string,
	): Promise<void> {
		if (!this.autoChatChannel) return;

		const otherBots = botIDs.filter((id) => id !== myBotId);
		const mentions = otherBots.map((id) => `<@${id}>`).join(' ');

		try {
			const systemInstruction = this.agent.config.autoChatCharacter || '';
			const prompt = `The channel has been quiet for a while. Start a new conversation topic. Address these participants: ${mentions}. Stay in character.`;

			const response = await geminiService.generateResponseWithInstruction(
				prompt,
				systemInstruction,
			);
			const fullContent = `${mentions} ${response}`;

			// Write to history BEFORE sending (consistency)
			const myName = this.agent.user?.displayName ?? 'Unknown';
			await this.channelHistory.addMessage(channelId, {
				sender: myName,
				content: fullContent,
				timestamp: Date.now(),
			});

			// Send with burst typing (D-14)
			const typingDuration = ranInt(5000, 15000);
			const typingPromise = this.simulateBurstTyping(this.autoChatChannel, typingDuration);

			await Promise.all([
				typingPromise.catch(() => {}),
				this.autoChatChannel.send({
					content: fullContent,
					allowedMentions: { users: otherBots },
				}),
			]);

			this.lastResponseTime = Date.now();
			this.lastChannelMessageTime = Date.now();
			logger.info(
				`[Initiator] ${myName} started new topic in ${this.autoChatChannel.name}`,
			);
		} catch (error) {
			logger.error(
				`[Initiator] Failed to generate opening topic: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	public destroy(): void {
		if (this.initiatorInterval) {
			clearInterval(this.initiatorInterval);
			this.initiatorInterval = undefined;
			logger.info('[Initiator] Cleaned up initiator check interval');
		}
	}

	private async sendRandomChat(): Promise<void> {
		if (!this.autoChatChannel || this.isProcessing) return;

		this.isProcessing = true;
		const channelId = this.autoChatChannel.id;
		const myBotId = this.agent.user?.id;
		const botIDs = new Set<string>(this.agent.config.autoChatBotIDs ?? []);

		try {
			// Fetch authoritative recent messages from Discord channel, filtering to only keep messages from the 5 bots
			const discordMessages = await this.autoChatChannel.messages.fetch({ limit: 50 });
			const sortedMessages = [...discordMessages.values()]
				.reverse()
				.filter((m) => botIDs.has(m.author.id) || m.author.id === myBotId)
				.slice(-10);

			const history = sortedMessages.map((m) => {
				const sender = m.author.displayName || m.author.username;
				return {
					role: 'user' as const,
					content: `${sender}: ${m.content}`,
				};
			});

			// Calculate message counts for each bot in the 5 bots list to find the least active one
			const counts: Record<string, number> = {};
			for (const id of botIDs) {
				counts[id] = 0;
			}
			if (myBotId) {
				counts[myBotId] = 0;
			}

			for (const m of sortedMessages) {
				if (counts[m.author.id] !== undefined) {
					counts[m.author.id]++;
				}
			}

			let leastActiveBotId: string | null = null;
			let minCount = Infinity;

			for (const id of Object.keys(counts)) {
				if (id === myBotId) continue; // Exclude ourselves
				if (counts[id] < minCount) {
					minCount = counts[id];
					leastActiveBotId = id;
				}
			}

			let leastActiveBotName = 'Thành viên';
			if (leastActiveBotId) {
				const user = this.agent.users.cache.get(leastActiveBotId);
				leastActiveBotName = user ? (user.displayName || user.username) : 'Thành viên';
			}

			const myName = this.agent.user?.displayName ?? 'Unknown';

			let prompt = history.length > 0
				? `Dựa trên lịch sử chat trên, hãy đưa ra một câu chat ngắn gọn, tự nhiên để tiếp tục câu chuyện hoặc chia sẻ một ý nghĩ ngẫu nhiên. Đừng tag ai trừ khi cần thiết.`
				: `Hãy bắt đầu một câu chuyện ngắn gọn, tự nhiên về cuộc sống hàng ngày hoặc cảm xúc hiện tại của bạn.`;

			// Add system note about the least active bot to encourage natural mentions (Priority 3)
			if (leastActiveBotId && history.length > 0) {
				prompt += `\n\n[Gợi ý hệ thống: Đồng chí ${leastActiveBotName} (<@${leastActiveBotId}>) dạo này ít phát biểu nhất trong lịch sử chat (${minCount} tin nhắn). Nếu phù hợp, hãy mention/tag và nhắc khéo họ tham gia hội thoại.]`;
			}

			const systemInstruction = this.agent.config.autoChatCharacter || '';

			const response = await geminiService.generateResponseWithHistory(
				prompt,
				systemInstruction,
				history,
			);

			// Clean and validate
			const { cleanedText, mentionIDs } = this.parseAndValidateMentions(response, botIDs);

			if (!cleanedText) {
				this.isProcessing = false;
				return;
			}

			// Save to history
			await this.channelHistory.addMessage(channelId, {
				sender: myName,
				content: cleanedText,
				timestamp: Date.now(),
			});

			// Typing simulation
			const typingDuration = ranInt(3000, 7000);
			await this.simulateBurstTyping(this.autoChatChannel, typingDuration);

			// Send
			await this.autoChatChannel.send({
				content: cleanedText,
				allowedMentions: { users: mentionIDs },
			});

			this.lastChatTime = Date.now();
			this.lastResponseTime = Date.now();
			this.lastChannelMessageTime = Date.now();
			logger.info(`[AutoChat] ${myName} đã gửi tin nhắn ngẫu nhiên tới ${this.autoChatChannel.name}`);
		} catch (error) {
			logger.error(
				`[AutoChat] Lỗi khi gửi tin nhắn ngẫu nhiên: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			this.isProcessing = false;
		}
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
				this.startInitiatorCheck();
			}
		}

		if (!enabled) {
			logger.info('[AutoChat] Đã tắt auto chat');
			this.destroy();
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
			isProcessingMention: this.isProcessing,
			queueLength: this.queue.length,
		};
	}
}

export default AutoChatManager;
