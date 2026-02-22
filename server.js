require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectDb } = require("./config/db");
const authRouter = require("./routes/authRoutes");
const adminRouter = require("./routes/adminRoutes");
const userRouter = require("./routes/userRoutes");
const chatRouter = require("./routes/chatRoutes");
const { initializeChatHandlers } = require("./controllers/chatSocketHandlers");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", process.env.FRONTEND_VITE_URL, process.env.CLOUDFRONT_URL].filter(Boolean),
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Initialize chat socket handlers
initializeChatHandlers(io);

// Middlewares
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173", process.env.FRONTEND_VITE_URL, process.env.CLOUDFRONT_URL].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api", userRouter);
app.use("/api/chat", chatRouter);


// Default Route
app.get("/", (req, res) => {
    res.send("🚀 API is running...");
});

// Error handling middleware
app.use((err, req, res, next) => {
    const error = {
        success: false,
        status: err.status || 500,
        message: err.message || "Something went wrong",
    };
    res.status(error.status).json(error);
});

server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO server ready for connections`);
    await connectDb();
});

