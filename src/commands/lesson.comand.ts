import { Context, InlineKeyboard, InputFile } from "grammy";
import { getSession, setSession } from "../utils/redis.js";
import { interactiveLessonPrompt, lessonFollowupPrompt, InteractiveLessonJSON } from "../prompt/lesson.prompt.js";
import { apiService } from "../services/api.service.js";
import { callGeminiGenerateContent } from "../api/gemini/callGeminiGenerateContents.js";
import { checkCentralAuthAndAccess } from "../middleware/authGuard.middleware.js";
import * as googleTTS from "google-tts-api";

// ─────────────────────────────────────────────────────────────────────────────
// Curated High-Yield Offline Fallbacks by CEFR Level
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_MICRO_LESSONS: Record<string, InteractiveLessonJSON> = {
  A1: {
    title: "Ordering at a Cafe & Coffee",
    level: "A1",
    conceptEn: "When ordering food or drinks, use 'Can I have...' or 'I would like...' to sound natural and polite.",
    conceptAm: "በእንግሊዝኛ ምግብ ወይም መጠጥ ስናዝ 'Give me' ከማለት ይልቅ 'Can I have...' ወይም 'I would like...' ማለት በጣም ጨዋ እና ተገቢ አነጋገር ነው።",
    audioText: "Good morning! Can I have one cup of coffee and a bottle of water, please?",
    commonTrap: {
      incorrect: "Give me one coffee.",
      correct: "Can I have one coffee, please?",
      whyAm: "'Give me' የሚለው አነጋገር ሻካራ (rude) ሊመስል ስለሚችል 'Can I have...' እንጠቀማለን።",
    },
    question: "How do you politely ask a barista for a cup of tea in English?",
    options: [
      "A) Give me tea now",
      "B) Can I have a cup of tea, please?",
      "C) I am wanting tea",
    ],
    correctIndex: 1,
    explanationAm: "'Can I have a cup of tea, please?' በጣም ተፈጥሯዊ እና ጨዋ የእንግሊዝኛ አጠያየቅ ነው።",
    speakingChallenge: "Good afternoon! Can I have a cup of traditional buna, please?",
  },
  A2: {
    title: "Natural Past Habits ('used to')",
    level: "A2",
    conceptEn: "Use 'used to' to talk about habits or states that were true in the past but are not true now.",
    conceptAm: "በእንግሊዝኛ ድሮ እናደርገው የነበረውን ግን አሁን ያቆምነውን ልምድ ለመግለጽ 'used to' እንጠቀማለን።",
    audioText: "I used to drink four cups of coffee every morning, but now I prefer tea.",
    commonTrap: {
      incorrect: "I am used to drink four cups of coffee.",
      correct: "I used to drink four cups of coffee.",
      whyAm: "የድሮ ልምድን ለመግለጽ 'used to' ከዋናው ግስ ጋር ያለ 'am/is/was' በቀጥታ ይገባል።",
    },
    question: "When Abebe lived in Hawassa, he ________ football every Sunday morning.",
    options: [
      "A) is used to play",
      "B) used to play",
      "C) was used to playing",
    ],
    correctIndex: 1,
    explanationAm: "'used to play' ትክክለኛ ምርጫ ነው፤ ምክንያቱም ድሮ የነበረን ልምድ ለመግለጽ 'used to' ከግሱ መደበኛ ቅርጽ (play) ጋር ያለ አጋዥ ግስ ይገባል።",
    speakingChallenge: "I used to wake up late, but now I exercise every morning.",
  },
  B1: {
    title: "Professional Workplace Disagreement",
    level: "B1",
    conceptEn: "In meetings, soften your disagreements using diplomatic phrases like 'I see your point, however...' instead of blunt statements.",
    conceptAm: "በስራ ቦታ ወይም በስብሰባ ላይ ከሰው ሀሳብ ጋር ካልተስማማን 'You are wrong' ከማለት ይልቅ 'I see your point, however...' በማለት በጨዋነት ሀሳባችንን መግለጽ ተመራጭ ነው።",
    audioText: "I see where you are coming from; however, looking at our project deadline, we should prioritize this feature first.",
    commonTrap: {
      incorrect: "Your idea is completely wrong.",
      correct: "I appreciate that idea; however, we might need a different approach.",
      whyAm: "ቀጥተኛ ተቃውሞ የስራ ግንኙነትን እንዳያበላሽ በቅድሚያ የሌላውን ሀሳብ አድንቀን 'however' በሚል ማያያዣ ሀሳባችንን እንሰጣለን።",
    },
    question: "What is the most professional way to disagree with a colleague's plan during a team meeting?",
    options: [
      "A) I reject your opinion completely.",
      "B) I see what you mean, but let's also consider our project budget.",
      "C) That is not true at all.",
    ],
    correctIndex: 1,
    explanationAm: "አማራጭ B የሌላውን ሰው ሀሳብ እውቅና ሰጥቶ በጨዋነት የራሱን ምክንያት ያቀርባል፤ ይህም የተዋጣለት የዲፕሎማሲያዊ ንግግር ነው።",
    speakingChallenge: "I appreciate that perspective; however, we might want to check the latest data first.",
  },
  B2: {
    title: "Thought-Chunking & Spoken Cadence",
    level: "B2",
    conceptEn: "Group your words into 3-4 word thought-chunks to speak with natural rhythm instead of pausing after every single word.",
    conceptAm: "በእንግሊዝኛ አቀላጥፈው ለመናገር ቃላትን አንድ በአንድ ከመቁጠር ይልቅ 3 ወይም 4 ቃላትን በአንድ ላይ አጣምረው (thought-chunk) ይናገሩ።",
    audioText: "To build on your point, I believe our engineering team can deliver this milestone ahead of schedule.",
    commonTrap: {
      incorrect: "I... think... that... we... can... finish... early.",
      correct: "[To build on your point,] [I believe our team] [can finish on time.]",
      whyAm: "ቃላትን በቡድን መናገር የንግግርን ቅልጥፍና (fluency) እና ማራኪነት በእጅጉ ይጨምራል።",
    },
    question: "Which response demonstrates natural thought-chunk cadence and professional confidence?",
    options: [
      "A) I am knowing what to do for this company.",
      "B) In my opinion, our marketing strategy has significantly increased customer engagement this quarter.",
      "C) The work is very good and I am understanding all things.",
    ],
    correctIndex: 1,
    explanationAm: "አማራጭ B የተሟላ የሀሳብ ቅንጅት፣ ተገቢ የቃላት አጠቃቀም እና ተፈጥሯዊ የንግግር ምት (cadence) አለው።",
    speakingChallenge: "From my perspective, this new strategy will streamline our daily operations.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Command Entry Point
// ─────────────────────────────────────────────────────────────────────────────

export const lessonCommand = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  // Centralized authentication & access verification
  const allowed = await checkCentralAuthAndAccess(ctx, 'lesson');
  if (!allowed) return;

  await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now() });

  try {
    await startLessonRecommendation(ctx);
  } catch (error) {
    console.error('Lesson command error:', error);
    await ctx.reply("❌ An error occurred while starting the lesson. Please try again later.");
  }
};

