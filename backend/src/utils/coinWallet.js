import User from "../models/User.js";
import CoinTransaction from "../models/CoinTransaction.js";

/**
 * Credits (amount > 0) or debits (amount < 0) a user's coin balance and
 * writes a matching CoinTransaction row in the same call, so every coin
 * movement is always explainable from the transaction log.
 *
 * Throws if a debit would take the balance below zero.
 */
export async function applyCoinTransaction({ userId, type, amount, referenceId = null, note = "" }) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const balanceBefore = user.coins;
  const balanceAfter = balanceBefore + amount;

  if (balanceAfter < 0) {
    throw new Error("Insufficient coin balance");
  }

  user.coins = balanceAfter;
  if (amount > 0) {
    user.totalEarned += amount;
  }
  await user.save();

  const tx = await CoinTransaction.create({
    userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    referenceId,
    note,
  });

  return { user, tx };
}
