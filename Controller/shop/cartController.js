const Cart = require("../../Models/Cart");
const Product = require("../../Models/Product");
const customErrorHandler = require("../../Services/customErrorHandler");

const addToCart = async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;
    if (!userId || !productId || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid Data Provided" });
    }
    const product = await Product.findById(productId);
    if (!product) return next(customErrorHandler.notFound("Product Not Found"));
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const findCurrentProductIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (findCurrentProductIndex === -1) {
      cart.items.push({ productId, quantity });
    } else {
      cart.items[findCurrentProductIndex].quantity += quantity;
    }
    await cart.save();
    return res.status(200).json({ success: true, msg: "Added to Cart", data: cart });
  } catch (error) {
    return next(error);
  }
};

const fetchCart = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, msg: "Invalid Data Provided" });
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "image title price salePrice",
    });
    if (!cart) return next(customErrorHandler.notFound("Cart Not Found"));
    const validItems = cart.items.filter(
      (productItem) => productItem.productId
    );
    if (validItems.length < cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }
    const populateCartItems = validItems.map((item) => ({
      productId: item.productId._id,
      image: item.productId.image,
      title: item.productId.title,
      price: item.productId.price,
      salePrice: item.productId.salePrice,
      quantity: item.quantity,
    }));
    return res.status(200).json({
      success: true,
      msg: "Product Fetched Successfully",
      data: { ...cart._doc, items: populateCartItems },
    });
  } catch (error) {
    return next(error);
  }
};

const updateCart = async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;
    if (!userId || !productId || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid Data Provided" });
    }
    const cart = await Cart.findOne({ userId });
    if (!cart) return next(customErrorHandler.notFound("Cart Not Found"));
    const findCurrentProductIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (findCurrentProductIndex === -1) {
      return res.status(404).json({ success: false, msg: "Cart Empty" });
    }
    cart.items[findCurrentProductIndex].quantity = quantity;
    await cart.save();
    await cart.populate({
      path: "items.productId",
      select: "image title  price salePrice",
    });
    const populateCartItems = cart.items.map((item) => ({
      productId: item.productId ? item.productId._id : null,
      image: item.productId ? item.productId.image : null,
      title: item.productId ? item.productId.title : "Product not found",
      price: item.productId ? item.productId.price : null,
      salePrice: item.productId ? item.productId.salePrice : null,
      quantity: item.quantity,
    }));
    return res.status(200).json({
      success: true,
      msg: "Cart Updated Successfully",
      data: { ...cart._doc, items: populateCartItems },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteCart = async (req, res, next) => {
  try {
    const { userId, productId } = req.params;
    if (!userId || !productId) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid Data Provided" });
    }
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "image title price salePrice",
    });
    if (!cart) return next(customErrorHandler.notFound("Cart Not Found"));
    cart.items = cart.items.filter(
      (item) => item.productId._id.toString() !== productId
    );
    await cart.save();
    await cart.populate({
      path: "items.productId",
      select: "image title price salePrice",
    });
    const populateCartItems = cart.items.map((item) => ({
      productId: item.productId ? item.productId._id : null,
      image: item.productId ? item.productId.image : null,
      title: item.productId ? item.productId.title : "Product not found",
      price: item.productId ? item.productId.price : null,
      salePrice: item.productId ? item.productId.salePrice : null,
      quantity: item.quantity,
    }));
    return res.status(200).json({
      success: true,
      msg: "Product Removed From Cart",
      data: { ...cart._doc, items: populateCartItems },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { addToCart, fetchCart, updateCart, deleteCart };
