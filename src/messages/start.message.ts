export const getStartMenuMsg = (name: string) => {
  return (
    `👋 <b>Hello ${name}! Welcome to Maraki AI 🌟</b>\n\n` +
    `Level up your English skills with interactive AI voice conversations and daily practice!\n\n` +
    `🎯 <b>Master English Speaking</b>\n` +
    `Practice speaking naturally, confidently, and fluently by talking directly with Maraki AI.\n\n` +
    `Tap an option below to get started 👇`
  );
};

// Aliases for backwards compatibility
export const getUnassessedStartMsg = getStartMenuMsg;
export const getAssessedStartMsg = (name: string) => getStartMenuMsg(name);
export const getPersonalizedStartMsg = getStartMenuMsg;
