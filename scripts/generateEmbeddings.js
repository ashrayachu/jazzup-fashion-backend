const dotenv = require("dotenv");

dotenv.config();
const mongoose = require("mongoose");
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
const Product = require("../models/Product"); // Adjust path if needed
const Category = require("../models/Category"); // Required for populate to work

const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2"
});

async function generateEmbeddings() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Fetch all products
        const products = await Product.find({}).populate('category');
        console.log(`Found ${products.length} products to process`);

        if (products.length === 0) {
            console.log('⚠️  No products found in database');
            process.exit(0);
        }

        let processed = 0;
        let failed = 0;

        for (const product of products) {
            try {
                // Extract colors from variants
                const colors = product.variants
                    .map(v => v.color)
                    .filter(Boolean)
                    .join(', ');

                // Extract sizes from variants
                const sizes = product.variants
                    .flatMap(v => v.sizes.map(s => s.size))
                    .filter(Boolean)
                    .join(', ');

                // Get category name
                const categoryName = product.category?.name || product.subCategory || 'uncategorized';

                // Create rich text for embedding
                const embeddingText = `
          ${product.name}
          Brand: ${product.brand || 'Generic'}
          Category: ${categoryName}
          Sub-category: ${product.subCategory || ''}
          Description: ${product.description || ''}
          Colors available: ${colors}
          Sizes available: ${sizes}
          Collections: ${product.collections?.join(', ') || ''}
          Fabric: ${product.fabric || 'standard'}
          Fit type: ${product.fitType || 'regular'}
          Sleeve type: ${product.sleeveType || 'standard'}
          Size type: ${product.sizeType || 'standard'}
          Price: ₹${product.price}
        `.trim().replace(/\s+/g, ' '); // Remove extra whitespace

                // Generate embedding
                console.log(`Processing: ${product.name}...`);
                const embedding = await embeddings.embedQuery(embeddingText);

                // Update product with embedding
                await Product.updateOne(
                    { _id: product._id },
                    {
                        $set: {
                            embedding: embedding,
                            embeddingText: embeddingText
                        }
                    }
                );

                processed++;
                console.log(`✓ [${processed}/${products.length}] ${product.name}`);

                // Rate limiting: wait 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (err) {
                failed++;
                console.error(`✗ Error processing "${product.name}":`, err.message);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✓ Successfully processed: ${processed} products`);
        if (failed > 0) {
            console.log(`✗ Failed: ${failed} products`);
        }
        console.log('='.repeat(50));

        process.exit(0);

    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

// Run the script
generateEmbeddings();