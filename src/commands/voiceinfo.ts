import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const voiceinfoCommand: Commands = {
    name: "voiceinfo",
    description: "Hiển thị thông tin về kết nối voice hiện tại",
    execute: async (agent, message, ...args) => {
        try {
            // Kiểm tra xem bot có đang trong voice channel không
            if (!agent.voice.connection) {
                return message.reply("❌ Bot hiện không ở trong kênh voice nào!");
            }

            const connection = agent.voice.connection;
            
            const infoMessage = `🔊 **Thông tin Voice Connection:**
**Trạng thái:** Đã kết nối
**Connection ID:** \`${connection.channel?.id || 'N/A'}\`
**Channel:** ${connection.channel?.name || 'Không xác định'}
**Server:** ${connection.channel?.guild?.name || 'Không xác định'}`;

            message.reply(infoMessage);

        } catch (error) {
            logger.error(`[VoiceInfo] Lỗi khi lấy thông tin voice: ${error}`);
            message.reply("❌ Có lỗi xảy ra khi lấy thông tin voice connection!");
        }
    }
}

export default voiceinfoCommand;
