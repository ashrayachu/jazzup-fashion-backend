const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null, // Null for guest users
        },
        sessionId: {
            type: String,
            required: true,
            index: true, // For faster queries
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        sender: {
            type: String,
            enum: ["user", "bot"],
            required: true,
        },
        metadata: {
            productContext: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                },
            ],
            sentimentScore: {
                type: Number,
                min: -1,
                max: 1,
            },
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Index for efficient querying by session and time
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
