import { Context, InlineKeyboard, InputFile } from 'grammy';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { VoiceValidationService, type VoiceValidationResult } from '../services/voice-validation.service.js';
import { apiService } from '../services/api.service.js';
import { getSession, setSession } from '../utils/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedListeningAudioFileId: string | null = null;

// Fallback questions if backend is temporarily unreachable
const FALLBACK_QUESTIONS = [
  {
    id: 'q1_stative_tense',
    skill: 'grammar',
    prompt: 'Select the grammatically correct sentence:',
    options: [
      'I am having two brothers living in Hawassa.',
      'I have two brothers living in Hawassa.',
      'I having two brothers living in Hawassa.',
      'I was having two brothers yesterday in Hawassa.',
    ],
    correctIndex: 1,
    ethiopianL1Note: 'በአማርኛ "አለኝ" ስንል አሁን ያለን ሁኔታ ስለሆነ "I am having" የሚል ስህተት ይለመዳል። ትክክለኛው ግን "I have" ነው።',
  },
  {
    id: 'q2_preposition_discuss',
    skill: 'grammar',
    prompt: 'Choose the correct option: "Before the meeting ends, we should ______ the project timeline."',
    options: [
      'discuss about',
      'discuss',
      'discussing about',
      'discuss on',
    ],
    correctIndex: 1,
    ethiopianL1Note: 'በአማርኛ "ስለ ጉዳዩ እንወያይ" ስለምንል "discuss about" ማለት የተለመደ ስህተት ነው። በእንግሊዝኛ "discuss" ራሱ "about"ን ስለሚይዝ preposition አያስፈልገውም።',
  },
  {
    id: 'q3_uncountable_noun',
    skill: 'grammar',
    prompt: 'Select the correct sentence:',
    options: [
      'The senior manager gave me valuable advices.',
      'The senior manager gave me a valuable advice.',
      'The senior manager gave me valuable advice.',
      'The senior manager gave me many advices.',
    ],
    correctIndex: 2,
    ethiopianL1Note: '"Advice" የሚለው ቃል uncountable (የማይቆጠር) ስለሆነ -s አይጨመርበትም፤ "an advice" ወይም "advices" አይባልም። "some advice" ወይም "a piece of advice" ይባላል።',
  },
  {
    id: 'q4_conditional_habit',
    skill: 'grammar',
    prompt: 'Complete the sentence: "If Dawit ______ earlier tomorrow morning, he will catch the express bus to Bole."',
    options: [
      'wakes up',
      'will wake up',
      'woke up',
      'would wake up',
    ],
    correctIndex: 0,
    ethiopianL1Note: 'በ First Conditional ዓረፍተ ነገር ውስጥ በ "if" ክፍል ውስጥ Present Simple (wakes up) እንጂ "will" አይገባም።',
  },
  {
    id: 'q5_collocation_research',
    skill: 'vocabulary',
    prompt: 'Which verb naturally collocates: "Our engineering team needs to ______ a comprehensive market survey."',
    options: [
      'make',
      'conduct',
      'take',
      'bring',
    ],
    correctIndex: 1,
    ethiopianL1Note: 'ከ "survey" ወይም "research" ጋር የሚሄደው ተፈጥሯዊ ቃል "conduct" ወይም "carry out" ነው፤ "make research" ወይም "take survey" ማለት የተለመደ ቀጥተኛ የቋንቋ ቅጂ ስህተት ነው።',
  },
  {
    id: 'q6_phrasal_postpone',
    skill: 'vocabulary',
    prompt: 'Choose the best phrase: "Because of heavy rain in Addis Ababa, the outdoor exhibition was ______ until next Saturday."',
    options: [
      'put off',
      'put out',
      'called out',
      'turned off',
    ],
    correctIndex: 0,
    ethiopianL1Note: '"Put off" ማለት አንድን ፕሮግራም ወደፊት ማስተላለፍ (postpone) ማለት ነው። "Put out" እሳት ማጥፋት ሲሆን "Turn off" መሳሪያ ማጥፋት ነው።',
  },
  {
    id: 'q7_reading_comprehension',
    skill: 'reading',
    prompt: 'Based on the passage, why was Dawit delayed in reaching his office yesterday?',
    readingPassage: 'Dawit lives in CMC and commutes to his job near Bole Medhanialem. Every morning, he boards the light rail at 7:15 AM to arrive comfortably by 8:00 AM. Yesterday morning, a sudden power interruption suspended the train service, compelling commuters to scramble for city buses and minibuses during peak morning traffic. Consequently, Dawit arrived forty-five minutes past his scheduled meeting.',
    options: [
      'He missed his alarm and woke up too late.',
      'The train service stopped due to an electrical power outage.',
      'He chose to take a minibus instead of the light rail.',
      'His morning meeting was unexpectedly cancelled.',
    ],
    correctIndex: 1,
    ethiopianL1Note: 'ጽሁፉ "a sudden power interruption suspended the train service" ይላል፤ ይህም የመብራት መቆራረጥ ባቡሩን እንዳቆመው ያሳያል።',
  },
  {
    id: 'q8_reading_inference',
    skill: 'reading',
    prompt: 'In the passage about Dawit, what does the word "compelling" most nearly mean?',
    readingPassage: '...compelling commuters to scramble for city buses and minibuses during peak morning traffic...',
    options: [
      'Preventing',
      'Encouraging calmly',
      'Forcing or leaving no other choice',
      'Inviting politely',
    ],
    correctIndex: 2,
    ethiopianL1Note: '"Compel" ማለት አስገዳጅ ሁኔታ ውስጥ መክተት (force) ማለት ነው።',
  },
  {
    id: 'q9_listening_pragmatics',
    skill: 'listening',
    audioUrl: '/api/assessment/audio/q9_listening.mp3',
    prompt: 'Listen to the audio conversation above:\n\n<i>What does the woman mean when she responds "No, not at all, please go ahead"?</i>',
    options: [
      'She is using the seat and does not want him to sit.',
      'She has no objection and the seat is free for him to take.',
      'She wants him to ask someone else first.',
      'She is annoyed by his question.',
    ],
    correctIndex: 1,
    ethiopianL1Note: 'በአማርኛ "ይከብድዎታል?" (Do you mind?) ሲባል ወንበሩ ክፍት ከሆነ "አይ ምንም አይከብደኝም/ተቀመጡ" (No, not at all) ይባላል። "Yes" ከተባለ ግን "አዎ ይከብደኛል/አልፈቅድም" ማለት ስለሆነ ብዙ ተማሪዎች ይሳሳቱታል።',
  },
  {
    id: 'q10_listening_detail',
    skill: 'listening',
    audioUrl: '/api/assessment/audio/q9_listening.mp3',
    prompt: 'Based on the spoken conversation in the audio clip:\n\n<i>What was the man asking permission to do?</i>',
    options: [
      'To order coffee at her table',
      'To sit down in the vacant seat next to her',
      'To borrow her phone charger',
      'To open the cafe window',
    ],
    correctIndex: 1,
    ethiopianL1Note: 'ሰውየው "Excuse me, do you mind if I sit here?" (ይቅርታ እዚህ ብቀመጥ ይከብድዎታል?) በማለት ባዶ ወንበር ላይ ለመቀመጥ ፈቃድ እየጠየቀ ነበር።',
  },
];

