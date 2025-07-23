import { BaseAgent } from "../structures/BaseAgent.js";
import { safeDiscordBotChat, safeGeminiCall } from "../structures/gemini.js";
import { logger } from "../utils/logger.js";
import { ranInt } from "../utils/utils.js";
import { TextChannel, Message } from "discord.js-selfbot-v13";

export class AutoChatManager {
    private agent: BaseAgent;
    private autoChatChannel?: TextChannel;
    private lastChatTime: number = 0;
    private isProcessingMention: boolean = false;
    private randomChatTopics: string[] = [
        "Ôi trời ơi, hôm nay nóng ghê! Ai có tips gì để survive không? 🥵💀",
        "Mình vừa nghe bài mới của NewJeans, addicted luôn! Ai cũng stan ai không? 🎵✨",
        "Game gì đang hot vậy mọi người? Mình đang bored muốn tìm game mới chơi 🎮👀",
        "Cuối tuần này ai có plan gì fun không? Share với mình đi! 🎉",
        "Đói bụng quá rồi... ai recommend quán ăn ngon ở HN không? 🍜😭",
        "Friday mood activated! Ai cũng excited như mình không? 🔥💯",
        "Vừa xem anime episode mới, twist plot crazy ghê! Ai cũng xem không? 📺😱",
        "Học hành stress quá, ai có cách relax nào hay không? Need help 😩✨",
        "Phim gì đang trending vậy? Mình cần content để binge watch 🎬👀",
        "Weather dễ thương quá, perfect để đi cafe! Ai rủ mình đi không? ☕💕"
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

            // Gọi Gemini để tạo phản hồi
            const response = await safeDiscordBotChat(message.author.id, messageContent);
            
            if (response.success && response.data) {
                // Chia nhỏ tin nhắn nếu quá dài
                const messages = this.splitMessage(response.data);
                
                for (let i = 0; i < messages.length; i++) {
                    if (i > 0) await this.agent.sleep(ranInt(1000, 2000)); // Delay giữa các tin nhắn
                    await this.autoChatChannel?.send(messages[i]);
                    logger.info(`[AutoChat] Đã phản hồi ${message.author.username}: ${messages[i].substring(0, 50)}...`);
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
                const geminiPrompt = `Bạn là Minh Châu, 19 tuổi, gen Z năng động đang chat trong server Discord "Phố Người Việt". 
                
Tạo một câu mở đầu cuộc trò chuyện ngẫu nhiên với style như sau:
- Ngôn ngữ gen Z, có thể lẫn tiếng Anh (vibe, mood, flex, etc.)
- Dùng emoji 😂🔥💀✨👀💯🎉
- Có thể về: thời tiết, game, anime, K-pop, đồ ăn, drama, học hành, trending topics
- Tông giọng năng động, hơi "mồm", táo bạo nhưng friendly
- Dùng "mình" thay vì "tôi"
- Ngắn gọn 1-2 câu thôi

Ví dụ style: "Alo server! Ai đang bored như mình không? Need some entertainment 😂💀"

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

    private splitMessage(text: string, maxLength: number = 2000): string[] {
        if (text.length <= maxLength) return [text];
        
        const messages: string[] = [];
        let currentMessage = "";
        
        const sentences = text.split(/([.!?]+\s*)/);
        
        for (const sentence of sentences) {
            if ((currentMessage + sentence).length > maxLength) {
                if (currentMessage) {
                    messages.push(currentMessage.trim());
                    currentMessage = sentence;
                } else {
                    // Nếu câu quá dài, cắt theo từ
                    const words = sentence.split(" ");
                    for (const word of words) {
                        if ((currentMessage + " " + word).length > maxLength) {
                            if (currentMessage) {
                                messages.push(currentMessage.trim());
                                currentMessage = word;
                            }
                        } else {
                            currentMessage += (currentMessage ? " " : "") + word;
                        }
                    }
                }
            } else {
                currentMessage += sentence;
            }
        }
        
        if (currentMessage.trim()) {
            messages.push(currentMessage.trim());
        }
        
        return messages;
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
