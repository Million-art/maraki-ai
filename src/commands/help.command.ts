import { Context } from "grammy";
import { help_msg } from "../messages/help.message.js";

export const helpCommand= async(ctx:Context)=>{
    return ctx.reply(help_msg)
}