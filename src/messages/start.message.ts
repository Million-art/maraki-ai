export const getStartMenuMsg = (name: string) => {
  return (
    `👋 <b>ሰላም ${name}! እንኳን ወደ Maraki AI በደህና መጡ 🇪🇹</b>\n\n` +
    `የእንግሊዝኛ ቋንቋ ችሎታዎን በAI የቀጥታ ድምፅ፣ ዕለታዊ ልምምዶች እና አዝናኝ ጥያቄዎች ያሳድጉ!\n\n` +
    `✨ <b>ዋና ዋና አገልግሎቶች፦</b>\n` +
    `• 🎙️ <b>ከማራኪ ጋር አውራ፦</b> በቀጥታ በድምፅ ከAI ጋር በእንግሊዝኛ ማውራት\n` +
    `• 🔥 <b>ዕለታዊ ልምምድ፦</b> የ5 ደቂቃ ፈጣን የቋንቋ ማሻሻያ\n` +
    `• 📚 <b>ትምህርቶች (Lessons)፦</b> ደረጃ በደረጃ የሚሰጡ የቋንቋ ትምህርቶች\n` +
    `• 🧠 <b>ጥያቄዎች (Quiz)፦</b> አዝናኝ የእንግሊዝኛ ፈተናዎችን መሞከር\n` +
    `• 🌐 <b>ትርጉም፦</b> እንግሊዝኛ ↔ አማርኛ ፈጣን ትርጉም\n\n` +
    `ለመጀመር ከታች ካሉት አማራጮች አንዱን ይጫኑ 👇`
  );
};

// Aliases for backwards compatibility
export const getUnassessedStartMsg = getStartMenuMsg;
export const getAssessedStartMsg = (name: string) => getStartMenuMsg(name);
export const getPersonalizedStartMsg = getStartMenuMsg;

