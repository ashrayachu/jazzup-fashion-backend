const express = require("express");
const { verifyAdmin } = require("../middleware/auth");
const { createProduct } = require("../controllers/productController");
const uploadS3 = require("../config/s3Config");
const { AddCategory, CatergoryList, getProducts, getSingleProduct, updateProduct } = require("../controllers/productController");

const router = express.Router();

//Admin Routes
router.post("/product-create", verifyAdmin, (req, res, next) => {
    const upload = uploadS3.any();
    upload(req, res, (err) => {
        if (err) {
            console.error("Multer/S3 upload error:", err);
            return res.status(500).json({
                success: false,
                message: "File upload failed",
                error: err.message
            });
        }
        next();
    });
}, createProduct);
router.post("/product-category-add", verifyAdmin, AddCategory);
router.get("/product-categories", verifyAdmin, CatergoryList);
router.get("/products", verifyAdmin, getProducts);
router.get("/product/:id", verifyAdmin, getSingleProduct);
router.put("/product/:id", verifyAdmin, (req, res, next) => {
    const upload = uploadS3.any();
    upload(req, res, (err) => {
        if (err) {
            console.error("Multer/S3 upload error:", err);
            return res.status(500).json({
                success: false,
                message: "File upload failed",
                error: err.message
            });
        }
        next();
    });
}, updateProduct);


module.exports = router;