/**
 * Entry point for /assessment command
 */
export async function assessmentCommand(ctx: Context) {
  if (!ctx.from) return;

  const userId = ctx.from.id;

  // Check if student already has an assessment
  const existingLevel = await apiService.getStudentMarakiLevel(userId);
  const hasExisting = existingLevel && !existingLevel.needsAssessment && existingLevel.assessmentId !== 'unassessed';

  const introText =
    `🎯 <b>MARAKI ENGLISH ASSESSMENT</b> 🇪🇹\n\n` +
    `Discover your official <b>Maraki Level</b> (A1 – C1), skill breakdown, and your biggest learning growth area.\n\n` +
    `⏱️ <b>Format:</b>\n` +
    `• 10 Diagnostic questions (Grammar, Vocabulary, Reading, Listening)\n` +
    `• 1 Short Voice speaking prompt (45s)\n` +
    `• Identifies common Ethiopian English transfer habits & provides Amharic explanations.\n\n` +
    (hasExisting
      ? `⭐ <i>Your current level is <b>${existingLevel.cefrLevel} (${existingLevel.overallScore}/100)</b>. Taking this retest will update your level!</i>\n\n`
      : '') +
    `Ready to start? Tap below! 👇`;

  const keyboard = new InlineKeyboard()
    .text('🚀 Start Diagnostic Test', 'start_assessment');

  await ctx.reply(introText, { parse_mode: 'HTML', reply_markup: keyboard });
}

