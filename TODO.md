# TODO: Implement Webhook and Polling based on NODE_ENV

## Completed Tasks
- [x] Modified `src/index.ts` to conditionally use webhook in production and polling in development
- [x] Added webhook endpoint `/webhook` in Express app using `bot.handleUpdate(req.body)`
- [x] Exported `bot` from `src/adapters/telegram.adapter.ts`
- [x] Removed `bot.start()` from adapter to handle conditionally in index.ts
- [x] Added `WEBHOOK_URL` environment variable to `render.yaml`
- [x] Fixed webhook implementation to use POST endpoint with bot.handleUpdate
- [x] Added `await bot.init()` to initialize the bot before setting webhook or starting polling

## Next Steps
- [ ] Set `WEBHOOK_URL` in production environment (e.g., https://your-app.onrender.com/webhook)
- [ ] Test in development mode (should use polling)
- [ ] Test in production mode (should use webhook)
- [ ] Ensure webhook URL is accessible and handles HTTPS (required by Telegram)

## Notes
- In development (NODE_ENV != 'production'), the bot uses polling via `bot.start()`
- In production (NODE_ENV = 'production'), the bot sets webhook and uses webhook callback
- Webhook URL must be HTTPS and publicly accessible for Telegram to send updates
