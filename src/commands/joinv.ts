import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const joinvCommand: Commands = {
    name: "joinv",
    description: "Join bot vào kênh voice được chỉ định. Sử dụng: joinv <channelId> hoặc joinv <guildId> <channelId>",
    execute: async (agent, message, args) => {
        try {
            // Kiểm tra xem có cung cấp channelVoiceId không
            if (!args[0]) {
                return message.reply("❌ Vui lòng cung cấp ID của kênh voice!\n" +
                    "Sử dụng: `joinv <channelId>` hoặc `joinv <guildId> <channelId>`");
            }

            let voiceChannel;
            let guildId: string | undefined;
            let channelId: string;

            // Kiểm tra có 2 tham số không (guildId và channelId)
            if (args[1]) {
                guildId = args[0];
                channelId = args[1];
                
                // Fetch guild trước
                const guild = agent.guilds.cache.get(guildId);
                if (!guild) {
                    return message.reply("❌ Không tìm thấy server với ID đã cung cấp!");
                }

                // Fetch channels của guild đó
                await guild.channels.fetch();
                voiceChannel = guild.channels.cache.get(channelId);
                
                if (!voiceChannel) {
                    return message.reply(`❌ Không tìm thấy kênh voice với ID ${channelId} trong server ${guild.name}!`);
                }
            } else {
                // Chỉ có channelId, tìm trong tất cả guilds
                channelId = args[0];
                
                // Tìm trong cache trước
                voiceChannel = agent.channels.cache.get(channelId);
                
                if (!voiceChannel) {
                    // Nếu không tìm thấy trong cache, thử fetch từ tất cả guilds
                    logger.info(`[JoinV] Không tìm thấy kênh trong cache, đang fetch từ các server...`);
                    
                    for (const guild of agent.guilds.cache.values()) {
                        try {
                            await guild.channels.fetch();
                            const foundChannel = guild.channels.cache.get(channelId);
                            if (foundChannel) {
                                voiceChannel = foundChannel;
                                guildId = guild.id;
                                logger.info(`[JoinV] Tìm thấy kênh trong server: ${guild.name}`);
                                break;
                            }
                        } catch (error) {
                            logger.debug(`[JoinV] Không thể fetch channels từ server ${guild.name}: ${error}`);
                        }
                    }
                }
            }

            if (!voiceChannel) {
                return message.reply("❌ Không tìm thấy kênh voice với ID đã cung cấp trong bất kỳ server nào!");
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
            
            logger.info(`[JoinV] Đã join vào kênh voice: ${voiceChannel.name} (${channelId})`);
            message.reply(`✅ Đã join vào kênh voice: **${voiceChannel.name}**${guildId ? ` trong server **${voiceChannel.guild?.name}**` : ''}`);

        } catch (error) {
            logger.error(`[JoinV] Lỗi khi join voice channel: ${error}`);
            message.reply("❌ Có lỗi xảy ra khi join vào kênh voice!");
        }
    }
}

export default joinvCommand;
