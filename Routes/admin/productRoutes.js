const {handleImageUpload, addProduct, editProduct, fetchAllProduct, deleteProduct} = require('../../Controller/admin/productController');
const { upload } = require('../../Middleware/cloudinary');
const router=require('express').Router();
router.post('/upload-image',upload.single('my_file'),handleImageUpload);
router.post('/add',addProduct);
router.post('/edit/:id',editProduct);
router.post('/get',fetchAllProduct);
router.post('/delete/:id',deleteProduct);
module.exports=router;