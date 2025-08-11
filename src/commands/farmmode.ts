import { Message } from "discord.js-selfbot-v13";
import { Commands } from "../typings/typings.js";
import { BaseAgent } from "../structures/BaseAgent.js";

export const farmmode: Commands = {
	name: "farmmode",
	description: "Bật/tắt chế độ auto farm (câu cá, owo, nhiệm vụ)",
	execute: async (agent: BaseAgent, msg: Message, ...args: string[]) => {
		if (!args.length) {
			const currentMode = (agent as any).farmModeDisabled ? "❌ TẮT" : "✅ BẬT";
			return msg.reply(
				`🔧 **Trạng thái Auto Farm:** ${currentMode}\n\n` +
				`📋 **Sử dụng:**\n` +
				`\`${agent.config.prefix}farmmode on\` - Bật auto farm\n` +
				`\`${agent.config.prefix}farmmode off\` - Tắt auto farm (chỉ chạy auto chat)\n` +
				`\`${agent.config.prefix}farmmode status\` - Xem trạng thái hiện tại\n\n` +
				`💡 **Lưu ý:** Khi tắt farm mode, bot chỉ chạy auto chat và lắng nghe commands.`
			);
		}

		const subCommand = args[0].toLowerCase();

		switch (subCommand) {
			case "on":
			case "enable":
				(agent as any).farmModeDisabled = false;
				return msg.reply(
					`✅ **Đã BẬT Auto Farm Mode!**\n\n` +
					`🎣 Câu cá sẽ hoạt động\n` +
					`🦉 OWO commands sẽ chạy\n` +
					`📋 Nhiệm vụ sẽ được kiểm tra\n` +
					`💬 Auto chat vẫn hoạt động\n\n` +
					`⚠️ **Cần restart bot để áp dụng hoàn toàn!**`
				);

			case "off":
			case "disable":
				(agent as any).farmModeDisabled = true;
				return msg.reply(
					`❌ **Đã TẮT Auto Farm Mode!**\n\n` +
					`🚫 Câu cá đã dừng\n` +
					`🚫 OWO commands đã dừng\n` +
					`🚫 Nhiệm vụ đã dừng\n` +
					`✅ Auto chat vẫn hoạt động\n` +
					`✅ Commands vẫn hoạt động\n\n` +
					`💡 Bot hiện chỉ chạy auto chat và phản hồi commands.`
				);

			case "status":
				const isDisabled = (agent as any).farmModeDisabled;
				const statusIcon = isDisabled ? "❌" : "✅";
				const statusText = isDisabled ? "TẮT" : "BẬT";
				
				return msg.reply(
					`📊 **Farm Mode Status**\n\n` +
					`🔧 **Auto Farm:** ${statusIcon} ${statusText}\n` +
					`🎣 **Câu cá:** ${isDisabled ? "❌ Dừng" : "✅ Hoạt động"}\n` +
					`🦉 **OWO:** ${isDisabled ? "❌ Dừng" : "✅ Hoạt động"}\n` +
					`📋 **Nhiệm vụ:** ${isDisabled ? "❌ Dừng" : "✅ Hoạt động"}\n` +
					`💬 **Auto Chat:** ✅ Luôn hoạt động\n` +
					`⚡ **Commands:** ✅ Luôn hoạt động`
				);

			default:
				return msg.reply(`❌ Sub-command không hợp lệ: **${subCommand}**\nSử dụng: \`${agent.config.prefix}farmmode\` để xem hướng dẫn.`);
		}
	},
};
