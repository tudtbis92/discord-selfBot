import { Commands } from '../typings/typings.js';

const configCommand: Commands = {
	name: 'config',
	description: 'See/set the configuration for the bot',
	execute: (_agent, _message, ..._args) => {
		return;
	},
};

export default configCommand;
