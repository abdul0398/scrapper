
const cheerio = require('cheerio');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const rephrase = require("./openAi.js");


async function changeImgSrcToLocal(htmlString) {
  const $ = cheerio.load(htmlString);
  const promises = [];

  console.log("Changing The Image Link and Rephrasing The Blog Text.....");


  $('img').each((index, element) => {
      const srcLink = element.attribs.src;
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
  return modifiedHtmlString;
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



module.exports = {
  changeImgSrcToLocal,
  getImageLink,
  generateRandomString
}



