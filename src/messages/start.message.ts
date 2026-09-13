export const getUnassessedStartMsg = (name: string) => {
  return (
    `👋 <b>ሰላም ${name}! እንኳን ወደ Maraki AI በደህና መጡ 🇪🇹</b>\n\n` +
    `<b>ኢትዮጵያ ውስጥ የእንግሊዝኛ ቋንቋ ችሎታን ለማሳደግ የተዘጋጀ የAI መድረክ።</b>\n\n` +
    `የእርስዎን የእንግሊዝኛ ችሎታ የሚመጥን <b>ዕለታዊ ቻሌንጅ (Daily Challenge)</b> ለማግኘት፣ በመጀመሪያ አጭር የችሎታ መለያ ፈተና ይውሰዱ።\n\n` +
    `⏱️ <b>የሚፈጀው ጊዜ፦</b> 3 ደቂቃ ብቻ\n` +
    `🎯 <b>ምን ያገኛሉ?</b>\n` +
    `• የእንግሊዝኛ ችሎታዎን (A1 – C1)\n` +
    `• ያለብዎትን ክፍተት (Speaking, Grammar ወዘተ)\n` +
    `• ለእርስዎ የተዘጋጀ ዕለታዊ የ5 ደቂቃ ልምምድ!\n\n` +
    `ከታች ያለውን ተጭነው ይጀምሩ! 👇`
  );
};

import { sanitizeAmharicDiagnosis } from '../utils/report-formatter.util.js';

export const getAssessedStartMsg = (
  name: string,
  report: any,
  streak: number,
  challengeTitle?: string
) => {
  const levelName = report?.cefrLevel || 'B1';
  const score = report?.overallScore || 50;
  const skills = report?.skills;

  // Always pick the skill with the actual lowest score for the gap label
  // so it matches what the user sees in the progress bar
  let weaknessTag: string;
  if (skills) {
    const skillMap: Record<string, number> = {
      'speaking': typeof skills.speaking === 'number' ? skills.speaking : 999,
      'listening': skills.listening ?? 999,
      'grammar': skills.grammar ?? 999,
      'vocabulary': skills.vocabulary ?? 999,
      'reading': skills.reading ?? 999,
    };
    const lowestKey = Object.entries(skillMap).reduce((a, b) => a[1] <= b[1] ? a : b)[0];
    weaknessTag = sanitizeAmharicDiagnosis(lowestKey);
  } else {
    const rawWeakness = report?.diagnosis?.headlineAmharic || report?.primaryWeakness || 'Speaking';
    weaknessTag = sanitizeAmharicDiagnosis(rawWeakness);
  }

  const cleanTitle = challengeTitle || 'ዕለታዊ የ5 ደቂቃ ልምምድ';

  return (
    `👋 <b>ሰላም ${name}! እንኳን ደህና መጡ 🇪🇹</b>\n\n` +
    `🏆 <b>የእንግሊዝኛ ችሎታዎ፦</b> Level ${levelName} (${score}/100)\n` +
    `🎯 <b>ዋናው ክፍተትዎ፦</b> <b>${weaknessTag}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔥 <b>የዛሬው ቻሌንጅ (Daily Challenge)፦</b>\n` +
    `📌 ${cleanTitle}\n` +
    `⏱️ <i>በቀን 5 ደቂቃ ብቻ</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `ልምምዱን ለመጀመር ከታች ያለውን አዝራር ይጫኑ! 👇`
  );
};

// Backwards compatibility alias
export const getPersonalizedStartMsg = getUnassessedStartMsg;

