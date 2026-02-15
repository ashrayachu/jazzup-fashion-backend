const {
    getChatHistory,
    saveChatMessage,
    generateBotResponse,
} = require("./chatController");

/**
 * Initialize Socket.IO event handlers
 */
const initializeChatHandlers = (io) => {
    io.on("connection", (socket) => {
        console.log(`✅ New client connected: ${socket.id}`);

        /**
         * Join a chat session
         */
        socket.on("join_chat", async (data) => {
            try {
                const { sessionId, userId } = data;

                if (!sessionId) {
                    socket.emit("error", { message: "Session ID is required" });
                    return;
                }

                // Join the room
                socket.join(sessionId);
                console.log(`👤 Client ${socket.id} joined session: ${sessionId}`);

                // Fetch and send chat history
                const history = await getChatHistory(sessionId, userId || null);
                socket.emit("chat_history", { messages: history });

                // Send welcome message for new sessions
                if (history.length === 0) {
                    const welcomeMessage = {
                        sessionId,
                        userId: null,
                        message: "Hello! Welcome to Jazzup Fashion. I'm here to help you discover amazing fashion pieces. How can I assist you today?",
                        sender: "bot",
                    };

                    const savedWelcome = await saveChatMessage(welcomeMessage);
                    io.to(sessionId).emit("bot_message", {
                        message: savedWelcome.message,
                        sender: savedWelcome.sender,
                        timestamp: savedWelcome.createdAt,
                        messageId: savedWelcome._id,
                    });
                }
            } catch (error) {
                console.error("Error in join_chat:", error);
                socket.emit("error", { message: "Failed to join chat session" });
            }
        });

        /**
         * Handle user messages
         */
        socket.on("user_message", async (data) => {
            try {
                const { sessionId, userId, message } = data;

                if (!sessionId || !message) {
                    socket.emit("error", { message: "Session ID and message are required" });
                    return;
                }

                // Validate and sanitize message
                const sanitizedMessage = message.trim().substring(0, 1000); // Max 1000 chars

                if (!sanitizedMessage) {
                    socket.emit("error", { message: "Message cannot be empty" });
                    return;
                }

                // Save user message
                const userMessageData = {
                    sessionId,
                    userId: userId || null,
                    message: sanitizedMessage,
                    sender: "user",
                };

                const savedUserMessage = await saveChatMessage(userMessageData);

                // Emit acknowledgment to sender
                socket.emit("message_sent", {
                    message: savedUserMessage.message,
                    sender: savedUserMessage.sender,
                    timestamp: savedUserMessage.createdAt,
                    messageId: savedUserMessage._id,
                });

                // Broadcast to all clients in the session (for multi-device support)
                socket.to(sessionId).emit("user_message", {
                    message: savedUserMessage.message,
                    sender: savedUserMessage.sender,
                    timestamp: savedUserMessage.createdAt,
                    messageId: savedUserMessage._id,
                });

                // Emit typing indicator
                io.to(sessionId).emit("bot_typing", { isTyping: true });

                // Get recent history for context
                const recentHistory = await getChatHistory(sessionId, userId || null, 10);

                // Generate bot response (now returns { message, products })
                const botResponse = await generateBotResponse(sanitizedMessage, {
                    sessionId,
                    userId: userId || null,
                    recentHistory,
                });

                // Stop typing indicator
                io.to(sessionId).emit("bot_typing", { isTyping: false });

                // Extract message and product recommendations
                const botMessageText = typeof botResponse === 'string' ? botResponse : botResponse.message;
                const recommendedProducts = typeof botResponse === 'object' ? botResponse.products : null;

                // Debug logging
                console.log(`🤖 Bot Response Type:`, typeof botResponse);
                console.log(`📝 Message:`, botMessageText?.substring(0, 50));
                console.log(`🛍️ Products Count:`, recommendedProducts?.length || 0);
                if (recommendedProducts && recommendedProducts.length > 0) {
                    console.log(`📦 Sample Product:`, {
                        name: recommendedProducts[0].name,
                        url: recommendedProducts[0].url,
                        hasImage: !!recommendedProducts[0].image
                    });
                }

                // Save bot response
                const botMessageData = {
                    sessionId,
                    userId: null, // Bot messages don't have a userId
                    message: botMessageText,
                    sender: "bot",
                    metadata: {
                        productContext: recommendedProducts?.map(p => p._id) || [],
                    }
                };

                const savedBotMessage = await saveChatMessage(botMessageData);

                // Emit bot response to all clients in the session with product images
                const emitData = {
                    message: savedBotMessage.message,
                    sender: savedBotMessage.sender,
                    timestamp: savedBotMessage.createdAt,
                    messageId: savedBotMessage._id,
                    products: recommendedProducts, // Include product data with images
                };

                console.log(`✉️ Emitting bot_message with products:`, !!emitData.products);

                io.to(sessionId).emit("bot_message", emitData);

            } catch (error) {
                console.error("Error in user_message:", error);
                socket.emit("error", { message: "Failed to process message" });
                // Stop typing indicator on error
                socket.emit("bot_typing", { isTyping: false });
            }
        });

        /**
         * Handle typing indicator
         */
        socket.on("typing", (data) => {
            const { sessionId, isTyping } = data;
            if (sessionId) {
                socket.to(sessionId).emit("user_typing", { isTyping });
            }
        });

        /**
         * Handle disconnect
         */
        socket.on("disconnect", () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });

        /**
         * Handle errors
         */
        socket.on("error", (error) => {
            console.error(`Socket error for ${socket.id}:`, error);
        });
    });

    console.log("✅ Chat Socket.IO handlers initialized");
};

module.exports = { initializeChatHandlers };
