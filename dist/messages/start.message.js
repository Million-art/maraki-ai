export const getUnassessedStartMsg = (name) => {
    return (`👋 <b>ሰላም ${name}! እንኳን ወደ Maraki AI በደህና መጡ 🇪🇹</b>\n\n` +
        `<b>ኢትዮጵያ ውስጥ የእንግሊዝኛ ቋንቋ ችሎታን ለማሳደግ የተዘጋጀ የAI መድረክ።</b>\n\n` +
        `የእርስዎን የእንግሊዝኛ ችሎታ የሚመጥን <b>ዕለታዊ ቻሌንጅ (Daily Challenge)</b> ለማግኘት፣ በመጀመሪያ አጭር የችሎታ መለያ ፈተና ይውሰዱ።\n\n` +
        `⏱️ <b>የሚፈጀው ጊዜ፦</b> 3 ደቂቃ ብቻ\n` +
        `🎯 <b>ምን ያገኛሉ?</b>\n` +
        `• የእንግሊዝኛ ችሎታዎን (A1 – C1)\n` +
        `• ያለብዎትን ክፍተት (Speaking, Grammar ወዘተ)\n` +
        `• ለእርስዎ የተዘጋጀ ዕለታዊ የ5 ደቂቃ ልምምድ!\n\n` +
        `ከታች ያለውን ተጭነው ይጀምሩ! 👇`);
};
import { sanitizeAmharicDiagnosis } from '../utils/report-formatter.util.js';
export const getAssessedStartMsg = (name, report, streak, challengeTitle) => {
    const levelName = report?.cefrLevel || 'B1';
    const score = report?.overallScore || 50;
    const rawWeakness = report?.diagnosis?.headlineAmharic || report?.primaryWeakness || 'Speaking';
    const weaknessTag = sanitizeAmharicDiagnosis(rawWeakness);
    const cleanTitle = challengeTitle || 'ዕለታዊ የ5 ደቂቃ ልምምድ';
    return (`👋 <b>ሰላም ${name}! እንኳን ደህና መጡ 🇪🇹</b>\n\n` +
        `🏆 <b>የእንግሊዝኛ ችሎታዎ፦</b> Level ${levelName} (${score}/100)\n` +
        `🔥 <b>ቀጣይነት (Streak)፦</b> ${streak} ${streak === 1 ? 'ቀን' : 'ቀናት'}\n` +
        `🔍 <b>ያተኮሩበት ክፍተት፦</b> <b>${weaknessTag}</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔥 <b>የዛሬው ቻሌንጅ (Daily Challenge)፦</b>\n` +
        `📌 ${cleanTitle}\n` +
        `⏱️ <i>በቀን 5 ደቂቃ ብቻ</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `ልምምዱን ለመጀመር ከታች ያለውን አዝራር ይጫኑ! 👇`);
};
// Backwards compatibility alias
export const getPersonalizedStartMsg = getUnassessedStartMsg;
