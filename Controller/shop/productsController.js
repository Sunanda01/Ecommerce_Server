const Product = require("../../Models/Product");
const getFilteredProduct = async (req, res) => {
  try {
    const { category = [], brand = [], sortBy = "price-lowtohigh" } = req.query;
    let filters = {};
    if (category.length) {
      filters.category = { $in: category.split(",") };
    }

    if (brand.length) {
      filters.brand = { $in: brand.split(",") };
    }

    let sort = {};
    switch (sortBy) {
      case "price-lowtohigh":
        sort.price = 1;
        break;

      case "price-hightolow":
        sort.price = -1;
        break;

      case "title-atoz":
        sort.title = 1;
        break;

      case "title-ztoa":
        sort.title = -1;
        break;

      default:
        sort.price = 1;
        break;
    }

    const products = await Product.find(filters).sort(sort);
    res
      .status(200)
      .json({ success: true, msg: "Products Fetched", data: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Failed to fetch product" });
  }
};

const getProductDetails=async(req,res)=>{
    try{
        const {id}=req.params;
        const product=await Product.findById({_id:id});
        
        if(!product) return res.status(404).json({success:false,msg:"Product Not Found"});
        res.status(200).json({success:true,data:product});
    }
    catch(err){
        console.error(err);
        res.status(500).json({success:false,msg:"Failed to get details"});
    }
}

module.exports = { getFilteredProduct, getProductDetails };
