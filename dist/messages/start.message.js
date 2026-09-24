export const getStartMenuMsg = (name) => {
    return (`👋 <b>ሰላም ${name}! እንኳን ወደ Maraki AI በደህና መጡ 🇪🇹</b>\n\n` +
        `የእንግሊዝኛ ቋንቋ ችሎታዎን በAI የቀጥታ ድምፅ፣ ዕለታዊ ልምምዶች እና አዝናኝ ጥያቄዎች ያሳድጉ!\n\n` +
        `🎯 <b>የእንግሊዝኛ ንግግር (Speaking) ችሎታዎን ያሳድጉ!</b>\n` +
        `ያለምንም ፍርሃት እና መቆራረጥ አቀላጥፈው እንዲያወሩ ከማራኪ AI ጋር በቀጥታ በድምፅ ይለማመዱ።\n\n` +
        `ለመጀመር ከታች ካሉት አማራጮች አንዱን ይጫኑ 👇`);
};
// Aliases for backwards compatibility
export const getUnassessedStartMsg = getStartMenuMsg;
export const getAssessedStartMsg = (name) => getStartMenuMsg(name);
export const getPersonalizedStartMsg = getStartMenuMsg;
