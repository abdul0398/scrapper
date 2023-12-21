
const cheerio = require('cheerio');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const rephrase = require("./openAi.js");
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

   // Rephrase text inside <p> tags
  const rephrasePromises = [];
  $('p').each((index, element) => {
    const currentText = $(element).text();
    if (currentText.length >= 120) {
      const rephrasePromise = rephrase(currentText)
        .then(newText => {
          $(element).text(newText);
        })
        .catch(error => {
          console.error(error.message);
        });

      rephrasePromises.push(rephrasePromise);
    }
  });

  // Wait for all rephrase promises to resolve before continuing
  try {
    await Promise.all(rephrasePromises);
  } catch (error) {
    console.log(error.message);
  }

  const modifiedHtmlString = $.html("body > *");

  fs.writeFileSync("index.html", modifiedHtmlString);
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



module.exports = {
  changeImgSrcToLocal,
  getImageLink,
  generateRandomString,
  getCurrentTimestamp
}



