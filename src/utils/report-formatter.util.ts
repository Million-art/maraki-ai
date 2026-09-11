import { InlineKeyboard } from 'grammy';

export interface SkillScores {
  vocabulary: number;
  grammar: number;
  reading: number;
  listening: number;
  speaking: number | null;
}

export function renderBar(score: any): string {
  const num = typeof score === 'number' ? score : Number(score) || 0;
  const filled = Math.min(5, Math.max(0, Math.round(num / 20)));
  const empty = 5 - filled;
  return '🟩'.repeat(filled) + '⬜'.repeat(empty);
}

export function getLinguisticDiagnosisFallback(skills: SkillScores, weakness: string, isSpeakingTested: boolean) {
  const readingGrammarMax = Math.max(skills.reading || 0, skills.grammar || 0);
  const speakingScore = typeof skills.speaking === 'number' ? skills.speaking : null;

  if (isSpeakingTested && speakingScore !== null) {
    const gap = readingGrammarMax - speakingScore;
    if (gap >= 12 && readingGrammarMax >= 50) {
      return {
        tag: 'The Silent English Trap',
        headlineAmharic: 'የዝምታ እንግሊዝኛ (Silent English)',
        summary: `ማንበብና ሰዋሰው ላይ በጣም ጎበዝ ኖት (${readingGrammarMax}/100)፤ ችግሩ ማውራት ላይ ነው። በጭንቅላትዎ የሚያውቁትን በአፍዎ ለማውጣት ቃላት ይጠፉብዎታል ወይም ፍርሃት ይሰማዎታል። በትምህርት ቤት አንብበን እንጂ አውርተን ስላልተማርን አብዛኛውን ሰው የሚያጋጥመው ይሄው ነው።`,
        isSilentTrap: true,
        gapPoints: gap,
      };
    }
  }

  if (!isSpeakingTested) {
    return {
      tag: 'Speaking Untested',
      headlineAmharic: 'ድምፅዎን አልሞከሩም',
      summary: `የጽሑፍ ውጤትዎ በጣም ጥሩ ነው (${readingGrammarMax}/100)። ነገር ግን አብዛኛው ሰው በጽሑፍ ጎበዝ ሆኖ ማውራት ላይ ስለሚቸገር፣ ትክክለኛ ችሎታዎን ለማወቅ ድምፅዎን መፈተን ይመረጣል።`,
      isSilentTrap: false,
    };
  }

  switch (weakness) {
    case 'Speaking':
      return {
        tag: 'Conversational Friction',
        headlineAmharic: 'የንግግር መቆራረጥ እና ፍርሃት',
        summary: `ዋናው ችግር በጭንቅላትዎ ከአማርኛ ወደ እንግሊዝኛ እየተረጎሙ ማውራትዎ ነው። ቃላት እየጠፉብዎት እንዲቆሙ ያደርጋል። በየቀኑ አጭር ልምምድ ማድረግ አፍዎን ይፈታዋል!`,
        isSilentTrap: true,
      };
    case 'Grammar':
      return {
        tag: 'Grammar Errors',
        headlineAmharic: 'የሰዋሰው (Grammar) ስህተት',
        summary: `ከአማርኛ በቀጥታ ስለሚተረጎም የተለመዱ የሰዋሰው ስህተቶች ይታያሉ (ለምሳሌ፦ 'I am having'፣ 'discuss about')። ሰዋሰውን በተግባር መለማመድ ያስፈልጋል።`,
        isSilentTrap: false,
      };
    case 'Vocabulary':
      return {
        tag: 'Vocabulary Gap',
        headlineAmharic: 'የቃላት (Vocabulary) እጥረት',
        summary: `ነጠላ ቃላትን ያውቃሉ፤ ግን አብረው የሚሄዱ ቃላትን በስራዎና በንግግርዎ ላይ አቀላጥፈው ለመጠቀም ልምምድ ያንሳል።`,
        isSilentTrap: false,
      };
    case 'Listening':
      return {
        tag: 'Listening Barrier',
        headlineAmharic: 'የማዳመጥ (Listening) ክፍተት',
        summary: `ጽሑፍ ሲሆን ይገባዎታል፤ ነገር ግን ፈጣን የውጭ አገር ሰዎች ንግግር ጆሮ ላይ ግራ ይጋባል። ጥቂት የድምፅ ልምምዶች ጆሮዎን ይከፍቱታል።`,
        isSilentTrap: false,
      };
    case 'Reading':
      return {
        tag: 'Reading Speed',
        headlineAmharic: 'የንባብ ፍጥነት (Reading)',
        summary: `እያንዳንዱን ቃል በአማርኛ ለመተርጎም ስለሚሞከር ረጅም ጽሑፎችን በፍጥነት አንብቦ ለመረዳት ጊዜ ይወስዳል።`,
        isSilentTrap: false,
      };
    default:
      return {
        tag: `${weakness} Gap`,
        headlineAmharic: `የ${weakness} ክፍተት`,
        summary: `ዋናው ማሻሻያዎ ${weakness} ነው። በየቀኑ ጥቂት ደቂቃ በመለማመድ ችሎታዎን ማሳደግ ይችላሉ።`,
        isSilentTrap: false,
      };
  }
}

