const express = require("express");
const {verifyUser, verifyAdmin} = require("../middleware/auth");
const { register, login, getProfile } = require("../controllers/authController");
 
const router = express.Router();

//User Routes
router.post("/register", register);
router.post("/login", login);
router.get("/profile", verifyUser, getProfile);

//Admin Routes
router.post("/admin/profile", verifyAdmin, getProfile);




module.exports = router;
