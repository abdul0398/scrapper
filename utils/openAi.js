require("dotenv").config();

const OpenAI = require('openai');
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

const {geminiApiHandler} = require("./geminiApi");

async function openAiHandler(text, action) {
  console.log("GPT rephrasing the text")
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
  const data = process.env.AI_TYPE == "GPT"? await rephrase(heading,`\n provide 3 tags and 1 categories of above title in this format {["tag1","tag2","tag3"],["categorie"]}`) : await geminiApiHandler(heading, `\n provide 3 tags and 1 categories of above title in this format {["tag1","tag2","tag3"],["categorie"]}`);
  return extractTagsAndCategories(data);
}



function extractTagsAndCategories(inputString) {
  try {
    let regex = /\[.*?\]/g;
    let matches = inputString.match(regex);    
    let arrays = matches.map(match => JSON.parse(match.replace(/'/g, '"')));
    return arrays;
  } catch (error) {
      console.log(error);    
      return {};
  }
}

module.exports = {openAiHandler, getTagsAndCategories};