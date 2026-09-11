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
        headlineAmharic: 'የዝምታ እንግሊዝኛ ወጥመድ',
        summary: `Your Reading & Grammar (${readingGrammarMax}/100) are strong, but your Spoken English (${speakingScore}/100) lags behind by ${gap} points. This is the classic Ethiopian academic gap: 12+ years of reading textbooks and passing exams without spontaneous conversational practice. You understand the language in your head, but freeze or hesitate when speaking aloud.`,
        isSilentTrap: true,
        gapPoints: gap,
      };
    }
  }

  if (!isSpeakingTested) {
    return {
      tag: 'Receptive Knowledge Calibrated (Speaking Untested)',
      headlineAmharic: 'የንግግር ክህሎት ያልተፈተነ',
      summary: `Your reading, grammar, and vocabulary show a solid foundation (${readingGrammarMax}/100). However, 78% of Ethiopian learners test 1–2 CEFR bands lower in spontaneous speaking due to lecture-style schooling. Practice speaking aloud to ensure you avoid the Silent English Trap.`,
      isSilentTrap: false,
    };
  }

  switch (weakness) {
    case 'Speaking':
      return {
        tag: 'Conversational Retrieval Friction',
        headlineAmharic: 'የንግግር ማመንጨት እና የፍጥነት ውስንነት',
        summary: `Your speaking score is ${speakingScore}/100. Your primary challenge is mental Amharic-to-English translation before vocalizing, leading to pauses and hesitations. Daily 2-minute spontaneous verbal drills will rewire your automatic speech reflexes.`,
        isSilentTrap: true,
      };
    case 'Grammar':
      return {
        tag: 'L1 Amharic Syntax Interference',
        headlineAmharic: 'የቋንቋ መዋቅር እና የትርጉም ተጽዕኖ',
        summary: `Your grammar score is ${skills.grammar}/100. Errors stem from direct translation of Amharic sentence patterns into English: using stative verbs in continuous tense ("I am having" vs "I have"), redundant prepositions ("discuss about"), and countable noun mixups ("advices").`,
        isSilentTrap: false,
      };
    case 'Vocabulary':
      return {
        tag: 'Collocation & Professional Lexicon Gap',
        headlineAmharic: 'የቃላት ትስስር እና ሙያዊ አገላለጽ እጥረት',
        summary: `Your vocabulary score is ${skills.vocabulary}/100. You know isolated words, but struggle with natural collocations ("make a favor" vs "do a favor") and high-yield workplace phrasal verbs necessary for professional fluency.`,
        isSilentTrap: false,
      };
    case 'Listening':
      return {
        tag: 'Acoustic Connected-Speech Barrier',
        headlineAmharic: 'የፈጣን ንግግር ማዳመጥ ፈተና',
        summary: `Your listening score is ${skills.listening}/100. You understand written English, but native reductions, elisions, and fast connected speech ("whaddya think") present an auditory hurdle.`,
        isSilentTrap: false,
      };
    case 'Reading':
      return {
        tag: 'Subvocalization & Inference Bottleneck',
        headlineAmharic: 'የንባብ ፍጥነት እና ጥልቅ ትንታኔ ክፍተት',
        summary: `Your reading score is ${skills.reading}/100. You tend to translate word-by-word into Amharic rather than absorbing text in semantic chunks, which slows comprehension during long articles and official documents.`,
        isSilentTrap: false,
      };
    default:
      return {
        tag: `${weakness} Growth Area`,
        headlineAmharic: 'የማሻሻያ መስክ',
        summary: `Your diagnosed growth area is ${weakness}. Focusing targeted practice here unlocks the next CEFR level.`,
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
        currentLevelReality: 'Basic social greetings & short messages. High hesitation during formal interviews and complex work emails; constant Amharic-to-English translation in head.',
        targetLevel: 'B1',
        targetUnlock: 'Handle routine professional emails with ease, conduct basic client calls, and pass standard workplace English screenings without freezing.',
      };
    case 'B1':
      return {
        currentLevelReality: 'Understands university lectures and standard office emails, but hesitates during high-stakes job interviews, technical presentations, or spontaneous English discussions.',
        targetLevel: 'B2',
        targetUnlock: 'The "Global Passport": Unlocks competitive candidacy for international remote work (Upwork, Remotebase), multinational companies (Safaricom, Ethiopian Airlines, UNDP/NGOs), and prestigious international scholarships (Mastercard Foundation, Chevening).',
      };
    case 'B2':
      return {
        currentLevelReality: 'Comfortable in most professional settings and standard interviews. Occasional hesitations under intense pressure or with nuanced idiomatic expressions.',
        targetLevel: 'C1',
        targetUnlock: 'Executive-level communication: Effortlessly lead international cross-functional teams, negotiate high-stakes deals, deliver conference presentations, and publish authoritative reports.',
      };
    case 'C1':
    case 'C2':
      return {
        currentLevelReality: 'Fluent, spontaneous, highly articulated expression across academic, executive, and international environments.',
        targetLevel: 'C2',
        targetUnlock: 'Native-level rhetorical precision, diplomatic negotiation, and top-tier global leadership mastery.',
      };
    default:
      return {
        currentLevelReality: 'Foundational English communication capable of handling structured everyday tasks.',
        targetLevel: 'B2',
        targetUnlock: 'High-value career opportunities with international NGOs, tech companies, and overseas academic programs.',
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

  const diagnosis = report.diagnosis || getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);

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
    `🔍 <b>Diagnosis:</b> ${diagnosis.tag}`
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
  const day1Title = plan?.day1?.title || 'Core Foundational Drills';
  const day1Task = plan?.day1?.task || '5-minute targeted practice';

  const speakingNote = !isSpeakingTested
    ? `\n🎙️ <i>Note: Speaking was skipped. Tap "🎙️ Practice Speaking" to test your vocal fluency!</i>\n`
    : '';

  return (
    `🩺 <b>MARAKI CLINICAL DIAGNOSIS & PRESCRIPTION</b> 🇪🇹\n\n` +
    `🔍 <b>The Diagnosis:</b> <b>${diagnosis.tag}</b>\n` +
    `<i>(${diagnosis.headlineAmharic || 'የክህሎት ትንታኔ'})</i>\n` +
    `${diagnosis.summary}\n\n` +
    `💼 <b>Career & Opportunity Reality:</b>\n` +
    `• <b>Current Reality (${levelName}):</b> ${career.currentLevelReality}\n` +
    `• <b>Next Unlock (${career.targetLevel}):</b> ${career.targetUnlock}\n\n` +
    `💊 <b>The Doctor's Prescription (የመፍትሄው መንገድ):</b>\n` +
    `• <b>Root Cause:</b> Cramming grammar textbooks will NOT cure ${weakness}. You need active, low-friction daily micro-practice.\n` +
    `• <b>Daily Dose:</b> 5 minutes daily targeted drills\n` +
    `• <b>Day 1 Antidote:</b> ${day1Title}\n` +
    `• <i>Task:</i> ${day1Task}${speakingNote}`
  );
}

export function getFullTextMessage(report: any, fullName: string, credId: string): string {
  const photoCard = getPhotoScorecard(report, fullName, credId);
  const detailed = getDetailedDiagnosisMessage(report);
  return `${photoCard}\n\n${detailed}`;
}

export function getReportKeyboard(options?: { isAssessed?: boolean; speakingTested?: boolean }): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text('🚀 Start Day 1 Prescription', 'start_plan_lesson_1')
    .row()
    .text('📊 View Assessment Report', 'view_certificate')
    .text('📅 View 7-Day Plan', 'view_weekly_plan')
    .row();

  if (options?.speakingTested === false) {
    keyboard.text('🎙️ Practice Speaking', 'start_speaking_flow');
  } else {
    keyboard.text('🔥 Daily Challenge', 'daily_challenge');
  }

  keyboard.text('🔄 Retest Level', 'start_assessment');
  return keyboard;
}
