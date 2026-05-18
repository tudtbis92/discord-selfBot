import { logger } from '../utils/logger.js';
import { RedisCacheManager } from './RedisCacheManager.js';

/**
 * Interface cho một cuộc trò chuyện
 */
interface Conversation {
	userId: string;
	channelId: string;
	history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
	lastActivity: number;
	silentMode: boolean; // Bot sẽ không phản hồi khi ở chế độ silent
}

/**
 * Quản lý các cuộc trò chuyện giữa bot và users với Redis cache và RAM fallback
 */
export class ConversationManager {
	private conversations: Map<string, Conversation> = new Map();
	private readonly CONVERSATION_TIMEOUT = 30 * 60 * 1000; // 30 phút
	private cleanupInterval: NodeJS.Timeout | null = null;
	private redisCache: RedisCacheManager;

	constructor(redisUri?: string) {
		this.redisCache = new RedisCacheManager(redisUri);
		// Tự động dọn dẹp các conversation cũ mỗi 5 phút trong RAM
		this.startCleanupTask();
	}

	/**
	 * Tạo key duy nhất cho conversation trong RAM map
	 */
	private getConversationKey(userId: string, channelId: string): string {
		return `${userId}_${channelId}`;
	}

	/**
	 * Tạo key duy nhất cho Redis
	 */
	private getRedisKey(userId: string, channelId: string): string {
		return `owo:conv:${userId}:${channelId}`;
	}

	/**
	 * Lưu trạng thái cuộc trò chuyện vào Redis
	 */
	private async saveToRedis(
		userId: string,
		channelId: string,
		conv: Conversation,
	): Promise<void> {
		if (this.redisCache.connected) {
			const key = this.getRedisKey(userId, channelId);
			// Hết hạn sau 24 giờ để dọn dẹp Redis tự động
			await this.redisCache.set(key, conv, 24 * 60 * 60);
		}
	}

	/**
	 * Nạp trạng thái cuộc trò chuyện từ Redis vào RAM nếu có
	 */
	private async loadFromRedis(userId: string, channelId: string): Promise<Conversation | null> {
		if (!this.redisCache.connected) {
			return null;
		}

		const key = this.getRedisKey(userId, channelId);
		const cached = await this.redisCache.get<Conversation>(key);

		if (cached) {
			// Kiểm tra xem dữ liệu cache có hết hạn theo logic timeout không
			const isExpired = Date.now() - cached.lastActivity > this.CONVERSATION_TIMEOUT;
			if (isExpired) {
				await this.redisCache.delete(key);
				return null;
			}

			const ramKey = this.getConversationKey(userId, channelId);
			this.conversations.set(ramKey, cached);
			logger.debug(
				`[ConversationManager] Đã tải conversation từ Redis lên RAM cho key: ${ramKey}`,
			);
			return cached;
		}

		return null;
	}

	/**
	 * Bắt đầu một cuộc trò chuyện mới hoặc lấy cuộc trò chuyện hiện có
	 */
	async startConversation(userId: string, channelId: string): Promise<void> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (conv) {
			// Cập nhật last activity
			conv.lastActivity = Date.now();
			logger.debug(`[ConversationManager] Tiếp tục conversation: ${key}`);
		} else {
			// Tạo conversation mới
			conv = {
				userId,
				channelId,
				history: [],
				lastActivity: Date.now(),
				silentMode: false,
			};
			this.conversations.set(key, conv);
			logger.info(`[ConversationManager] Bắt đầu conversation mới: ${key}`);
		}

