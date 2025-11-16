import mongoose, { Schema } from 'mongoose';
export var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["CHAPA"] = "chapa";
    PaymentProvider["FREE"] = "free";
})(PaymentProvider || (PaymentProvider = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
})(PaymentStatus || (PaymentStatus = {}));
export var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["PREMIUM"] = "premium";
    SubscriptionTier["PRO"] = "pro";
})(SubscriptionTier || (SubscriptionTier = {}));
const PaymentSchema = new Schema({
    telegramId: { type: Number, required: true, index: true },
    provider: { type: String, enum: Object.values(PaymentProvider), required: true },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
    amount: { type: Number, required: true },
    subscriptionTier: { type: String, enum: Object.values(SubscriptionTier), required: true },
    subscriptionDuration: { type: Number, required: true },
    expiresAt: { type: Date, default: null },
    providerData: { type: Schema.Types.Mixed, default: {} },
    description: { type: String, default: null },
    notes: { type: String, default: null },
}, { timestamps: true });
export const Payment = mongoose.model('Payment', PaymentSchema);
