
const cheerio = require('cheerio');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const {openAiHandler, getTagsAndCategories} = require("./openAi.js");
const { geminiApiHandler } = require("./geminiApi.js");
const https = require('https');
const fetch = require('node-fetch');


const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Bypasses SSL certificate check; use with caution
});



async function changeImgSrcToLocal(htmlString) {
  const $ = cheerio.load(htmlString);
  const promises = [];
  let feat_img_link = '';
  console.log("Changing The Image Link and Rephrasing The Blog Text.....");


  $('img').each((index, element) => {
      const srcLink = element.attribs.src;
      if(index == 0){
        feat_img_link = srcLink;
      }
      const promise = getImageLink(srcLink)
          .then(newSrcLink => {
              $(element).attr('src', newSrcLink);
          })
          .catch(error => {
              console.error(error);
          });

      promises.push(promise);
  });
  
  // Wait for all promises to resolve before continuing
  try {
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  }

  

  const paragraphs = $('p');

  for (const element of paragraphs) {
    const currentText = $(element).text();
    if (currentText.length >= 120) {
      try {
        // Perform the rephrasing and wait for it to complete
        const newText = process.env.AI_TYPE == "BARD"? await geminiApiHandler(currentText, "\n Please rephrase the above sentence, with the same number of paras"):await openAiHandler(currentText, "\n Please rephrase the above sentence, with the same number of paras");
        $(element).text(newText);

        // Add a delay before making the next request
      } catch (error) {
        console.log("Error in rephrasing, hence skipping -", error.message);
      }
      await delay(1000); // Delays for 1 second; adjust as needed
    }
  }
  
  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  const modifiedHtmlString = $.html("body > *");

  return {modifiedHtmlString, feat_img_link};
}

async function getImageLink(imageUrl) {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    const filename = generateRandomString(30);
    const localFilePath = path.join('uploads', `${filename}.jpg`);
    const writer = fs.createWriteStream(localFilePath);
    response.data.pipe(writer);

    const hostedImageUrl = `${process.env.SERVER_URL}/uploads/${filename}.jpg`;
    return hostedImageUrl;
}

function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') 
    .slice(0, length);
}

function getCurrentTimestamp(string) {
  const now = new Date(string);

  const year = now.getFullYear();
  const month = ('0' + (now.getMonth() + 1)).slice(-2); // Months are 0-indexed in JS
  const day = ('0' + now.getDate()).slice(-2);
  const hours = ('0' + now.getHours()).slice(-2);
  const minutes = ('0' + now.getMinutes()).slice(-2);
  const seconds = ('0' + now.getSeconds()).slice(-2);
  const milliseconds = ('00' + now.getMilliseconds()).slice(-3); // Ensure 3 digits

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}


async function createTagsAndCategories(website, heading) {
  try {
    const [tags, categories] = await getTagsAndCategories(heading);
    console.log(tags, categories);
    const tagsPromises = tags.map(tag => createTagsApi(website, tag));
    const categoriesPromises = categories.map(category => createCategoriesApi(website, category));

    const tagsResponses = await Promise.all(tagsPromises);
    const categoriesResponses = await Promise.all(categoriesPromises);

    const tagsId = tagsResponses.map(res => res.id ? res.id : res.data.term_id);
    const categoriesId = categoriesResponses.map(res => res.id ? res.id : res.data.term_id);

    return { tagsId, categoriesId };
  } catch (error) {
    console.log("Error in creating Tags and Categories", error.message);
    return { tagsId: [], categoriesId: [] };
  }
}


async function getUsersId(website) {
  try {
      const response = await fetch(website.URL + '/wp-json/wp/v2/users', {
          method: 'GET',
          agent: httpsAgent,
          headers: {
              'Authorization': `Basic ${website.secret}`,
          }
      });
      const data = await response.json();
      const userIds = data.map((user)=>{
          return user.id
      })
      return userIds;
  } catch (error) {
      console.log(`Error in Checking Users on webiste ${website.URL}`, error.message);
      return false;       
  }
}

