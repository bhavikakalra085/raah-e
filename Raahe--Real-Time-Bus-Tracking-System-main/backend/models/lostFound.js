// backend/models/lostFound.js
const mongoose = require("mongoose");

const LostFoundSchema = new mongoose.Schema(
  {
    // Who created the request (user)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // User snapshot (useful if user gets deleted later)
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    userPhone: { type: String, default: "" },

    // Complaint details
    busNumber: { type: String, required: true, trim: true },
    dateOfLoss: { type: Date, required: true },     // just the date (frontend can send "YYYY-MM-DD")
    approxTime: { type: String, default: "" },       // "HH:mm" (optional)
    itemType: {
      type: String,
      required: true,
      enum: [
        "Phone",
        "Wallet",
        "Bag",
        "Keys",
        "Water Bottle",
        "ID Card",
        "Umbrella",
        "Earbuds/Headphones",
        "Clothing",
        "Other",
      ],
    },
    description: { type: String, default: "" },

    // Status & resolution
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    pickupStationCity: { type: String, default: "" },
    resolutionNote: { type: String, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.LostFound || mongoose.model("LostFound", LostFoundSchema);
