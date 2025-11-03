// models/Product.js
const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
    color: String,
    colorCode: String,
    images: [String], // URLs from AWS S3
    sizes: [
        {
            size: String,
            quantity: Number,
        },
    ],
});

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        brand: { type: String },
        category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
        subCategory: { type: String },
        price: { type: Number, required: true },
        description: { type: String },
        sizeType: { type: String },
        fabric: { type: String },
        fitType: { type: String },
        sleeveType: { type: String },
        variants: [variantSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
