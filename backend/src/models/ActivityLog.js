import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    action: { type: String, required: true, index: true }, // e.g., 'login', 'user_blocked', 'balance_added'
    resourceType: { type: String, index: true }, // e.g., 'User', 'Withdrawal', 'AppSettings'
    resourceId: { type: mongoose.Schema.Types.ObjectId, index: true }, // ID of the resource affected
    details: mongoose.Schema.Types.Mixed, // Additional context about the action
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Indexes for common queries
activityLogSchema.index({ adminId: 1, createdAt: -1 });
activityLogSchema.index({ resourceType: 1, resourceId: 1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);