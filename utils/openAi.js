require("dotenv").config();

const OpenAI = require('openai');
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

async function rephrase(text, action) {
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: text + action}],
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



async function getTagsAndCategories(heading) {
  console.log("This is heading to generate tags", heading);
  const data = await rephrase(heading,`\n provide 3 tags and 1 categories of above title in this format {["tag1","tag2","tag3"],["categorie"]}`)
  console.log(typeof data);
  return extractTagsAndCategories(data);
}



function extractTagsAndCategories(inputString) {
  try {
      const cleanedInput = inputString.replace(/^{|\}$/g, '');

      const parts = cleanedInput.split(/\]\s*,\s*\[/);

      const arrays = parts.map(part => 
          part.replace(/\[|\]/g, '')  // Remove square brackets
             .split(',')             // Split by comma
             .map(item => item.trim().replace(/^"|"$/g, '')) // Trim each item and remove double quotes
      );
      return arrays;
  } catch (error) {
      console.log(error);    
      return {};
  }
}





module.exports = {rephrase, getTagsAndCategories};