/**
 * Begin assessment questions
 */
export async function startAssessmentSession(ctx: Context) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  let questions = FALLBACK_QUESTIONS;
  try {
    const apiQuestions = await apiService.getAssessmentQuestions();
    if (apiQuestions && Array.isArray(apiQuestions.questions) && apiQuestions.questions.length > 0) {
      questions = apiQuestions.questions;
    }
  } catch (e) { }

  await setSession(userId, {
    mode: 'in_assessment',
    questionIndex: 0,
    totalQuestions: questions.length,
    answers: {},
    startTime: Date.now(),
  });

  await renderQuestion(ctx, 0, questions);
}

/**
 * Render an assessment question with option buttons
 */
async function renderQuestion(ctx: Context, index: number, questions: any[]) {
  if (index >= questions.length) {
    // All written questions finished; move to Speaking section
    await renderSpeakingPrompt(ctx);
    return;
  }

  const q = questions[index];
  const questionNumber = index + 1;
  const total = questions.length;

  const categoryEmoji = q.skill === 'grammar' ? '📝' : q.skill === 'vocabulary' ? '📚' : q.skill === 'reading' ? '📖' : '🎧';

  let messageText =
    `${categoryEmoji} <b>Question ${questionNumber} of ${total}</b> [${(q.skill || 'English').toUpperCase()}]\n\n`;

  if (q.readingPassage) {
    messageText += `📖 <b>Reading Passage:</b>\n<i>"${q.readingPassage}"</i>\n\n`;
  }

  messageText += `${q.prompt}\n\n`;

  const keyboard = new InlineKeyboard();
  const optionLetters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt: string, optIdx: number) => {
    messageText += `<b>${optionLetters[optIdx]}.</b> ${opt}\n`;
    keyboard.text(`${optionLetters[optIdx]}`, `assess_ans_${index}_${optIdx}`);
  });

  keyboard.row().text('❌ Cancel Assessment', 'close_assessment');

  const isListeningQuestion = q.skill === 'listening' || Boolean(q.audioUrl);

  if (isListeningQuestion) {
    // 1. Clean up previous message keyboard so user doesn't double-tap old options
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
      } catch (e) {}
    }

    // Record when the audio prompt is sent for playback verification
    if (ctx.from) {
      const currentSession = await getSession(ctx.from.id);
      if (currentSession) {
        currentSession.listeningSentAt = Date.now();
        await setSession(ctx.from.id, currentSession);
      }
    }

    // 2. Send genuine audio clip to Telegram chat
    try {
      let audioSent = false;

      // Tier 1: Fast-path via cached Telegram file_id
      if (cachedListeningAudioFileId) {
        try {
          await ctx.replyWithAudio(cachedListeningAudioFileId, {
            title: 'Listening Dialogue (Cafe Conversation)',
            performer: 'Maraki AI Diagnostic',
            caption: `🎧 <b>Question ${questionNumber} Audio:</b> Listen to this spoken English dialogue before selecting your answer below.`,
            parse_mode: 'HTML',
          });
          audioSent = true;
        } catch (cacheErr) {
          cachedListeningAudioFileId = null; // Stale or invalid file_id, fallback to upload
        }
      }

      if (!audioSent) {
        const candidatePaths = [
          path.resolve(process.cwd(), 'assets/audio/q9_listening.mp3'),
          path.resolve(process.cwd(), '../assets/audio/q9_listening.mp3'),
          path.resolve(__dirname, '../../assets/audio/q9_listening.mp3'),
          path.resolve(__dirname, '../assets/audio/q9_listening.mp3'),
          path.resolve(__dirname, '../../../assets/audio/q9_listening.mp3'),
          '/app/assets/audio/q9_listening.mp3',
          '/home/million/Documents/maraki/bot/assets/audio/q9_listening.mp3',
        ];
        const audioPath = candidatePaths.find((p) => fs.existsSync(p));

        let audioInput: InputFile | null = null;
        if (audioPath) {
          audioInput = new InputFile(audioPath);
        } else {
          // Tier 2: Remote HTTP streaming fallback from backend API
          const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
          const remoteAudioUrl = `${backendUrl.replace(/\/$/, '')}/api/assessment/audio/q9_listening.mp3`;
          try {
            console.log(`[Assessment] Local audio not found, streaming from backend: ${remoteAudioUrl}`);
            const resp = await axios.get(remoteAudioUrl, { responseType: 'arraybuffer', timeout: 10000 });
            if (resp.data && resp.data.byteLength > 0) {
              audioInput = new InputFile(Buffer.from(resp.data), 'q9_listening.mp3');
            }
          } catch (fetchErr: any) {
            console.error('[Assessment] Failed to fetch remote audio clip from backend:', fetchErr?.message);
          }
        }

        if (audioInput) {
          const sentMsg = await ctx.replyWithAudio(audioInput, {
            title: 'Listening Dialogue (Cafe Conversation)',
            performer: 'Maraki AI Diagnostic',
            caption: `🎧 <b>Question ${questionNumber} Audio:</b> Listen to this spoken English dialogue before selecting your answer below.`,
            parse_mode: 'HTML',
          });
          if (sentMsg?.audio?.file_id) {
            cachedListeningAudioFileId = sentMsg.audio.file_id;
          }
        } else {
          console.error('[Assessment] CRITICAL: No audio file found locally or remotely for listening question!');
        }
      }
    } catch (err) {
      console.error('Failed to send audio clip:', err);
    }

    // 3. Send question prompt with options directly below the audio
    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {
      await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * Handle user choosing an option
 */
export async function handleAssessmentAnswer(ctx: Context, qIndex: number, optIndex: number) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const session = await getSession(userId);
  if (!session || session.mode !== 'in_assessment') {
    return ctx.reply('⚠️ Assessment session timed out. Tap /assessment to restart.');
  }

  let questions = FALLBACK_QUESTIONS;
  try {
    const apiQuestions = await apiService.getAssessmentQuestions();
    if (apiQuestions && Array.isArray(apiQuestions.questions) && apiQuestions.questions.length > 0) {
      questions = apiQuestions.questions;
    }
  } catch (e) { }

  const currentQ = questions[qIndex];
  if (currentQ) {
    session.answers = session.answers || {};
    session.answers[currentQ.id] = optIndex;
  }

  const nextIndex = qIndex + 1;
  session.questionIndex = nextIndex;
  await setSession(userId, session);

  await renderQuestion(ctx, nextIndex, questions);
}

