import { BaseAgent } from "../structures/BaseAgent.js";
import { safeDiscordBotChatWithDelay, safeGeminiCall } from "../structures/gemini.js";
import { logger } from "../utils/logger.js";
import { ranInt } from "../utils/utils.js";
import { TextChannel, Message } from "discord.js-selfbot-v13";

export class AutoChatManager {
    private agent: BaseAgent;
    private autoChatChannel?: TextChannel;
    private lastChatTime: number = 0;
    private lastBotMessageCheckTime: number = 0; // Thời gian kiểm tra cuối khi tin nhắn mới nhất là của bot
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
                    this.agent.config.autoChatChannelID
                ) as TextChannel;
                
                if (this.autoChatChannel) {
                    logger.info(`[AutoChat] Đã thiết lập auto chat cho kênh: ${this.autoChatChannel.name}`);
                    this.setupMessageListener();
                } else {
                    logger.warn(`[AutoChat] Không tìm thấy kênh chat với ID: ${this.agent.config.autoChatChannelID}`);
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
            const isReply = message.reference?.messageId && 
                           this.autoChatChannel.messages.cache.get(message.reference.messageId)?.author.id === this.agent.user?.id;

            if (isMentioned || isReply) {
                await this.handleMentionOrReply(message);
            }
        });
    }

    private async handleMentionOrReply(message: Message) {
        if (this.isProcessingMention) return; // Tránh xử lý đồng thời
        this.isProcessingMention = true;

        try {
            logger.info(`[AutoChat] Đang xử lý mention/reply từ ${message.author.username}`);
            
            // Thêm delay ngẫu nhiên để tự nhiên hơn
            await this.agent.sleep(ranInt(1000, 3000));

            // Lấy context cuộc trò chuyện gần đây
            const recentMessages = await this.getRecentMessages(10);
            const conversationContext = this.buildConversationContext(recentMessages);

            // Lấy nội dung tin nhắn, loại bỏ mention
            let messageContent = message.content;
            if (message.mentions.users.has(this.agent.user?.id!)) {
                messageContent = messageContent.replace(/<@!?\d+>/g, '').trim();
            }

            if (!messageContent) {
                messageContent = "Bạn vừa mention mình nhưng không nói gì cả. Có chuyện gì thế?";
            }

            // Tạo prompt với context cho Gemini
            const contextualPrompt = conversationContext 
                ? `Nội dung cuộc trò chuyện gần đây:\n${conversationContext}\n\nTin nhắn hiện tại từ ${message.author.displayName || message.author.username}: ${messageContent}`
                : messageContent;

            // Gọi Gemini để tạo phản hồi với delay
            const response = await safeDiscordBotChatWithDelay(message.author.id, contextualPrompt);
            
            if (response.success && response.data) {
                // Gửi từng tin nhắn với delay đã được tính toán
                for (let i = 0; i < response.data.messages.length; i++) {
                    if (i > 0) {
                        // Sử dụng delay được tính toán từ Gemini service (7-10s)
                        await this.agent.sleep(response.data.delayBetween);
                    }
                    await this.autoChatChannel?.send(response.data.messages[i]);
                    logger.info(`[AutoChat] Đã phản hồi ${message.author.username} (${i + 1}/${response.data.messages.length}): ${response.data.messages[i].substring(0, 50)}...`);
                }
            } else {
                // Fallback response
                const fallbacks = [
                    "Oppss sorry, mình đang space out một chút 😅 Bạn có thể nói lại không?",
                    "Lol mình không catch được, bạn explain lại đi 🤔💭",
                    "Ơ wait, mình đang zoning out 😂 Bạn vừa nói gì thế?",
                    "Hehe brain lag một tí, repeat lại cho mình với 🙃✨",
                    "Sorry bạn, mình đang processing... có thể nói lại không? 🤖💀"
                ];
                
                const fallback = fallbacks[ranInt(0, fallbacks.length)];
                await this.autoChatChannel?.send(fallback);
                logger.warn(`[AutoChat] Sử dụng fallback response cho ${message.author.username}`);
            }

        } catch (error) {
            logger.error(`[AutoChat] Lỗi khi xử lý mention/reply: ${error}`);
        } finally {
            this.isProcessingMention = false;
        }
    }

    private async sendRandomChat() {
        if (!this.autoChatChannel || !this.agent.config.autoChat) return;
        if (this.isProcessingMention) return; // Không gửi random chat khi đang xử lý mention

        try {
            const now = Date.now();
            
            // Kiểm tra nếu đang trong thời gian delay do tin nhắn mới nhất là của bot
            if (this.botMessageDelayTime > 0 && now < this.botMessageDelayTime) {
                const remainingMinutes = Math.ceil((this.botMessageDelayTime - now) / 60000);
                logger.debug(`[AutoChat] Đang delay ${remainingMinutes} phút nữa do tin nhắn mới nhất là của bot`);
                return;
            }

            logger.debug("[AutoChat] Đang kiểm tra tin nhắn mới nhất...");

            // Kiểm tra tin nhắn mới nhất trong channel
            const lastMessage = await this.getLastMessage();
            if (lastMessage && lastMessage.author.id === this.agent.user?.id) {
                // Nếu lần kiểm tra trước đó cũng là tin nhắn của bot và chưa quá 1 phút
                if (this.lastBotMessageCheckTime > 0 && now - this.lastBotMessageCheckTime < 60000) {
                    // Đặt delay 3-5 phút
                    const delayMinutes = ranInt(3, 6); // 3-5 phút
                    this.botMessageDelayTime = now + (delayMinutes * 60 * 1000);
                    logger.info(`[AutoChat] Tin nhắn mới nhất vẫn là của bot, delay ${delayMinutes} phút`);
                } else {
                    // Lần đầu phát hiện hoặc đã qua 1 phút, chỉ ghi nhận thời gian
                    this.lastBotMessageCheckTime = now;
                    logger.debug("[AutoChat] Tin nhắn mới nhất là của bot, ghi nhận thời gian kiểm tra");
                }
                return;
            } else {
                // Reset thời gian kiểm tra và delay khi có tin nhắn của người khác
                this.lastBotMessageCheckTime = 0;
                this.botMessageDelayTime = 0;
            }

            logger.info("[AutoChat] Đang tạo tin nhắn ngẫu nhiên...");

            // Lấy 10 tin nhắn mới nhất để hiểu nội dung cuộc trò chuyện
            const recentMessages = await this.getRecentMessages(10);
            const conversationContext = this.buildConversationContext(recentMessages);

            // Yêu cầu Gemini tạo chủ đề dựa trên context cuộc trò chuyện
            let prompt: string;
            
            const geminiPrompt = `Bạn là Hương, 19 tuổi, gen Z năng động vừa tham gia server Discord "Thiên Ma Giới". 

${conversationContext ? `Nội dung cuộc trò chuyện gần đây:\n${conversationContext}\n\n` : ''}

Tạo một câu mở đầu cuộc trò chuyện ${conversationContext ? 'phù hợp với ngữ cảnh trên' : 'ngẫu nhiên'} với style như sau:
- Ngôn ngữ thuần Việt, thân thiện và tò mò
- Thỉnh thoảng dùng emoji (không phải lúc nào cũng cần) - chỉ khi thực sự cần thiết
- Có thể về: tu tiên, tu luyện, linh khí, đan dược, đột phá, thiền định, truyện tu tiên, thế giới tu tiên
- Tông giọng friendly, tò mò, newbie muốn học hỏi về tu tiên
- Dùng "mình" thay vì "tôi"
- Ngắn gọn 1-2 câu thôi
- Có thể dùng teen code Việt: "oke", "dc", "ko", "k", "j", "đc", "cx", "ntn", "sao", "thế"
- Thỉnh thoảng dùng từ tiếng Anh CỰC KỲ thông dụng: "ok", "cool", "wow", "nice" (chỉ những từ ai cũng biết, không lạm dụng)
- Thỉnh thoảng dùng từ như "đạo hữu", "sư huynh", "sư tỷ", "mọi người"
- Phần lớn tin nhắn không cần emoji, chỉ dùng khi muốn thể hiện cảm xúc đặc biệt
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ NHẬN MÌNH LÀ BOT HAY AI
- Luôn giữ vai trò là Hương - một cô gái 19 tuổi thật sự
${conversationContext ? '- Nếu có cuộc trò chuyện gần đây, hãy tham khảo và tạo câu chat phù hợp, có thể comment hoặc hỏi thêm về chủ đề đó' : ''}

Ví dụ style: "Đạo hữu nào giỏi về tu luyện ko? Mình đang bị kẹt ở tầng này nè 🌟"

Chỉ trả về nội dung tin nhắn, không giải thích.`;

            const response = await safeGeminiCall(geminiPrompt);
            
            if (response.success && response.data) {
                const prompt = response.data;
                
                // Gửi tin nhắn
                await this.autoChatChannel.send(prompt);
                logger.info(`[AutoChat] Đã gửi tin nhắn ngẫu nhiên: ${prompt.substring(0, 50)}...`);
                
                // Cập nhật thời gian chat cuối
                this.lastChatTime = Date.now();
            } else {
                logger.warn(`[AutoChat] Gemini lỗi, bỏ qua lần chat này`);
                return; // Không làm gì cả khi Gemini lỗi
            }

        } catch (error) {
            logger.error(`[AutoChat] Lỗi khi gửi random chat: ${error}`);
        }
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
            logger.info("[AutoChat] Đã tắt auto chat");
        }
    }

    // Method để thay đổi interval
    public setAutoChatInterval(minutes: number) {
        this.agent.config.autoChatInterval = minutes;
        logger.info(`[AutoChat] Đã đặt interval thành ${minutes} phút`);
    }

    // Method để lấy tin nhắn mới nhất trong channel
    private async getLastMessage(): Promise<Message | null> {
        if (!this.autoChatChannel) return null;
        
        try {
            const messages = await this.autoChatChannel.messages.fetch({ limit: 1 });
            return messages.first() || null;
        } catch (error) {
            logger.error(`[AutoChat] Lỗi khi lấy tin nhắn mới nhất: ${error}`);
            return null;
        }
    }

    // Method để lấy tin nhắn gần đây
    private async getRecentMessages(limit: number = 10): Promise<Message[]> {
        if (!this.autoChatChannel) return [];
        
        try {
            const messages = await this.autoChatChannel.messages.fetch({ limit });
            return Array.from(messages.values()).reverse(); // Sắp xếp theo thời gian tăng dần
        } catch (error) {
            logger.error(`[AutoChat] Lỗi khi lấy tin nhắn gần đây: ${error}`);
            return [];
        }
    }

    // Method để xây dựng context cuộc trò chuyện
    private buildConversationContext(messages: Message[]): string {
        if (!messages.length) return '';

        const contextMessages = messages
            .filter(msg => !msg.author.bot && msg.content.trim().length > 0) // Lọc bot và tin nhắn rỗng
            .slice(-5) // Chỉ lấy 5 tin nhắn gần nhất
            .map(msg => {
                const username = msg.author.displayName || msg.author.username;
                const content = msg.content.length > 100 
                    ? msg.content.substring(0, 100) + '...' 
                    : msg.content;
                return `${username}: ${content}`;
            });

        return contextMessages.length > 0 
            ? contextMessages.join('\n') 
            : '';
    }

    // Method để lấy thống kê
    public getStats() {
        const now = Date.now();
        const nextChatTime = this.lastChatTime + ((this.agent.config.autoChatInterval || 4) * 60 * 1000);
        const timeUntilNextChat = Math.max(0, nextChatTime - now);
        
        // Kiểm tra delay do tin nhắn bot
        const botDelayRemaining = this.botMessageDelayTime > 0 ? Math.max(0, this.botMessageDelayTime - now) : 0;
        
        return {
            enabled: this.agent.config.autoChat,
            channel: this.autoChatChannel?.name,
            interval: this.agent.config.autoChatInterval,
            lastChatTime: this.lastChatTime,
            timeUntilNextChat: botDelayRemaining > 0 ? botDelayRemaining : timeUntilNextChat,
            isProcessingMention: this.isProcessingMention,
            isBotMessageDelay: botDelayRemaining > 0,
            botDelayRemaining: botDelayRemaining
        };
    }
}

export default AutoChatManager;
