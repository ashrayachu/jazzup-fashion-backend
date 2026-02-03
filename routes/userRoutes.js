const express = require("express");
const {verifyUser, verifyAdmin} = require("../middleware/auth");
const { getCollectionProducts } = require("../controllers/productController");

 
const router = express.Router();

//User
router.get("/products/collection/:collection", getCollectionProducts);



module.exports = router;
