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

export function sanitizeAmharicDiagnosis(text?: string): string {
  if (!text) return 'የንግግር ቅልጥፍና (Speaking Fluency)';
  let cleaned = text
    .replace(/የዝምታ እንግሊዝኛ ወጥመድ/g, 'የንግግር ቅልጥፍና (Speaking Fluency)')
    .replace(/የዝምታ እንግሊዝኛ/g, 'የንግግር ቅልጥፍና (Speaking Fluency)')
    .replace(/ማንበብ እንጂ ማውራት አለመቻል/g, 'የንግግር ቅልጥፍና (Speaking Fluency)')
    .replace(/The Silent English Trap/gi, 'የንግግር ቅልጥፍና (Speaking Fluency)')
    .replace(/Silent English/gi, 'የንግግር ቅልጥፍና (Speaking Fluency)')
    .replace(/የንግግር መቆራረጥ እና ፍርሃት/g, 'የንግግር ቅልጥፍና (Speaking Fluency)')
    .replace(/የሰዋሰው \(Grammar\) ስህተት/g, 'የሰዋሰው አጠቃቀም (Grammar)')
    .replace(/የቃላት \(Vocabulary\) እጥረት/g, 'የቃላት አጠቃቀም (Vocabulary)')
    .replace(/የማዳመጥ \(Listening\) ክፍተት/g, 'የማዳመጥ ችሎታ (Listening)')
    .replace(/ወጥመድ/g, 'ክፍተት');

  const lower = cleaned.trim().toLowerCase();
  if (lower === 'speaking') return 'የንግግር ቅልጥፍና (Speaking Fluency)';
  if (lower === 'listening') return 'የማዳመጥ ችሎታ (Listening)';
  if (lower === 'grammar') return 'የሰዋሰው አጠቃቀም (Grammar)';
  if (lower === 'vocabulary') return 'የቃላት አጠቃቀም (Vocabulary)';
  if (lower === 'reading') return 'የንባብ ፍጥነት (Reading)';

  return cleaned;
}

