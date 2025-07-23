import { Message } from "discord.js-selfbot-v13";
import { Commands } from "../typings/typings.js";
import { BaseAgent } from "../structures/BaseAgent.js";

export const setchat: Commands = {
	name: "setchat",
	description: "Thiết lập kênh auto chat nhanh chóng",
	execute: async (agent: BaseAgent, msg: Message, ...args: string[]) => {
		// Nếu không có args, sử dụng kênh hiện tại
		const targetChannelId = args[0] || msg.channel.id;
		const targetChannel = agent.channels.cache.get(targetChannelId);
		
		if (!targetChannel) {
			return msg.reply("❌ Không tìm thấy kênh được chỉ định!");
		}

		// Khởi tạo AutoChatManager nếu chưa có
		if (!agent.autoChatManager) {
			try {
				const { AutoChatManager } = await import("../feats/autoChat.js");
				agent.autoChatManager = new AutoChatManager(agent);
			} catch (error) {
				return msg.reply(`❌ Lỗi khi khởi tạo Auto Chat Manager: ${error}`);
			}
		}

		// Thiết lập auto chat
		agent.autoChatManager.setAutoChat(true, targetChannelId);
		
		const channelName = targetChannel.type === "DM" ? "DM Channel" : (targetChannel as any).name || "Unknown";
		const isCurrentChannel = targetChannelId === msg.channel.id;
		
		return msg.reply(
			`✅ Đã thiết lập auto chat cho kênh: **${channelName}**\n` +
			`${isCurrentChannel ? "🎯 Đang sử dụng kênh hiện tại" : `📍 Channel ID: \`${targetChannelId}\``}\n` +
			`⏰ Interval: **${agent.config.autoChatInterval || 4} phút**\n\n` +
			`💡 **Mẹo:**\n` +
			`• Sử dụng \`${agent.config.prefix}autochat interval <phút>\` để thay đổi tần suất\n` +
			`• Sử dụng \`${agent.config.prefix}autochat test\` để test ngay\n` +
			`• Sử dụng \`${agent.config.prefix}autochat off\` để tắt`
		);
	},
};