		await this.saveToRedis(userId, channelId, conv);
	}

	/**
	 * Kiểm tra xem có conversation active không
	 */
	async hasActiveConversation(userId: string, channelId: string): Promise<boolean> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (!conv) return false;

		// Kiểm tra xem có quá timeout không
		const isExpired = Date.now() - conv.lastActivity > this.CONVERSATION_TIMEOUT;
		if (isExpired) {
			await this.endConversation(userId, channelId);
			return false;
		}

		return true;
	}

	/**
	 * Thêm tin nhắn vào lịch sử
	 */
	async addMessage(
		userId: string,
		channelId: string,
		role: 'user' | 'assistant',
		content: string,
	): Promise<void> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (!conv) {
			logger.warn(
				`[ConversationManager] Không tìm thấy conversation để thêm tin nhắn: ${key}`,
			);
			return;
		}

		conv.history.push({
			role,
			content,
			timestamp: Date.now(),
		});

		conv.lastActivity = Date.now();

		// Giữ tối đa 20 tin nhắn gần nhất
		if (conv.history.length > 20) {
			conv.history = conv.history.slice(-20);
		}

		logger.debug(
			`[ConversationManager] Đã thêm tin nhắn (${role}): ${content.substring(0, 50)}...`,
		);

		await this.saveToRedis(userId, channelId, conv);
	}

	/**
	 * Lấy lịch sử cuộc trò chuyện
	 */
	async getHistory(
		userId: string,
		channelId: string,
	): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (!conv) return [];

		return conv.history.map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));
	}

	/**
	 * Xóa lịch sử chat nhưng giữ conversation
	 */
	async clearHistory(userId: string, channelId: string): Promise<void> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (conv) {
			conv.history = [];
			logger.info(`[ConversationManager] Đã xóa lịch sử chat: ${key}`);
			await this.saveToRedis(userId, channelId, conv);
		}
	}

	/**
	 * Bật chế độ silent (bot sẽ không phản hồi)
	 */
	async enableSilentMode(userId: string, channelId: string): Promise<void> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (conv) {
			conv.silentMode = true;
			logger.info(`[ConversationManager] Đã bật silent mode: ${key}`);
			await this.saveToRedis(userId, channelId, conv);
		}
	}

	/**
	 * Tắt chế độ silent
	 */
	async disableSilentMode(userId: string, channelId: string): Promise<void> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (conv) {
			conv.silentMode = false;
			logger.info(`[ConversationManager] Đã tắt silent mode: ${key}`);
			await this.saveToRedis(userId, channelId, conv);
		}
	}

	/**
	 * Kiểm tra xem conversation có đang ở silent mode không
	 */
	async isSilentMode(userId: string, channelId: string): Promise<boolean> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		return conv?.silentMode ?? false;
	}

	/**
	 * Kết thúc cuộc trò chuyện
	 */
	async endConversation(userId: string, channelId: string): Promise<void> {
		const key = this.getConversationKey(userId, channelId);
		this.conversations.delete(key);

		if (this.redisCache.connected) {
			const redisKey = this.getRedisKey(userId, channelId);
			await this.redisCache.delete(redisKey);
		}

		logger.info(`[ConversationManager] Đã kết thúc conversation: ${key}`);
	}

	/**
	 * Dọn dẹp các conversation đã hết hạn trong RAM
	 */
	private cleanup(): void {
		const now = Date.now();
		const toDelete: string[] = [];

		for (const [key, conv] of this.conversations.entries()) {
			if (now - conv.lastActivity > this.CONVERSATION_TIMEOUT) {
				toDelete.push(key);
			}
		}

		if (toDelete.length > 0) {
			toDelete.forEach((key) => this.conversations.delete(key));
			logger.info(
				`[ConversationManager] Đã dọn dẹp ${String(toDelete.length)} conversation hết hạn trong RAM`,
			);
		}
	}

	/**
	 * Bắt đầu task dọn dẹp định kỳ
	 */
	private startCleanupTask(): void {
		// Dọn dẹp mỗi 5 phút
		this.cleanupInterval = setInterval(
			() => {
				this.cleanup();
			},
			5 * 60 * 1000,
		);

		logger.info('[ConversationManager] Đã khởi động cleanup task');
	}

	/**
	 * Dừng cleanup task
	 */
	stopCleanupTask(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
			logger.info('[ConversationManager] Đã dừng cleanup task');
		}

		// Cũng ngắt kết nối Redis nếu có
		void this.redisCache.disconnect();
	}

	/**
	 * Lấy số lượng conversation đang active
	 */
	getActiveConversationsCount(): number {
		return this.conversations.size;
	}

	/**
	 * Clear tất cả conversations
	 */
	clearAll(): void {
		const count = this.conversations.size;
		this.conversations.clear();
		logger.info(`[ConversationManager] Đã xóa tất cả ${String(count)} conversations trong RAM`);
	}

	/**
	 * Lấy thời gian còn lại trước khi conversation hết hạn (ms)
	 */
	async getTimeRemaining(userId: string, channelId: string): Promise<number> {
		const key = this.getConversationKey(userId, channelId);
		let conv = this.conversations.get(key);

		if (!conv) {
			conv = (await this.loadFromRedis(userId, channelId)) || undefined;
		}

		if (!conv) return 0;

		const elapsed = Date.now() - conv.lastActivity;
		const remaining = this.CONVERSATION_TIMEOUT - elapsed;

		return Math.max(0, remaining);
	}
}
