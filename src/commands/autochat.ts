import { MessageEmbed, Message } from 'discord.js-selfbot-v13';
import { Commands } from '../typings/typings.js';
import { BaseAgent } from '../structures/BaseAgent.js';

export const autochat: Commands = {
	name: 'autochat',
	description: 'Quản lý tính năng auto chat của bot',
	execute: async (agent: BaseAgent, msg: Message, ...args: string[]) => {
		if (!args.length) {
			// Hiển thị trạng thái hiện tại
			const stats = agent.autoChatManager?.getStats();

			// Xác định trạng thái chat tiếp theo
			let nextChatStatus = 'Sẵn sàng';
			if (stats?.timeUntilNextChat && stats.timeUntilNextChat > 0) {
				nextChatStatus = `${Math.ceil(stats.timeUntilNextChat / 60000)} phút nữa`;
			}

			const embed = new MessageEmbed()
				.setTitle('🤖 Auto Chat Status')
				.setColor('#00ff00')
				.addField('Trạng thái', stats?.enabled ? '✅ Đang bật' : '❌ Đang tắt', true)
				.addField('Kênh', stats?.channel || 'Chưa thiết lập', true)
				.addField('Interval', `${stats?.interval || 4} phút`, true)
				.addField(
					'Chat cuối',
					stats?.lastChatTime
						? `<t:${Math.floor(stats.lastChatTime / 1000)}:R>`
						: 'Chưa có',
					true,
				)
				.addField('Chat tiếp theo', nextChatStatus, true)
				.addField('Đang xử lý', stats?.isProcessing ? '✅' : '❌', true)
				.addField('Hàng chờ', `${stats?.queueLength ?? 0}/3`, true)
				.addField(
					'Sử dụng',
					`\`${agent.config.prefix}autochat on <channelId>\` - Bật auto chat\n` +
						`\`${agent.config.prefix}autochat off\` - Tắt auto chat\n` +
						`\`${agent.config.prefix}autochat interval <phút>\` - Đặt khoảng thời gian\n` +
						`\`${agent.config.prefix}autochat test\` - Test gửi tin nhắn ngay`,
					false,
				);

			return msg.reply({ embeds: [embed] });
		}

		const subCommand = args[0].toLowerCase();

		switch (subCommand) {
			case 'on':
			case 'enable':
				if (!args[1]) {
					return msg.reply(
						'❌ Vui lòng cung cấp Channel ID!\nSử dụng: `autochat on <channelId>`',
					);
				}

				const channelId = args[1];
				const channel = agent.channels.cache.get(channelId);

				if (!channel) {
					return msg.reply('❌ Không tìm thấy kênh với ID đã cung cấp!');
				}

				if (!agent.autoChatManager) {
					const { AutoChatManager } = await import('../feats/autoChat.js');
					agent.autoChatManager = new AutoChatManager(agent);
				}

				agent.autoChatManager.setAutoChat(true, channelId);
				const channelName =
					channel.type === 'DM' ? 'DM Channel' : (channel as any).name || 'Unknown';
				return msg.reply(`✅ Đã bật auto chat cho kênh: **${channelName}**`);

			case 'off':
			case 'disable':
				if (!agent.autoChatManager) {
					return msg.reply('❌ Auto chat chưa được khởi tạo!');
				}

				agent.autoChatManager.setAutoChat(false);
				return msg.reply('✅ Đã tắt auto chat!');

			case 'interval':
				if (!args[1] || isNaN(parseInt(args[1]))) {
					return msg.reply(
						'❌ Vui lòng cung cấp số phút hợp lệ!\nSử dụng: `autochat interval <phút>`',
					);
				}

				const minutes = parseInt(args[1]);
				if (minutes < 1 || minutes > 60) {
					return msg.reply('❌ Khoảng thời gian phải từ 1 đến 60 phút!');
				}

				if (!agent.autoChatManager) {
					return msg.reply('❌ Auto chat chưa được khởi tạo!');
				}

				agent.autoChatManager.setAutoChatInterval(minutes);
				return msg.reply(`✅ Đã đặt khoảng thời gian auto chat thành **${minutes} phút**!`);

			case 'test':
				if (!agent.autoChatManager) {
					return msg.reply('❌ Auto chat chưa được khởi tạo!');
				}

				const stats = agent.autoChatManager.getStats();
				if (!stats.enabled) {
					return msg.reply('❌ Auto chat đang tắt! Hãy bật trước khi test.');
				}

				try {
					await agent.autoChatManager.checkAndSendRandomChat();
					return msg.reply('✅ Đã gửi tin nhắn test! Kiểm tra kênh auto chat.');
				} catch (error) {
					return msg.reply(`❌ Lỗi khi test: ${error}`);
				}

			default:
				return msg.reply(
					`❌ Sub-command không hợp lệ: **${subCommand}**\nSử dụng: \`${agent.config.prefix}autochat\` để xem hướng dẫn.`,
				);
		}
	},
};

export default autochat;
