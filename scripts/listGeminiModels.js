require("dotenv").config();
const https = require("https");

async function listGeminiModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ GEMINI_API_KEY not found in .env file");
            return;
        }

        console.log("📋 Fetching available Google Gemini models...\n");

        // Use Google's REST API to list models
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        https.get(url, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    const response = JSON.parse(data);

                    if (response.error) {
                        console.error("❌ API Error:", response.error.message);
                        return;
                    }

                    const models = response.models || [];
                    console.log(`Found ${models.length} models:\n`);
                    console.log("=".repeat(100));

                    models.forEach((model, index) => {
                        console.log(`\n${index + 1}. ${model.name}`);
                        console.log(`   Display Name: ${model.displayName || "N/A"}`);
                        console.log(`   Description: ${model.description || "N/A"}`);
                        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(", ") || "N/A"}`);
                        console.log(`   Input Token Limit: ${model.inputTokenLimit || "N/A"}`);
                        console.log(`   Output Token Limit: ${model.outputTokenLimit || "N/A"}`);
                        console.log(`   Temperature: ${model.temperature !== undefined ? model.temperature : "N/A"}`);
                        console.log(`   Top P: ${model.topP !== undefined ? model.topP : "N/A"}`);
                        console.log(`   Top K: ${model.topK !== undefined ? model.topK : "N/A"}`);
                        console.log("-".repeat(100));
                    });

                    console.log("\n✅ Model listing complete");
                    console.log("\n💡 Recommended models for chat:");
                    console.log("   - gemini-1.5-pro (best quality, slower)");
                    console.log("   - gemini-1.5-flash (fast, good quality)");
                    console.log("   - gemini-2.0-flash-exp (experimental, latest features)");

                } catch (parseError) {
                    console.error("❌ Error parsing response:", parseError.message);
                    console.log("Raw response:", data);
                }
            });
        }).on("error", (error) => {
            console.error("❌ Error fetching models:", error.message);
        });

    } catch (error) {
        console.error("❌ Error listing models:", error.message);
    }
}

listGeminiModels();