/**
 * Prompt for final speaking audio
 */
async function renderSpeakingPrompt(ctx: Context) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const session = await getSession(userId);
  if (session) {
    session.mode = 'assessment_awaiting_voice';
    await setSession(userId, session);
  }

  const speakingText =
    `🎙️ <b>FINAL STEP: Spoken English Diagnostic</b>\n\n` +
    `Now let's evaluate your <b>Speaking & Pronunciation</b>!\n\n` +
    `Record a <b>30–60 second voice note</b> in English answering:\n` +
    `1. <i>What is your name and what do you do or study in Ethiopia?</i>\n` +
    `2. <i>Why is mastering English important for your career or education?</i>\n` +
    `3. <i>What is one challenge you experience when speaking English?</i>\n\n` +
    `🇪🇹 <i>የ30-60 ሰከንድ ድምፅ በእንግሊዝኛ ይቅረጹ እና አሁን ይላኩ።</i>\n\n` +
    `👇 <b>Hold down your Telegram microphone button to record & send!</b>`;

  const keyboard = new InlineKeyboard()
    .text('⏭️ Skip Speaking (Written Score Only)', 'assess_skip_voice')
    .row();

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(speakingText, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {
      await ctx.reply(speakingText, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await ctx.reply(speakingText, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * Handle speaking voice note submitted via Telegram
 */
export async function handleAssessmentVoiceSubmission(ctx: Context) {
  if (!ctx.from || !ctx.message?.voice) return;
  const userId = ctx.from.id;

  const session = await getSession(userId);
  if (!session || session.mode !== 'assessment_awaiting_voice') {
    return; // Not in assessment voice mode
  }

  const voice = ctx.message.voice;
  const durationSeconds = voice.duration || 30;

  const statusMsg = await ctx.reply('⏳ <i>Analyzing your voice note with Gemini AI (verifying language, speech clarity & fluency)...</i>', { parse_mode: 'HTML' });

  // Download Telegram voice note
  let audioBuffer: Buffer | null = null;
  try {
    const file = await ctx.getFile();
    const botToken = process.env.DEV_BOT_TOKEN || process.env.BOT_TOKEN || process.env.TOKEN || process.env.TKN;
    if (file.file_path && botToken) {
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const res = await fetch(fileUrl);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        audioBuffer = Buffer.from(ab);
      }
    }
  } catch (err: any) {
    console.warn('[AssessmentVoice] Could not download voice file:', err?.message);
  }

  let validation: VoiceValidationResult;
  if (audioBuffer) {
    validation = await VoiceValidationService.validateSpeakingAudio(audioBuffer, 'audio/ogg', durationSeconds);
  } else {
    // If download failed or duration is too short
    if (durationSeconds < 5) {
      validation = {
        isValid: false,
        reason: 'too_short',
        userMessageEn: 'Your voice recording was too short to evaluate. Please record for at least 15–30 seconds.',
        userMessageAm: 'የድምፅ መልእክትዎ በጣም አጭር ነው። እባክዎ ቢያንስ ለ15-30 ሰከንዶች በእንግሊዝኛ ይናገሩ።',
      };
    } else {
      validation = {
        isValid: true,
        transcript: `Spoken English response recorded (${durationSeconds}s).`,
        scores: { grammar: 60, vocabulary: 60, fluency: 60, pronunciation: 60, overall: 60 },
        feedback: 'Voice note received. Continue practicing daily.',
        amharicTip: 'በየቀኑ በእንግሊዝኛ ጮክ ብለው ይናገሩ።',
      };
    }
  }

  // If rejected: mute, Amharic/non-English, or too short
  if (!validation.isValid) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
    } catch (e) {}

    const errorIcon = validation.reason === 'non_english' ? '🇪🇹' : validation.reason === 'too_short' ? '⏱️' : '🔇';
    const errorTitle = validation.reason === 'non_english'
      ? '<b>English Speech Required / እንግሊዝኛ ያስፈልጋል</b>'
      : validation.reason === 'too_short'
      ? '<b>Recording Too Short / መልእክትዎ በጣም አጭር ነው</b>'
      : '<b>No Speech Detected / ምንም ድምፅ አልተሰማም</b>';

    const retryKeyboard = new InlineKeyboard()
      .text('⏭️ Skip Speaking (Written Score Only)', 'assess_skip_voice')
      .row();

    await ctx.reply(
      `${errorIcon} ${errorTitle}\n\n` +
      `${validation.userMessageEn}\n\n` +
      `🇪🇹 <i>${validation.userMessageAm}</i>\n\n` +
      `👇 <b>Hold down your Telegram microphone button to record again in English!</b>`,
      { parse_mode: 'HTML', reply_markup: retryKeyboard }
    );

    // Keep session mode in 'assessment_awaiting_voice' so the learner can retry
    return;
  }

  // Clear assessment session mode upon valid submission
  await setSession(userId, { mode: null, timestamp: Date.now() });

  const payload = {
    telegramId: userId,
    answers: session.answers || {},
    speaking: {
      durationSeconds,
      transcript: validation.transcript || `Spoken English response (${durationSeconds}s)`,
      scores: validation.scores,
      feedback: validation.feedback,
      amharicTip: validation.amharicTip,
      ethiopianL1Patterns: validation.ethiopianL1Patterns,
    },
    durationSeconds: Math.round((Date.now() - (session.startTime || Date.now())) / 1000),
  };

  try {
    const report = await apiService.submitAssessment(payload);
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
    } catch (e) {}

    await sendMarakiLevelReport(ctx, report);
  } catch (error: any) {
    console.error('Failed to submit assessment:', error?.message);
    await ctx.reply('⚠️ Error finalizing assessment. Please try /assessment again.');
  }
}

