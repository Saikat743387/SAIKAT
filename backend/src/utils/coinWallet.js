import mongoose from "mongoose";
import User from "../models/User.js";
import CoinTransaction from "../models/CoinTransaction.js";

/**
 * Credits (amount > 0) or debits (amount < 0) a user's coin balance and
 * writes a matching CoinTransaction row in the same call, so every coin
 * movement is always explainable from the transaction log.
 *
 * Uses an atomic MongoDB update ($inc + $gte) to prevent race conditions
 * where concurrent requests could both read the same balance and spend
 * coins that don't exist (double-spend).
 *
 * Throws if a debit would take the balance below zero.
 */
export async function applyCoinTransaction({ userId, type, amount, referenceId = null, note = "" }) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const balanceBefore = Number(user.coins);
  const balanceAfter = balanceBefore + amount;

  if (balanceAfter < 0) {
    throw new Error("Insufficient coin balance");
  }

  // Atomic update: only succeeds if the user still has enough balance.
  // This prevents race conditions where two concurrent requests both read
  // the same balance and both pass the check above.
  const result = await User.findOneAndUpdate(
    { _id: userId, coins: { $gte: balanceBefore } },
    {
      $inc: { coins: amount, totalEarned: amount > 0 ? amount : 0 },
    },
    { new: true }
  );

  if (!result) {
    // Another request modified the balance between our read and this update.
    // The user likely already spent those coins — treat as insufficient balance.
    throw new Error("Insufficient coin balance");
  }

  const tx = await CoinTransaction.create({
    userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    referenceId,
    note,
  });

  return { user: result, tx };
}
