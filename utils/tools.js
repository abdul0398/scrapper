
const cheerio = require('cheerio');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

async function changeImgSrcToLocal(htmlString) {
  const $ = cheerio.load(htmlString);
  console.log($("img").length);

  const promises = [];

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
  await Promise.all(promises);

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



