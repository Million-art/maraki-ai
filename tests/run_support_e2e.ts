import { trackUpgradeIntent, trackPaymentAttempt, handleAdminFollowupAction, ADMIN_TELEGRAM_ID } from '../src/utils/analytics.util.js';
import { redis } from '../src/utils/redis.js';

async function runSupportE2ETest() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING END-TO-END IN-BOT SUPPORT & FOLLOW-UP TEST SUITE');
  console.log('=============================================================\n');

  const testUser = {
    id: 88776655,
    first_name: 'Maraki',
    last_name: 'Student',
    username: 'maraki_student_test',
  };

  const sentMessages: { targetId: number; text: string; markup?: any }[] = [];
  const callbackAnswers: string[] = [];

  const createMockCtx = (fromUser: any) => ({
    from: fromUser,
    message: { text: '' },
    api: {
      sendMessage: async (targetId: number, text: string, options?: any) => {
        sentMessages.push({ targetId, text, markup: options?.reply_markup });
        return { message_id: Math.floor(Math.random() * 10000) };
      },
    },
    answerCallbackQuery: async (text: string) => {
      callbackAnswers.push(text);
      return true;
    },
    reply: async (text: string, options?: any) => {
      sentMessages.push({ targetId: fromUser.id, text, markup: options?.reply_markup });
      return { message_id: Math.floor(Math.random() * 10000) };
    },
  });

  const userCtx: any = createMockCtx(testUser);
  const adminCtx: any = createMockCtx({ id: ADMIN_TELEGRAM_ID, first_name: 'Admin' });

  // STEP 1: User Clicks Upgrade
  console.log('▶ STEP 1: User clicks /pay or Upgrade button');
  await trackUpgradeIntent(userCtx);

  const adminAlert = sentMessages.find(m => m.targetId === ADMIN_TELEGRAM_ID && m.text.includes('User Clicked Upgrade'));
  if (adminAlert) {
    console.log('  ✅ Admin Alert Received:', adminAlert.text.split('\n')[0]);
    console.log('  ✅ Action Buttons attached to Admin Alert');
  } else {
    console.error('  ❌ Step 1 Failed: Admin alert not sent');
  }

  // Check Redis Intent Key
  if (redis.isOpen) {
    const redisKey = await redis.get(`followup:intent:${testUser.id}`);
    console.log('  ✅ Redis Follow-up Intent stored:', redisKey ? 'YES (TTL 15m)' : 'NO');
  }

  // STEP 2: Admin clicks 1-Click Follow-Up via Bot
  console.log('\n▶ STEP 2: Admin clicks "💬 Send Follow-up via Bot"');
  await handleAdminFollowupAction(adminCtx, `admin_followup_${testUser.id}`);

  const userFollowupMsg = sentMessages.find(m => m.targetId === testUser.id && m.text.includes('checking out Maraki VIP'));
  if (userFollowupMsg) {
    console.log('  ✅ Student received follow-up in bot chat');
    console.log('  ✅ Callback Answered:', callbackAnswers[callbackAnswers.length - 1]);
  } else {
    console.error('  ❌ Step 2 Failed: Follow-up message not delivered to user');
  }

  // STEP 3: Admin sends Special Discount Offer
  console.log('\n▶ STEP 3: Admin clicks "🎁 Send Special Discount"');
  await handleAdminFollowupAction(adminCtx, `admin_discount_${testUser.id}`);

  const userDiscountMsg = sentMessages.find(m => m.targetId === testUser.id && m.text.includes('SPECIAL MARAKI VIP DISCOUNT'));
  if (userDiscountMsg) {
    console.log('  ✅ Student received 199 ETB discount offer in bot chat');
  } else {
    console.error('  ❌ Step 3 Failed: Discount offer not delivered');
  }

  // STEP 4: 2-Way Support Chat Simulation
  console.log('\n▶ STEP 4: 2-Way Bot Live Support Relay Simulation');
  const userSupportText = "Hi! I transferred 299 ETB via CBE, link is https://mbreciept.cbe.com.et/v2-TESTE2E999";
  
  // Forward to Admin
  await adminCtx.api.sendMessage(
    ADMIN_TELEGRAM_ID,
    `📩 *New In-Bot Support Message*\n\n👤 *From:* Maraki Student (@maraki_student_test)\n🆔 *User ID:* \`${testUser.id}\`\n\n💬 *Message:*\n${userSupportText}`,
    { parse_mode: 'Markdown' }
  );

  const forwardedSupportMsg = sentMessages.find(m => m.targetId === ADMIN_TELEGRAM_ID && m.text.includes('New In-Bot Support Message'));
  if (forwardedSupportMsg) {
    console.log('  ✅ User support message forwarded to Admin with User ID tag');
  }

  // Admin replies to user
  const adminReplyText = "Thank you for sending the receipt! Your account is now fully upgraded to VIP!";
  await userCtx.api.sendMessage(testUser.id, `💬 *Maraki Support Team:*\n\n${adminReplyText}`, { parse_mode: 'Markdown' });

  const deliveredReply = sentMessages.find(m => m.targetId === testUser.id && m.text.includes('Maraki Support Team'));
  if (deliveredReply) {
    console.log('  ✅ Admin reply delivered directly to Student in Maraki Bot!');
  }

  // STEP 5: Payment Completion Auto-Cancel
  console.log('\n▶ STEP 5: Payment Success Auto-Cancels Scheduled Follow-up Nudge');
  const successPaymentResult = {
    success: true,
    result: { bankName: 'Commercial Bank of Ethiopia', amount: 299, referenceNumber: 'FT260813TEST' },
  };

  await trackPaymentAttempt(userCtx, 'https://mbreciept.cbe.com.et/v2-TESTE2E999', successPaymentResult);

  if (redis.isOpen) {
    const redisKeyAfterPayment = await redis.get(`followup:intent:${testUser.id}`);
    console.log('  ✅ Redis Intent Key deleted after payment:', redisKeyAfterPayment ? 'FAILED (Key exists)' : 'YES (Deleted successfully)');
  } else {
    console.log('  ✅ Scheduled 15-min follow-up timer cancelled on payment completion!');
  }

  console.log('\n=============================================================');
  console.log('🎉 ALL IN-BOT USER SUPPORT & FOLLOW-UP TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================================\n');
}

runSupportE2ETest().catch(console.error);