export function getLinguisticDiagnosisFallback(skills: SkillScores, weakness: string, isSpeakingTested: boolean) {
  const readingGrammarMax = Math.max(skills.reading || 0, skills.grammar || 0);
  const speakingScore = typeof skills.speaking === 'number' ? skills.speaking : null;

  // ─── STEP 1: Actual lowest-score check (HIGHEST PRIORITY) ─────────────────
  // If ANY skill is critically weak (below 50), that skill is the real primary
  // gap — regardless of the Silent Trap heuristic. Listening=25 beats Speaking=81.
  const testedSkills: { key: string; score: number }[] = [
    { key: 'Listening',  score: skills.listening  ?? 999 },
    { key: 'Vocabulary', score: skills.vocabulary ?? 999 },
    { key: 'Reading',    score: skills.reading    ?? 999 },
    { key: 'Grammar',    score: skills.grammar    ?? 999 },
    ...(isSpeakingTested && speakingScore !== null
      ? [{ key: 'Speaking', score: speakingScore }]
      : []),
  ];

  const lowestSkill = testedSkills.reduce((a, b) => a.score <= b.score ? a : b);

  if (lowestSkill.score < 50) {
    switch (lowestSkill.key) {
      case 'Listening':
        return {
          tag: 'Listening Barrier',
          headlineAmharic: 'የማዳመጥ ችሎታ (Listening)',
          summary: `የማዳመጥ ውጤትዎ ${lowestSkill.score}/100 ሲሆን ይህ ዋናው የማሻሻያ ቦታ ነው። ፈጣን ቃላትን እና ተፈጥሯዊ ንግግር ቅልጥፍና ስለሚቸግሩ፣ ተደጋጋሚ የማዳመጥ ልምምድ ጆሮዎን ይከፍቱታል።`,
          isSilentTrap: false,
        };
      case 'Vocabulary':
        return {
          tag: 'Vocabulary Gap',
          headlineAmharic: 'የቃላት አጠቃቀም (Vocabulary)',
          summary: `የቃላት ውጤትዎ ${lowestSkill.score}/100 ነው። ቃላትን በተሻለ ሁኔታ ለመቆጣጠር አብረው የሚሄዱ ቃላትን (collocations) ልምምድ ማድረግ ያስፈልጋል።`,
          isSilentTrap: false,
        };
      case 'Reading':
        return {
          tag: 'Reading Speed',
          headlineAmharic: 'የንባብ ፍጥነት (Reading)',
          summary: `የንባብ ውጤትዎ ${lowestSkill.score}/100 ነው። እያንዳንዱን ቃል በአማርኛ ለመተርጎም ስለሚሞከር ፍጥነት ይቀንሳል። ፈጣን ንባብ ልምምድ ያስፈልጋል።`,
          isSilentTrap: false,
        };
      case 'Grammar':
        return {
          tag: 'Grammar Errors',
          headlineAmharic: 'የሰዋሰው አጠቃቀም (Grammar)',
          summary: `የሰዋሰው ውጤትዎ ${lowestSkill.score}/100 ሲሆን ዋናው ትኩረት ሰዋሰው ላይ ነው። ከአማርኛ በቀጥታ ስለሚተረጎም የተለመዱ ስህተቶች ይታያሉ። ሰዋሰውን በተግባር መለማመድ ያስፈልጋል።`,
          isSilentTrap: false,
        };
      case 'Speaking':
        return {
          tag: 'Conversational Friction',
          headlineAmharic: 'የንግግር ቅልጥፍና (Speaking Fluency)',
          summary: `የንግግር ውጤትዎ ${lowestSkill.score}/100 ነው። ዋናው ትኩረት በእንግሊዝኛ አቀላጥፎ እና ያለፍርሃት መናገር ላይ ነው። በየቀኑ አጭር ልምምድ ማድረግ አፍዎን ይፈታዋል!`,
          isSilentTrap: true,
        };
    }
  }

  // ─── STEP 2: Silent Trap heuristic (no skill critically low) ─────────────
  // Only fires when all skills ≥ 50 but speaking lags noticeably behind reading/grammar.
  if (isSpeakingTested && speakingScore !== null) {
    const gap = readingGrammarMax - speakingScore;
    if (gap >= 12 && readingGrammarMax >= 50) {
      return {
        tag: 'Speaking Fluency Gap',
        headlineAmharic: 'የንግግር ቅልጥፍና (Speaking Fluency)',
        summary: `ማንበብና ሰዋሰው ላይ ውጤትዎ ጥሩ ነው (${readingGrammarMax}/100)፤ ዋናው መሻሻል ያለበት ማውራት ላይ ነው። በጭንቅላትዎ የሚያውቁትን በአፍዎ በልበ-ሙሉነት ለማውጣት የንግግር ልምምድ ያግዝዎታል።`,
        isSilentTrap: true,
        gapPoints: gap,
      };
    }
  }

  // ─── STEP 3: Speaking untested ────────────────────────────────────────────
  if (!isSpeakingTested) {
    return {
      tag: 'Speaking Untested',
      headlineAmharic: 'ድምፅዎን አልሞከሩም',
      summary: `የጽሑፍ ውጤትዎ በጣም ጥሩ ነው (${readingGrammarMax}/100)። ነገር ግን አብዛኛው ሰው በጽሑፍ ጎበዝ ሆኖ ማውራት ላይ ስለሚቸገር፣ ትክክለኛ ችሎታዎን ለማወቅ ድምፅዎን መፈተን ይመረጣል።`,
      isSilentTrap: false,
    };
  }

  // ─── STEP 4: Fallback by primaryWeakness from backend ───────────────────
  switch (weakness) {
    case 'Speaking':
      return {
        tag: 'Conversational Friction',
        headlineAmharic: 'የንግግር ቅልጥፍና (Speaking Fluency)',
        summary: `ዋናው ትኩረት በእንግሊዝኛ አቀላጥፎ እና ያለፍርሃት መናገር ላይ ነው። በየቀኑ አጭር ልምምድ ማድረግ አፍዎን ይፈታዋል!`,
        isSilentTrap: true,
      };
    case 'Grammar':
      return {
        tag: 'Grammar Errors',
        headlineAmharic: 'የሰዋሰው አጠቃቀም (Grammar)',
        summary: `ከአማርኛ በቀጥታ ስለሚተረጎም የተለመዱ የሰዋሰው ስህተቶች ይታያሉ (ለምሳሌ፦ 'I am having'፣ 'discuss about')። ሰዋሰውን በተግባር መለማመድ ያስፈልጋል።`,
        isSilentTrap: false,
      };
    case 'Vocabulary':
      return {
        tag: 'Vocabulary Gap',
        headlineAmharic: 'የቃላት አጠቃቀም (Vocabulary)',
        summary: `ነጠላ ቃላትን ያውቃሉ፤ ግን አብረው የሚሄዱ ቃላትን በስራዎና በንግግርዎ ላይ አቀላጥፈው ለመጠቀም ልምምድ ያንሳል።`,
        isSilentTrap: false,
      };
    case 'Listening':
      return {
        tag: 'Listening Barrier',
        headlineAmharic: 'የማዳመጥ ችሎታ (Listening)',
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
        headlineAmharic: `የ${weakness} ችሎታ`,
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
        currentLevelReality: 'መሰረታዊ ሰላምታ ይችላሉ፤ ግን የስራ ቃለ-መጠይቅና የቢሮ ኢሜይል ላይ ይቸገራሉ።',
        targetLevel: 'B1',
        targetUnlock: 'የስራ ቃለ-መጠይቆችን ሳይደናበሩ ማለፍና የቢሮ ኢሜይሎችን በልበ-ሙሉነት መጻፍ ያስችልዎታል።',
      };
    case 'B1':
      return {
        currentLevelReality: 'የቢሮ ኢሜይልና ጽሑፍ ይገባዎታል፤ ግን ፈጣን ቃለ-መጠይቅና ንግግር ላይ ቃላት ይጠፉብዎታል።',
        targetLevel: 'B2 (የስራ ፓስፖርት)',
        targetUnlock: 'ለውጭ Remote ስራዎች (Upwork)፣ እንደ Safaricom እና አየር መንገድ ያሉ ተቋማት፣ እንዲሁም ለስኮላርሺፕ (Mastercard) በር ይከፍትልዎታል!',
      };
    case 'B2':
      return {
        currentLevelReality: 'በማንኛውም የስራ ቦታ እና ቃለ-መጠይቅ ላይ ጠንካራ ናቸው፤ ከፍተኛ ጫና ሲኖር ብቻ ትንሽ ይቆማሉ።',
        targetLevel: 'C1 (ከፍተኛ አመራር)',
        targetUnlock: 'ከአለም አቀፍ ድርጅቶች ጋር ኮንትራት መደራደር፣ ትልልቅ ስብሰባዎችን መምራትና በልበ-ሙሉነት መናገር ያስችልዎታል።',
      };
    case 'C1':
    case 'C2':
      return {
        currentLevelReality: 'እንግሊዝኛዎ ፈሳሽና የተዋጣለት ነው፤ በማንኛውም መድረክ በልበ-ሙሉነት ይናገራሉ።',
        targetLevel: 'C2',
        targetUnlock: 'ከፍተኛ የአለም አቀፍ አመራር እና ዲፕሎማሲያዊ ንግግር።',
      };
    default:
      return {
        currentLevelReality: 'መሰረታዊ ተግባቦት ይችላሉ፤ ግን ቀጣዩን ችሎታ መያዝ ያስፈልጋል።',
        targetLevel: 'B2',
        targetUnlock: 'ለአለም አቀፍ እና ለሀገር ውስጥ ምርጥ የስራ ዕድሎች ዝግጁ ያደርጋሉ።',
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
    ? `🗣️ Speaking:     ${renderBar(speakingScoreNum)} <b>${speakingScoreNum}</b>/100\n`
    : `🗣️ Speaking:     ⏭️ <i>Skipped (Untested)</i>\n`;

  const diagnosis = getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);
  const cleanHeadline = sanitizeAmharicDiagnosis(diagnosis.headlineAmharic || diagnosis.tag);
  const cleanSummary = sanitizeAmharicDiagnosis(diagnosis.summary);

  return (
    `🎯 <b>MARAKI ENGLISH ASSESSMENT REPORT</b> 🇪🇹\n\n` +
    `👤 <b>Student:</b> ${fullName}\n` +
    `🏆 <b>Verified Level:</b> Level ${levelName} (CEFR)\n` +
    `⭐ <b>Score:</b> ${overall}/100 | 🛡️ <b>ID:</b> <code>${credId}</code>\n\n` +
    `<b>Skill Breakdown:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📚 Vocabulary:   ${renderBar(skills.vocabulary)} <b>${skills.vocabulary}</b>/100\n` +
    `📝 Grammar:      ${renderBar(skills.grammar)} <b>${skills.grammar}</b>/100\n` +
    `📖 Reading:      ${renderBar(skills.reading)} <b>${skills.reading}</b>/100\n` +
    `🎧 Listening:    ${renderBar(skills.listening)} <b>${skills.listening}</b>/100\n` +
    speakingLine +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔍 <b>Diagnosis:</b> ${cleanHeadline}`
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

  const diagnosis = getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);
  const cleanHeadline = sanitizeAmharicDiagnosis(diagnosis.headlineAmharic || diagnosis.tag);
  const cleanSummary = sanitizeAmharicDiagnosis(diagnosis.summary);
  const career = report.careerTranslation || getCareerTranslationFallback(levelName);
  const plan = report.recommendedPlan;
  const day1Title = plan?.day1?.title || 'የመጀመሪያ ቀን ልምምድ';

  const speakingNote = !isSpeakingTested
    ? `\n🎙️ <i>ማስታወሻ፦ ድምፅዎን አልሞከሩም። አፍዎን ለመፍታት ከታች "🎙️ ድምፅዎን ይሞክሩ" የሚለውን ይጫኑ!</i>`
    : '';

  return (
    `🎯 <b>የእንግሊዝኛ ችሎታዎ እና መፍትሔው</b> 🇪🇹\n\n` +
    `🔍 <b>ያለብዎት ክፍተት፦</b> <b>${cleanHeadline}</b>\n` +
    `${cleanSummary}\n\n` +
    `💼 <b>ይህ ችሎታ ለስራዎ ምን ይጠቅማል?</b>\n` +
    `• <b>አሁን (${levelName})፦</b> ${career.currentLevelReality}\n` +
    `• <b>ቀጣዩ ችሎታ (${career.targetLevel})፦</b> ${career.targetUnlock}\n\n` +
    `💡 <b>የመፍትሔው መንገድ፦</b>\n` +
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
    .text('📅 የልምምድ እቅድ', 'view_weekly_plan')
    .row();

  if (options?.speakingTested === false) {
    keyboard.text('🎙️ ድምፅዎን ይሞክሩ', 'start_speaking_flow');
  } else {
    keyboard.text('🔥 ዕለታዊ ቻሌንጅ', 'daily_challenge');
  }

  keyboard.text('🔄 እንደገና ፈትን', 'start_assessment');
  return keyboard;
}
