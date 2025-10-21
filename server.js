require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectDb } = require("./config/db");
const authRouter = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRouter);

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

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await connectDb();
});
