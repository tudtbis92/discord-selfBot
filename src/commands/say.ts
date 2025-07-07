import { Commands } from "../typings/typings.js";

const sayCommand: Commands = {
    name: "say",
    description: "Make the Tool Perform command/say something",
    execute: (agent, message, ...args) => {
        agent.caucaChannel.send(args.join(" "));
    }
}

export default sayCommand;