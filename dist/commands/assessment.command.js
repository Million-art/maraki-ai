import { InlineKeyboard, Keyboard, InputFile } from 'grammy';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as googleTTS from 'google-tts-api';
import { VoiceValidationService } from '../services/voice-validation.service.js';
import { apiService } from '../services/api.service.js';
import { getSession, setSession } from '../utils/redis.js';
import { getPhotoScorecard, getDetailedDiagnosisMessage, getFullTextMessage, getReportKeyboard, } from '../utils/report-formatter.util.js';
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 3 High-Signal Audio-First & Error Trap Questions (No Boring Reading!)
const FALLBACK_QUESTIONS = [
    {
        id: 'q1_listening_pragmatics',
        skill: 'listening',
        listeningScript: 'Excuse me, do you mind if I sit here? No, not at all, please go ahead.',
        prompt: 'Listen to the audio dialogue above:\n\n<i>What does the speaker mean when she responds "No, not at all, please go ahead"?</i>',
        options: [
            'She is using the seat and does not want him to sit.',
            'She has no objection and the seat is free for him to take.',
            'She wants him to ask someone else first.',
            'She is annoyed by his question.',
        ],
        correctIndex: 1,
        ethiopianL1Note: 'በአማርኛ "ይከብድዎታል?" (Do you mind?) ሲባል "No, not at all" ማለት "አይ ምንም አይከብደኝም/ተቀመጡ" ማለት ነው፤ "Yes" ከተባለ ግን "አልፈቅድም" ማለት ነው።',
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
        id: 'q3_collocation_research',
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
];
/**
 * Entry point for /assessment command
 */
export async function assessmentCommand(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    // Check if student already has an assessment
    let existingLevel = null;
    try {
        existingLevel = await apiService.getStudentMarakiLevel(userId);
    }
    catch (e) { }
    const hasExisting = Boolean(existingLevel &&
        !existingLevel.needsAssessment &&
        existingLevel.assessmentId !== 'unassessed' &&
        existingLevel.overallScore > 0);
    const introText = `🎙️ <b>MARAKI ENGLISH DIAGNOSTIC</b> 🇪🇹\n\n` +
        `Discover your official <b>Maraki Level</b> (A1 – C1), speaking fluency, and your biggest learning growth area in under 1 minute.\n\n` +
        `⏱️ <b>Format:</b>\n` +
        `• 🎙️ <b>Step 1:</b> Express yourself freely in 15–30s of spoken English\n` +
        `• 🎧 <b>Step 2:</b> 1 Spoken Listening Dialogue check\n` +
        `• 📝 <b>Step 3:</b> 2 Quick Ethiopian Error Trap checks\n` +
        `• 🏆 Instant AI diagnostic scorecard & customized daily practice!\n\n` +
        (hasExisting
            ? `⭐ <i>Your current level is <b>${existingLevel.cefrLevel} (${existingLevel.overallScore}/100)</b>. Taking this will update your level!</i>\n\n`
            : '') +
        `Ready? Tap below to start! 👇`;
    const keyboard = new InlineKeyboard()
        .text('🚀 Start Diagnostic Test (1 Min)', 'start_assessment');
    await ctx.reply(introText, { parse_mode: 'HTML', reply_markup: keyboard });
}
/**
 * Begin assessment session — launches Step 1 (Voice) immediately!
 */
export async function startAssessmentSession(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    await setSession(userId, {
        mode: 'assessment_awaiting_voice',
        questionIndex: 0,
        totalQuestions: FALLBACK_QUESTIONS.length,
        questions: FALLBACK_QUESTIONS,
        answers: {},
        speaking: null,
        startTime: Date.now(),
    });
    await renderSpeakingPrompt(ctx);
}
/**
 * Render Step 1: Spoken English Prompt ("Express Yourself Freely")
 */
export async function renderSpeakingPrompt(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    if (session) {
        session.mode = 'assessment_awaiting_voice';
        await setSession(userId, session);
    }
    const speakingText = `🎙️ <b>የእንግሊዝኛ ችሎታ መለያ (Speaking Diagnostic) 🇪🇹</b>\n\n` +
        `<b>Express yourself freely!</b>\n\n` +
        `<i>"Hi! I'm Maraki. Go ahead and express yourself freely — tell me a little about who you are, what you love doing, or what your goals are. Speak naturally, there are no wrong answers!"</i>\n\n` +
        `💪 <b>አይጨነቁ — ፍጹም እንግሊዝኛ መናገር አይጠበቅብዎትም!</b>\n` +
        `<i>ራስዎን በነፃነት ይግለጹ (ስለራስዎ፣ ስለሚወዱት ነገር ወይም ስለ ህልምዎ በጥቂቱ ይንገሩኝ። ስህተት ቢኖርም እንኳን በድፍረት ይናገሩ!)</i>\n\n` +
        `⏱️ <b>15–30 ሰከንድ ድምፅ በእንግሊዝኛ ይቅረጹ</b>\n\n` +
        `👇 <b>የቴሌግራም ማይክራፎን ምልክቱን ተጭነው ድምፅዎን ይላኩ!</b>`;
    const keyboard = new InlineKeyboard()
        .text('⏭️ ድምፅ ዝለል (Skip Voice)', 'assess_skip_voice');
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(speakingText, { parse_mode: 'HTML', reply_markup: keyboard });
            return;
        }
        catch (e) { }
    }
    await ctx.reply(speakingText, { parse_mode: 'HTML', reply_markup: keyboard });
}
/**
 * Handle speaking voice note submitted via Telegram
 */
