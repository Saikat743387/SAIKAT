import mongoose from "mongoose";

const taskCompletionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    rewardCoins: { type: Number, required: true },
  },
  { timestamps: true }
);

taskCompletionSchema.index({ userId: 1, taskId: 1 }, { unique: true });

export default mongoose.model("TaskCompletion", taskCompletionSchema);
