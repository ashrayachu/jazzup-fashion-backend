const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        embedding: {
            type: [Number],
            select: false
        },
        embeddingText: String
    },
    { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
