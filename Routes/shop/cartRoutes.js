const { addToCart, fetchCart, updateCart, deleteCart } = require('../../Controller/shop/cartController');
const routes=require('express').Router();
const {verifyToken}= require('../../Middleware/verification');
routes.post("/add",addToCart);
routes.get("/get/:userId",fetchCart);
routes.put("/update-cart",updateCart);
routes.delete("/:userId/:productId",deleteCart);
module.exports=routes; 