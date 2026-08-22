import mongoose from "mongoose";

const TX_TYPES = [
  "DAILY_CLAIM",
  "AD_REWARD",
  "REFERRAL",
  "TASK_REWARD",
  "WITHDRAWAL",
  "WITHDRAWAL_REFUND",
  "ADMIN_ADJUST",
];

const coinTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: TX_TYPES, required: true },
    amount: { type: Number, required: true }, // positive credit, negative debit
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: String, default: null }, // e.g. ad callback id, withdrawal id, referred user id
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export const TX_TYPE = Object.fromEntries(TX_TYPES.map((t) => [t, t]));
export default mongoose.model("CoinTransaction", coinTransactionSchema);