async function createUserHandler(website) {
  const users = [
      { name: "Benjamin Tan", username: "BenT_SG" },
      { name: "Jasmine Lim", username: "JazzyLim_SG" },
      { name: "Marcus Wong", username: "MarWong_SG" },
      { name: "Serena Koh", username: "SerKoh_SG" },
      { name: "Desmond Tan", username: "DesTan_SG" },
      { name: "Emily Ng", username: "EmiNg_SG" },
      { name: "Adrian Lee", username: "AdrLee_SG" },
      { name: "Natasha Chen", username: "NatChen_SG" },
      { name: "Aaron Goh", username: "AarGoh_SG" },
      { name: "Rachel Low", username: "RachLow_SG" }
  ];
  const bool = await checkIfUsersArePresent(website);
  if(bool){
      const usersId = await getUsersId(website);
      return usersId;
  }else{
      try {
          users.forEach(async user=>{
              await createUserApi(website, user);
          })
          console.log("User creation Successfull");
          const usersId = await getUsersId(website);
          return usersId;
      } catch (error) {
          return [0];
          console.log("Error in Creating users", error.message);
      }
  }

}

async function createUserApi(website, user) {
  try {
      const email = createEmailFromWebsite(website.URL, user.username);
      const response = await fetch(website.URL + '/wp-json/wp/v2/users', {
          method: 'POST',
          agent: httpsAgent,
          headers: {
              'Authorization': `Basic ${website.secret}`,
              'Content-Type': 'application/json', 
          },
          body: JSON.stringify({name:user.name, username:user.username, email:email, password:website.secret})
      });
  
      const res =  await response.json();
  } catch (error) {
      console.log(`Error in Creating user on webiste ${website.URL} with username ${user.username}`, error.message);
  }
}

async function checkIfUsersArePresent(website) {
  try {
      const response = await fetch(website.URL + '/wp-json/wp/v2/users', {
          method: 'GET',
          agent: httpsAgent,
          headers: {
              'Authorization': `Basic ${website.secret}`,
          }
      });
      const data = await response.json();
      return data.length > 6;
  } catch (error) {
      console.log(`Error in Checking Users on webiste ${website.URL}`, error.message);
      return false;       
  }
}

function createEmailFromWebsite(url, username) {
  try {
      const regex = /https?:\/\/(?:www\.)?([a-zA-Z]+\d*)\..*/;
      const match = url.match(regex);
  
      if (match) {
          const extractedText = match[1];
          return username+"@"+extractedText+".com";
      }
  } catch (error) {
      console.log("Error is mail generation in regex", error.message);
  }
}


async function createTagsApi(website, name) {
  try {
      const response = await fetch(website.URL + '/wp-json/wp/v2/tags', {
          method: 'POST',
          agent: httpsAgent,
          headers: {
              'Authorization': `Basic ${website.secret}`,
              'Content-Type': 'application/json', 
          },
          body: JSON.stringify({name:name})
      });
  
      const res =  await response.json();
      return res;
  } catch (error) {
      console.log(`Error in Creating tags on webiste ${website.URL} with name ${name}`, error.message);
  }
}
async function createCategoriesApi(website, name) {
  try {
      const response = await fetch(website.URL + '/wp-json/wp/v2/categories', {
          method: 'POST',
          agent: httpsAgent,
          headers: {
              'Authorization': `Basic ${website.secret}`,
              'Content-Type': 'application/json', 
          },
          body: JSON.stringify({name:name})
      });
  
      const res =  await response.json();
      return res;
  } catch (error) {
      console.log(`Error in Creating tags on webiste ${website.URL} with name ${name}`, error.message);
  }
}



module.exports = {
  changeImgSrcToLocal,
  getImageLink,
  generateRandomString,
  getCurrentTimestamp,
  createTagsAndCategories,
  createUserHandler,
}



