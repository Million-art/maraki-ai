import { InlineKeyboard } from "grammy";
import { apiService } from "../services/api.service.js";
import { updateDailyStreak } from "../utils/streak.util.js";
import { completePlanDay } from "../utils/plan-progress.util.js";
import { DynamicLessonService } from "../services/dynamic-lesson.service.js";
import * as googleTTS from "google-tts-api";
export const LESSON_DATABASE = {
    Reading: {
        1: {
            title: "Reading Comprehension",
            topic: "Skimming & Core Thesis Extraction",
            duration: "5 mins",
            strategy: "Never translate every English word into Amharic word-by-word. This drops reading speed below 80 WPM. Instead, skim the opening topic sentence and look for transitional signposts (<i>However, Consequently, In fact</i>) to identify the primary thesis in under 45 seconds.",
            passage: "The digital payments landscape in Ethiopia has experienced a remarkable surge over the past two years. With the widespread adoption of mobile money platforms like telebirr and private commercial bank apps, millions of previously unbanked citizens can now transfer funds, settle utility bills, and purchase goods instantly. While infrastructure gaps and network latency still pose occasional hurdles in rural outposts, financial analysts agree that Ethiopia is on a definitive trajectory toward a cash-lite economy.",
            question: "What is the core thesis of the passage?",
            options: [
                "A) Rural latency will permanently stop electronic payments in Ethiopia",
                "B) Mobile money adoption is actively driving Ethiopia toward a cash-lite economy",
                "C) Private commercial banks are closing down physical branches in Addis Ababa",
            ],
            correctIndex: 1,
            explanation: "The central argument is that despite minor rural hurdles, rapid mobile money adoption is successfully transforming Ethiopia into a cash-lite society.",
        },
        2: {
            title: "Reading Comprehension",
            topic: "Contextual Clues & Unfamiliar Vocabulary",
            duration: "5 mins",
            strategy: "When you encounter a difficult word in a professional report (e.g., 'adverse', 'compelling', 'prevalent'), look at surrounding contrast markers rather than stopping to consult a dictionary.",
            passage: "Despite facing adverse weather conditions and supply chain bottlenecks, the coffee cooperative in Sidama managed to exceed its annual export targets by twenty percent.",
            question: "In this passage, what does the word 'adverse' mean?",
            options: [
                "A) Unfavorable or difficult",
                "B) Extremely sunny and humid",
                "C) Highly profitable and modern",
            ],
            correctIndex: 0,
            explanation: "The contrast marker 'Despite' signals that conditions were challenging/unfavorable, yet the cooperative succeeded.",
        },
        3: {
            title: "Reading Comprehension",
            topic: "Scanning for Specific Facts & Numbers",
            duration: "5 mins",
            strategy: "Scanning is targeted searching for dates, percentages, and figures without reading line-by-line. Keep the keyword in mind and run your eyes in a zigzag pattern across the text.",
            passage: "Ethiopian Airlines announced its Q3 fiscal report indicating an 18% increase in passenger traffic, with total operating revenue reaching $1.6 billion. Passenger load factor on European routes averaged 84%, while cargo freight volume expanded by 12,000 metric tons compared to the same period in 2024.",
            question: "What was the passenger load factor on European routes according to the report?",
            options: [
                "A) 18%",
                "B) 84%",
                "C) 12,000 metric tons",
            ],
            correctIndex: 1,
            explanation: "Scanning specifically for 'European routes' immediately isolates 'averaged 84%'.",
        },
        4: {
            title: "Reading Comprehension",
            topic: "Deep Inference & Reading Between the Lines",
            duration: "5 mins",
            strategy: "Inference requires recognizing what is implied rather than stated outright. Look for evaluative adjectives and cause-and-effect relationships.",
            passage: "While senior executives publicly praised the new remote work policy, department managers quietly mandated that all critical sprint planning sessions take place inside the Bole headquarters every Monday morning.",
            question: "What can be inferred about the managers' attitude toward full remote work?",
            options: [
                "A) They completely trust fully remote planning without any in-person oversight",
                "B) They are skeptical of remote planning and still value physical presence for key decisions",
                "C) They plan to close down the Bole headquarters permanently",
            ],
            correctIndex: 1,
            explanation: "Requiring mandatory in-person presence for critical planning implies reservations about 100% remote collaboration.",
        },
        5: {
            title: "Reading Comprehension",
            topic: "Cohesion & Transition Markers",
            duration: "5 mins",
            strategy: "Transition markers show the logical relationship between thoughts: contrast ('Whereas', 'Despite'), causation ('Consequently', 'Hence'), and addition ('Furthermore').",
            question: "Which transition marker correctly connects these two thoughts: 'The project budget was reduced by 30%; ________, the engineering team delivered all core features on time.'",
            options: [
                "A) Consequently",
                "B) Nevertheless",
                "C) Furthermore",
            ],
            correctIndex: 1,
            explanation: "'Nevertheless' signals contrast between a budget reduction and successful on-time delivery.",
        },
        6: {
            title: "Reading Comprehension",
            topic: "Ethiopian Long-Form Article Challenge",
            duration: "6 mins",
            strategy: "When tackling multi-paragraph articles, read the introductory paragraph and conclusion first to anchor the main argument before reading body paragraphs.",
            passage: "Renewable energy integration in Eastern Africa took a historic step forward as the Grand Ethiopian Renaissance Dam (GERD) reached commercial synchronization milestones. Beyond supplying domestic manufacturing hubs with stable baseline electricity, regional interconnectors to Kenya, Djibouti, and Sudan position Ethiopia as a green power exporter. Analysts emphasize that grid reliability will be the catalyst for attracting foreign direct investment into regional industrial parks.",
            question: "According to the article, what is the key catalyst for attracting foreign direct investment?",
            options: [
                "A) Constructing luxury shopping centers in industrial parks",
                "B) Electrical grid reliability powered by green energy",
                "C) Eliminating regional interconnectors to neighboring nations",
            ],
            correctIndex: 1,
            explanation: "The final sentence explicitly states that 'grid reliability will be the catalyst for attracting foreign direct investment'.",
        },
        7: {
            title: "Reading Comprehension",
            topic: "Weekly Retest & Reading Benchmark",
            duration: "8 mins",
            strategy: "Consolidate all skills: thesis skimming, context deduction, and deep inference under timed conditions.",
            passage: "Urban mobility in Addis Ababa has undergone profound shifts with the expansion of mass transit corridors and smart traffic surveillance. Commuters who once spent over two hours in transit during peak morning hours report significant time savings. However, maintaining rolling stock and ensuring equitable fare tariffs remain crucial for long-term municipal viability.",
            question: "What is identified as crucial for long-term viability?",
            options: [
                "A) Doubling transit tariffs immediately",
                "B) Rolling stock maintenance and equitable fare tariffs",
                "C) Banning private vehicles from peak morning hours",
            ],
            correctIndex: 1,
            explanation: "The passage directly concludes that 'maintaining rolling stock and ensuring equitable fare tariffs remain crucial for long-term municipal viability'.",
        },
    },
    Grammar: {
        1: {
            title: "Grammar & Syntax",
            topic: "Stative vs Dynamic Verbs",
            duration: "5 mins",
            strategy: "Stative verbs describe states, feelings, and thoughts (know, believe, understand, belong, own). In standard English, they are NEVER used in continuous (-ing) forms. Do not say 'I am knowing' or 'I am having two cars'.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> በአማርኛ 'አውቄዋለሁ' ወይም 'እየገባኝ ነው' ብለን የምንገልጸውን በእንግሊዝኛ 'I understand' እንጂ 'I am understanding' አንልም።",
            question: "Which sentence uses standard English grammar?",
            options: [
                "A) I am understanding the presentation clearly now.",
                "B) I understand the presentation clearly now.",
                "C) I am knowing what the manager wants.",
            ],
            correctIndex: 1,
            explanation: "'Understand' is a stative verb describing mental state, so it uses the simple present 'I understand'.",
        },
        2: {
            title: "Grammar & Syntax",
            topic: "Redundant Prepositions Traps",
            duration: "5 mins",
            strategy: "A widespread habit among Ethiopian speakers is inserting unnecessary prepositions after verbs: 'discuss about', 'order for', 'accompany with', 'demand for'. These verbs are transitive and take a direct object immediately.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> 'ስለ ጉዳዩ ተወያየን' የሚለውን ቃል በቃል ተርጉሞ 'discuss about' ማለት ስህተት ነው። 'We discussed the issue' ብቻ ይበሉ።",
            question: "Select the sentence with correct preposition usage:",
            options: [
                "A) We need to discuss about the budget reallocation tomorrow.",
                "B) We need to discuss the budget reallocation tomorrow.",
                "C) We will order for new office laptops this afternoon.",
            ],
            correctIndex: 1,
            explanation: "'Discuss' takes a direct object without 'about'. Say 'discuss the issue', never 'discuss about the issue'.",
        },
        3: {
            title: "Grammar & Syntax",
            topic: "Uncountable Noun Pluralization",
            duration: "5 mins",
            strategy: "Nouns like 'information', 'advice', 'equipment', 'software', and 'research' are uncountable in English. They can NEVER take an 's' or the indefinite article 'a'. Use 'a piece of advice' or 'some equipment'.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> 'መረጃዎች' ወይም 'ምክሮች' ብለን በአማርኛ በብዛት የምንጠቀመውን 'informations' ወይም 'advices' ማለት በፍጹም አይቻልም።",
            question: "Which sentence correctly treats uncountable workplace nouns?",
            options: [
                "A) The senior consultant gave me two valuable advices on my CV.",
                "B) The IT department purchased new equipments and softwares for the team.",
                "C) The consultant gave me two valuable pieces of advice on my CV.",
            ],
            correctIndex: 2,
            explanation: "'Advice' is uncountable; the correct partitive is 'pieces of advice'. 'Advices', 'equipments', and 'softwares' are non-standard.",
        },
        4: {
            title: "Grammar & Syntax",
            topic: "Conditionals in Corporate Decisions",
            duration: "5 mins",
            strategy: "Differentiate real possibilities (First Conditional: If + present, will + base) from hypothetical scenarios (Second Conditional: If + past, would + base). Do not mix them by saying 'If I will see' or 'If they came, they will join'.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> 'ቢሆን ኖሮ' የሚለውን ሃሳብ ለመግለጽ 'If + past verb, would...' መጠቀም አለብን።",
            question: "Choose the correct hypothetical conditional sentence:",
            options: [
                "A) If the client approves the proposal, we would sign the contract tomorrow.",
                "B) If the client approved the proposal, we will sign the contract tomorrow.",
                "C) If the client approved the proposal, we would sign the contract tomorrow.",
            ],
            correctIndex: 2,
            explanation: "Second conditional requires past tense in the if-clause ('approved') and 'would' in the main clause.",
        },
        5: {
            title: "Grammar & Syntax",
            topic: "Gerunds after Prepositions & Phrasal Verbs",
            duration: "5 mins",
            strategy: "When 'to' acts as a preposition (such as in 'look forward to', 'committed to', 'prior to'), it MUST be followed by a gerund (-ing) or a noun, NOT a base verb.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> 'to'ን በማየት ብቻ ተከትሎ የሚመጣውን ግስ base verb ማድረግ የተለመደ ስህተት ነው። 'looking forward to meeting' እንጂ 'meet' አይባልም።",
            question: "Which sentence is grammatically accurate?",
            options: [
                "A) The executive committee is committed to finalize the audit by Friday.",
                "B) The executive committee is committed to finalizing the audit by Friday.",
                "C) We are looking forward to collaborate on this renewable project.",
            ],
            correctIndex: 1,
            explanation: "'Committed to' is followed by a gerund ('finalizing'), just as 'look forward to' requires 'collaborating'.",
        },
        6: {
            title: "Grammar & Syntax",
            topic: "Subject-Verb Agreement in Complex Sentences",
            duration: "6 mins",
            strategy: "Intervening phrases (such as 'along with', 'as well as', 'in addition to') do not change the number of the subject. If the subject is singular, the verb remains singular.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> 'The director along with his assistants' ሲባል ዋናው ባለቤት 'The director' ብቻ ስለሆነ ግሱ ነጠላ (is/has) ይሆናል።",
            question: "Identify the correct subject-verb agreement:",
            options: [
                "A) The project manager, along with the senior engineers, are traveling to Hawassa.",
                "B) The project manager, along with the senior engineers, is traveling to Hawassa.",
                "C) Neither the developer nor the designers was available for the review.",
            ],
            correctIndex: 1,
            explanation: "The true grammatical subject is 'The project manager' (singular). The phrase 'along with...' is parenthetical.",
        },
        7: {
            title: "Grammar & Syntax",
            topic: "Weekly Grammar Retest & Error Audit",
            duration: "8 mins",
            strategy: "Consolidate stative verbs, prepositions, and countable nouns under timed diagnostic conditions.",
            question: "Find the single sentence that contains NO grammatical error:",
            options: [
                "A) We discussed about the findings and are looking forward to launch the product.",
                "B) We discussed the findings and are looking forward to launching the product.",
                "C) We discussed the findings and are having three equipments to deploy.",
            ],
            correctIndex: 1,
            explanation: "'Discussed the findings' avoids redundant 'about', and 'looking forward to launching' uses the required gerund.",
        },
    },
    Vocabulary: {
        1: {
            title: "Vocabulary Mastery",
            topic: "High-Yield Workplace Collocations",
            duration: "5 mins",
            strategy: "Native speakers learn words in natural combinations (collocations). Rather than 'make a research', professional English uses 'conduct research' or 'carry out research'.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> 'ጥናት አደረግን' የሚለውን በእንግሊዝኛ 'conducted research' እንጂ 'made research' አንልም።",
            question: "Which phrase is the correct professional collocation?",
            options: [
                "A) The team made a thorough research on the market.",
                "B) The team conducted thorough research on the market.",
                "C) The team did an investigation to the market.",
            ],
            correctIndex: 1,
            explanation: "In academic and business English, you 'conduct research' or 'carry out research', never 'make research'.",
        },
        2: {
            title: "Vocabulary Mastery",
            topic: "False Friends & Literal Translations",
            duration: "5 mins",
            strategy: "Beware of literal translation habits: In English, you don't 'shift' a meeting if you mean moving it to another day you 'reschedule', 'postpone', or 'push back' the meeting.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> ስብሰባን ወደ ሌላ ቀን ማዛወር 'reschedule' ወይም 'postpone' ይባላል እንጂ 'shift the meeting' አይባልም።",
            question: "How should you naturally say you need to move a 2:00 PM appointment to 4:00 PM?",
            options: [
                "A) Can we shift the meeting to 4:00 PM?",
                "B) Can we postpone or push back the meeting to 4:00 PM?",
                "C) Can we transfer the meeting to 4:00 PM?",
            ],
            correctIndex: 1,
            explanation: "'Postpone' or 'push back' is the natural, idiomatic terminology for moving meeting times.",
        },
        3: {
            title: "Vocabulary Mastery",
            topic: "Remote & Hybrid Work Phrasal Verbs",
            duration: "5 mins",
            strategy: "Master international tech & business phrasal verbs: 'follow up on' (check progress), 'run out of' (deplete), 'touch base' (briefly connect), 'iron out' (resolve details).\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> በኢሜይል ወይም በቴሌግራም 'ጉዳዩን መከታተል' ስትፈልጉ 'I will follow up on this' ማለት በጣም ፕሮፌሽናል ነው።",
            question: "Choose the correct phrasal verb: 'I wanted to ________ you regarding the quarterly deliverables we discussed on Monday.'",
            options: [
                "A) follow up with",
                "B) look up to",
                "C) catch down with",
            ],
            correctIndex: 0,
            explanation: "'Follow up with [person]' or 'follow up on [task]' is the gold standard in professional communication.",
        },
        4: {
            title: "Vocabulary Mastery",
            topic: "Precision Adjectives for Problem Solving",
            duration: "5 mins",
            strategy: "Elevate your vocabulary by replacing vague words like 'good' or 'bad' with precise adjectives: 'robust' (sturdy/reliable), 'feasible' (achievable), 'imperative' (vital), 'prevalent' (widespread).",
            question: "Which adjective best completes: 'Due to current currency constraints, building an entirely new campus this year is simply not ________.'",
            options: [
                "A) feasible",
                "B) pervasive",
                "C) superfluous",
            ],
            correctIndex: 0,
            explanation: "'Feasible' means practical and workable within available resources.",
        },
        5: {
            title: "Vocabulary Mastery",
            topic: "Business Idioms & Pragmatic Expressions",
            duration: "5 mins",
            strategy: "Understand everyday idioms used in international meetings: 'cut corners' (take shortcuts that hurt quality), 'on the same page' (in agreement), 'hit the ground running' (start fast).",
            question: "What does an executive mean when stating: 'We cannot afford to cut corners during the aviation safety audit'?",
            options: [
                "A) They must trim the physical paper audit sheets with scissors",
                "B) They must not sacrifice safety quality by taking cheap shortcuts",
                "C) They plan to cancel the audit completely to save funds",
            ],
            correctIndex: 1,
            explanation: "'Cut corners' means undertaking something in the easiest, cheapest, or fastest way at the expense of quality.",
        },
        6: {
            title: "Vocabulary Mastery",
            topic: "Academic & Analytical Transition Words",
            duration: "6 mins",
            strategy: "Enhance reports with high-level signposts: 'notwithstanding' (in spite of), 'inasmuch as' (since), 'conversely' (on the other hand).",
            question: "Select the sentence with correct transitional vocabulary:",
            options: [
                "A) Notwithstanding the global inflation, the Ethiopian export sector grew by 8%.",
                "B) Conversely the inflation, export sector grew positively.",
                "C) Furthermore the difficulties, our team succeeded.",
            ],
            correctIndex: 0,
            explanation: "'Notwithstanding' is a formal preposition meaning 'in spite of' or 'despite'.",
        },
        7: {
            title: "Vocabulary Mastery",
            topic: "Weekly Vocabulary Retest & Collocation Benchmark",
            duration: "8 mins",
            strategy: "Test your mastery of professional verbs, adjectives, and collocations in timed settings.",
            question: "Choose the sentence where all professional collocations are used correctly:",
            options: [
                "A) We made a favor, did an agreement, and shifted the schedule.",
                "B) We did a favor, reached an agreement, and rescheduled the meeting.",
                "C) We took a favor, made an agreement, and pushed over the meeting.",
            ],
            correctIndex: 1,
            explanation: "Standard collocations are 'do a favor', 'reach an agreement', and 'reschedule a meeting'.",
        },
    },
    Listening: {
        1: {
            title: "Connected Speech & Natural Reductions",
            topic: "Listening to Fast Native Audio Snippets",
            duration: "5 mins",
            strategy: "Native speakers reduce function words: 'going to' becomes /gənə/, 'want to' becomes /wɑnə/. Listen closely to the voice note to catch these connected speech patterns.",
            passage: "I'm gonna go to the store because I wanna buy some coffee. I could've called ya earlier, but I forgot.",
            question: "Which of the following exact reduced phrases was spoken in the audio?",
            options: [
                "A) I'm going to go to the store because I want to buy",
                "B) I'm gonna go to the store because I wanna buy",
                "C) I gonna go to the store because I want to buy",
            ],
            correctIndex: 1,
            explanation: "The audio clearly uses the reductions 'gonna' (going to) and 'wanna' (want to), which is very common in fast native speech.",
        },
        2: {
            title: "Conversational Pragmatics",
            topic: "Tone and 'Do you mind...?'",
            duration: "5 mins",
            strategy: "When asked 'Do you mind...?', answering 'No, not at all' means you agree and it is fine. Listen to the tone of the speaker to determine their intention and politeness.",
            passage: "Hi team, would you mind if we pushed our daily sync back to 3:00 PM today? I'm running a bit behind on this report.",
            question: "Based on the speaker's tone and phrasing, what is their intention?",
            options: [
                "A) They are angrily canceling the meeting",
                "B) They are politely asking for permission to delay the meeting",
                "C) They are demanding everyone stay until 3:00 PM",
            ],
            correctIndex: 1,
            explanation: "'Would you mind if we...' is a polite, pragmatic way to ask for permission to change a schedule.",
        },
        3: {
            title: "Telephone English & Fast Instructions",
            topic: "Extracting Action Items from Voicemails",
            duration: "5 mins",
            strategy: "When listening to fast voicemails, don't try to understand every word. Focus on imperative verbs (review, send, call) to extract the required action items.",
            passage: "Hi, it's Sarah from accounting. Before you leave today, I need you to review the Q3 budget, approve the final draft, and call the software vendor to confirm the license renewal.",
            question: "According to the voicemail, what are the 3 required action items?",
            options: [
                "A) Review the budget, approve the draft, and call the vendor",
                "B) Call Sarah, write a new budget, and buy software",
                "C) Review the Q3 budget, leave early, and email the vendor",
            ],
            correctIndex: 0,
            explanation: "The three action verbs were explicitly stated: 'review', 'approve', and 'call'.",
        },
        4: {
            title: "Critical Numbers, Dates & Time Traps",
            duration: "5 mins",
            topic: "Numerical Dictation",
            strategy: "Listen carefully to the stress on numbers. 'FourTEEN' stresses the end, while 'FORty' stresses the beginning. Pay close attention to the exact financial figures spoken.",
            passage: "Our Q3 revenue was fourteen million dollars, which is a significant drop from the forty million we projected in January.",
            question: "Based on the fast numerical audio statement, what was the actual Q3 revenue?",
            options: [
                "A) 40 million dollars",
                "B) 14 million dollars",
                "C) 4 million dollars",
            ],
            correctIndex: 1,
            explanation: "The speaker said 'fourteen' (14) million was the actual revenue, while 'forty' (40) was the projection.",
        },
        5: {
            title: "Ambient Noise & Real-World Background Listening",
            topic: "Filtering out distractions",
            duration: "5 mins",
            strategy: "In real-world scenarios like airports or cafes, background noise can obscure speech. Focus entirely on the nouns and numbers that matter, ignoring the surrounding chatter.",
            passage: "Attention passengers. Flight ET 704 to Addis Ababa is now boarding at Gate 14B. Please have your boarding passes ready.",
            question: "Despite the ambient background noise, which flight gate was announced?",
            options: [
                "A) Gate 40D",
                "B) Gate 14B",
                "C) Gate 41B",
            ],
            correctIndex: 1,
            explanation: "The announcer clearly stated 'Gate 14B'.",
        },
        6: {
            title: "2-Minute International News Podcast Comprehension",
            topic: "Global Economy Report",
            duration: "6 mins",
            strategy: "When listening to news reports or podcasts, identify the 'who, what, where, and why'. Listen to the following snippet from a global economy report.",
            passage: "Global markets rallied significantly today as European inflation numbers finally dropped below three percent for the first time this fiscal year, signaling a potential end to aggressive rate hikes.",
            question: "According to the podcast snippet, what is the primary reason global markets rallied?",
            options: [
                "A) Aggressive rate hikes were increased",
                "B) European inflation numbers dropped below 3%",
                "C) The fiscal year just ended",
            ],
            correctIndex: 1,
            explanation: "The report explicitly links the market rally to European inflation numbers dropping below three percent.",
        },
        7: {
            title: "Weekly Retest & Listening Diagnostic",
            topic: "Comprehensive Listening Benchmark",
            duration: "8 mins",
            strategy: "It's time for your weekly retest! Apply all the skills you've practiced: recognizing reductions, filtering ambient noise, and extracting action items.",
            passage: "I'm gonna need you to touch base with the client by 4:15 PM regarding the fourteen missing shipments.",
            question: "What is the key action required in this final diagnostic statement?",
            options: [
                "A) Contact the client by 4:15 PM about 14 shipments",
                "B) Contact the client by 4:50 PM about 40 shipments",
                "C) Ship 14 items to the client tomorrow",
            ],
            correctIndex: 0,
            explanation: "'Gonna' (going to), '4:15', and 'fourteen' were the key details extracted from the rapid speech.",
        },
    },
    Speaking: {
        1: {
            title: "Spoken English Fluency",
            topic: "Fluid Self-Introduction & Thought Chunks",
            duration: "5 mins",
            strategy: "Fluent English rhythm relies on thought chunks rather than word-by-word pausing. Group words into natural blocks: [Hi, my name is Million] [I'm a software engineer] [based in Addis Ababa].\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> በእያንዳንዱ ቃል መሃል ከመቆም ይልቅ 3-4 ቃላትን በአንድ የአስተሳሰብ ምት (thought chunk) በማያያዝ መናገር ቅልጥፍናን ይጨምራል።",
            question: "Which phrasing demonstrates natural thought-chunk phrasing for an interview introduction?",
            options: [
                "A) Hi... my... name... is... Million... I... work... in... tech.",
                "B) [Good morning,] [I'm Million,] [a tech professional] [specializing in software solutions.]",
                "C) I am Million and I am working in software company for five years and I like it.",
            ],
            correctIndex: 1,
            explanation: "Dividing sentences into clear 3-to-4 word thought chunks produces the cadence expected in international workplace interviews.",
        },
        2: {
            title: "Spoken English Fluency",
            topic: "Eliminating the Intrusive /i/ Sound",
            duration: "5 mins",
            strategy: "In Amharic phonology, initial consonant clusters (/sp/, /st/, /sk/) don't exist naturally, causing speakers to insert an /i/ sound: 'isport', 'ischool', 'istudent'. To speak clearly, start with a continuous unvoiced hiss /ssss/ before adding the consonant: 'ssss-port', 'ssss-tudent'.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> 'Sport' የሚለውን 'ኢስፖርት' ሳይሆን በረጅሙ በ'ስስስ' በመጀመር 'ssss-port' ብሎ መለማመድ ትክክለኛውን አነጋገር ይሰጣል።",
            question: "How can an Ethiopian learner eliminate the intrusive /i/ before words like 'special' and 'strategy'?",
            options: [
                "A) Pronounce an extra vowel at the end: 'special-a'",
                "B) Start with a prolonged unvoiced hiss /s/ without an opening vowel",
                "C) Drop the 's' entirely and say 'pecial'",
            ],
            correctIndex: 1,
            explanation: "Leading directly with an unvoiced alveolar fricative /s/ eliminates the intrusive opening vowel.",
        },
        3: {
            title: "Spoken English Fluency",
            topic: "Vowel Lengths & Minimal Pairs (Ship vs Sheep)",
            duration: "5 mins",
            strategy: "English distinguishes between short lax vowels (/ɪ/ in 'ship', 'fit', 'live') and long tense vowels (/i:/ in 'sheep', 'feet', 'leave'). Amharic has a single /i/ vowel, which often leads to confusion in conversations.",
            question: "In the sentence 'I have lived here for three years', which vowel sound belongs in 'lived'?",
            options: [
                "A) The long tense /i:/ like in 'leave'",
                "B) The short lax /ɪ/ like in 'sit'",
                "C) The open /æ/ like in 'cat'",
            ],
            correctIndex: 1,
            explanation: "'Lived' uses the short lax /ɪ/ sound. Using the long /i:/ sounds like 'leaved' (departed).",
        },
        4: {
            title: "Spoken English Fluency",
            topic: "Conversational Bridge Phrases & Fillers",
            duration: "5 mins",
            strategy: "When thinking on your feet, avoid long silent pauses or saying 'እእእ...' (uhhh...). Use professional bridge phrases: 'That's an interesting perspective...', 'To be frank with you...', 'As far as I'm concerned...'.\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> ማሰብ በሚፈልጉበት ጊዜ ፀጥ ከማለት 'Well, to be honest...' ወይም 'That's a valid question...' በማለት ጊዜ መውሰድ ይችላሉ።",
            question: "Which phrase effectively buys 3 seconds to formulate your thoughts during a live voice interview?",
            options: [
                "A) 'Wait for me, I am thinking in Amharic.'",
                "B) 'That's a very thoughtful question; let me break down my approach.'",
                "C) 'I have no words.'",
            ],
            correctIndex: 1,
            explanation: "Professional bridge phrases buy cognitive processing time while showcasing high conversational composure.",
        },
        5: {
            title: "Spoken English Fluency",
            topic: "The STAR Framework for Interview Answers",
            duration: "5 mins",
            strategy: "Structure professional spoken answers using STAR: Situation (set the scene), Task (your goal), Action (specific steps you took), Result (measurable positive outcome). This prevents rambling.",
            question: "When an interviewer asks 'Tell me about a time you solved a conflict', which component should you describe FIRST?",
            options: [
                "A) The final salary bonus you received",
                "B) The brief context and situation of the disagreement",
                "C) A list of all your coworkers' shortcomings",
            ],
            correctIndex: 1,
            explanation: "The STAR method begins with Situation (briefly setting the context before detailing your actions).",
        },
        6: {
            title: "Spoken English Fluency",
            topic: "Expressing Nuanced & Diplomatic Opinions",
            duration: "6 mins",
            strategy: "Avoid blunt statements like 'You are wrong.' Instead, use diplomatic mitigation: 'I see where you're coming from, however...', 'While that's a valid point, we might also consider...'.",
            question: "What is the most diplomatic way to express disagreement in an executive meeting?",
            options: [
                "A) 'I completely reject your opinion.'",
                "B) 'I appreciate that perspective; however, looking at the recent telemetry data, another angle emerges.'",
                "C) 'Your data is not true.'",
            ],
            correctIndex: 1,
            explanation: "Diplomatic disagreement acknowledges the speaker's perspective before gently introducing counter-evidence.",
        },
        7: {
            title: "Spoken English Fluency",
            topic: "Weekly Spoken English Benchmark & Retest",
            duration: "8 mins",
            strategy: "Consolidate thought-chunking, pacing, minimal pairs, and diplomatic framing for your CEFR evaluation scorecard.",
            question: "Which spoken response combines natural thought-chunks, diplomatic phrasing, and standard pronunciation?",
            options: [
                "A) 'Isport is good and I am understanding you.'",
                "B) 'Good afternoon. [To build on your point,] [I believe our team] [can deliver this milestone on time.]'",
                "C) 'I am knowing what to do for this company.'",
            ],
            correctIndex: 1,
            explanation: "Option B demonstrates clear thought chunking, avoids stative verb errors, and maintains diplomatic cadence.",
        },
    },
};
/**
 * Launch the personalized 7-Day Plan lesson (AI-generated with local Ethiopian fallback)
 */
