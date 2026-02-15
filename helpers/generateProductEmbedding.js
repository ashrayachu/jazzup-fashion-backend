const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");

// Initialize embeddings client
const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2"
});

/**
 * Generate embedding for a product
 */
async function generateProductEmbedding(product) {
    try {
        // Extract colors from variants
        const colors = product.variants
            ?.map(v => v.color)
            .filter(Boolean)
            .join(', ') || 'various colors';

        // Extract sizes from all variants
        const sizes = product.variants
            ?.flatMap(v => v.sizes?.map(s => s.size))
            .filter(Boolean)
            .join(', ') || 'various sizes';

        // Create comprehensive text description for embedding
        const embeddingText = `
      ${product.name}
      Brand: ${product.brand || 'Generic'}
      Category: ${product.subCategory || 'General'}
      Description: ${product.description || 'No description available'}
      Available colors: ${colors}
      Available sizes: ${sizes}
      Collections: ${product.collections?.join(', ') || 'Standard'}
      Fabric: ${product.fabric || 'standard material'}
      Fit type: ${product.fitType || 'regular fit'}
      Sleeve type: ${product.sleeveType || 'standard sleeve'}
      Size type: ${product.sizeType || 'standard sizing'}
      Price: ₹${product.price}
    `.trim().replace(/\s+/g, ' '); // Remove extra whitespace

        console.log(`🔄 Generating embedding for: ${product.name}`);

        // Generate embedding using LangChain
        const embedding = await embeddings.embedQuery(embeddingText);

        console.log(`✅ Embedding generated (${embedding.length} dimensions)`);

        return {
            embedding,
            embeddingText
        };

    } catch (error) {
        console.error('Error in generateProductEmbedding:', error);
        throw error;
    }
}

module.exports = {
    generateProductEmbedding
};