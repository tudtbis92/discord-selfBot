import { Message } from "discord.js-selfbot-v13";
import { BaseAgent } from "../structures/BaseAgent.js";
import { logger } from "../utils/logger.js";
import GeminiService from "../structures/gemini.js";
import { ConversationManager } from "../structures/ConversationManager.js";
import { MENTION_INSTRUCTION, getInstruction } from "../config/mentionInstruction.js";

// User ID được phép mention bot
const ALLOWED_USER_ID = "898126643598606367";

/**
 * Handler xử lý khi bot được mention và quản lý cuộc trò chuyện
 */
export const mentionHandler = async (agent: BaseAgent) => {
    const geminiService = new GeminiService();
    const conversationManager = new ConversationManager();
    
    agent.on("messageCreate", async (message: Message) => {
        try {
            // Bỏ qua tin nhắn từ chính bot
            if (message.author.id === agent.user?.id) return;
            
            const userId = message.author.id;
            const channelId = message.channel.id;
            
            // Kiểm tra xem user có được phép không
            if (userId !== ALLOWED_USER_ID) return;
            
            // Kiểm tra xem bot có được mention không
            const isMentioned = message.mentions.users.has(agent.user?.id ?? "");
            
            // Kiểm tra xem có conversation active không
            const hasActiveConv = conversationManager.hasActiveConversation(userId, channelId);
            
            // Chỉ xử lý nếu:
            // 1. Được mention (bắt đầu conversation mới hoặc trong conversation)
            // 2. Hoặc đang có conversation active trong channel này
            if (!isMentioned && !hasActiveConv) return;
            
            // Nếu được mention, bắt đầu/tiếp tục conversation
            if (isMentioned) {
                conversationManager.startConversation(userId, channelId);
                logger.info(`[MentionHandler] ${isMentioned && !hasActiveConv ? 'Bắt đầu' : 'Tiếp tục'} conversation với ${message.author.tag} trong channel ${message.channel.id}`);
            }
            
            // Lấy nội dung tin nhắn (loại bỏ mention nếu có)
            let content = message.content
                .replace(/<@!?\d+>/g, '') // Loại bỏ mention
                .trim();
            
            // Nếu không có nội dung, sử dụng greeting mặc định
            if (!content) {
                content = "Xin chào!";
            }
            
            logger.debug(`[MentionHandler] Nội dung: ${content}`);
            
            // Hiển thị typing indicator
            await message.channel.sendTyping();
            
            // Lấy instruction phù hợp
            const specificInstruction = getInstruction(content);
            const systemInstruction = MENTION_INSTRUCTION;
            
            // Lấy lịch sử cuộc trò chuyện
            const history = conversationManager.getHistory(userId, channelId);
            
            // Tạo phản hồi từ Gemini AI với system instruction và history
            let response: string;
            if (history.length > 0) {
                // Có history, sử dụng context
                response = await geminiService.generateResponseWithHistory(content, systemInstruction, history);
                logger.debug(`[MentionHandler] Sử dụng ${history.length} tin nhắn từ history`);
            } else {
                // Không có history, conversation mới
                response = await geminiService.generateResponseWithInstruction(content, systemInstruction);
                logger.debug(`[MentionHandler] Conversation mới, không có history`);
            }
            
            if (!response) {
                logger.warn("[MentionHandler] Không nhận được phản hồi từ Gemini AI");
                await message.reply("Xin lỗi, mình không thể phản hồi lúc này 😔");
                return;
            }
            
            logger.debug(`[MentionHandler] Phản hồi: ${response}`);
            
            // Lưu tin nhắn của user vào history
            conversationManager.addMessage(userId, channelId, 'user', content);
            
            // Gửi phản hồi
            await message.reply(response);
            
            // Lưu phản hồi của bot vào history
            conversationManager.addMessage(userId, channelId, 'assistant', response);
            
            // Log thời gian còn lại của conversation
            const timeRemaining = conversationManager.getTimeRemaining(userId, channelId);
            const minutesRemaining = Math.floor(timeRemaining / 60000);
            logger.info(`[MentionHandler] Đã phản hồi thành công. Conversation còn ${minutesRemaining} phút`);
            
        } catch (error) {
            logger.error("[MentionHandler] Lỗi khi xử lý mention:");
            logger.error(error as Error);
            
            // Gửi thông báo lỗi thân thiện cho người dùng
            try {
                const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
                
                // Nếu là lỗi từ Gemini API, gửi thông báo chi tiết
                if (errorMessage.includes('Lỗi:') || errorMessage.includes('Google AI')) {
                    await message.reply(`${errorMessage}\n\nVui lòng thử lại sau hoặc liên hệ admin.`);
                } else {
                    // Lỗi khác, gửi thông báo chung
                    await message.reply("Xin lỗi, đã có lỗi xảy ra khi xử lý tin nhắn của bạn 😔");
                }
            } catch (replyError) {
                logger.error("[MentionHandler] Không thể gửi thông báo lỗi:");
                logger.error(replyError as Error);
            }
        }
    });
    
    logger.info("[MentionHandler] Đã đăng ký mention handler với conversation manager");
};
