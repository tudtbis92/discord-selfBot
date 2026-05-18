import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const leavevCommand: Commands = {
    name: "leavev",
    description: "Rời khỏi kênh voice hiện tại",
    execute: async (agent, message, ..._args) => {
        try {
            // Kiểm tra xem bot có đang trong voice channel không
            if (!agent.voice.connection) {
                await message.reply("❌ Bot hiện không ở trong kênh voice nào!");
                return;
            }

            // Rời khỏi voice channel
            agent.voice.connection.disconnect();
            
            logger.info(`[LeaveV] Đã rời khỏi kênh voice`);
            await message.reply("✅ Đã rời khỏi kênh voice!");

        } catch (error) {
            logger.error(`[LeaveV] Lỗi khi rời voice channel: ${error}`);
            await message.reply("❌ Có lỗi xảy ra khi rời khỏi kênh voice!");
        }
        
        return;
    }
}

export default leavevCommand;
