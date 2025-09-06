import { Context } from "grammy";
import { getSession } from "../utils/redis.js";


export const lessonCommand = async(ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const session = await getSession(ctx.from.id);
  await ctx.reply("Ok, let's continue the lesson...");
 
}