export interface AIWeaknessAnalysis {
  identifiedWeakness: string;
  recommendedTopic: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Personalized Topic Recommendation
// ─────────────────────────────────────────────────────────────────────────────

export const startLessonRecommendation = async (ctx: Context) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  if (ctx.chat?.id) {
    try { await ctx.api.sendChatAction(ctx.chat.id, 'typing'); } catch (e) {}
  }

  // Get user profile / diagnostic assessment from API
  let userLevel = 'B1';
  let primaryWeakness = 'Spoken Fluency & Grammar';

  try {
    const report = await apiService.getStudentMarakiLevel(userId);
    if (report?.cefrLevel && report.cefrLevel !== 'UNTESTED') {
      userLevel = report.cefrLevel;
    }
    if (report?.primaryWeakness) {
      primaryWeakness = report.primaryWeakness;
    }
  } catch (apiError) {
    console.warn('API not available, using default profile:', (apiError as Error).message);
  }

  const defaultTopicsByLevel: Record<string, { weakness: string; topic: string }> = {
    A1: { weakness: "መሰረታዊ የእለት ተእለት የውይይት አነጋገሮች", topic: "Ordering at a Cafe & Coffee" },
    A2: { weakness: "የድሮ ልምዶችን ያለምንም ስህተት መግለጽ", topic: "Natural Past Habits ('used to')" },
    B1: { weakness: "በስራ ቦታ ጨዋ እና ተፅዕኖ ፈጣሪ ንግግር ማድረግ", topic: "Professional Workplace Disagreement" },
    B2: { weakness: "ፈጣን እና የተሳለጠ የንግግር ምት (Thought-Chunking)", topic: "Thought-Chunking & Spoken Cadence" },
  };

