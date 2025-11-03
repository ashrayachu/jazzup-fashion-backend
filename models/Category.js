// models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        subCategories: [{ type: String }], // optional
    },
    { timestamps: true }
);

module.exports =  mongoose.model("Category", categorySchema);
