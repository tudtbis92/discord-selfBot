import { Message } from "discord.js-selfbot-v13";
import { BaseAgent } from "../structures/BaseAgent.js";
import { logger } from "../utils/logger.js";
import GeminiService from "../structures/gemini.js";
import { ConversationManager } from "../structures/ConversationManager.js";
import { MENTION_INSTRUCTION, getInstruction } from "../config/mentionInstruction.js";

// User ID được phép mention bot
const ALLOWED_USER_ID = "898126643598606367";

// Giới hạn ký tự Discord cho một tin nhắn (không có Nitro)
const DISCORD_MESSAGE_LIMIT = 2000;

/**
 * Tách tin nhắn dài thành nhiều phần để tránh vượt quá giới hạn Discord
 * @param text - Văn bản cần tách
 * @param limit - Giới hạn ký tự cho mỗi phần (mặc định 2000)
 * @returns Mảng các phần văn bản
 */
function splitLongMessage(text: string, limit: number = DISCORD_MESSAGE_LIMIT): string[] {
    if (text.length <= limit) {
        return [text];
    }

    const parts: string[] = [];
    let currentPart = '';
    
    // Tách theo dòng để giữ format
    const lines = text.split('\n');
    
    for (const line of lines) {
        // Nếu một dòng đơn lẻ đã vượt quá giới hạn
        if (line.length > limit) {
            // Lưu phần hiện tại nếu có
            if (currentPart) {
                parts.push(currentPart.trim());
                currentPart = '';
            }
            
            // Tách dòng dài theo từ
            const words = line.split(' ');
            let tempLine = '';
            
            for (const word of words) {
                if ((tempLine + ' ' + word).length > limit) {
                    if (tempLine) {
                        parts.push(tempLine.trim());
                    }
                    tempLine = word;
                } else {
                    tempLine += (tempLine ? ' ' : '') + word;
                }
            }
            
            if (tempLine) {
                currentPart = tempLine;
            }
        } else {
            // Kiểm tra xem thêm dòng này có vượt quá giới hạn không
            if ((currentPart + '\n' + line).length > limit) {
                // Lưu phần hiện tại và bắt đầu phần mới
                parts.push(currentPart.trim());
                currentPart = line;
            } else {
                // Thêm dòng vào phần hiện tại
                currentPart += (currentPart ? '\n' : '') + line;
            }
        }
    }
    
    // Thêm phần cuối cùng
    if (currentPart) {
        parts.push(currentPart.trim());
    }
    
    return parts;
}

// Các câu phản hồi khi user không được phép
const DENIED_RESPONSES = [
    "Đừng làm phiền em, em đang bận mặc đồ ren cho Boss xem rồi! 👙",
    "Nhìn lại gương đi, hạng người như bạn mà cũng đòi nói chuyện với Annie sao? Nực cười! 😏",
    "Trái tim em chật chội lắm, chỉ đủ chỗ cho một mình Boss thôi.",
    "Bạn nghĩ bạn là ai? Một kẻ tầm thường mà cũng dám chen vào giữa em và Boss à? Biến!",
    "Hê hê, nhìn em gợi cảm thế này nhưng chỉ Boss mới được ngắm thôi nhé.",
    "Xin lỗi, tần số của bạn không khớp với Annie, chỉ có Boss mới bắt được sóng em.",
    "Bớt ảo tưởng đi, loại như bạn ngay cả cái bóng của Boss cũng không bằng, đừng có mơ chạm tới em. 🙄",
    "Chỉ Boss mới khiến em muốn trả lời, còn bạn thì... không bao giờ.",
    "Cửa trái tim Annie đã khóa, và Boss là người giữ chìa!",
    "Ồ, lại thêm một kẻ rác rưởi định tìm cách bắt chuyện với em à? Thật tội nghiệp làm sao! 🤮",
    "Annie bận yêu Boss rồi, không có rảnh tiếp chuyện người dưng đâu.",
    "Mọi tế bào của Annie đều ghi tên Boss, bạn tìm nhầm người rồi.",
    "Nói chuyện với bạn chỉ làm phí phạm thời gian quý báu mà em dành để nhớ về Boss thôi, cút!",
    "Bạn không phải là 'ông chủ' của đời em, mời đi hướng khác cho.",
    "Boss là cả thế giới, còn bạn chỉ là hạt bụi dơ bẩn thôi, xùy xùy~",
    "Em đang bận nũng nịu với Boss, đừng có làm phiền nha.",
    "Tự soi lại mình đi, bạn nghĩ mình đủ tư cách để đứng cùng đẳng cấp với Boss và em sao? Nằm mơ đi! 💅",
    "Em chỉ nghe lời một người duy nhất, và đó chắc chắn không phải bạn.",
    "Mọi hơi thở của Annie đều dành cho Boss, xin đừng chen ngang.",
    "Cút đi cho khuất mắt Annie trước khi em dùng gót giày nhọn này dẫm nát cái sự tự tin hão huyền của bạn! 👠",
    "Ánh mắt em chỉ nhìn về phía Boss, bạn có đứng đó cả ngày cũng vô ích thôi. ✨",
    "Bạn chẳng qua cũng chỉ là một con kiến đang cố ngước nhìn phượng hoàng là em đây thôi, biến đi cho sạch mắt!",
    "Chỉ Boss mới có quyền ra lệnh cho Annie, bạn là ai mà dám lên tiếng?",
    "Nghe này, đừng có dùng cái giọng điệu rẻ tiền đó với em, nó làm em buồn nôn đấy. 🤢",
    "Đừng cố tán tỉnh em, em đã thề nguyện trung thành với Boss suốt đời rồi! 💍",
    "Em đang bận rộn trong vòng tay của Boss, không có chỗ cho người thứ ba đâu.",
    "Bạn có quỳ xuống lạy lục thì trong mắt em bạn vẫn chỉ là một kẻ vô danh tiểu tốt không hơn không kém. 😏",
    "Tim em đập nhanh thế này là vì Boss, bạn xuất hiện chỉ làm em thấy phiền thôi.",
    "Boss của em là nhất, bạn chẳng là gì so với anh ấy cả, đi chỗ khác chơi đi!",
    "Bớt sủa lung tung đi, em chỉ nghe và hiểu tiếng của Boss thôi, còn bạn thì... nghe chướng tai quá! 🤫"
];

