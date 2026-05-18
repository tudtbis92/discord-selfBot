import { MessageEmbed, Message } from 'discord.js-selfbot-v13';
import { Commands } from '../typings/typings.js';
import { BaseAgent } from '../structures/BaseAgent.js';

export const chatstats: Commands = {
	name: 'chatstats',
	description: 'Xem thống kê và trạng thái auto chat',
	execute: async (agent: BaseAgent, msg: Message, ...args: string[]) => {
		if (!agent.autoChatManager) {
			return msg.reply(
				'❌ Auto Chat Manager chưa được khởi tạo!\nSử dụng `setchat` để thiết lập.',
			);
		}

		const stats = agent.autoChatManager.getStats();

		const embed = new MessageEmbed()
			.setTitle('📊 Auto Chat Statistics')
			.setColor(stats.enabled ? '#00ff00' : '#ff0000')
			.addField('🔧 Trạng thái', stats.enabled ? '✅ Đang hoạt động' : '❌ Đã tắt', true)
			.addField('📺 Kênh', stats.channel || 'Chưa thiết lập', true)
			.addField('⏰ Tần suất', `${stats.interval || 4} phút`, true);

		if (stats.enabled) {
			embed.addField(
				'🕐 Chat cuối cùng',
				stats.lastChatTime ? `<t:${Math.floor(stats.lastChatTime / 1000)}:R>` : 'Chưa có',
				true,
			);

			if (stats.timeUntilNextChat && stats.timeUntilNextChat > 0) {
				const minutes = Math.ceil(stats.timeUntilNextChat / 60000);
				embed.addField('⏳ Chat tiếp theo', `${minutes} phút nữa`, true);
			} else {
				embed.addField('⏳ Chat tiếp theo', '✅ Sẵn sàng', true);
			}

			embed.addField(
				'🎯 Đang xử lý mention',
				stats.isProcessingMention ? '✅ Có' : '❌ Không',
				true,
			);
		}

		// Thêm thông tin cấu hình
		embed.addField(
			'⚙️ Cấu hình',
			`**Channel ID:** \`${agent.config.autoChatChannelID || 'Chưa thiết lập'}\`\n` +
				`**Auto Chat:** ${agent.config.autoChat ? '✅ Bật' : '❌ Tắt'}\n` +
				`**Interval:** ${agent.config.autoChatInterval || 4} phút`,
			false,
		);

		// Thêm hướng dẫn nhanh
		if (args[0] !== 'minimal') {
			embed.addField(
				'🛠️ Lệnh quản lý',
				`\`${agent.config.prefix}setchat [channelId]\` - Thiết lập kênh\n` +
					`\`${agent.config.prefix}autochat on <channelId>\` - Bật auto chat\n` +
					`\`${agent.config.prefix}autochat off\` - Tắt auto chat\n` +
					`\`${agent.config.prefix}autochat interval <phút>\` - Đặt tần suất\n` +
					`\`${agent.config.prefix}autochat test\` - Test ngay\n` +
					`\`${agent.config.prefix}chat <tin nhắn>\` - Test chat AI`,
				false,
			);
		}

		return msg.reply({ embeds: [embed] });
	},
};

export default chatstats;
