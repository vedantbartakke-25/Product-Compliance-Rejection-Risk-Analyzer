require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAI() {
  console.log("🔑 Checking API Key...");
  const key = process.env.GEMINI_API_KEY;
  
  if (!key) {
    console.error("❌ ERROR: API Key is undefined. Check your .env file!");
    return;
  }
  console.log(`✅ Key found: ${key.substring(0, 5)}...`);

  console.log("🤖 Connecting to Gemini...");
  try {
    const genAI = new GoogleGenerativeAI(key);
    // Use 'gemini-1.5-flash' - it is faster and more reliable for free tier
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = "Explain in one sentence why using Mercury in soap is bad.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("\n✅ AI RESPONSE SUCCESS:");
    console.log(text);

  } catch (error) {
    console.error("\n❌ AI CONNECTION FAILED:");
    console.error(error.message);
  }
}

testAI();