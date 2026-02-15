const express = require("express");
const { verifyUser, verifyAdmin } = require("../middleware/auth");
const { getCollectionProducts, CatergoryList, getProducts } = require("../controllers/productController");
const { addToCart, getCart, updateCartItem, removeFromCart, clearCart } = require("../controllers/cartController")


const router = express.Router();

//User
router.get("/products/collection/:collection", getCollectionProducts);
router.get("/categories", CatergoryList)
router.get("/products", getProducts)
router.post("/add-to-cart", addToCart)
router.get("/get-cart", getCart)
router.get("/update-cart", updateCartItem)
router.get("/remove-from-cart", removeFromCart)
router.get("/clear-cart", clearCart)





module.exports = router;
