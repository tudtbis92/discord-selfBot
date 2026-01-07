import { BaseAgent } from "../structures/BaseAgent.js";
import { logger } from "../utils/logger.js";

export const avatarHandler = async (agent: BaseAgent) => {
    agent.on("messageCreate", async (message) => {
        // Kiểm tra nếu không có config avatarUpdateChannelID
        if (!agent.config.avatarUpdateChannelID) return;
        
        // Kiểm tra nếu message không phải từ channel chỉ định
        if (message.channelId !== agent.config.avatarUpdateChannelID) return;
        
        // Kiểm tra nếu người gửi không phải là admin
        if (!agent.config.adminID || message.author.id !== agent.config.adminID) return;
        
        // Kiểm tra nếu message có attachment (image)
        if (message.attachments.size === 0) return;
        
        const attachment = message.attachments.first();
        if (!attachment) return;
        
        // Kiểm tra nếu attachment là image
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const isImage = imageExtensions.some(ext => 
            attachment.url.toLowerCase().includes(ext) || 
            attachment.contentType?.startsWith('image/')
        );
        
        if (!isImage) {
            logger.warn(`Attachment is not an image: ${attachment.url}`);
            return;
        }
        
        try {
            logger.info(`Updating bot avatar from: ${attachment.url}`);
            await agent.user?.setAvatar(attachment.url);
            logger.sent("Bot avatar updated successfully!");
            
            // Gửi message xác nhận (optional)
            await message.reply("✅ Avatar đã được cập nhật thành công!");
        } catch (error) {
            logger.error("Failed to update bot avatar:");
            logger.error(error as Error);
            
            try {
                await message.reply("❌ Không thể cập nhật avatar. Vui lòng thử lại sau.");
            } catch (replyError) {
                logger.error("Failed to send error reply:");
                logger.error(replyError as Error);
            }
        }
    });
};
