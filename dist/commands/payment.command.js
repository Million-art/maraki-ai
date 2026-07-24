import { apiService } from '../services/api.service.js';
export async function handlePaymentCommand(ctx) {
    if (!ctx.from)
        return;
    const paymentText = `💳 *Maraki VIP Subscription & Bank Transfer*\n\n` +
        `Unlock unlimited AI chat, speech practice, and full bank aptitude & Grade 12 exam modules!\n\n` +
        `📌 *Pricing Tiers:*\n` +
        `• ⚡ *Daily Pass*: 10 ETB / day\n` +
        `• 🌟 *Monthly VIP*: 150 ETB / month (Best Value)\n` +
        `• 🚀 *Yearly Pass*: 1,200 ETB / year\n\n` +
        `🏦 *Direct Bank Transfer Accounts:*\n` +
        `• *Commercial Bank of Ethiopia (CBE)*:\n` +
        `  ` + '`1000123456789`' + ` (Account: Maraki English)\n` +
        `• *Dashen Bank*:\n` +
        `  ` + '`0123456789001`' + ` (Account: Maraki English)\n` +
        `• *Telebirr*:\n` +
        `  ` + '`0911223344`' + `\n\n` +
        `✅ *How to Activate Instantly:*\n` +
        `1. Transfer the exact amount for your chosen tier.\n` +
        `2. Copy the receipt link from CBE Mobile/Dashen SuperApp (e.g., \`https://mbreciept.cbe.com.et/v2-XXXXXX\`) or reference ID.\n` +
        `3. Simply paste the link or reference directly in this chat!\n\n` +
        `⚡ Our automated system will verify your receipt with the bank and upgrade your account in seconds!`;
    await ctx.reply(paymentText, { parse_mode: 'Markdown' });
}
export async function handleReceiptVerification(ctx, referenceText) {
    if (!ctx.from)
        return;
    const telegramId = ctx.from.id;
    await ctx.reply(`🔄 *Verifying your bank receipt with the bank network... Please wait...*`, {
        parse_mode: 'Markdown',
    });
    try {
        const result = await apiService.verifyBankPayment(telegramId, referenceText);
        if (result.success) {
            await ctx.reply(`🎉 *PAYMENT VERIFIED SUCCESSFULLY!*\n\n` +
                `Bank: *${result.result?.bankName || 'CBE'}*\n` +
                `Amount: *${result.result?.amount || 150} ETB*\n` +
                `Reference: \`${result.result?.referenceNumber || referenceText}\`\n\n` +
                `🌟 Your *Maraki Premium* status is now ACTIVE! You have unlimited access to AI practice and exam modules.`, { parse_mode: 'Markdown' });
        }
        else {
            await ctx.reply(`❌ *Payment Verification Failed*\n\n` +
                `Reason: ${result.message || 'Transaction could not be verified'}.\n\n` +
                `Please ensure you pasted a valid CBE or Dashen receipt link/reference number, or contact support if you need assistance.`, { parse_mode: 'Markdown' });
        }
    }
    catch (error) {
        console.error('Receipt verification error:', error);
        await ctx.reply(`⚠️ *Verification Error*: Unable to connect to the bank network right now. Please try again in a few moments.`);
    }
}
