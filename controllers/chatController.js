const ChatMessage = require("../models/ChatMessage");
const Product = require("../models/Product");
const User = require("../models/User");
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

// Initialize AI models (reusing existing configuration)
const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2"
});

const chatModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",      // ✅ Free tier model with good availability
    modelName: "gemini-2.5-flash-lite",  // ✅ Also include this
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
});

// Rate limiting variables to prevent 429 errors
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 4500; // 4.5 seconds between requests

/**
 * Get chat history for a session
 */
const getChatHistory = async (sessionId, userId = null, limit = 50) => {
    try {
        const query = { sessionId };
        if (userId) {
            query.userId = userId;
        }

        const messages = await ChatMessage.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return messages.reverse(); // Return in chronological order
    } catch (error) {
        console.error("Error fetching chat history:", error);
        throw error;
    }
};

/**
 * Save a chat message to the database  
 */
const saveChatMessage = async (messageData) => {
    try {
        const chatMessage = new ChatMessage(messageData);
        await chatMessage.save();
        return chatMessage;
    } catch (error) {
        console.error("Error saving chat message:", error);
        throw error;
    }
};

/**
 * Search for relevant products using embeddings
 */
const getProductContext = async (query, limit = 5) => {
    try {
        // Generate embedding for the user query
        const queryEmbedding = await embeddings.embedQuery(query);

        // Use MongoDB aggregation to find similar products
        const products = await Product.aggregate([
            {
                $addFields: {
                    similarity: {
                        $let: {
                            vars: {
                                dotProduct: {
                                    $reduce: {
                                        input: { $range: [0, { $size: "$embedding" }] },
                                        initialValue: 0,
                                        in: {
                                            $add: [
                                                "$$value",
                                                {
                                                    $multiply: [
                                                        { $arrayElemAt: ["$embedding", "$$this"] },
                                                        { $arrayElemAt: [queryEmbedding, "$$this"] }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: "$$dotProduct"
                        }
                    }
                }
            },
            { $match: { embedding: { $exists: true, $ne: null } } },
            { $sort: { similarity: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    brand: 1,
                    price: 1,
                    description: 1,
                    subCategory: 1,
                    collections: 1,
                    variants: {
                        $slice: ["$variants", 2] // Include first 2 variants with images
                    },
                    similarity: 1
                }
            }
        ]);

        return products;
    } catch (error) {
        console.error("Error getting product context:", error);
        return [];
    }
};

/**
 * Get user context (cart, recent orders) for authenticated users
 */
const getUserContext = async (userId) => {
    try {
        if (!userId) return null;

        const user = await User.findById(userId)
            .select("name email cart")
            .lean();

        return user;
    } catch (error) {
        console.error("Error getting user context:", error);
        return null;
    }
};

/**
 * Generate AI bot response using Google Gemini with rate limiting
 * Returns both the AI response text and product recommendations with images
 */
const generateBotResponse = async (userMessage, context = {}) => {
    try {
        // Wait if needed to respect rate limits
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;

        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
            console.log(`⏳ Rate limit: waiting ${Math.round(waitTime)}ms before API call`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const { sessionId, userId, recentHistory = [] } = context;

        // Get product context based on user message
        const relevantProducts = await getProductContext(userMessage, 3);

        // Get user context if authenticated
        const userContext = userId ? await getUserContext(userId) : null;

        // Build context for the AI
        let contextInfo = "";

        // Add product context
        if (relevantProducts.length > 0) {
            contextInfo += "\n\nRelevant Products:\n";
            relevantProducts.forEach((product, idx) => {
                const colors = product.variants?.map(v => v.color).filter(Boolean).join(", ") || "various";
                const imageUrl = product.variants?.[0]?.images?.[0] || "No image available";
                contextInfo += `${idx + 1}. ${product.name} by ${product.brand || "Generic"} - ₹${product.price}\n`;
                contextInfo += `   Category: ${product.subCategory || "General"}\n`;
                contextInfo += `   Colors: ${colors}\n`;
                contextInfo += `   Image: ${imageUrl}\n`;
                if (product.description) {
                    contextInfo += `   Description: ${product.description.substring(0, 100)}...\n`;
                }
            });
        }

        // Add user context if available
        if (userContext) {
            contextInfo += `\n\nUser Information:\n`;
            contextInfo += `Name: ${userContext.name}\n`;
            if (userContext.cart && userContext.cart.length > 0) {
                contextInfo += `Cart items: ${userContext.cart.length}\n`;
            }
        }

        // Add recent conversation history
        if (recentHistory.length > 0) {
            contextInfo += `\n\nRecent Conversation:\n`;
            recentHistory.slice(-4).forEach(msg => {
                contextInfo += `${msg.sender === "user" ? "Customer" : "Assistant"}: ${msg.message}\n`;
            });
        }

        // Create system prompt
        const systemPrompt = `You are a helpful AI shopping assistant for Jazzup Fashion, an e-commerce platform for fashion apparel. 

Your role:
- Help customers discover products that match their preferences
- Provide fashion advice and styling tips
- Answer questions about products, sizing, and fit
- Assist with navigation and shopping experience
- Be friendly, concise, and helpful

Guidelines:
- Keep responses under 3 sentences when possible
- When recommending products, mention the product names and prices (e.g., "Check out the Floral Summer Dress by Zara for ₹2,999")
- When users ask for links, say something like "You can click on the product card to view details" or "The clickable link is available on the product card"
- The system automatically provides clickable product cards whenever you recommend items
- If you don't have enough information, ask clarifying questions
- Use a warm, conversational tone
- For sizing questions, recommend checking the size guide or contacting support for specific measurements

${contextInfo}`;

        // Update timestamp BEFORE making the API call
        lastRequestTime = Date.now();

        // Generate response using Google Gemini
        const response = await chatModel.invoke([
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ]);

        // Prepare product data with images for frontend
        const frontendUrl = process.env.FRONTEND_VITE_URL || 'http://localhost:5173';
        const productData = relevantProducts.map(product => ({
            _id: product._id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            subCategory: product.subCategory,
            image: product.variants?.[0]?.images?.[0] || null,
            color: product.variants?.[0]?.color || null,
            url: `${frontendUrl}/product/${product._id}`, // Full clickable URL
        }));

        return {
            message: response.content,
            products: productData.length > 0 ? productData : null,
        };

    } catch (error) {
        console.error("Error generating bot response:", error);

        // Handle rate limit errors specifically
        if (error.status === 429 || error.message?.includes("429") || error.message?.includes("rate limit")) {
            console.error("⚠️ Rate limit hit despite throttling. Consider increasing MIN_REQUEST_INTERVAL.");
            return "I'm getting a lot of requests right now. Please wait a moment and try again!";
        }

        // Handle quota exceeded errors
        if (error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED")) {
            console.error("⚠️ API quota exhausted.");
            return "I've reached my daily limit. Please try again later or contact our support team.";
        }

        // Generic error message
        return "I apologize, but I'm having trouble processing your request right now. Please try again or contact our support team for assistance.";
    }
};

module.exports = {
    getChatHistory,
    saveChatMessage,
    getProductContext,
    getUserContext,
    generateBotResponse,
};
