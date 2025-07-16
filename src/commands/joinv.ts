import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const joinvCommand: Commands = {
    name: "joinv",
    description: "Join bot vào kênh voice được chỉ định",
    execute: async (agent, message, args) => {
        try {
            // Kiểm tra xem có cung cấp channelVoiceId không
            if (!args[0]) {
                return message.reply("❌ Vui lòng cung cấp ID của kênh voice!\nSử dụng: `joinv <channelVoiceId>`");
            }

            const voiceChannelId = args[0];
            
            // Tìm kênh voice
            const voiceChannel = agent.channels.cache.get(voiceChannelId);
            
            if (!voiceChannel) {
                return message.reply("❌ Không tìm thấy kênh voice với ID đã cung cấp!");
            }

            if (voiceChannel.type !== "GUILD_VOICE") {
                return message.reply("❌ ID được cung cấp không phải là kênh voice!");
            }

            // Kiểm tra xem bot đã join voice channel nào chưa
            if (agent.voice.connection) {
                agent.voice.connection.disconnect();
                logger.info(`[JoinV] Đã rời khỏi kênh voice hiện tại`);
            }

            // Join vào kênh voice
            const connection = await agent.voice.joinChannel(voiceChannel, {
                selfVideo: false,
                selfDeaf: false,
                selfMute: false,
            });
            
            logger.info(`[JoinV] Đã join vào kênh voice: ${voiceChannel.name} (${voiceChannelId})`);
            message.reply(`✅ Đã join vào kênh voice: **${voiceChannel.name}**`);

        } catch (error) {
            logger.error(`[JoinV] Lỗi khi join voice channel: ${error}`);
            message.reply("❌ Có lỗi xảy ra khi join vào kênh voice!");
        }
    }
}

export default joinvCommand;
