import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const speedCommand: Commands = {
    name: "speed",
    description: "Điều chỉnh tốc độ thực hiện các lệnh. Sử dụng: speed <mode> (turbo/normal/slow)",
    execute: async (agent, message, ...args) => {
        try {
            if (!args || args.length === 0 || !args[0]) {
                return message.reply("❌ Vui lòng chỉ định chế độ tốc độ!\n" +
                    "Sử dụng: `speed turbo` (nhanh nhất), `speed normal` (mặc định), `speed slow` (chậm)");
            }

            const mode = args[0].toLowerCase();
            
            switch (mode) {
                case "turbo":
                    // Chế độ turbo - tốc độ cao nhất
                    agent.speedMode = "turbo";
                    logger.info("[Speed] Chuyển sang chế độ TURBO - Tốc độ cao nhất");
                    message.reply("🚀 **Chế độ TURBO được kích hoạt!**\n" +
                        "• Delay tối thiểu\n" +
                        "• Timeout ngắn\n" +
                        "• Thực hiện nhanh nhất có thể");
                    break;

                case "normal":
                    // Chế độ bình thường
                    agent.speedMode = "normal";
                    logger.info("[Speed] Chuyển sang chế độ NORMAL - Tốc độ cân bằng");
                    message.reply("⚖️ **Chế độ NORMAL được kích hoạt!**\n" +
                        "• Delay cân bằng\n" +
                        "• Timeout vừa phải\n" +
                        "• An toàn và ổn định");
                    break;

                case "slow":
                    // Chế độ chậm - an toàn nhất
                    agent.speedMode = "slow";
                    logger.info("[Speed] Chuyển sang chế độ SLOW - Tốc độ an toàn");
                    message.reply("🐌 **Chế độ SLOW được kích hoạt!**\n" +
                        "• Delay cao\n" +
                        "• Timeout dài\n" +
                        "• An toàn tối đa");
                    break;

                default:
                    return message.reply("❌ Chế độ không hợp lệ!\n" +
                        "Các chế độ hỗ trợ: `turbo`, `normal`, `slow`");
            }

        } catch (error) {
            logger.error(`[Speed] Lỗi: ${error}`);
            message.reply(`❌ Có lỗi xảy ra: ${error}`);
        }
    }
}

export default speedCommand;
