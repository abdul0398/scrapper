require("dotenv").config();

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function rephrase(prompt) {
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt + "\n Please rephrase the above sentence, with same number of paras"}],
      model: 'gpt-4',
    });

    // Check if the response has choices before accessing them
    if (chatCompletion.choices && chatCompletion.choices.length > 0) {
      return chatCompletion.choices[0].message.content;
    } else {
      return false;
    }
  } catch (error) {
      console.error('Error:', error.message || error);
      return false
  }
}

module.exports = rephrase;
