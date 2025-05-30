const paypal = require("@paypal/checkout-server-sdk");
const Order = require("../../Models/Order");
const Product = require("../../Models/Product");
const Cart = require("../../Models/Cart");
const client = require("../../Services/paypal");
const FRONTEND_URL = require("../../Config/config").FRONTEND_URL;
const redis_client = require("../../Utils/redisConnection");
const customErrorHandler = require("../../Services/customErrorHandler");
const INR_TO_USD_RATE = 83.25;
const createOrder = async (req, res, next) => {
  try {
    const {
      userId,
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus,
      totalAmount,
      orderDate,
      orderUpdateDate,
      cartId,
    } = req.body;

    const items = cartItems.map((item) => {
      const unitPriceUSD = item.price / INR_TO_USD_RATE;
      return {
        name: item.title,
        unit_amount: {
          currency_code: "USD",
          value: unitPriceUSD.toFixed(2),
        },
        quantity: item.quantity.toString(),
        description: item.title,
        sku: item.productId,
      };
    });

    const totalAmountUSD = items
      .reduce((sum, item) => {
        return (
          sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity)
        );
      }, 0)
      .toFixed(2);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: totalAmountUSD,
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: totalAmountUSD,
              },
            },
          },
          items,
        },
      ],
      application_context: {
        return_url: `${FRONTEND_URL}/shop/paypal-return`,
        cancel_url: `${FRONTEND_URL}/shop/paypal-cancel`,
        brand_name: "My Shop",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    });

    const order = await client.execute(request);
    const approvalLink = order.result.links.find(
      (link) => link.rel === "approve"
    )?.href;

    const newOrder = new Order({
      userId,
      cartId,
      cartItems,
      addressInfo,
      orderStatus,
      paymentMethod,
      paymentStatus,
      totalAmount,
      orderDate,
      orderUpdateDate,
      paymentId: order.result.id,
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      approvalURL: approvalLink,
      orderId: newOrder._id,
      paymentId: newOrder.paymentId,
    });
  } catch (error) {
    return next(error);
  }
};

const capturePayment = async (req, res, next) => {
  try {
    const { paymentId, payerId, orderId } = req.body;

    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, msg: "Order not found" });
    }

    const request = new paypal.orders.OrdersCaptureRequest(paymentId);
    request.requestBody({});

    const captureResponse = await client.execute(request);

    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    order.paymentId = paymentId;
    order.payerId = payerId;

    // Reduce stock
    for (let item of order.cartItems) {
      let product = await Product.findById(item.productId);
      if (!product)
        return next(
          customErrorHandler.notFound(`Product not found: ${item.title}`)
        );
      product.totalStock -= item.quantity;
      await product.save();
    }

    const cart = await Cart.findByIdAndDelete(order.cartId);
    await order.save();
    const redis_exists = await redis_client.exists("all_orderList");
    if (redis_exists) {
      await redis_client.del("all_orderList");
      await redis_client.del(`${cart.userId}_orderList`);
    }
    res.status(200).json({
      success: true,
      msg: "Order confirmed",
      data: order,
      captureResult: captureResponse.result,
    });
  } catch (error) {
    return next(error);
  }
};

const getAllOrdersByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const redis_data = await redis_client.get(`${userId}_orderList`);
    if (redis_data) {
      const parsed_data = JSON.parse(redis_data);
      return res.status(200).json({
        success: true,
        data: parsed_data.data,
      });
    }

    const orders = await Order.find({ userId });

    if (!orders.length)
      return next(customErrorHandler.notFound("No Orders Found"));
    await redis_client.set(
      `${userId}_orderList`,
      JSON.stringify({
        data: orders,
      }),
      "EX",
      1800
    );

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return next(error);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const redis_data = await redis_client.get(`${id}_order_details`);
    if (redis_data) {
      const parsed_data = JSON.parse(redis_data);
      return res.status(200).json({ success: true, data: parsed_data.data });
    }
    const order = await Order.findById(id);

    if (!order) return next(customErrorHandler.notFound("No Orders Found"));
    await redis_client.set(
      `${id}_order_details`,
      JSON.stringify({
        data: order,
      }),
      "EX",
      1800
    );
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  capturePayment,
  getAllOrdersByUser,
  getOrderDetails,
};
