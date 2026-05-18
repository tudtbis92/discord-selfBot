import { BaseAgent } from '../structures/BaseAgent.js';
import { logger } from '../utils/logger.js';

export const commandHandler = async (agent: BaseAgent) => {
	agent.on('messageCreate', async (message) => {
		if (!agent.config.prefix || !message.content.startsWith(agent.config.prefix)) return;
		// Cho phép bot user và admin gửi lệnh
		if (
			message.author.id != message.client.user?.id &&
			message.author.id != agent.config.adminID
		)
			return;

		logger.debug(message.author.username + ' executed a command: ' + message.content);

		const args = message.content.slice(agent.config.prefix.length).trim().split(/ +/);
		const command = agent.commands.get(args.shift()?.toLowerCase() ?? '');
		if (!command) return;
		try {
			command.execute(agent, message, ...args);
		} catch (error) {
			logger.error('Error executing command: ' + command);
			logger.error(error as Error);
		}
	});
};