export async function startPlanLesson(ctx, dayNumber = 1) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    const report = await apiService.getStudentMarakiLevel(userId);
    const weakness = report?.primaryWeakness || "Reading";
    const levelName = report?.cefrLevel && report.cefrLevel !== 'UNTESTED' ? report.cefrLevel : 'B1';
    const plan = report?.recommendedPlan;
    const dayPlan = plan ? plan[`day${dayNumber}`] : null;
    // 1. Check if user already has an active AI lesson saved for this day in PostgreSQL DB
    const dbProgress = await apiService.getStudentPlanProgress(userId);
    let lesson = null;
    if (dbProgress?.activeLesson &&
        dbProgress.activeLesson.dayNumber === dayNumber &&
        dbProgress.activeLesson.weakness === weakness) {
        lesson = dbProgress.activeLesson.lesson;
    }
    // 2. If no cached active lesson, try generating a fresh one via cost-efficient Gemini
    if (!lesson) {
        try {
            const generated = await DynamicLessonService.generateLesson(weakness, levelName, dayNumber, dayPlan?.title, dayPlan?.task);
            if (generated) {
                lesson = {
                    ...generated,
                    isAiGenerated: true,
                };
                // Persist active lesson in PostgreSQL database
                await apiService.saveStudentPlanProgress(userId, {
                    activeLesson: {
                        dayNumber,
                        weakness,
                        lesson,
                    },
                });
            }
        }
        catch (e) {
            console.warn('[PlanLesson] Dynamic generation failed, using local database:', e);
        }
    }
    // 3. Fallback to complete Ethiopian-localized offline lesson database
    if (!lesson) {
        const skillLessons = LESSON_DATABASE[weakness] || LESSON_DATABASE["Reading"];
        lesson = skillLessons[dayNumber] || skillLessons[1];
    }
    const aiBadge = lesson.isAiGenerated ? " ✨ <i>AI-Adaptive</i>" : "";
    let message = `🎯 <b>DAY ${dayNumber}: ${lesson.title.toUpperCase()}</b>${aiBadge} 📖\n` +
        `<i>Topic: ${lesson.topic} (${lesson.duration})</i>\n\n` +
        `💡 <b>Core Technique (የስልጠና ስልት):</b>\n` +
        `${lesson.strategy}\n\n`;
    if (lesson.passage && weakness !== "Listening") {
        message +=
            `📑 <b>Practice Context / Passage:</b>\n` +
                `<i>"${lesson.passage}"</i>\n\n`;
    }
    else if (weakness === "Listening") {
        message +=
            `🎧 <b>የድምፅ ልምምድ (Listening Practice):</b>\n` +
                `<i>🔊 ከታች የተላከውን የድምፅ ፋይል በጥሞና ያዳምጡ፤ ከዚያም ለቀረበው ጥያቄ ትክክለኛውን መልስ ይምረጡ።</i>\n\n`;
    }
    message += `❓ <b>Practice Question:</b>\n<b>${lesson.question}</b>\n\n`;
    lesson.options.forEach((opt, idx) => {
        const letter = ['A', 'B', 'C'][idx];
        const cleanOpt = opt.replace(/^[A-C]\)\s*/, '');
        message += `<b>${letter})</b> ${cleanOpt}\n\n`;
    });
    // Provide interactive voice recording prompt for Speaking lessons
    if (weakness === "Speaking") {
        message +=
            `🎙️ <i>Tip: Read the correct option aloud into your microphone or voice notes to build mouth muscle memory!</i>`;
    }
    const keyboard = new InlineKeyboard();
    lesson.options.forEach((opt, idx) => {
        const letter = ['A', 'B', 'C'][idx];
        keyboard.text(letter, `plan_ans_${weakness}_${dayNumber}_${idx}`);
    });
    keyboard.row();
    keyboard.text("📅 የልምምድ እቅድ", "view_weekly_plan").text("⬅️ ውጤቴን እይ", "level");
    // Send TTS Voice Note for Listening lessons
    if (weakness === "Listening") {
        try {
            let rawText = lesson.passage || lesson.question;
            let textToSpeak = rawText
                .replace(/Dialog \d+.*?:/gi, '')
                .replace(/Speaker \w+:?/gi, '')
                .replace(/["'""'']/g, '')
                .replace(/[•\t\n]+/g, ' ')
                .trim();
            if (textToSpeak.length > 200) {
                const truncated = textToSpeak.substring(0, 190);
                const lastPeriod = truncated.lastIndexOf('.');
                textToSpeak = lastPeriod > 50 ? truncated.substring(0, lastPeriod + 1) : truncated;
            }
            if (textToSpeak.length > 0) {
                const url = googleTTS.getAudioUrl(textToSpeak, {
                    lang: 'en-US',
                    slow: false,
                    host: 'https://translate.google.com',
                });
                await ctx.replyWithVoice(url, {
                    caption: "🎧 <b>የድምፅ ፋይል (Audio Clip)</b>\n<i>ይህን ድምፅ በጥሞና ያዳምጡና ጥያቄውን ይመልሱ</i>",
                    parse_mode: "HTML",
                });
            }
        }
        catch (e) {
            console.error('Failed to send TTS Voice Note', e);
        }
    }
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(message, { parse_mode: "HTML", reply_markup: keyboard });
        }
        catch (e) {
            await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
        }
    }
    else {
        await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
    }
}
/**
 * Handle user's answer to the plan lesson practice question
 */
