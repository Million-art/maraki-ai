export const getStartMenuMsg = (name) => {
    return (`👋 <b>ሰላም ${name}! እንኳን ወደ Maraki AI በደህና መጡ 🇪🇹</b>\n\n` +
        `🎯 <b>የእንግሊዝኛ ንግግር (Speaking) ችሎታዎን ያሳድጉ!</b>\n` +
        `ያለምንም ፍርሃት እና መቆራረጥ አቀላጥፈው እንዲያወሩ ከማራኪ AI ጋር በቀጥታ በድምፅ ይለማመዱ።\n\n` +
        `✨ <b>ዋና ዋና አገልግሎቶች፦</b>\n` +
        `• 🎙️ <b>ከማራኪ ጋር አውራ፦</b> የቀጥታ የድምፅ ውይይት እና የSpeaking ልምምድ\n` +
        `• 🔥 <b>ዕለታዊ ልምምድ፦</b> የ5 ደቂቃ ፈጣን የቋንቋ ማሻሻያ\n` +
        `• 📚 <b>ትምህርቶች፦</b> ደረጃ በደረጃ የሚሰጡ ተግባራዊ ትምህርቶች\n` +
        `• 🧠 <b>ጥያቄዎች (Quiz)፦</b> አዝናኝ የእንግሊዝኛ ፈተናዎች\n` +
        `• 🌐 <b>ትርጉም፦</b> እንግሊዝኛ ↔ አማርኛ ፈጣን ትርጉም\n\n` +
        `ለመጀመር ከታች ካሉት አማራጮች አንዱን ይጫኑ 👇`);
};
// Aliases for backwards compatibility
export const getUnassessedStartMsg = getStartMenuMsg;
export const getAssessedStartMsg = (name) => getStartMenuMsg(name);
export const getPersonalizedStartMsg = getStartMenuMsg;
