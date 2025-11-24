# Admin Commands Documentation

## 🔐 Admin Access

The bot includes hidden admin commands that are **not listed** in the help menu or command lists. These commands are only accessible to authorized administrators.

### Setting Up Admin Access

1. **Find Your Telegram ID:**
   - Message [@userinfobot](https://t.me/userinfobot) on Telegram
   - Copy your user ID (it will be a number like `123456789`)

2. **Configure Admin Access:**
   - Open your `.env` file
   - Add your Telegram ID to the `ADMIN_ID` variable:
     ```env
     ADMIN_ID=123456789
     ```
   - For multiple admins, modify `src/commands/admin.command.ts` and add IDs to the `ADMIN_IDS` array

3. **Restart the bot** for changes to take effect

---

## 📊 `/admin_status` Command

### Description
Displays comprehensive bot statistics and system health information.

### Access
- **Protected:** Only users with IDs in the `ADMIN_IDS` array can use this command
- **Hidden:** Not listed in `/help` or any public command lists
- **Security:** Non-admin users receive a fake "unknown command" message

### Usage
Simply send:
```
/admin_status
```

### Information Displayed

#### ⚙️ System Status
- Database connection status
- Database name
- Redis connection status
- Node.js version
- Bot uptime
- Memory usage

#### 👥 User Statistics
- Total registered users
- Premium vs Free users (with percentages)
- New users today
- Active users (last 24 hours)
- Active users (last 7 days)

#### 📊 User Levels
- Beginner users count
- Intermediate users count
- Advanced users count

#### 📚 Learning Activity
- Total conversations
- Grammar corrections performed
- Lessons completed
- Chat messages exchanged
- Quizzes completed

#### 💰 Payment Statistics
- Total payments
- Completed payments
- Pending payments
- Failed payments
- Total revenue (in ETB)

#### 🔗 Referral Statistics
- Total referrals made

---

## 🛡️ Security Features

1. **ID Whitelist:** Only specific Telegram IDs can access admin commands
2. **Hidden from Users:** Command doesn't appear in help menus
3. **Fake Response:** Non-admins get a "command not found" message
4. **No Hints:** No indication that admin commands exist

---

## 🔧 Adding More Admins

Edit `src/commands/admin.command.ts`:

```typescript
const ADMIN_IDS = [
  123456789,    // Your ID
  987654321,    // Another admin
  555666777,    // Third admin
];
```

Or use environment variables (requires code modification):
```typescript
const ADMIN_IDS = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id)) || [];
```

Then in `.env`:
```env
ADMIN_IDS=123456789,987654321,555666777
```

---

## 📝 Example Output

```
🔐 ADMIN STATUS DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ SYSTEM STATUS
├ Database: ✅ Connected
├ DB Name: maraki
├ Redis: ✅ Connected
├ Node: v20.11.0
├ Uptime: 2d 5h 30m
└ Memory: 145MB / 256MB

👥 USER STATISTICS
├ Total Users: 1,234
├ Premium: 45 (3.6%)
├ Free: 1,189 (96.4%)
├ New Today: 23
├ Active (24h): 156
└ Active (7d): 487

📊 USER LEVELS
├ Beginner: 567
├ Intermediate: 489
└ Advanced: 178

📚 LEARNING ACTIVITY
├ Conversations: 1,234
├ Grammar Corrections: 5,678
├ Lessons Completed: 2,345
├ Chat Messages: 12,456
└ Quizzes Completed: 890

💰 PAYMENT STATISTICS
├ Total Payments: 67
├ Completed: 45
├ Pending: 12
├ Failed: 10
└ Revenue: 22,500 ETB

🔗 REFERRAL STATISTICS
└ Total Referrals: 234

━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Generated: 11/24/2025, 1:05:00 PM EAT
```

---

## 🚨 Important Notes

- **Keep ADMIN_ID Secret:** Never commit your `.env` file to version control
- **Test Access:** Verify admin access works before deploying
- **Monitor Usage:** Check logs for unauthorized access attempts
- **Regular Updates:** Review admin list periodically

---

## 🔮 Future Admin Commands (Planned)

- `/admin_broadcast` - Send message to all users
- `/admin_grant_premium` - Manually grant premium access
- `/admin_users` - Search and manage users
- `/admin_ban` - Ban/unban users
- `/admin_stats_export` - Export statistics to CSV
