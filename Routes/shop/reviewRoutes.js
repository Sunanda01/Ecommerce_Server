const routes = require("express").Router();
const {
  addProductReview,
  getProductReviews,
} = require("../../Controller/shop/reviewController");
const {verifyToken}= require('../../Middleware/verification');
routes.post("/add",addProductReview);
routes.get("/:productId",getProductReviews);
module.exports = routes;