  const defaultRec = defaultTopicsByLevel[userLevel] || defaultTopicsByLevel['B1'];

  let analysis: AIWeaknessAnalysis = {
    identifiedWeakness: defaultRec.weakness,
    recommendedTopic: defaultRec.topic,
  };

  // Save recommendation in user session
  await setSession(userId, {
    mode: 'lesson_awaiting_topic',
    timestamp: Date.now(),
    userLevel,
    recommendedTopic: analysis.recommendedTopic,
  });

  const keyboard = new InlineKeyboard()
    .text(`${analysis.recommendedTopic}`, `lesson_start_rec`)
    .row()
    .text(`የራሴን ርዕስ መርጬ ልማር`, `lesson_custom_input`);

  const messageText =
    `🎯 <b>የዛሬው የ5 ደቂቃ ማይክሮ-ትምህርት</b>\n\n` +
    `📈 <b>የእርስዎ ደረጃ፦</b> <code>${userLevel.toUpperCase()}</code>\n` +
    `🎯 <b>የትኩረት መስክ፦</b> <i>${analysis.identifiedWeakness}</i>\n` +
    `📚 <b>የተመረጠ ርዕስ፦</b> <b>${analysis.recommendedTopic}</b>\n\n` +
    `ለመጀመር ከታች ያለውን ይጫኑ 👇`;

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch {
      await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Generate and Send the 3-Beat Micro-Lesson (Audio + Quiz)
// ─────────────────────────────────────────────────────────────────────────────

export const generateAndSendLesson = async (ctx: Context, topic: string) => {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const session = await getSession(userId) || {};
  const userLevel = session.userLevel || 'B1';

  if (ctx.chat?.id) {
    try { await ctx.api.sendChatAction(ctx.chat.id, 'typing'); } catch (e) {}
  }

  let lessonData: InteractiveLessonJSON | null = null;

  try {
    const prompt = interactiveLessonPrompt
      .replace('{user_level}', userLevel)
      .replace('{topic}', topic)
      .replace('{conversation_context}', session.conversationContext || 'Focus on Ethiopian conversational context');

    const rawResponse = await callGeminiGenerateContent(prompt, 'complex');
    const cleanJson = rawResponse.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.title && parsed.question && Array.isArray(parsed.options) && parsed.options.length >= 3) {
      lessonData = parsed;
    }
  } catch (error) {
    console.warn('[Lesson] Dynamic generation failed or returned invalid format, using curated fallback:', error);
  }

  if (!lessonData) {
    lessonData = FALLBACK_MICRO_LESSONS[userLevel] || FALLBACK_MICRO_LESSONS['B1'];
    if (topic && topic !== lessonData.title) {
      lessonData = { ...lessonData, title: topic };
    }
  }

  // 1. Synthesize Audio Voice Note (TTS) for the model sentence
  if (lessonData.audioText) {
    try {
      const cleanText = lessonData.audioText.replace(/["'""'']/g, '').trim();
      const base64List = await googleTTS.getAllAudioBase64(cleanText, {
        lang: 'en',
        slow: false,
        timeout: 12000,
      });

      if (base64List && base64List.length > 0) {
        const buffers = base64List.map((item) => Buffer.from(item.base64, 'base64'));
        const fullAudioBuffer = Buffer.concat(buffers);
        await ctx.replyWithVoice(new InputFile(fullAudioBuffer, 'model_speech.mp3'));
      }
    } catch (e) {
      console.error('[Lesson] Failed to generate TTS audio:', e);
    }
  }

  // 2. Build Beat 1 (Concept Card) + Beat 2 (Interactive Quiz) Message
  const trapBlock = lessonData.commonTrap
    ? `\n⚠️ <b>የተለመደ ስህተት፦</b>\n` +
      `• ስህተት፦ <s>${lessonData.commonTrap.incorrect}</s>\n` +
      `• ትክክል፦ <b>${lessonData.commonTrap.correct}</b>\n` +
      `💡 <i>${lessonData.commonTrap.whyAm}</i>\n`
    : '';

  let messageText =
    `🎯 <b>${lessonData.title.toUpperCase()}</b>\n\n` +
    `• ${lessonData.conceptEn}\n` +
    `• <i>${lessonData.conceptAm}</i>\n` +
    trapBlock +
    `\n─────────────────────\n` +
    `🧠 <b>ፈጣን ጥያቄ (Quick Practice)፦</b>\n` +
    `<b>${lessonData.question}</b>\n\n`;

  lessonData.options.forEach((opt, idx) => {
    const letter = ['A', 'B', 'C'][idx] || `${idx + 1}`;
    const cleanOpt = opt.replace(/^[A-C]\)\s*/, '');
    messageText += `<b>${letter})</b> ${cleanOpt}\n`;
  });

  messageText += `\n<i>ትክክለኛውን መልስ ከታች ይምረጡ 👇</i>`;

  // 3. Inline Keyboard for Multiple Choice (NO SPOILERS!)
  const keyboard = new InlineKeyboard();
  lessonData.options.slice(0, 3).forEach((_, idx) => {
    const letter = ['A', 'B', 'C'][idx];
    keyboard.text(letter, `lesson_ans_${idx}`);
  });

  // Save active lesson to Redis for active recall answer validation
  await setSession(userId, {
    mode: 'lesson_interactive',
    timestamp: Date.now(),
    activeLesson: lessonData,
    lastLessonTopic: topic,
  });

  await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Handle Interactive Quiz Answer & Smart Feedback + Speaking Challenge
// ─────────────────────────────────────────────────────────────────────────────

export const handleLessonAnswer = async (ctx: Context, selectedOptionIndex: number) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const session = await getSession(userId);
  const activeLesson: InteractiveLessonJSON = session?.activeLesson;

  if (!activeLesson) {
    return ctx.reply("⚠️ የትምህርቱ ጊዜ አልቋል። እባክዎ አዲስ ትምህርት ለመጀመር /lesson ይጫኑ።");
  }

  const isCorrect = selectedOptionIndex === activeLesson.correctIndex;
  const selectedLetter = ['A', 'B', 'C'][selectedOptionIndex] || 'A';
  const correctLetter = ['A', 'B', 'C'][activeLesson.correctIndex] || 'B';

  const resultHeader = isCorrect
    ? `🎉 <b>ትክክል ነው! (Excellent Job!)</b>\n` +
      `ትክክለኛ መልስ፦ <b>${correctLetter})</b>\n\n`
    : `💡 <b>ትንሽ ተሳስተዋል! (Not Quite)</b>\n` +
      `የመረጡት፦ <s>${selectedLetter}</s> | ትክክለኛው መልስ፦ <b>${correctLetter})</b>\n\n`;

  const feedbackText =
    resultHeader +
    `📝 <b>ማብራሪያ (Why?):</b>\n` +
    `${activeLesson.explanationAm}\n\n` +
    `─────────────────────\n` +
    `🗣️ <b>የመናገር ልምምድ (Speaking Challenge)፦</b>\n` +
    `አሁን ይህን ዓረፍተ ነገር ጮክ ብለው ይናገሩ (ወይም ድምፅዎን ይቅረጹ)፦\n\n` +
    `🎙️ <i>"${activeLesson.speakingChallenge}"</i>\n\n` +
    `ያለምንም ፍርሃት አቀላጥፈው ማውራት እንዲችሉ ከማራኪ AI ጋር የቀጥታ የድምፅ ውይይት ያድርጉ! 🚀`;

  const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
  const keyboard = new InlineKeyboard();

  if (miniAppUrl.includes('t.me/')) {
    keyboard.url("🎙️ ከማራኪ ጋር በድምፅ ተለማመድ (Voice App)", miniAppUrl);
  } else {
    keyboard.webApp("🎙️ ከማራኪ ጋር በድምፅ ተለማመድ (Voice App)", miniAppUrl);
  }

  keyboard.row()
    .text("➡️ ቀጣይ ትምህርት", "lesson_next")
    .text("❓ ጥያቄ ጠይቅ", "lesson_followup_ask")
    .row()
    .text("🏠 ዋና ማውጫ", "back_to_main");

  // Save lesson to database in the background
  try {
    await apiService.addLesson(userId, {
      topic: activeLesson.title,
      details: `${activeLesson.conceptEn} - ${activeLesson.speakingChallenge}`,
      content: `${activeLesson.conceptEn}\n${activeLesson.conceptAm}`,
      createdAt: new Date(),
    });
  } catch (apiError) {
    console.warn('Could not save lesson progress to backend:', (apiError as Error).message);
  }

  // Update session to followup mode
  await setSession(userId, {
    mode: 'lesson_followup',
    timestamp: Date.now(),
    lastLessonContent: `${activeLesson.title}: ${activeLesson.conceptEn} (${activeLesson.conceptAm})`,
    lastLessonTopic: activeLesson.title,
  });

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(feedbackText, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch {
      await ctx.reply(feedbackText, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await ctx.reply(feedbackText, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// User Custom Topic Input or Agree to Recommend
// ─────────────────────────────────────────────────────────────────────────────

export const handleLessonResponse = async (ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userResponse = ctx.message.text.trim();
  const session = await getSession(userId) || {};

  let topicToUse = session.recommendedTopic || 'General English';

  if (
    userResponse.toLowerCase().includes('yes') || 
    userResponse.toLowerCase().includes('agree') || 
    userResponse.toLowerCase().includes('ok') ||
    userResponse.toLowerCase().includes('start')
  ) {
    topicToUse = session.recommendedTopic || 'General English';
  } else {
    topicToUse = userResponse;
  }

  await generateAndSendLesson(ctx, topicToUse);
};

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up Q&A about the Lesson
// ─────────────────────────────────────────────────────────────────────────────

export const handleLessonFollowup = async (ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const userQuestion = ctx.message.text.trim();

  try {
    const session = await getSession(userId);
    const lastLessonContent = session?.lastLessonContent || '';

    if (!lastLessonContent) {
      await ctx.reply("❌ የትምህርቱ መረጃ አልተገኘም። እባክዎ አዲስ ትምህርት ለመጀመር /lesson ይጫኑ።");
      return;
    }

    const prompt = lessonFollowupPrompt
      .replace('{lesson_content}', lastLessonContent)
      .replace('{user_question}', userQuestion);

    const answer = await callGeminiGenerateContent(prompt, 'complex');

    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
    const keyboard = new InlineKeyboard();

    if (miniAppUrl.includes('t.me/')) {
      keyboard.url("🎙️ ከማራኪ ጋር በድምፅ ተለማመድ (Voice App)", miniAppUrl);
    } else {
      keyboard.webApp("🎙️ ከማራኪ ጋር በድምፅ ተለማመድ (Voice App)", miniAppUrl);
    }

    keyboard.row()
      .text("➡️ ቀጣይ ትምህርት", "lesson_next")
      .text("❓ ሌላ ጥያቄ ጠይቅ", "lesson_followup_ask")
      .row()
      .text("🏠 ዋና ማውጫ", "back_to_main");

    try {
      await ctx.reply(answer, { reply_markup: keyboard, parse_mode: 'HTML' });
    } catch {
      await ctx.reply(answer.replace(/<[^>]*>/g, ''), { reply_markup: keyboard });
    }

  } catch (error) {
    console.error('Lesson follow-up error:', error);
    await ctx.reply("❌ ይቅርታ፣ ጥያቄዎን መመለስ አልተቻለም። እባክዎ እንደገና ይሞክሩ።");
  }
};