export async function handleAssessmentVoiceSubmission(ctx) {
    const voiceOrAudio = ctx.message?.voice || ctx.message?.audio;
    if (!ctx.from || !voiceOrAudio)
        return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    if (!session || session.mode !== 'assessment_awaiting_voice') {
        return;
    }
    const durationSeconds = voiceOrAudio.duration || 20;
    const statusMsg = await ctx.reply('⏳ <i>Great job speaking up! Analyzing your speech with Maraki AI (clarity, vocabulary & fluency)...</i>', { parse_mode: 'HTML' });
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
        if (durationSeconds < 5) {
            validation = {
                isValid: false,
                reason: 'too_short',
                userMessageEn: 'Your voice recording was too short to evaluate. Please record for at least 10–20 seconds.',
                userMessageAm: 'የድምፅ መልእክትዎ በጣም አጭር ነው። እባክዎ ቢያንስ ለ10-20 ሰከንዶች በእንግሊዝኛ ይናገሩ።',
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
    // If rejected: mute, non-English, or too short
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
            .text('⏭️ ድምፅ ዝለል (Skip Voice)', 'assess_skip_voice');
        await ctx.reply(`${errorIcon} ${errorTitle}\n\n` +
            `${validation.userMessageEn}\n\n` +
            `🇪🇹 <i>${validation.userMessageAm}</i>\n\n` +
            `👇 <b>የቴሌግራም ማይክራፎን ምልክቱን ተጭነው በድጋሚ በእንግሊዝኛ ይናገሩ!</b>`, { parse_mode: 'HTML', reply_markup: retryKeyboard });
        return;
    }
    // Voice accepted! Delete status message
    try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    }
    catch (e) { }
    session.speaking = {
        durationSeconds,
        transcript: validation.transcript || `Spoken English response (${durationSeconds}s)`,
        scores: validation.scores,
        feedback: validation.feedback,
        amharicTip: validation.amharicTip,
        ethiopianL1Patterns: validation.ethiopianL1Patterns,
    };
    session.mode = 'in_assessment';
    session.questionIndex = 0;
    await setSession(userId, session);
    await ctx.reply(`✅ <b>ድንቅ ንግግር! የድምፅ ምዘናዎ ተመዝግቧል።</b>\n\n` +
        `አሁን የመጨረሻዎቹን <b>3 አጫጭር ጥያቄዎች (Listening + Grammar + Vocabulary)</b> እንጨርስ 👇`, { parse_mode: 'HTML' });
    const questions = session.questions && session.questions.length > 0 ? session.questions : FALLBACK_QUESTIONS;
    await renderQuestion(ctx, 0, questions);
}
/**
 * Render a written/audio assessment question with option buttons
 */
