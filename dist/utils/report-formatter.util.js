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
                headlineAmharic: 'የዝምታ እንግሊዝኛ (Silent English)',
                summary: `ማንበብና ሰዋሰው ላይ በጣም ጎበዝ ነህ (${readingGrammarMax}/100)፤ ችግሩ ማውራት ላይ ነው። በጭንቅላትህ የምታውቀውን በአፍህ ለማውጣት ቃላት ይጠፉብሃል ወይም ትፈራለህ። በትምህርት ቤት አንብበን እንጂ አውርተን ስላልተማርን አብዛኛውን ሰው የሚያጋጥመው ይሄው ነው።`,
                isSilentTrap: true,
                gapPoints: gap,
            };
        }
    }
    if (!isSpeakingTested) {
        return {
            tag: 'Speaking Untested',
            headlineAmharic: 'ድምፅህን አልሞከርክም',
            summary: `የጽሑፍ ውጤትህ በጣም ጥሩ ነው (${readingGrammarMax}/100)። ነገር ግን አብዛኛው ሰው በጽሑፍ ጎበዝ ሆኖ ማውራት ላይ ስለሚቸገር፣ ትክክለኛ ደረጃህን ለማወቅ ድምፅህን መፈተን ይመረጣል።`,
            isSilentTrap: false,
        };
    }
    switch (weakness) {
        case 'Speaking':
            return {
                tag: 'Conversational Friction',
                headlineAmharic: 'የንግግር መቆራረጥ እና ፍርሃት',
                summary: `ዋናው ችግር በጭንቅላትህ ከአማርኛ ወደ እንግሊዝኛ እየተረጎምክ ማውራትህ ነው። ቃላት እየጠፉብህ እንድትቆም ያደርግሃል። በየቀኑ አጭር ልምምድ ማድረግ አፍህን ይፈታዋል!`,
                isSilentTrap: true,
            };
        case 'Grammar':
            return {
                tag: 'Grammar Errors',
                headlineAmharic: 'የሰዋሰው (Grammar) ስህተት',
                summary: `ከአማርኛ በቀጥታ ስለምትተረጉም የተለመዱ የሰዋሰው ስህተቶች ይታዩብሃል (ለምሳሌ፦ 'I am having'፣ 'discuss about')። ሰዋሰውን በተግባር መለማመድ ያስፈልግሃል።`,
                isSilentTrap: false,
            };
        case 'Vocabulary':
            return {
                tag: 'Vocabulary Gap',
                headlineAmharic: 'የቃላት (Vocabulary) እጥረት',
                summary: `ነጠላ ቃላትን ታውቃለህ፤ ግን አብረው የሚሄዱ ቃላትን በስራህና በንግግርህ ላይ አቀላጥፈህ ለመጠቀም ልምምድ ያንሰሃል።`,
                isSilentTrap: false,
            };
        case 'Listening':
            return {
                tag: 'Listening Barrier',
                headlineAmharic: 'የማዳመጥ (Listening) ክፍተት',
                summary: `ጽሑፍ ሲሆን ይገባሃል፤ ነገር ግን ፈጣን የውጭ አገር ሰዎች ንግግር ጆሮህ ላይ ግራ ይጋባል። ጥቂት የድምፅ ልምምዶች ጆሮህን ይከፍቱታል።`,
                isSilentTrap: false,
            };
        case 'Reading':
            return {
                tag: 'Reading Speed',
                headlineAmharic: 'የንባብ ፍጥነት (Reading)',
                summary: `እያንዳንዱን ቃል በአማርኛ ለመተርጎም ስለምትሞክር ረጅም ጽሑፎችን በፍጥነት አንብቦ ለመረዳት ጊዜ ይወስድብሃል።`,
                isSilentTrap: false,
            };
        default:
            return {
                tag: `${weakness} Gap`,
                headlineAmharic: `የ${weakness} ክፍተት`,
                summary: `ዋናው ማሻሻያህ ${weakness} ነው። በየቀኑ ጥቂት ደቂቃ በመለማመድ ደረጃህን ማሳደግ ትችላለህ።`,
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
                targetUnlock: 'የስራ ቃለ-መጠይቆችን በልበ-ሙሉነት እንድታልፍና የቢሮ ኢሜይሎችን ያለፍርሃት እንድትጽፍ ይረዳሃል።',
            };
        case 'B1':
            return {
                currentLevelReality: 'የቢሮ ኢሜይልና ጽሑፍ ይገባሃል፤ ግን ቃለ-መጠይቅና ፈጣን ንግግር ላይ ቃላት ይጠፉብሃል።',
                targetLevel: 'B2',
                targetUnlock: 'እንደ Safaricom፣ አየር መንገድ ወይም የውጭ Remote ስራዎች (Upwork) እና ለስኮላርሺፕ በር ይከፍትልሃል!',
            };
        case 'B2':
            return {
                currentLevelReality: 'በማንኛውም የስራ ቦታና ቃለ-መጠይቅ ላይ ጥሩ ነህ፤ ጫና ሲበዛ ብቻ ትንሽ ትቆማለህ።',
                targetLevel: 'C1',
                targetUnlock: 'ከአለም አቀፍ ድርጅቶች ጋር ኮንትራት መደራደር፣ ትልልቅ ስብሰባዎችን መምራትና በልበ-ሙሉነት መናገር ያስችልሃል።',
            };
        case 'C1':
        case 'C2':
            return {
                currentLevelReality: 'እንግሊዝኛህ ፈሳሽና የተዋጣለት ነው፤ በማንኛውም ቦታ በልበ-ሙሉነት ትናገራለህ።',
                targetLevel: 'C2',
                targetUnlock: 'ከፍተኛ የአለም አቀፍ አመራር እና ንግግር።',
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
        ? `🗣️ ንግግር (Speaking):  ${renderBar(speakingScoreNum)} <b>${speakingScoreNum}</b>/100\n`
        : `🗣️ ንግግር (Speaking):  ⏭️ <i>አልተፈተነም</i>\n`;
    const diagnosis = report.diagnosis || getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);
    return (`🎯 <b>የእንግሊዝኛ የፈተና ሪፖርት</b> 🇪🇹\n\n` +
        `👤 <b>ተማሪ፦</b> ${fullName}\n` +
        `🏆 <b>ደረጃህ፦</b> Level ${levelName} (CEFR)\n` +
        `⭐ <b>ውጤት፦</b> ${overall}/100 | 🛡️ <b>መለያ፦</b> <code>${credId}</code>\n\n` +
        `<b>የውጤትህ ዝርዝር፦</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `📚 ቃላት (Vocabulary):   ${renderBar(skills.vocabulary)} <b>${skills.vocabulary}</b>/100\n` +
        `📝 ሰዋሰው (Grammar):     ${renderBar(skills.grammar)} <b>${skills.grammar}</b>/100\n` +
        `📖 ንባብ (Reading):      ${renderBar(skills.reading)} <b>${skills.reading}</b>/100\n` +
        `🎧 ማዳመጥ (Listening):   ${renderBar(skills.listening)} <b>${skills.listening}</b>/100\n` +
        speakingLine +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔍 <b>ዋና ክፍተትህ፦</b> ${diagnosis.headlineAmharic || diagnosis.tag}`);
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
        ? `\n🎙️ <i>ማስታወሻ፦ ድምፅህን አልሞከርክም። አፍህን ለመፍታት ከታች "🎙️ ድምፅህን ሞክር" የሚለውን ንካ!</i>`
        : '';
    return (`🎯 <b>የፈተናህ ውጤት እና መፍትሔው</b> 🇪🇹\n\n` +
        `🔍 <b>ያለብህ ክፍተት፦</b> <b>${diagnosis.headlineAmharic || diagnosis.tag}</b>\n` +
        `${diagnosis.summary}\n\n` +
        `💼 <b>ይህ ደረጃ ለስራህ ምን ይጠቅማል?</b>\n` +
        `• <b>አሁን (${levelName})፦</b> ${career.currentLevelReality}\n` +
        `• <b>ቀጣዩ ደረጃ (${career.targetLevel})፦</b> ${career.targetUnlock}\n\n` +
        `💡 <b>መፍትሔው (የ7 ቀን እቅድ)፦</b>\n` +
        `• <b>ምን ማድረግ አለብህ?</b> በቀን 5 ደቂቃ አጭር ልምምድ።\n` +
        `• <b>የዛሬው ልምምድ፦</b> ${day1Title}${speakingNote}`);
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
        .text('📅 የ7 ቀን እቅድ', 'view_weekly_plan')
        .row();
    if (options?.speakingTested === false) {
        keyboard.text('🎙️ ድምፅህን ሞክር', 'start_speaking_flow');
    }
    else {
        keyboard.text('🔥 ዕለታዊ ቻሌንጅ', 'daily_challenge');
    }
    keyboard.text('🔄 እንደገና ፈትን', 'start_assessment');
    return keyboard;
}
