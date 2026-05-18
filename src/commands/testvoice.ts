import { Commands } from '../typings/typings.js';
import { logger } from '../utils/logger.js';

const testvoiceCommand: Commands = {
	name: 'testvoice',
	description: 'Test debug voice functionality',
	execute: async (agent, message, ..._args) => {
		try {
			logger.info(`[TestVoice] Bắt đầu test...`);

			// Test 1: Kiểm tra số lượng guilds
			const guildsCount = agent.guilds.cache.size;
			logger.info(`[TestVoice] Số guilds trong cache: ${guildsCount}`);

			let debugInfo = `🔧 **Debug Voice Information:**\n`;
			debugInfo += `**Guilds in cache:** ${guildsCount}\n`;

			if (guildsCount > 0) {
				debugInfo += `**Guild list:**\n`;
				agent.guilds.cache.forEach((guild, _index) => {
					debugInfo += `• ${guild.name} (${guild.id})\n`;
				});

				// Test với guild đầu tiên
				const firstGuild = agent.guilds.cache.first();
				if (firstGuild) {
					debugInfo += `\n**Testing with first guild:** ${firstGuild.name}\n`;

					try {
						const channelsBeforeFetch = firstGuild.channels.cache.size;
						debugInfo += `**Channels before fetch:** ${channelsBeforeFetch}\n`;

						await firstGuild.channels.fetch();

						const channelsAfterFetch = firstGuild.channels.cache.size;
						debugInfo += `**Channels after fetch:** ${channelsAfterFetch}\n`;

						const voiceChannels = firstGuild.channels.cache.filter(
							(channel: any) => channel.type === 'GUILD_VOICE',
						);

						debugInfo += `**Voice channels found:** ${voiceChannels.size}\n`;

						if (voiceChannels.size > 0) {
							debugInfo += `**Voice channels:**\n`;
							voiceChannels.forEach((channel: any) => {
								debugInfo += `• ${channel.name} - \`${channel.id}\`\n`;
							});
						}
					} catch (error) {
						debugInfo += `**Error fetching channels:** ${error}\n`;
						logger.error(`[TestVoice] Error: ${error}`);
					}
				}
			} else {
				debugInfo += `❌ **No guilds found!**\n`;
			}

			// Test voice connection
			debugInfo += `\n**Voice connection status:** ${agent.voice.connection ? 'Connected' : 'Not connected'}\n`;

			await message.reply(debugInfo);
		} catch (error) {
			logger.error(`[TestVoice] Error: ${error}`);
			await message.reply(`❌ Test failed: ${error}`);
		}

		return;
	},
};

export default testvoiceCommand;