async function renderQuestion(ctx, index, questions) {
    if (index >= questions.length) {
        // All questions finished; finalize
        const userId = ctx.from?.id;
        if (userId) {
            const session = await getSession(userId);
            await finalizeAssessmentSession(ctx, session);
        }
        return;
    }
    const q = questions[index];
    const questionNumber = index + 1;
    const total = questions.length;
    const categoryEmoji = q.skill === 'listening' ? '🎧' : q.skill === 'grammar' ? '📝' : '📚';
    let messageText = `${categoryEmoji} <b>Question ${questionNumber} of ${total}</b> [${(q.skill || 'English').toUpperCase()}]\n\n`;
    messageText += `${q.prompt}\n\n`;
    const optionLetters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, optIdx) => {
        messageText += `<b>${optionLetters[optIdx]}.</b> ${opt}\n`;
    });
    messageText += `\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `💬 <b>ምርጫዎን ይንኩ፦</b>`;
    const replyKeyboard = new Keyboard()
        .text('A').text('B').text('C').text('D')
        .row()
        .text('❌ Cancel Assessment')
        .resized();
    // If Listening question, synthesize and send voice note first
    if (q.skill === 'listening' && q.listeningScript) {
        try {
            const cleanScript = q.listeningScript.replace(/["'""'']/g, '').replace(/[•\t\n]+/g, ' ').trim();
            const base64List = await googleTTS.getAllAudioBase64(cleanScript, {
                lang: 'en',
                slow: false,
                timeout: 12000,
            });
            if (base64List && base64List.length > 0) {
                const buffers = base64List.map((item) => Buffer.from(item.base64, 'base64'));
                const fullAudioBuffer = Buffer.concat(buffers);
                await ctx.replyWithVoice(new InputFile(fullAudioBuffer, `listening_q${questionNumber}.mp3`), {
                    caption: `🎧 <b>Question ${questionNumber} Spoken Dialogue:</b> Listen to this audio before answering below.`,
                    parse_mode: 'HTML',
                });
            }
        }
        catch (synthErr) {
            console.warn('[Assessment] TTS synthesis failed:', synthErr);
        }
    }
    await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: replyKeyboard });
}
/**
 * Handle user choosing an option (A, B, C, D)
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
    const questions = session.questions && session.questions.length > 0 ? session.questions : FALLBACK_QUESTIONS;
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
 * Handle skipping speaking test
 */
export async function skipAssessmentVoice(ctx) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const session = await getSession(userId);
    if (session) {
        session.speaking = null;
        session.mode = 'in_assessment';
        session.questionIndex = 0;
        await setSession(userId, session);
    }
    await ctx.reply('⏭️ <b>ድምፅ አልፈዋል (Voice Skipped).</b>\n\nየመጨረሻዎቹን 3 ጥያቄዎች ይመልሱ 👇', {
        parse_mode: 'HTML',
    });
    const questions = session?.questions && session.questions.length > 0 ? session.questions : FALLBACK_QUESTIONS;
    await renderQuestion(ctx, 0, questions);
}
/**
 * Finalize assessment and submit to backend API
 */
async function finalizeAssessmentSession(ctx, session) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const statusMsg = await ctx.reply('⏳ <i>Calculating your official Maraki Level & creating study plan...</i>', {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
    });
    await setSession(userId, { mode: null, timestamp: Date.now() });
    const payload = {
        telegramId: userId,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username,
        answers: session?.answers || {},
        questions: session?.questions || FALLBACK_QUESTIONS,
        speaking: session?.speaking || null,
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
        try {
            await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
        }
        catch (e) { }
        await ctx.reply('⚠️ Error finalizing assessment. Please try /assessment again.');
    }
}
/**
 * Format and send the "🎯 MARAKI LEVEL REPORT" Card with English Skill Feedback & 7-Day Plan
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
            // Send the skill feedback & 7-day plan message with interactive keyboard
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
