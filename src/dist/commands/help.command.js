import { help_msg } from "../messages/help.message.js";
export const helpCommand = async (ctx) => {
    return ctx.reply(help_msg);
};
