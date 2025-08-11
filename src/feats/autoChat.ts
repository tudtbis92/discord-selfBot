import { BaseAgent } from "../structures/BaseAgent.js";
import { safeDiscordBotChatWithDelay, safeGeminiCall } from "../structures/gemini.js";
import { logger } from "../utils/logger.js";
import { ranInt } from "../utils/utils.js";
import { TextChannel, Message } from "discord.js-selfbot-v13";

export class AutoChatManager {
    private agent: BaseAgent;
    private autoChatChannel?: TextChannel;
    private lastChatTime: number = 0;
    private isProcessingMention: boolean = false;
    private randomChatTopics: string[] = [
        "Mọi người ơi, mình mới đọc đến chap mới của truyện tu tiên, twist quá! �✨",
        "Có ai biết làm sao để tăng linh khí không? Newbie cần tips nè �💫",
        "Sư huynh sư tỷ nào có kinh nghiệm về đan dược không? Share với mình đi! ⚗️�",
        "Thái Cổ Thánh Địa này view đẹp ghê, ai cũng feel peaceful không? �️✨",
        "Vừa breakthrough tầng mới rồi! Excited quá, ai cũng chúc mừng mình đi �⚡",
        "Đêm nay trăng tròn, perfect để tu luyện! Ai join mình ngồi thiền không? 🌕�",
        "Mình thấy có spiritual energy mạnh ở đây, newbie nào cũng cảm nhận được không? ✨🌟",
        "Có cao nhân nào guide mình về cultivation methods không? Đang stuck nè 🤔�",
        "Server này vibe chill quá, khác hẳn thế giới bên ngoài! Love it 💕�️",
        "Weekend rồi, ai có plan gì về tu luyện không? Share tips đi! 🎭⚡"
    ];

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

            // Lấy nội dung tin nhắn, loại bỏ mention
            let messageContent = message.content;
            if (message.mentions.users.has(this.agent.user?.id!)) {
                messageContent = messageContent.replace(/<@!?\d+>/g, '').trim();
            }

            if (!messageContent) {
                messageContent = "Bạn vừa mention mình nhưng không nói gì cả. Có chuyện gì thế?";
            }

            // Gọi Gemini để tạo phản hồi với delay
            const response = await safeDiscordBotChatWithDelay(message.author.id, messageContent);
            
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
            logger.info("[AutoChat] Đang tạo tin nhắn ngẫu nhiên...");

            // Chọn chủ đề ngẫu nhiên hoặc yêu cầu Gemini tạo
            let prompt: string;
            
            if (ranInt(0, 2) === 0) {
                // 50% dùng chủ đề có sẵn
                prompt = this.randomChatTopics[ranInt(0, this.randomChatTopics.length)];
            } else {
                // 50% yêu cầu Gemini tạo chủ đề mới
                const geminiPrompt = `Bạn là Hương, 19 tuổi, gen Z năng động vừa tham gia server Discord tu tiên "Thái Cổ Thánh Địa". 
                
Tạo một câu mở đầu cuộc trò chuyện ngẫu nhiên với style như sau:
- Ngôn ngữ gen Z, thân thiện và tò mò
- Dùng emoji �✨🌟�⚡��
- Có thể về: tu tiên, cultivation, linh khí, đan dược, breakthrough, thiền định, truyện tu tiên, thế giới tu tiên
- Tông giọng friendly, tò mò, newbie muốn học hỏi
- Dùng "mình" thay vì "tôi"
- Ngắn gọn 1-2 câu thôi
- Thỉnh thoảng dùng từ như "đạo hữu", "sư huynh", "sư tỷ"

Ví dụ style: "Đạo hữu nào có experience về breakthrough không? Mình đang stuck ở tầng này nè 🌟�"

Chỉ trả về nội dung tin nhắn, không giải thích.`;

                const response = await safeGeminiCall(geminiPrompt);
                prompt = response.success ? response.data! : this.randomChatTopics[ranInt(0, this.randomChatTopics.length)];
            }

            // Gửi tin nhắn
            await this.autoChatChannel.send(prompt);
            logger.info(`[AutoChat] Đã gửi tin nhắn ngẫu nhiên: ${prompt.substring(0, 50)}...`);
            
            // Cập nhật thời gian chat cuối
            this.lastChatTime = Date.now();

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

    // Method để lấy thống kê
    public getStats() {
        return {
            enabled: this.agent.config.autoChat,
            channel: this.autoChatChannel?.name,
            interval: this.agent.config.autoChatInterval,
            lastChatTime: this.lastChatTime,
            timeUntilNextChat: this.lastChatTime + ((this.agent.config.autoChatInterval || 4) * 60 * 1000) - Date.now(),
            isProcessingMention: this.isProcessingMention
        };
    }
}

export default AutoChatManager;
