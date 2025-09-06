import { getCurrentLevel as getUserLevel } from "./userService.js";
export const getCurrentLevel = async (from) => {
    const result = await getUserLevel(from);
    return result.level;
};
