import { Message } from "discord.js-selfbot-v13";
import { BaseAgent } from "../structures/BaseAgent.js";
import { Commands } from "../typings/typings.js";

export default {
    name: "conversation",
    description: "Quản lý các cuộc trò chuyện active với bot",
    usage: "conversation [status|clear]",
    execute: async (agent: BaseAgent, message: Message, ...args: string[]) => {
        const subCommand = args[0]?.toLowerCase();

        // Note: ConversationManager được khởi tạo trong mentionHandler
        // Chúng ta sẽ cần export nó để command này có thể truy cập
        // Tạm thời gửi thông báo hướng dẫn
        
        switch (subCommand) {
            case "status":
                await message.reply("📊 Xem status conversation (feature đang được phát triển)");
                break;
            
            case "clear":
                await message.reply("🗑️ Clear conversations (feature đang được phát triển)");
                break;
            
            default:
                await message.reply(
                    "**Conversation Manager**\n\n" +
                    "Quản lý các cuộc trò chuyện với bot:\n" +
                    `\`${agent.config.prefix}conversation status\` - Xem trạng thái conversations\n` +
                    `\`${agent.config.prefix}conversation clear\` - Xóa tất cả conversations\n\n` +
                    "💡 Bot sẽ tự động nhớ cuộc trò chuyện trong vòng 30 phút sau khi bạn mention bot."
                );
        }
    },
} as Commands;
