import { InlineKeyboard, Keyboard, InputFile } from 'grammy';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { VoiceValidationService } from '../services/voice-validation.service.js';
import { DynamicAssessmentService } from '../services/dynamic-assessment.service.js';
import { apiService } from '../services/api.service.js';
import { getSession, setSession } from '../utils/redis.js';
import { getPhotoScorecard, getDetailedDiagnosisMessage, getFullTextMessage, getReportKeyboard, } from '../utils/report-formatter.util.js';
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let cachedListeningAudioFileId = null;
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
export async function assessmentCommand(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    // Check if student already has an assessment
    const existingLevel = await apiService.getStudentMarakiLevel(userId);
    const hasExisting = existingLevel && !existingLevel.needsAssessment && existingLevel.assessmentId !== 'unassessed';
    const introText = `🎯 <b>MARAKI ENGLISH ASSESSMENT</b> 🇪🇹\n\n` +
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
export async function startAssessmentSession(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    let loadingMsg = null;
    try {
        loadingMsg = await ctx.reply('⏳ <i>Preparing your personalized diagnostic assessment with AI...</i>', {
            parse_mode: 'HTML',
        });
    }
    catch (e) { }
    let questions = FALLBACK_QUESTIONS;
    try {
        const dynamicQuestions = await DynamicAssessmentService.generateWrittenQuestions();
        if (dynamicQuestions && dynamicQuestions.length >= 6) {
            // Q1 to Q8: Dynamic AI questions generated by Gemini
            // Q9 & Q10: Authentic listening dialogue questions
            const listeningQuestions = FALLBACK_QUESTIONS.filter((q) => q.skill === 'listening');
            questions = [...dynamicQuestions.slice(0, 8), ...listeningQuestions];
            console.log(`[Assessment] Generated ${questions.length} questions (8 dynamic + 2 listening) using Gemini`);
        }
        else {
            const apiQuestions = await apiService.getAssessmentQuestions();
            if (apiQuestions && Array.isArray(apiQuestions.questions) && apiQuestions.questions.length > 0) {
                questions = apiQuestions.questions;
            }
        }
    }
    catch (e) {
        console.warn('[Assessment] Dynamic generation failed, using standard questions:', e?.message || e);
    }
    // Delete loading message
    if (loadingMsg && ctx.chat) {
        try {
            await ctx.api.deleteMessage(ctx.chat.id, loadingMsg.message_id);
        }
        catch (e) { }
    }
    await setSession(userId, {
        mode: 'in_assessment',
        questionIndex: 0,
        totalQuestions: questions.length,
        questions,
        answers: {},
        startTime: Date.now(),
    });
    await renderQuestion(ctx, 0, questions);
}
/**
 * Render an assessment question with option buttons
 */
async function renderQuestion(ctx, index, questions) {
    if (index >= questions.length) {
        // All written questions finished; move to Speaking section
        await renderSpeakingPrompt(ctx);
        return;
    }
    const q = questions[index];
    const questionNumber = index + 1;
    const total = questions.length;
    const categoryEmoji = q.skill === 'grammar' ? '📝' : q.skill === 'vocabulary' ? '📚' : q.skill === 'reading' ? '📖' : '🎧';
    let messageText = `${categoryEmoji} <b>Question ${questionNumber} of ${total}</b> [${(q.skill || 'English').toUpperCase()}]\n\n`;
    if (q.readingPassage) {
        messageText += `📖 <b>Reading Passage:</b>\n<i>"${q.readingPassage}"</i>\n\n`;
    }
    messageText += `${q.prompt}\n\n`;
    const optionLetters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, optIdx) => {
        messageText += `<b>${optionLetters[optIdx]}.</b> ${opt}\n`;
    });
    messageText += `\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `💬 <b>Reply with:</b> Send <b>A</b>, <b>B</b>, <b>C</b>, or <b>D</b>`;
    // Provide Reply Keyboard so buttons are big, permanently visible above the phone chat bar
    const replyKeyboard = new Keyboard()
        .text('A').text('B').text('C').text('D')
        .row()
        .text('❌ Cancel Assessment')
        .resized();
    const isListeningQuestion = q.skill === 'listening' || Boolean(q.audioUrl);
    if (isListeningQuestion) {
        // 1. Clean up previous message keyboard so user doesn't double-tap old options
        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
            }
            catch (e) { }
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
                }
                catch (cacheErr) {
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
                let audioInput = null;
                if (audioPath) {
                    audioInput = new InputFile(audioPath);
                }
                else {
                    // Tier 2: Remote HTTP streaming fallback from backend API
                    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
                    const remoteAudioUrl = `${backendUrl.replace(/\/$/, '')}/api/assessment/audio/q9_listening.mp3`;
                    try {
                        console.log(`[Assessment] Local audio not found, streaming from backend: ${remoteAudioUrl}`);
                        const resp = await axios.get(remoteAudioUrl, { responseType: 'arraybuffer', timeout: 10000 });
                        if (resp.data && resp.data.byteLength > 0) {
                            audioInput = new InputFile(Buffer.from(resp.data), 'q9_listening.mp3');
                        }
                    }
                    catch (fetchErr) {
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
                }
                else {
                    console.error('[Assessment] CRITICAL: No audio file found locally or remotely for listening question!');
                }
            }
        }
        catch (err) {
            console.error('Failed to send audio clip:', err);
        }
        // 3. Send question prompt with options directly below the audio
        await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: replyKeyboard });
        return;
    }
    // Send question prompt with options and Reply Keyboard
    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: replyKeyboard });
}
/**
 * Handle user choosing an option
 */
export async function handleAssessmentAnswer(ctx, qIndex, optIndex) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    if (!session || session.mode !== 'in_assessment') {
        return ctx.reply('⚠️ Assessment session timed out. Tap /assessment to restart.', {
            reply_markup: { remove_keyboard: true },
        });
    }
    let questions = session.questions && session.questions.length > 0 ? session.questions : FALLBACK_QUESTIONS;
    if (!session.questions) {
        try {
            const apiQuestions = await apiService.getAssessmentQuestions();
            if (apiQuestions && Array.isArray(apiQuestions.questions) && apiQuestions.questions.length > 0) {
                questions = apiQuestions.questions;
            }
        }
        catch (e) { }
    }
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
async function renderSpeakingPrompt(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    if (session) {
        session.mode = 'assessment_awaiting_voice';
        await setSession(userId, session);
    }
    // Clean up Reply Keyboard so mobile microphone button is completely unobstructed
    await ctx.reply('✅ <b>Written diagnostic complete!</b> Moving to speaking evaluation...', {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
    });
    const speakingText = `🎙️ <b>FINAL STEP: Spoken English Diagnostic</b>\n\n` +
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
        }
        catch (e) {
            await ctx.reply(speakingText, { parse_mode: 'HTML', reply_markup: keyboard });
        }
    }
    else {
        await ctx.reply(speakingText, { parse_mode: 'HTML', reply_markup: keyboard });
    }
}
/**
 * Handle speaking voice note submitted via Telegram
 */
export async function handleAssessmentVoiceSubmission(ctx) {
    if (!ctx.from || !ctx.message?.voice)
        return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    if (!session || session.mode !== 'assessment_awaiting_voice') {
        return; // Not in assessment voice mode
    }
    const voice = ctx.message.voice;
    const durationSeconds = voice.duration || 30;
    const statusMsg = await ctx.reply('⏳ <i>Analyzing your voice note with Gemini AI (verifying language, speech clarity & fluency)...</i>', { parse_mode: 'HTML' });
    // Download Telegram voice note
    let audioBuffer = null;
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
    }
    catch (err) {
        console.warn('[AssessmentVoice] Could not download voice file:', err?.message);
    }
    let validation;
    if (audioBuffer) {
        validation = await VoiceValidationService.validateSpeakingAudio(audioBuffer, 'audio/ogg', durationSeconds);
    }
    else {
        // If download failed or duration is too short
        if (durationSeconds < 5) {
            validation = {
                isValid: false,
                reason: 'too_short',
                userMessageEn: 'Your voice recording was too short to evaluate. Please record for at least 15–30 seconds.',
                userMessageAm: 'የድምፅ መልእክትዎ በጣም አጭር ነው። እባክዎ ቢያንስ ለ15-30 ሰከንዶች በእንግሊዝኛ ይናገሩ።',
            };
        }
        else {
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
            await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
        }
        catch (e) { }
        const errorIcon = validation.reason === 'non_english' ? '🇪🇹' : validation.reason === 'too_short' ? '⏱️' : '🔇';
        const errorTitle = validation.reason === 'non_english'
            ? '<b>English Speech Required / እንግሊዝኛ ያስፈልጋል</b>'
            : validation.reason === 'too_short'
                ? '<b>Recording Too Short / መልእክትዎ በጣም አጭር ነው</b>'
                : '<b>No Speech Detected / ምንም ድምፅ አልተሰማም</b>';
        const retryKeyboard = new InlineKeyboard()
            .text('⏭️ Skip Speaking (Written Score Only)', 'assess_skip_voice')
            .row();
        await ctx.reply(`${errorIcon} ${errorTitle}\n\n` +
            `${validation.userMessageEn}\n\n` +
            `🇪🇹 <i>${validation.userMessageAm}</i>\n\n` +
            `👇 <b>Hold down your Telegram microphone button to record again in English!</b>`, { parse_mode: 'HTML', reply_markup: retryKeyboard });
        // Keep session mode in 'assessment_awaiting_voice' so the learner can retry
        return;
    }
    // Clear assessment session mode upon valid submission
    await setSession(userId, { mode: null, timestamp: Date.now() });
    const payload = {
        telegramId: userId,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username,
        answers: session.answers || {},
        questions: session.questions || undefined,
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
            await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
        }
        catch (e) { }
        await sendMarakiLevelReport(ctx, report);
    }
    catch (error) {
        console.error('Failed to submit assessment:', error?.message);
        await ctx.reply('⚠️ Error finalizing assessment. Please try /assessment again.');
    }
}
/**
 * Handle skipping speaking test
 */
export async function skipAssessmentVoice(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    const statusMsg = await ctx.reply('⏳ <i>Calculating your Maraki Level...</i>', { parse_mode: 'HTML' });
    await setSession(userId, { mode: null, timestamp: Date.now() });
    const payload = {
        telegramId: userId,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username,
        answers: session?.answers || {},
        questions: session?.questions || undefined,
        speaking: null,
        durationSeconds: Math.round((Date.now() - (session?.startTime || Date.now())) / 1000),
    };
    try {
        const report = await apiService.submitAssessment(payload);
        try {
            await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
        }
        catch (e) { }
        await sendMarakiLevelReport(ctx, report);
    }
    catch (error) {
        console.error('Failed to submit assessment:', error?.message);
        await ctx.reply('⚠️ Error finalizing assessment. Please try /assessment again.');
    }
}
/**
 * Format and send the killer feature: "🎯 YOUR MARAKI LEVEL" Card
 */
/**
 * Format and send the killer feature: "🎯 MARAKI LEVEL REPORT" Card with Doctor's Diagnosis & Prescription
 */
export async function sendMarakiLevelReport(ctx, report) {
    if (!report) {
        return ctx.reply('⚠️ Could not generate Maraki Level report. Try again with /level.');
    }
    const levelName = report.cefrLevel || 'B1';
    const overall = report.overallScore || 55;
    const skills = report.skills || { vocabulary: 55, grammar: 55, reading: 55, listening: 55, speaking: null };
    const speakingScoreNum = typeof skills?.speaking === 'number' ? skills.speaking : Number(skills?.speaking);
    const isSpeakingTested = Boolean(report.speakingTested !== false &&
        skills?.speaking !== null &&
        skills?.speaking !== undefined &&
        !isNaN(speakingScoreNum));
    const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Learner';
    const credId = `MRK-2026-${ctx.from?.id?.toString().slice(-4) || '0000'}`;
    const userId = ctx.from?.id || 'unknown';
    const keyboard = getReportKeyboard({ isAssessed: true, speakingTested: isSpeakingTested });
    // Dynamically generate personalized report image with user's name & Maraki brand colors
    const userCertPath = path.resolve('/tmp', `cert_${userId}.png`);
    let imageGenerated = false;
    try {
        const candidateScriptPaths = [
            path.resolve(process.cwd(), 'scripts/generate_certificate.py'),
            path.resolve(__dirname, '../../scripts/generate_certificate.py'),
            '/home/million/Documents/testing/bot/scripts/generate_certificate.py',
        ];
        const script = candidateScriptPaths.find((p) => fs.existsSync(p));
        if (script) {
            await execFileAsync('python3', [
                script,
                '--name', fullName,
                '--level', levelName,
                '--score', overall.toString(),
                '--vocab', (skills.vocabulary || 55).toString(),
                '--grammar', (skills.grammar || 55).toString(),
                '--reading', (skills.reading || 55).toString(),
                '--listening', (skills.listening || 55).toString(),
                '--speaking', (skills.speaking || 55).toString(),
                '--cred_id', credId,
                '--output', userCertPath,
            ]);
            imageGenerated = fs.existsSync(userCertPath);
        }
    }
    catch (err) {
        console.error('Dynamic report generation error:', err);
    }
    const photoCaption = getPhotoScorecard(report, fullName, credId);
    const detailedDiagnosis = getDetailedDiagnosisMessage(report);
    if (imageGenerated) {
        try {
            await ctx.replyWithPhoto(new InputFile(userCertPath), {
                caption: photoCaption,
                parse_mode: 'HTML',
            });
            // Send the clinical doctor's diagnosis & prescription message with interactive keyboard
            await ctx.reply(detailedDiagnosis, {
                parse_mode: 'HTML',
                reply_markup: keyboard,
            });
            return;
        }
        catch (err) {
            console.error('Failed to send report photo sequence:', err);
        }
    }
    // Fallback to unified comprehensive text message
    const fullText = getFullTextMessage(report, fullName, credId);
    await ctx.reply(fullText, { parse_mode: 'HTML', reply_markup: keyboard });
}