export function getCareerTranslationFallback(cefrLevel: string) {
  const level = (cefrLevel || 'B1').toUpperCase();
  switch (level) {
    case 'A1':
    case 'A2':
      return {
        currentLevelReality: 'መሰረታዊ ሰላምታ እና አጫጭር ቃላት መናገር ይችላሉ፤ ነገር ግን የስራ ቃለ-መጠይቅ (Interview) እና ረጅም ውይይት ይከብዳል።',
        targetLevel: 'B1',
        targetUnlock: 'የስራ ቃለ-መጠይቆችን በልበ-ሙሉነት ለማለፍ እና የቢሮ ኢሜይሎችን ያለ ፍርሃት ለመጻፍ ያግዛል።',
      };
    case 'B1':
      return {
        currentLevelReality: 'የተጻፈ ጽሑፍ ይገባዎታል፤ ነገር ግን በድንገት ከሰው ጋር ሲያወሩ ወይም የስራ ቃለ-መጠይቅ ላይ ቃላት ይጠፉብዎታል።',
        targetLevel: 'B2',
        targetUnlock: 'ጥሩ ደመወዝ ያላቸው ስራዎችን ለማግኘት፣ የነፃ የትምህርት ዕድል (Scholarship) ለመጠቀም እና ከሰው ጋር ያለፍርሃት ለመግባባት በር ይከፍታል!',
      };
    case 'B2':
      return {
        currentLevelReality: 'በማንኛውም ቦታ እና የስራ ቃለ-መጠይቅ ላይ ጥሩ ተግባቦት አለዎት፤ ፈጣን እና ከባድ ውይይት ሲሆን ብቻ ትንሽ ይቆማሉ።',
        targetLevel: 'C1',
        targetUnlock: 'በማንኛውም ስራ እና ትልልቅ ስብሰባዎች ላይ እንደ ልብ አቀላጥፈው ለመናገር እና ለመምራት ያስችላል።',
      };
    case 'C1':
    case 'C2':
      return {
        currentLevelReality: 'እንግሊዝኛዎ ፈሳሽ እና በጣም ጥሩ ነው፤ በማንኛውም ቦታ በልበ-ሙሉነት ይናገራሉ።',
        targetLevel: 'C2',
        targetUnlock: 'ከፍተኛ የአመራር ደረጃ እና ፍጹም የሆነ የቋንቋ ቅልጥፍና።',
      };
    default:
      return {
        currentLevelReality: 'መሰረታዊ ተግባቦት ይችላሉ፤ ነገር ግን የተሻለ ደረጃ ላይ ለመድረስ ልምምድ ያስፈልጋል።',
        targetLevel: 'B2',
        targetUnlock: 'የተሻለ የስራ እና የትምህርት ዕድሎችን ለመጠቀም ያግዛል።',
      };
  }
}