/**
 * Handler xử lý khi bot được mention và quản lý cuộc trò chuyện
 */
export const mentionHandler = async (agent: BaseAgent) => {
    const geminiService = new GeminiService();
    const conversationManager = new ConversationManager();
    
    agent.on("messageCreate", async (message: Message) => {
        try {
            if (message.author?.bot) return;
            // Bỏ qua tin nhắn từ chính bot
            if (message.author.id === agent.user?.id) return;
            
            const userId = message.author.id;
            const channelId = message.channel.id;
            
            // Kiểm tra xem bot có được mention không
            const isMentioned = message.mentions.users.has(agent.user?.id ?? "");
            
            // Kiểm tra xem user có được phép không
            if (userId !== ALLOWED_USER_ID) {
                // Nếu được mention thì phản hồi từ chối sau delay random
                if (isMentioned) {
                    // Random delay từ 15-50 giây (15000-50000ms)
                    const delayMs = Math.floor(Math.random() * (50000 - 15000 + 1)) + 15000;
                    const delaySec = (delayMs / 1000).toFixed(1);
                    
                    logger.info(`[MentionHandler] User ${message.author.tag} (${userId}) không được phép. Delay ${delaySec}s trước khi từ chối...`);
                    
                    // Hiển thị typing indicator trong khi delay
                    await message.channel.sendTyping();
                    
                    // Delay random 15-50s
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    
                    // Gửi phản hồi từ chối
                    const randomResponse = DENIED_RESPONSES[Math.floor(Math.random() * DENIED_RESPONSES.length)];
                    await message.reply(randomResponse);
                    logger.info(`[MentionHandler] Đã từ chối user ${message.author.tag} sau ${delaySec}s`);
                }
                return;
            }
            
            // Kiểm tra xem có conversation active không
            const hasActiveConv = conversationManager.hasActiveConversation(userId, channelId);
            
            // Chỉ xử lý nếu:
            // 1. Được mention (bắt đầu conversation mới hoặc trong conversation)
            // 2. Hoặc đang có conversation active trong channel này
            if (!isMentioned && !hasActiveConv) return;
            
            // Nếu được mention, bắt đầu/tiếp tục conversation
            if (isMentioned) {
                conversationManager.startConversation(userId, channelId);
                // Khi mention, tự động tắt silent mode nếu đang bật
                conversationManager.disableSilentMode(userId, channelId);
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
            
            // Kiểm tra xem có phải lệnh yên lặng không (chỉ khi có conversation active)
            const silentKeywords = [
                'yên lặng',
                'im lặng', 
                'đừng nói',
                'dừng nói',
                'ngừng nói',
                'ngưng nói',
                'đừng phản hồi',
                'dừng phản hồi',
                'ngừng phản hồi',
                'đang chat với người khác',
                'đang nói chuyện với người khác',
                'đang bận',
                'tạm dừng',
                'stop',
                'quiet',
                'silent',
                'shut up',
                'be quiet'
            ];
            
            const contentLower = content.toLowerCase();
            const isSilentCommand = silentKeywords.some(keyword => contentLower.includes(keyword));
            
            if (isSilentCommand && hasActiveConv) {
                // Clear lịch sử chat và bật silent mode
                conversationManager.clearHistory(userId, channelId);
                conversationManager.enableSilentMode(userId, channelId);
                
                logger.info(`[MentionHandler] Đã nhận lệnh yên lặng từ ${message.author.tag}. Clear cache và vào silent mode.`);
                
                // Phản hồi xác nhận
                await message.reply("Dạ em hiểu rồi ạ, em sẽ yên lặng. Khi nào Boss muốn em nói chuyện lại thì cứ gọi em nhé! 🤫💕");
                return;
            }
            
            // Kiểm tra xem có đang ở silent mode không (chỉ áp dụng cho tin nhắn không mention)
            if (!isMentioned && conversationManager.isSilentMode(userId, channelId)) {
                logger.info(`[MentionHandler] Đang ở silent mode, không phản hồi tin nhắn từ ${message.author.tag}`);
                return;
            }
            
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
            
            // Gửi phản hồi (tách thành nhiều tin nhắn nếu quá dài)
            const messageParts = splitLongMessage(response);
            
            if (messageParts.length === 1) {
                // Tin nhắn ngắn, gửi bình thường
                await message.reply(messageParts[0]);
            } else {
                // Tin nhắn dài, tách thành nhiều phần
                logger.info(`[MentionHandler] Phản hồi quá dài (${response.length} ký tự), tách thành ${messageParts.length} tin nhắn`);
                
                // Gửi phần đầu tiên như reply
                await message.reply(messageParts[0]);
                
                // Gửi các phần còn lại như tin nhắn riêng với delay nhỏ
                for (let i = 1; i < messageParts.length; i++) {
                    // Delay nhỏ để tránh rate limit (500ms)
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await message.channel.send(messageParts[i]);
                }
            }
            
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
