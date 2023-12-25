require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro"});

async function geminiApiHandler(text, action) {
    console.log("Gemini is running")
    try {
        const result = await model.generateContent(text + action);
        const response = await result.response;
        const res = response.text();
        return res;
    } catch (error) {
        console.error('Error:', error.message || error);
        return false
    }
}

module.exports = {geminiApiHandler}