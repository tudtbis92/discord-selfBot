import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const statusCommand: Commands = {
    name: "status",
    description: "Hiển thị trạng thái hiện tại của bot",
    execute: async (agent, message, ...args) => {
        try {
            const speedIcon = agent.speedMode === "turbo" ? "🚀" : 
                             agent.speedMode === "normal" ? "⚖️" : "🐌";
            
            const speedDescription = agent.speedMode === "turbo" ? "Turbo - Tốc độ cao nhất" :
                                   agent.speedMode === "normal" ? "Normal - Cân bằng" :
                                   "Slow - An toàn";

            const caucaStatus = agent.isCauCaRunning ? "🟢 Đang chạy" : "🔴 Đang chờ";
            const nhiemvuStatus = agent.isNhiemVuRunning ? "🟢 Đang chạy" : "🔴 Đang chờ";

            const statusMessage = `📊 **Trạng thái Bot:**

🎣 **Câu Cá:** ${caucaStatus}
📋 **Nhiệm Vụ:** ${nhiemvuStatus}

${speedIcon} **Chế độ tốc độ:** ${speedDescription}
🎯 **Mồi mặc định:** ${agent.defaultBait}

📈 **Thống kê:**
• Commands: ${agent.totalCommands}
• Texts: ${agent.totalTexts}
• Captcha giải được: ${agent.totalCaptcha.resolved}
• Captcha chưa giải: ${agent.totalCaptcha.unsolved}

🎮 **Voice:** ${agent.voice.connection ? "🟢 Đã kết nối" : "🔴 Chưa kết nối"}`;

            message.reply(statusMessage);

        } catch (error) {
            logger.error(`[Status] Lỗi: ${error}`);
            message.reply(`❌ Có lỗi xảy ra: ${error}`);
        }
    }
}

export default statusCommand;
