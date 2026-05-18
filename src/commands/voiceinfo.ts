import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const voiceinfoCommand: Commands = {
    name: "voiceinfo",
    description: "Hiển thị thông tin về kết nối voice hiện tại",
    execute: async (agent, message, ..._args) => {
        try {
            // Kiểm tra xem bot có đang trong voice channel không
            if (!agent.voice.connection) {
                await message.reply("❌ Bot hiện không ở trong kênh voice nào!");
                return;
            }

            const connection = agent.voice.connection;
            
            const infoMessage = `🔊 **Thông tin Voice Connection:**
**Trạng thái:** Đã kết nối
**Connection ID:** \`${connection.channel?.id || 'N/A'}\`
**Channel:** ${connection.channel?.name || 'Không xác định'}
**Server:** ${connection.channel?.guild?.name || 'Không xác định'}`;

            await message.reply(infoMessage);

        } catch (error) {
            logger.error(`[VoiceInfo] Lỗi khi lấy thông tin voice: ${error}`);
            await message.reply("❌ Có lỗi xảy ra khi lấy thông tin voice connection!");
        }
        
        return;
    }
}

export default voiceinfoCommand;