export async function handlePlanLessonAnswer(ctx, weakness, dayNumber, selectedOptionIndex) {
    if (!ctx.from)
        return;
    const userId = ctx.from.id;
    // Retrieve active lesson (from database activeLesson or static fallback)
    const dbProgress = await apiService.getStudentPlanProgress(userId);
    let lesson;
    if (dbProgress?.activeLesson &&
        dbProgress.activeLesson.dayNumber === dayNumber &&
        dbProgress.activeLesson.weakness === weakness) {
        lesson = dbProgress.activeLesson.lesson;
    }
    else {
        const skillLessons = LESSON_DATABASE[weakness] || LESSON_DATABASE["Reading"];
        lesson = skillLessons[dayNumber] || skillLessons[1];
    }
    const isCorrect = selectedOptionIndex === lesson.correctIndex;
    // 1. Update user daily streak in PostgreSQL database
    const { streak } = await updateDailyStreak(userId);
    // 2. Persist plan day completion and advance next day in PostgreSQL database
    const progress = await completePlanDay(userId, dayNumber);
    const nextDay = progress.currentDay;
    // Clear active lesson for this day since it is completed
    await apiService.saveStudentPlanProgress(userId, { activeLesson: null });
    const transcriptSection = (weakness === "Listening" && lesson.passage)
        ? `📜 <b>የድምፁ ጽሑፍ (Audio Transcript):</b>\n<i>"${lesson.passage}"</i>\n\n`
        : '';
    let responseText = "";
    if (isCorrect) {
        responseText =
            `✅ <b>ትክክል ነው! (CORRECT!)</b> 🎉\n\n` +
                transcriptSection +
                `💡 <b>ማብራሪያ፦</b> ${lesson.explanation}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `🔥 <b>ቀጣይነት (Streak)፦</b> <b>${streak} ${streak === 1 ? 'ቀን' : 'ቀናት'}</b>\n` +
                `🏆 <b>የተጠናቀቀው፦</b> የቀን ${dayNumber} ቻሌንጅ (${lesson.topic}) ✅\n` +
                (nextDay > dayNumber && nextDay <= 7
                    ? `⏭️ <b>ቀጣይ፦</b> የቀን ${nextDay} ቻሌንጅ አሁን ክፍት ሆኗል!\n`
                    : `🎉 <b>የዚህ ዙር ልምምዶች ተጠናቀዋል! አዲስ የችሎታ መለያ ፈተና መውሰድ ይችላሉ!</b>\n`) +
                `━━━━━━━━━━━━━━━━━━━━━`;
    }
    else {
        const correctLetter = ['A', 'B', 'C'][lesson.correctIndex];
        responseText =
            `❌ <b>በትክክል አልተመለሰም!</b>\n\n` +
                `ትክክለኛው መልስ <b>ምርጫ ${correctLetter}</b> ነበር።\n\n` +
                transcriptSection +
                `💡 <b>ማብራሪያ፦</b> ${lesson.explanation}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `🔥 <b>ቀጣይነት (Streak)፦</b> <b>${streak} ${streak === 1 ? 'ቀን' : 'ቀናት'}</b>\n` +
                `🏆 <b>የተመዘገበው፦</b> የቀን ${dayNumber} ልምምድ ✅\n` +
                `⏭️ <b>ቀጣይ፦</b> የቀን ${nextDay} ቻሌንጅ ክፍት ሆኗል!\n` +
                `━━━━━━━━━━━━━━━━━━━━━`;
    }
    const keyboard = new InlineKeyboard();
    if (nextDay > dayNumber && nextDay <= 7) {
        keyboard.text(`🔥 የቀን ${nextDay} ቻሌንጅ ጀምር`, `start_plan_lesson_${nextDay}`).row();
    }
    else if (nextDay > 7 || dayNumber === 7) {
        keyboard.text(`🎯 አዲስ የችሎታ መለያ ፈተና ውሰድ`, `start_assessment`).row();
    }
    keyboard.text("📅 የልምምድ እቅድ", "view_weekly_plan")
        .text("📊 የፈተና ውጤት", "view_certificate")
        .row()
        .text("⬅️ ወደ ዋናው ገጽ", "level");
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(responseText, { parse_mode: "HTML", reply_markup: keyboard });
        }
        catch (e) {
            await ctx.reply(responseText, { parse_mode: "HTML", reply_markup: keyboard });
        }
    }
    else {
        await ctx.reply(responseText, { parse_mode: "HTML", reply_markup: keyboard });
    }
}
