import { User as TelegramUser } from "grammy/types";
import { getCurrentLevel as getUserLevel } from "./userService.js";

export const getCurrentLevel = async (from: TelegramUser) => {
  const result = await getUserLevel(from);
  return result.level;
};
