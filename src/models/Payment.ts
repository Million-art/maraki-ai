import mongoose, { Document, Schema } from 'mongoose';

export enum PaymentProvider {
  CHAPA = 'chapa',
  FREE = 'free'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO = 'pro'
}

export interface IPayment extends Document {
  telegramId: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  subscriptionTier: SubscriptionTier;
  subscriptionDuration: number;
  expiresAt?: Date;
  providerData: {
    transactionId?: string;
    customerId?: string;
    paymentMethod?: string;
    checkoutUrl?: string;
    transactionRef?: string;
    [key: string]: any;
  };
  description?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
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

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
