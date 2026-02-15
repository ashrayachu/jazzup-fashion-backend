const express = require("express");
const { getChatHistory } = require("../controllers/chatController");

const router = express.Router();

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get("/history/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userId } = req.query;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required",
            });
        }

        const messages = await getChatHistory(sessionId, userId || null);

        res.status(200).json({
            success: true,
            data: {
                sessionId,
                messages,
                count: messages.length,
            },
        });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chat history",
            error: error.message,
        });
    }
});

/**
 * GET /api/chat/sessions
 * Get all sessions for a user (authenticated only)
 * This can be useful for showing chat history in user dashboard
 */
router.get("/sessions", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const ChatMessage = require("../models/ChatMessage");

        // Get unique sessions for this user
        const sessions = await ChatMessage.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: "$sessionId",
                    lastMessage: { $last: "$message" },
                    lastMessageTime: { $last: "$createdAt" },
                    messageCount: { $sum: 1 },
                },
            },
            { $sort: { lastMessageTime: -1 } },
        ]);

        res.status(200).json({
            success: true,
            data: {
                sessions,
                count: sessions.length,
            },
        });
    } catch (error) {
        console.error("Error fetching user sessions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user sessions",
            error: error.message,
        });
    }
});

module.exports = router;
