const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add to Cart or Update Quantity
const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.user.id; // Assuming user ID comes from auth middleware

        // Validate product exists and get price
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Get unit price from product
        const unitPrice = product.price;

        // Check if product already exists in cart
        const existingCartItem = await Cart.findOne({
            userId,
            productId
        });

        if (existingCartItem) {
            // Update quantity and recalculate total price
            existingCartItem.quantity += quantity;
            existingCartItem.price = unitPrice * existingCartItem.quantity; // Total price for this item
            await existingCartItem.save();

            // Get cart totals
            const allCartItems = await Cart.find({ userId });
            const cartTotal = allCartItems.reduce((sum, item) => sum + item.price, 0);
            const totalItems = allCartItems.reduce((sum, item) => sum + item.quantity, 0);

            return res.status(200).json({
                message: "Cart updated successfully",
                cart: existingCartItem,
                cartSummary: {
                    totalPrice: cartTotal,
                    totalItems: totalItems,
                    itemCount: allCartItems.length
                }
            });
        }

        // Calculate total price for new cart item
        const totalPrice = unitPrice * quantity;

        // Create new cart item
        const newCartItem = new Cart({
            userId,
            productId,
            quantity,
            price: totalPrice // Store total price (unitPrice × quantity)
        });

        await newCartItem.save();

        // Get cart totals after adding new item
        const allCartItems = await Cart.find({ userId });
        const cartTotal = allCartItems.reduce((sum, item) => sum + item.price, 0);
        const totalItems = allCartItems.reduce((sum, item) => sum + item.quantity, 0);

        res.status(201).json({
            message: "Product added to cart successfully",
            cart: newCartItem,
            cartSummary: {
                totalPrice: cartTotal,
                totalItems: totalItems,
                itemCount: allCartItems.length
            }
        });

    } catch (error) {
        console.error("Add to cart error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get user's cart
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const cartItems = await Cart.find({ userId })
            .populate("productId", "name image description")
            .sort({ createdAt: -1 });

        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.status(200).json({
            cart: cartItems,
            total,
            itemCount: cartItems.length
        });

    } catch (error) {
        console.error("Get cart error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
    try {
        const { cartId } = req.params;
        const { quantity } = req.body;
        const userId = req.user.id;

        if (quantity < 1) {
            return res.status(400).json({ message: "Quantity must be at least 1" });
        }

        const cartItem = await Cart.findOne({ _id: cartId, userId });

        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        res.status(200).json({
            message: "Cart item updated successfully",
            cart: cartItem
        });

    } catch (error) {
        console.error("Update cart error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const { cartId } = req.params;
        const userId = req.user.id;

        const cartItem = await Cart.findOneAndDelete({ _id: cartId, userId });

        if (!cartItem) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        res.status(200).json({ message: "Item removed from cart successfully" });

    } catch (error) {
        console.error("Remove from cart error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Clear entire cart
const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;

        await Cart.deleteMany({ userId });

        res.status(200).json({ message: "Cart cleared successfully" });

    } catch (error) {
        console.error("Clear cart error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart,
    clearCart
};  