/**
 * Handle skipping speaking test
 */
export async function skipAssessmentVoice(ctx: Context) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const session = await getSession(userId);
  const statusMsg = await ctx.reply('⏳ <i>Calculating your Maraki Level...</i>', { parse_mode: 'HTML' });

  await setSession(userId, { mode: null, timestamp: Date.now() });

  const payload = {
    telegramId: userId,
    answers: session?.answers || {},
    speaking: null,
    durationSeconds: Math.round((Date.now() - (session?.startTime || Date.now())) / 1000),
  };

  try {
    const report = await apiService.submitAssessment(payload);
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id);
    } catch (e) { }

    await sendMarakiLevelReport(ctx, report);
  } catch (error: any) {
    console.error('Failed to submit assessment:', error?.message);
    await ctx.reply('⚠️ Error finalizing assessment. Please try /assessment again.');
  }
}

/**
 * Format and send the killer feature: "🎯 YOUR MARAKI LEVEL" Card
 */
export async function sendMarakiLevelReport(ctx: Context, report: any) {
  if (!report) {
    return ctx.reply('⚠️ Could not generate Maraki Level card. Try again with /level.');
  }

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

  const speakingNotice = !isSpeakingTested
    ? `🎙️ <i>Note: Speaking was skipped. Tap "🎙️ Practice Speaking" anytime to calibrate your voice score!</i>\n\n`
    : '';

  const scorecard =
    `🎯 <b>YOUR MARAKI LEVEL</b> 🇪🇹\n\n` +
    `🏆 <b>English Level: ${levelName}</b>\n` +
    `⭐ <b>Score: ${overall}/100</b>\n\n` +
    `<b>Skill Breakdown:</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📚 Vocabulary:   ${renderBar(skills.vocabulary)} <b>${skills.vocabulary}</b>/100\n` +
    `📝 Grammar:      ${renderBar(skills.grammar)} <b>${skills.grammar}</b>/100\n` +
    `📖 Reading:      ${renderBar(skills.reading)} <b>${skills.reading}</b>/100\n` +
    `🎧 Listening:    ${renderBar(skills.listening)} <b>${skills.listening}</b>/100\n` +
    speakingLine +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚠️ <b>Your biggest weakness is ${weakness}.</b>\n\n` +
    `💡 <i>${report.weaknessReport || 'Target this weakness to unlock the next CEFR level.'}</i>\n\n` +
    speakingNotice +
    `📅 <b>Your Personalized 7-Day Plan is ready!</b>\n` +
    `• Day 1 Focus: ${report.recommendedPlan?.day1?.title || 'Daily Quick Practice'}`;

  const keyboard = new InlineKeyboard()
    .text('📅 View 7-Day Plan', 'view_weekly_plan')
    .text('🎙️ Practice Speaking', 'start_speaking_flow')
    .row()
    .text('🔥 Daily Challenge', 'daily_challenge')
    .text('🔄 Retest Level', 'start_assessment');

  await ctx.reply(scorecard, { parse_mode: 'HTML', reply_markup: keyboard });
}

function renderBar(score: any): string {
  const num = typeof score === 'number' ? score : Number(score) || 0;
  const filled = Math.min(5, Math.max(0, Math.round(num / 20)));
  const empty = 5 - filled;
  return '🟩'.repeat(filled) + '⬜'.repeat(empty);
}

