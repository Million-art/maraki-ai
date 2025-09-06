# Sentence Correction Implementation TODO

## 1. Fix grammarPrompt.ts
- [x] Replace ${Conversation} with explicit list of grammar types: "subject-verb agreement", "tense", "punctuation", "sentence structure", "flow", "spelling", "word choice"

## 2. Enhance grammar.command.ts
- [x] Add session state management to track when user is sending a sentence
- [x] Implement logic to construct full prompt with user input, context, and level
- [x] Integrate callGeminiGenerateContent to call Gemini API
- [x] Parse JSON response and format reply with correction, explanation, grammar type
- [x] Add error handling for API failures

## 3. Update telegram.adapter.ts
- [x] Modify message handler to route sentence input to grammar correction when in grammar mode

## 4. Test Integration
- [ ] Test with sample English sentences
- [ ] Verify JSON parsing and response formatting
- [ ] Check conversation context usage

## 5. Error Handling and Fallback
- [ ] Implement fallback for Gemini API errors
- [ ] Add user-friendly error messages
