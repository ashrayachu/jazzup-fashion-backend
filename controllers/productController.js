const Product = require("../models/Product");
// const User = require("../models/User");
const Category = require("../models/Category");




const createProduct = async (req, res) => {
   try {
      const formData = req.body;

      console.log("Form data in CREATE Product route:", formData);
      console.log("Uploaded files:", req.files);
      console.log("Number of files received:", req.files?.length);

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
         return res.status(400).json({
            success: false,
            message: "No images uploaded"
         });
      }

      // Parse variants metadata from JSON string
      const variantsMetadata = JSON.parse(formData.variants);

      // Group uploaded images by variant index
      const variantImages = {};

      req.files.forEach(file => {
         // Extract variant index from field name (e.g., "variant_0_image_1")
         const match = file.fieldname.match(/variant_(\d+)_image_\d+/);
         if (match) {
            const variantIndex = parseInt(match[1]);
            if (!variantImages[variantIndex]) {
               variantImages[variantIndex] = [];
            }
            // Push the S3 URL to the variant's images array
            variantImages[variantIndex].push(file.location);
         }
      });

      console.log("Grouped variant images:", variantImages);

      // Map images to their respective variants
      const variantsWithImages = variantsMetadata.map((variant, index) => ({
         color: variant.color,
         colorCode: variant.colorCode,
         images: variantImages[index] || [], // Assign images to correct variant
         sizes: variant.sizes
      }));

      console.log("Variants with images:", variantsWithImages);

      // Create a new product instance
      const newProduct = new Product({
         name: formData.name,
         brand: formData.brand,
         category: formData.categoryId, // Fixed: using categoryId from frontend
         subCategory: formData.subCategory,
         price: formData.price,
         description: formData.description,
         sizeType: formData.sizeType,
         fabric: formData.fabric || '',
         fitType: formData.fitType || '',
         sleeveType: formData.sleeveType || '',
         variants: variantsWithImages
      });

      // Save the product to the database
      const savedProduct = await newProduct.save();

      res.status(201).json({
         success: true,
         message: "Product created successfully",
         product: savedProduct
      });

   } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({
         success: false,
         message: "Error creating product",
         error: error.message
      });
   }
};


const getProducts = async (req, res) => {
   try {
      const {
         category,
         subCategory,
         brand,
         minPrice,
         maxPrice,
         sizeType,
         fabric,
         fitType,
         sleeveType,
         color,
         size,
         sortBy = 'createdAt',
         sortOrder = 'desc',
         page = 1,
         limit = 12,
         search
      } = req.query;

      // Build filter object
      const filter = {};

      // Category filter
      if (category) {
         filter.category = category;
      }

      // SubCategory filter
      if (subCategory) {
         filter.subCategory = subCategory;
      }

      // Brand filter
      if (brand) {
         filter.brand = { $regex: brand, $options: 'i' };
      }

      // Price range filter
      if (minPrice || maxPrice) {
         filter.price = {};
         if (minPrice) filter.price.$gte = Number(minPrice);
         if (maxPrice) filter.price.$lte = Number(maxPrice);
      }

      // Size type filter
      if (sizeType) {
         filter.sizeType = sizeType;
      }

      // Fabric filter
      if (fabric) {
         filter.fabric = { $regex: fabric, $options: 'i' };
      }

      // Fit type filter
      if (fitType) {
         filter.fitType = fitType;
      }

      // Sleeve type filter
      if (sleeveType) {
         filter.sleeveType = sleeveType;
      }

      // Color filter (searches within variants)
      if (color) {
         filter['variants.color'] = { $regex: color, $options: 'i' };
      }

      // Size filter (searches within variants)
      if (size) {
         filter['variants.sizes.size'] = { $regex: size, $options: 'i' };
      }

      // Search filter (searches in name and description)
      if (search) {
         filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
         ];
      }

      // Calculate pagination
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const products = await Product.find(filter)
         .populate('category', 'name') // Populate category name
         .sort(sort)
         .skip(skip)
         .limit(limitNumber)
         .lean();

      // Get total count for pagination
      const totalProducts = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limitNumber);

      res.status(200).json({
         success: true,
         data: {
            products,
            pagination: {
               currentPage: pageNumber,
               totalPages,
               totalProducts,
               limit: limitNumber,
               hasNextPage: pageNumber < totalPages,
               hasPrevPage: pageNumber > 1
            }
         }
      });

   } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({
         success: false,
         message: "Error fetching products",
         error: error.message
      });
   }
};




const AddCategory = async (req, res) => {
   const categoryData = req.body;
   try {
      const existingCategory = await Category.findOne({ name: categoryData.name });
      if (existingCategory) {
         return res.status(400).json({ success: false, message: "Category already exists" });
      }
      const newCategory = new Category(categoryData)
      await newCategory.save();
      const newCategoryList = await Category.find();
      res.status(201).json({
         success: true,
         message: "Category added successfully",
         categories: newCategoryList

      });
   }
   catch (error) {
      console.error("Error adding category:", error);
      res.status(500).json({
         success: false,
         message: "Error adding category",
         error: error.message
      });
   }
}

const CatergoryList = async (req, res) => {
   try {
      const categories = await Category.find();
      res.status(200).json({
         success: true,
         categories: categories
      });
   }
   catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
         success: false,
         message: "Error fetching categories",
         error: error.message
      });
   }
};





module.exports = {
   createProduct, AddCategory, CatergoryList, getProducts
};




