import { logger } from "../utils/logger.js";

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
 * Quản lý các cuộc trò chuyện giữa bot và users
 */
export class ConversationManager {
    private conversations: Map<string, Conversation> = new Map();
    private readonly CONVERSATION_TIMEOUT = 30 * 60 * 1000; // 30 phút
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Tự động dọn dẹp các conversation cũ mỗi 5 phút
        this.startCleanupTask();
    }

    /**
     * Tạo key duy nhất cho conversation
     */
    private getConversationKey(userId: string, channelId: string): string {
        return `${userId}_${channelId}`;
    }

    /**
     * Bắt đầu một cuộc trò chuyện mới hoặc lấy cuộc trò chuyện hiện có
     */
    startConversation(userId: string, channelId: string): void {
        const key = this.getConversationKey(userId, channelId);
        
        if (this.conversations.has(key)) {
            // Cập nhật last activity
            const conv = this.conversations.get(key)!;
            conv.lastActivity = Date.now();
            logger.debug(`[ConversationManager] Tiếp tục conversation: ${key}`);
        } else {
            // Tạo conversation mới
            this.conversations.set(key, {
                userId,
                channelId,
                history: [],
                lastActivity: Date.now(),
                silentMode: false,
            });
            logger.info(`[ConversationManager] Bắt đầu conversation mới: ${key}`);
        }
    }

    /**
     * Kiểm tra xem có conversation active không
     */
    hasActiveConversation(userId: string, channelId: string): boolean {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        if (!conv) return false;
        
        // Kiểm tra xem có quá timeout không
        const isExpired = Date.now() - conv.lastActivity > this.CONVERSATION_TIMEOUT;
        if (isExpired) {
            this.endConversation(userId, channelId);
            return false;
        }
        
        return true;
    }

    /**
     * Thêm tin nhắn vào lịch sử
     */
    addMessage(userId: string, channelId: string, role: 'user' | 'assistant', content: string): void {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        if (!conv) {
            logger.warn(`[ConversationManager] Không tìm thấy conversation: ${key}`);
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
        
        logger.debug(`[ConversationManager] Đã thêm tin nhắn (${role}): ${content.substring(0, 50)}...`);
    }

    /**
     * Lấy lịch sử cuộc trò chuyện
     */
    getHistory(userId: string, channelId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        if (!conv) return [];
        
        return conv.history.map(msg => ({
            role: msg.role,
            content: msg.content,
        }));
    }

    /**
     * Xóa lịch sử chat nhưng giữ conversation
     */
    clearHistory(userId: string, channelId: string): void {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        if (conv) {
            conv.history = [];
            logger.info(`[ConversationManager] Đã xóa lịch sử chat: ${key}`);
        }
    }

    /**
     * Bật chế độ silent (bot sẽ không phản hồi)
     */
    enableSilentMode(userId: string, channelId: string): void {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        if (conv) {
            conv.silentMode = true;
            logger.info(`[ConversationManager] Đã bật silent mode: ${key}`);
        }
    }

    /**
     * Tắt chế độ silent
     */
    disableSilentMode(userId: string, channelId: string): void {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        if (conv) {
            conv.silentMode = false;
            logger.info(`[ConversationManager] Đã tắt silent mode: ${key}`);
        }
    }

    /**
     * Kiểm tra xem conversation có đang ở silent mode không
     */
    isSilentMode(userId: string, channelId: string): boolean {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        return conv?.silentMode ?? false;
    }

    /**
     * Kết thúc cuộc trò chuyện
     */
    endConversation(userId: string, channelId: string): void {
        const key = this.getConversationKey(userId, channelId);
        
        if (this.conversations.delete(key)) {
            logger.info(`[ConversationManager] Đã kết thúc conversation: ${key}`);
        }
    }

    /**
     * Dọn dẹp các conversation đã hết hạn
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
            toDelete.forEach(key => this.conversations.delete(key));
            logger.info(`[ConversationManager] Đã dọn dẹp ${toDelete.length} conversation hết hạn`);
        }
    }

    /**
     * Bắt đầu task dọn dẹp định kỳ
     */
    private startCleanupTask(): void {
        // Dọn dẹp mỗi 5 phút
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
        
        logger.info("[ConversationManager] Đã khởi động cleanup task");
    }

    /**
     * Dừng cleanup task
     */
    stopCleanupTask(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.info("[ConversationManager] Đã dừng cleanup task");
        }
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
        logger.info(`[ConversationManager] Đã xóa tất cả ${count} conversations`);
    }

    /**
     * Lấy thời gian còn lại trước khi conversation hết hạn (ms)
     */
    getTimeRemaining(userId: string, channelId: string): number {
        const key = this.getConversationKey(userId, channelId);
        const conv = this.conversations.get(key);
        
        if (!conv) return 0;
        
        const elapsed = Date.now() - conv.lastActivity;
        const remaining = this.CONVERSATION_TIMEOUT - elapsed;
        
        return Math.max(0, remaining);
    }
}
