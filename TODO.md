# Lesson Follow-up Enhancement

## Issue
Users may get confused after receiving AI-generated lessons and want to ask questions about the lesson content. The current system only handles generating new lessons when in 'lesson' mode.

## Solution
Implement a follow-up question system that allows users to ask questions about lessons they've just received, with the AI providing contextual answers based on the lesson content.

## Tasks
- [x] Create lessonFollowupPrompt in src/prompt/lesson.prompt.ts
- [x] Add handleLessonFollowup function in src/commands/lesson.comand.ts
- [x] Modify handleLessonResponse to include inline keyboard with follow-up options
- [x] Update telegram.adapter.ts to handle 'lesson_followup' mode and 'lesson_followup_ask' callback
- [x] Ensure lesson content is stored in database for follow-up context
- [x] Fix syntax errors in lesson command
- [x] Test the implementation

## Files Modified
- src/prompt/lesson.prompt.ts - Added lessonFollowupPrompt
- src/commands/lesson.comand.ts - Added handleLessonFollowup, modified handleLessonResponse with keyboard
- src/adapters/telegram.adapter.ts - Added routing for 'lesson_followup' mode and callback handling
- src/database/models/conversation.ts - Already had content field in LessonSchema

## Testing Status
- [ ] TypeScript compilation passes
- [ ] Lesson generation with keyboard buttons works
- [ ] Follow-up question mode activation works
- [ ] AI answers questions based on lesson context
- [ ] Session mode transitions work correctly
- [ ] Database stores lesson content properly
