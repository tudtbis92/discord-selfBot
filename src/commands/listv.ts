import { Commands } from "../typings/typings.js";
import { logger } from "../utils/logger.js";

const listvCommand: Commands = {
    name: "listv",
    description: "Liệt kê tất cả voice channels từ các server. Sử dụng: listv hoặc listv <guildId>",
    execute: async (agent, message, ...args) => {
        try {
            let guildsToCheck: any[] = [];
            
            if (args && args.length > 0 && args[0]) {
                // Nếu có guildId cụ thể
                const guild = agent.guilds.cache.get(args[0]);
                if (!guild) {
                    await message.reply("❌ Không tìm thấy server với ID đã cung cấp!");
                    return;
                }
                guildsToCheck = [guild];
            } else {
                // Liệt kê từ tất cả servers
                guildsToCheck = Array.from(agent.guilds.cache.values());
            }

            logger.info(`[ListV] Tìm thấy ${guildsToCheck.length} servers để kiểm tra`);

            if (guildsToCheck.length === 0) {
                await message.reply("❌ Bot không có mặt trong server nào!");
                return;
            }

            let voiceChannelsList = "";
            let totalChannels = 0;

            for (const guild of guildsToCheck) {
                try {
                    logger.debug(`[ListV] Đang kiểm tra server: ${guild.name} (${guild.id})`);
                    
                    // Fetch channels của guild
                    await guild.channels.fetch();
                    
                    logger.debug(`[ListV] Đã fetch ${guild.channels.cache.size} channels từ ${guild.name}`);
                    
                    const voiceChannels = guild.channels.cache.filter(
                        (channel: any) => channel.type === "GUILD_VOICE"
                    );

                    logger.debug(`[ListV] Tìm thấy ${voiceChannels.size} voice channels trong ${guild.name}`);

                    if (voiceChannels.size > 0) {
                        voiceChannelsList += `\n**${guild.name}** (${guild.id}):\n`;
                        
                        voiceChannels.forEach((channel: any) => {
                            voiceChannelsList += `• ${channel.name} - \`${channel.id}\`\n`;
                            totalChannels++;
                        });
                    }
                } catch (error) {
                    logger.error(`[ListV] Không thể fetch channels từ server ${guild.name}: ${error}`);
                }
            }

            if (totalChannels === 0) {
                await message.reply("❌ Không tìm thấy voice channel nào!");
                return;
            }

            // Chia nhỏ tin nhắn nếu quá dài (Discord limit 2000 characters)
            const header = `🔊 **Danh sách Voice Channels** (${totalChannels} kênh):\n`;
            const fullMessage = header + voiceChannelsList;

            if (fullMessage.length <= 2000) {
                await message.reply(fullMessage);
            } else {
                // Chia thành nhiều tin nhắn
                const chunks: string[] = [];
                const lines = voiceChannelsList.split('\n');
                let currentChunk = header;

                for (const line of lines) {
                    if ((currentChunk + line + '\n').length > 1900) {
                        chunks.push(currentChunk);
                        currentChunk = line + '\n';
                    } else {
                        currentChunk += line + '\n';
                    }
                }
                
                if (currentChunk.trim()) {
                    chunks.push(currentChunk);
                }

                // Gửi từng chunk
                for (let i = 0; i < chunks.length; i++) {
                    setTimeout(() => {
                        message.reply(`${chunks[i]}${i === chunks.length - 1 ? '\n✅ **Hoàn tất!**' : ''}`);
                    }, i * 1000); // Delay 1s giữa các tin nhắn
                }
            }

        } catch (error) {
            logger.error(`[ListV] Lỗi khi liệt kê voice channels: ${error}`);
            await message.reply("❌ Có lỗi xảy ra khi liệt kê voice channels!");
        }
        
        return;
    }
}

export default listvCommand;
