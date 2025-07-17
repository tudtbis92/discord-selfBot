import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const joinv2Command: Commands = {
    name: "joinv2",
    description: "Alternative join voice command với fetch trực tiếp",
    execute: async (agent, message, ...args) => {
        try {
            if (!args || args.length === 0 || !args[0]) {
                return message.reply("❌ Vui lòng cung cấp ID của kênh voice!\n" +
                    "Sử dụng: `joinv2 <channelId>` hoặc `joinv2 <guildId> <channelId>`");
            }

            let channelId: string;
            let guildId: string | undefined;

            if (args.length > 1 && args[1]) {
                guildId = args[0];
                channelId = args[1];
            } else {
                channelId = args[0];
            }

            logger.info(`[JoinV2] Đang tìm channel ${channelId}${guildId ? ` trong guild ${guildId}` : ''}`);

            let voiceChannel;

            if (guildId) {
                // Tìm trong guild cụ thể
                try {
                    const guild = await agent.guilds.fetch(guildId);
                    if (!guild) {
                        return message.reply("❌ Không tìm thấy server với ID đã cung cấp!");
                    }
                    
                    await guild.channels.fetch();
                    voiceChannel = guild.channels.cache.get(channelId);
                    
                } catch (error) {
                    logger.error(`[JoinV2] Lỗi khi fetch guild ${guildId}: ${error}`);
                    return message.reply("❌ Không thể truy cập server được chỉ định!");
                }
            } else {
                // Tìm trong tất cả guilds
                try {
                    // Thử fetch channel trực tiếp trước
                    voiceChannel = await agent.channels.fetch(channelId).catch(() => null);
                    
                    if (!voiceChannel) {
                        // Nếu không tìm thấy, thử tìm trong từng guild
                        for (const [guildIdLoop, guild] of agent.guilds.cache) {
                            try {
                                await guild.channels.fetch();
                                const foundChannel = guild.channels.cache.get(channelId);
                                if (foundChannel) {
                                    voiceChannel = foundChannel;
                                    guildId = guildIdLoop;
                                    logger.info(`[JoinV2] Tìm thấy channel trong guild: ${guild.name}`);
                                    break;
                                }
                            } catch (error) {
                                logger.debug(`[JoinV2] Không thể fetch channels từ ${guild.name}: ${error}`);
                            }
                        }
                    }
                } catch (error) {
                    logger.error(`[JoinV2] Lỗi khi tìm channel: ${error}`);
                }
            }

            if (!voiceChannel) {
                return message.reply("❌ Không tìm thấy kênh voice với ID đã cung cấp!");
            }

            if (voiceChannel.type !== "GUILD_VOICE") {
                return message.reply("❌ Channel này không phải là voice channel!");
            }

            // Disconnect từ voice channel hiện tại nếu có
            if (agent.voice.connection) {
                agent.voice.connection.disconnect();
                logger.info(`[JoinV2] Đã disconnect khỏi voice channel hiện tại`);
            }

            // Join vào voice channel
            logger.info(`[JoinV2] Đang join vào ${voiceChannel.name} (${channelId})`);
            
            const connection = await agent.voice.joinChannel(voiceChannel, {
                selfVideo: false,
                selfDeaf: false,
                selfMute: false,
            });
            
            logger.info(`[JoinV2] Đã join thành công vào: ${voiceChannel.name}`);
            message.reply(`✅ Đã join vào voice channel: **${voiceChannel.name}**${guildId ? ` trong server **${voiceChannel.guild?.name}**` : ''}`);

        } catch (error) {
            logger.error(`[JoinV2] Lỗi: ${error}`);
            message.reply(`❌ Có lỗi xảy ra: ${error}`);
        }
    }
}

export default joinv2Command;
