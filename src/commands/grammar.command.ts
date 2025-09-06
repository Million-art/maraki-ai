import { Context } from "grammy";
import { getSession, setSession } from "../utils/redis.js";


export const grammarCommand = async(ctx:Context)=>{
     if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const session = await getSession(ctx.from.id);
  await ctx.reply("Ok, send me your sentence");
 
}
