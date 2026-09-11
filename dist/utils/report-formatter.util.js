import { InlineKeyboard } from 'grammy';
export function renderBar(score) {
    const num = typeof score === 'number' ? score : Number(score) || 0;
    const filled = Math.min(5, Math.max(0, Math.round(num / 20)));
    const empty = 5 - filled;
    return '🟩'.repeat(filled) + '⬜'.repeat(empty);
}
export function getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested) {
    const readingGrammarMax = Math.max(skills.reading || 0, skills.grammar || 0);
    const speakingScore = typeof skills.speaking === 'number' ? skills.speaking : null;
    if (isSpeakingTested && speakingScore !== null) {
        const gap = readingGrammarMax - speakingScore;
        if (gap >= 12 && readingGrammarMax >= 50) {
            return {
                tag: 'The Silent English Trap',
                headlineAmharic: 'የዝምታ እንግሊዝኛ ወጥመድ (Silent English)',
                summary: `ንባብና ሰዋሰውህ ምርጥ ነው (${readingGrammarMax}/100)፤ ነገር ግን ማውራት ላይ የ${gap} ነጥብ ልዩነት አለ። በጭንቅላትህ የምታውቀውን በአፍህ ለማውጣት ትፈራለህ። በት/ቤት 12 ዓመት ሙሉ አንብበን እንጂ አውርተን ስላላደግን አብዛኛውን ኢትዮጵያዊ የሚያጋጥመው ይሄው ነው።`,
                isSilentTrap: true,
                gapPoints: gap,
            };
        }
    }
    if (!isSpeakingTested) {
        return {
            tag: 'Receptive Knowledge Calibrated (Speaking Untested)',
            headlineAmharic: 'የጽሑፍ እውቀትህ አሪፍ ነው (ድምፅ አልተፈተነም)',
            summary: `የንባብና ሰዋሰው መሠረትህ በጣም ጥሩ ነው (${readingGrammarMax}/100)። ነገር ግን 78% የሚሆኑ ተማሪዎች ጽሑፍ ላይ ጎበዝ ሆነው ሲያወሩ ይቸገራሉ። ድምፅህን ሞክረህ ትክክለኛውን ደረጃህን ማወቅ ይመረጣል።`,
            isSilentTrap: false,
        };
    }
    switch (weakness) {
        case 'Speaking':
            return {
                tag: 'Conversational Friction',
                headlineAmharic: 'የንግግር መገታት እና የፍጥነት ውስንነት',
                summary: `ዋናው ፈተናህ በጭንቅላትህ ከአማርኛ ወደ እንግሊዝኛ እየተረጎምክ ማውራትህ ነው። ቃላቶች እየጠፉብህ እንድትቆም ያደርግሃል። በየቀኑ አጭር ልምምድ ማድረግ አፍህን ይፈታዋል!`,
                isSilentTrap: true,
            };
        case 'Grammar':
            return {
                tag: 'L1 Translation Interference',
                headlineAmharic: 'የቀጥታ ትርጉም ተጽዕኖ (Grammar)',
                summary: `ጥያቄዎችን ስትመልስ ከአማርኛ በቀጥታ ስለምትተረጉም ስህተቶች ይመጣሉ (ለምሳሌ፡ 'I am having'፣ 'discuss about')። ሰዋሰውን በደንብ መለማመድ ያስፈልግሃል።`,
                isSilentTrap: false,
            };
        case 'Vocabulary':
            return {
                tag: 'Lexicon & Collocation Gap',
                headlineAmharic: 'የተግባር ቃላት እጥረት (Vocabulary)',
                summary: `ነጠላ ቃላትን ታውቃለህ፤ ግን አብረው የሚሄዱ ቃላትን (Collocations) በንግግርህና በስራህ ላይ አቀላጥፈህ ለመጠቀም ልምምድ ያንሰሃል።`,
                isSilentTrap: false,
            };
        case 'Listening':
            return {
                tag: 'Fast Speech Barrier',
                headlineAmharic: 'የፈጣን ንግግር ማዳመጥ ፈተና (Listening)',
                summary: `የተጻፈ ጽሑፍ ይገባሃል፤ ነገር ግን የውጭ አገር ሰዎች ፈጣን ንግግር (Connected Speech) ጆሮህ ላይ ግራ ይጋባል። ጥቂት የድምፅ ልምምዶች ጆሮህን ይከፍቱታል።`,
                isSilentTrap: false,
            };
        case 'Reading':
            return {
                tag: 'Reading Speed Bottleneck',
                headlineAmharic: 'የንባብ ፍጥነት እና መረዳት (Reading)',
                summary: `እያንዳንዱን ቃል በአማርኛ ለመተርጎም ስለምትሞክር ረጅም ጽሑፎችን በፍጥነት አንብቦ ለመረዳት ጊዜ ይወስድብሃል።`,
                isSilentTrap: false,
            };
        default:
            return {
                tag: `${weakness} Growth Area`,
                headlineAmharic: `የ${weakness} ማሻሻያ መስክ`,
                summary: `ዋናው ማሻሻያህ ${weakness} ነው። በቀን ጥቂት ደቂቃ በመለማመድ ደረጃህን ማሳደግ ትችላለህ።`,
                isSilentTrap: false,
            };
    }
}
export function getCareerTranslationFallback(cefrLevel) {
    const level = (cefrLevel || 'B1').toUpperCase();
    switch (level) {
        case 'A1':
        case 'A2':
            return {
                currentLevelReality: 'መሰረታዊ ሰላምታ ትችላለህ፤ ግን የስራ ቃለ-መጠይቅና የቢሮ ኢሜይል ላይ ትቸገራለህ።',
                targetLevel: 'B1',
                targetUnlock: 'የስራ ቃለ-መጠይቆችን ሳትደናገጥ ማለፍና የቢሮ ኢሜይሎችን በልበ-ሙሉነት መጻፍ ያስችልሃል።',
            };
        case 'B1':
            return {
                currentLevelReality: 'የቢሮ ኢሜይልና ጽሑፍ ይገባሃል፤ ግን ፈጣን ቃለ-መጠይቅና ንግግር ላይ ቃላት ይጠፉብሃል።',
                targetLevel: 'B2 (የስራ ፓስፖርት)',
                targetUnlock: 'ለውጭ Remote ስራዎች (Upwork)፣ እንደ Safaricom እና አየር መንገድ ያሉ ተቋማት፣ እንዲሁም ለስኮላርሺፕ (Mastercard) በር ይከፍትልሃል!',
            };
        case 'B2':
            return {
                currentLevelReality: 'በማንኛውም የስራ ቦታ እና ቃለ-መጠይቅ ላይ አሪፍ ነህ፤ ከፍተኛ ጫና ሲኖር ብቻ ትንሽ ትቆማለህ።',
                targetLevel: 'C1 (ከፍተኛ አመራር)',
                targetUnlock: 'ከአለም አቀፍ ድርጅቶች ጋር ኮንትራት መደራደር፣ ትልልቅ ስብሰባዎችን መምራትና በልበ-ሙሉነት መናገር ያስችልሃል።',
            };
        case 'C1':
        case 'C2':
            return {
                currentLevelReality: 'እንግሊዝኛህ ፈሳሽና የተዋጣለት ነው፤ በማንኛውም መድረክ በልበ-ሙሉነት ትናገራለህ።',
                targetLevel: 'C2',
                targetUnlock: 'ከፍተኛ የአለም አቀፍ አመራር እና ዲፕሎማሲያዊ ንግግር።',
            };
        default:
            return {
                currentLevelReality: 'መሰረታዊ ተግባቦት ትችላለህ፤ ግን ቀጣዩን ደረጃ መያዝ ያስፈልግሃል።',
                targetLevel: 'B2',
                targetUnlock: 'ለአለም አቀፍ እና ለሀገር ውስጥ ምርጥ የስራ ዕድሎች ዝግጁ ያደርግሃል።',
            };
    }
}
export function getPhotoScorecard(report, fullName, credId) {
    const levelName = report.cefrLevel || 'B1';
    const overall = report.overallScore || 55;
    const skills = report.skills || { vocabulary: 55, grammar: 55, reading: 55, listening: 55, speaking: null };
    const weakness = report.primaryWeakness || 'Speaking';
    const speakingScoreNum = typeof skills?.speaking === 'number' ? skills.speaking : Number(skills?.speaking);
    const isSpeakingTested = Boolean(report.speakingTested !== false &&
        skills?.speaking !== null &&
        skills?.speaking !== undefined &&
        !isNaN(speakingScoreNum));
    const speakingLine = isSpeakingTested
        ? `🗣️ Speaking:     ${renderBar(speakingScoreNum)} <b>${speakingScoreNum}</b>/100\n`
        : `🗣️ Speaking:     ⏭️ <i>Skipped (Untested)</i>\n`;
    const diagnosis = report.diagnosis || getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);
    return (`🎯 <b>MARAKI ENGLISH ASSESSMENT REPORT</b> 🇪🇹\n\n` +
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
        `🔍 <b>Diagnosis:</b> ${diagnosis.headlineAmharic || diagnosis.tag}`);
}
export function getDetailedDiagnosisMessage(report) {
    const levelName = report.cefrLevel || 'B1';
    const skills = report.skills || { vocabulary: 55, grammar: 55, reading: 55, listening: 55, speaking: null };
    const weakness = report.primaryWeakness || 'Speaking';
    const speakingScoreNum = typeof skills?.speaking === 'number' ? skills.speaking : Number(skills?.speaking);
    const isSpeakingTested = Boolean(report.speakingTested !== false &&
        skills?.speaking !== null &&
        skills?.speaking !== undefined &&
        !isNaN(speakingScoreNum));
    const diagnosis = report.diagnosis || getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);
    const career = report.careerTranslation || getCareerTranslationFallback(levelName);
    const plan = report.recommendedPlan;
    const day1Title = plan?.day1?.title || 'የመጀመሪያ ቀን ልምምድ';
    const speakingNote = !isSpeakingTested
        ? `\n🎙️ <i>ማስታወሻ፦ ድምፅዎን አልሞከሩም። አፍዎን ለመፍታት ከታች "🎙️ ድምፅዎን ይሞክሩ" የሚለውን ይጫኑ!</i>`
        : '';
    return (`🎯 <b>የእንግሊዝኛ ችሎታዎ እና መፍትሔው</b> 🇪🇹\n\n` +
        `🔍 <b>ያለብዎት ክፍተት፦</b> <b>${diagnosis.headlineAmharic || diagnosis.tag}</b>\n` +
        `${diagnosis.summary}\n\n` +
        `💼 <b>ይህ ችሎታ ለስራዎ ምን ይጠቅማል?</b>\n` +
        `• <b>አሁን (${levelName})፦</b> ${career.currentLevelReality}\n` +
        `• <b>ቀጣዩ ችሎታ (${career.targetLevel})፦</b> ${career.targetUnlock}\n\n` +
        `💡 <b>የመፍትሔው መንገድ፦</b>\n` +
        `• <b>ምን ማድረግ አለብዎት?</b> በቀን 5 ደቂቃ አጭር ልምምድ ማድረግ።\n` +
        `• <b>የዛሬው ልምምድዎ፦</b> ${day1Title}${speakingNote}`);
}
export function getFullTextMessage(report, fullName, credId) {
    const photoCard = getPhotoScorecard(report, fullName, credId);
    const detailed = getDetailedDiagnosisMessage(report);
    return `${photoCard}\n\n${detailed}`;
}
export function getReportKeyboard(options) {
    const keyboard = new InlineKeyboard()
        .text('🚀 የዛሬውን ልምምድ ጀምር', 'start_plan_lesson_1')
        .row()
        .text('📊 የፈተና ውጤት', 'view_certificate')
        .text('📅 የልምምድ እቅድ', 'view_weekly_plan')
        .row();
    if (options?.speakingTested === false) {
        keyboard.text('🎙️ ድምፅዎን ይሞክሩ', 'start_speaking_flow');
    }
    else {
        keyboard.text('🔥 ዕለታዊ ቻሌንጅ', 'daily_challenge');
    }
    keyboard.text('🔄 እንደገና ፈትን', 'start_assessment');
    return keyboard;
}
