import { BaseAgent } from "../structures/BaseAgent.js";
import { Commands } from "../typings/typings.js";

const setBaitCommand: Commands = {
	name: "sbait",
	description: "Thiết lập loại mồi mặc định để mua khi hết mồi",
	execute: async (agent: BaseAgent, message, ...args: string[]) => {
		if (!args[0]) {
			return message.reply(`❌ Vui lòng chỉ định loại mồi! Sử dụng: sbait <m1|m2|m3|m4|m5>\nLoại mồi hiện tại: **${agent.defaultBait}**`);
		}

		const baitType = args[0].toLowerCase();
		const success = agent.setBait(baitType);
		
		if (success) {
			return message.reply(`✅ Đã thiết lập loại mồi mặc định thành: **${baitType}**`);
		} else {
			return message.reply(`❌ Loại mồi không hợp lệ: **${baitType}**\nCác loại mồi hợp lệ: m1, m2, m3, m4, m5`);
		}
	}
};

export default setBaitCommand;