export function getPhotoScorecard(report: any, fullName: string, credId: string): string {
  const levelName = report.cefrLevel || 'B1';
  const overall = report.overallScore || 55;
  const skills = report.skills || { vocabulary: 55, grammar: 55, reading: 55, listening: 55, speaking: null };
  const weakness = report.primaryWeakness || 'Speaking';

  const speakingScoreNum = typeof skills?.speaking === 'number' ? skills.speaking : Number(skills?.speaking);
  const isSpeakingTested = Boolean(
    report.speakingTested !== false &&
    skills?.speaking !== null &&
    skills?.speaking !== undefined &&
    !isNaN(speakingScoreNum)
  );

  const speakingLine = isSpeakingTested
    ? `🗣️ ንግግር (Speaking):  ${renderBar(speakingScoreNum)} <b>${speakingScoreNum}</b>/100\n`
    : `🗣️ ንግግር (Speaking):  ⏭️ <i>አልተፈተነም</i>\n`;

  const diagnosis = report.diagnosis || getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);

  return (
    `🎯 <b>የእንግሊዝኛ የፈተና ውጤት</b> 🇪🇹\n\n` +
    `👤 <b>ተማሪ፦</b> ${fullName}\n` +
    `🏆 <b>ችሎታዎ፦</b> Level ${levelName} (CEFR)\n` +
    `⭐ <b>ውጤት፦</b> ${overall}/100 | 🛡️ <b>መለያ፦</b> <code>${credId}</code>\n\n` +
    `<b>የውጤትዎ ዝርዝር፦</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📚 ቃላት (Vocabulary):   ${renderBar(skills.vocabulary)} <b>${skills.vocabulary}</b>/100\n` +
    `📝 ሰዋሰው (Grammar):     ${renderBar(skills.grammar)} <b>${skills.grammar}</b>/100\n` +
    `📖 ንባብ (Reading):      ${renderBar(skills.reading)} <b>${skills.reading}</b>/100\n` +
    `🎧 ማዳመጥ (Listening):   ${renderBar(skills.listening)} <b>${skills.listening}</b>/100\n` +
    speakingLine +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔍 <b>ያለብዎት ክፍተት፦</b> ${diagnosis.headlineAmharic || diagnosis.tag}`
  );
}

export function getDetailedDiagnosisMessage(report: any): string {
  const levelName = report.cefrLevel || 'B1';
  const skills = report.skills || { vocabulary: 55, grammar: 55, reading: 55, listening: 55, speaking: null };
  const weakness = report.primaryWeakness || 'Speaking';

  const speakingScoreNum = typeof skills?.speaking === 'number' ? skills.speaking : Number(skills?.speaking);
  const isSpeakingTested = Boolean(
    report.speakingTested !== false &&
    skills?.speaking !== null &&
    skills?.speaking !== undefined &&
    !isNaN(speakingScoreNum)
  );

  const diagnosis = report.diagnosis || getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);
  const career = report.careerTranslation || getCareerTranslationFallback(levelName);
  const plan = report.recommendedPlan;
  const day1Title = plan?.day1?.title || 'የመጀመሪያ ቀን ልምምድ';

  const speakingNote = !isSpeakingTested
    ? `\n🎙️ <i>ማስታወሻ፦ ድምፅዎን አልሞከሩም። አፍዎን ለመፍታት ከታች "🎙️ ድምፅዎን ይሞክሩ" የሚለውን ይጫኑ!</i>`
    : '';

  return (
    `🎯 <b>የእንግሊዝኛ ችሎታዎ እና መፍትሔው</b> 🇪🇹\n\n` +
    `🔍 <b>ያለብዎት ክፍተት፦</b> <b>${diagnosis.headlineAmharic || diagnosis.tag}</b>\n` +
    `${diagnosis.summary}\n\n` +
    `💼 <b>ይህ ችሎታ ለስራዎ ምን ይጠቅማል?</b>\n` +
    `• <b>አሁን (${levelName})፦</b> ${career.currentLevelReality}\n` +
    `• <b>ቀጣዩ ችሎታ (${career.targetLevel})፦</b> ${career.targetUnlock}\n\n` +
    `💡 <b>መፍትሔው (የ7 ቀን እቅድ)፦</b>\n` +
    `• <b>ምን ማድረግ አለብዎት?</b> በቀን 5 ደቂቃ አጭር ልምምድ ማድረግ።\n` +
    `• <b>የዛሬው ልምምድዎ፦</b> ${day1Title}${speakingNote}`
  );
}

export function getFullTextMessage(report: any, fullName: string, credId: string): string {
  const photoCard = getPhotoScorecard(report, fullName, credId);
  const detailed = getDetailedDiagnosisMessage(report);
  return `${photoCard}\n\n${detailed}`;
}

export function getReportKeyboard(options?: { isAssessed?: boolean; speakingTested?: boolean }): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text('🚀 የዛሬውን ልምምድ ጀምር', 'start_plan_lesson_1')
    .row()
    .text('📊 የፈተና ውጤት', 'view_certificate')
    .text('📅 የ7 ቀን እቅድ', 'view_weekly_plan')
    .row();

  if (options?.speakingTested === false) {
    keyboard.text('🎙️ ድምፅዎን ይሞክሩ', 'start_speaking_flow');
  } else {
    keyboard.text('🔥 ዕለታዊ ቻሌንጅ', 'daily_challenge');
  }

  keyboard.text('🔄 እንደገና ፈትን', 'start_assessment');
  return keyboard;
}
