# Refactor Bot to Use Direct MongoDB Access

## Issue
The bot currently uses axios to make API calls to a separate backend for user management, premium features, payments, and conversations. The user wants to eliminate this and use direct MongoDB access with Mongoose, using existing schemas from the backend.

## Solution
Convert the existing NestJS Mongoose schemas to plain Mongoose models, refactor api.service.ts to use direct database operations, and add MongoDB connection to the bot.

## Tasks
- [ ] Create Mongoose models in src/models/ based on schemas/
- [ ] Refactor src/services/api.service.ts to use direct DB operations
- [ ] Add MongoDB connection in src/index.ts
- [ ] Update src/services/user.service.ts for model compatibility
- [ ] Remove axios dependency and BACKEND_API_URL references
- [ ] Test the refactored bot functionality

## Files to Create/Modify
- New: src/models/User.ts
- New: src/models/Conversation.ts
- New: src/models/Payment.ts
- New: src/models/Material.ts
- New: src/models/Quiz.ts
- Modify: src/services/api.service.ts
- Modify: src/index.ts
- Modify: src/services/user.service.ts
- Modify: package.json (remove axios if not needed elsewhere)

## Testing Status
- [ ] MongoDB connection works
- [ ] User registration and updates work
- [ ] Premium checks and usage tracking work
- [ ] Conversation storage (grammar, lessons, chat) works
- [ ] Payment processing works
- [ ] All bot commands function correctly
