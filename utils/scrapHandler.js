require("dotenv").config();
const puppeteer = require("puppeteer");
const {sqlHandler} = require("../services/dbHandler.js");
const {changeImgSrcToLocal} = require("./tools.js");
const {postBlog, getBlog} = require("./WpHandler.js");

async function start() {
  const {addWebsite, getWebsites} = await sqlHandler();
  const websites = await getWebsites();
  console.log(websites);

  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 0,
  });
  const page = await browser.newPage();
  const navigationPromise = page.goto("https://www.propnex.com/picks");

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      _(new Error("Navigation timeout"));
    }, 10000);
  });

  try {
    await Promise.race([navigationPromise, timeoutPromise]);
  } catch (error) {
    console.log(error.message);
  }

  const newsListingBoxes = await page.$$(".news-listing-content");
  const arr = [];

  try {
    async function processBox(box) {
      const anchorTag = await box.$("a");

      if (anchorTag) {
          const linkedPageUrl = await (
            await anchorTag.getProperty("href")
          ).jsonValue();
          const newPage = await browser.newPage();
          const pageLoad = new Promise((resolve) =>
            newPage.once("load", resolve)
          );
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              _(new Error("Navigation timeout"));
            }, 10000);
          });
          await newPage.goto(linkedPageUrl, { waitUntil: "domcontentloaded" });
          try {
            await Promise.race([pageLoad, timeoutPromise]);
          } catch (error) {
            console.log(error.message);
          }
          const html = await newPage.$(".news-details-section");
          const heading = await html.$eval(
            ".news-details-content h1",
            (element) => element.innerText
          );
          const date = await html.$eval(
            ".news-details-content p",
            (element) => element.innerText
          );
          const allPara = await html.$(".news-details-img-box");
          const fullPage = await allPara.evaluate((el) => el.innerHTML);

          const res = await changeImgSrcToLocal(fullPage);
          const data = {
            title:heading,
            status: "publish",
            content: res,
          };

             for (const website of websites) {
               await postBlog(data, website);
             }
      }
    }
    
    for (const box of newsListingBoxes) {
      const heading = await box.$('.news-listing-content a');
      const text = await heading.evaluate((element) => element.innerText);
      console.log(text)
      const data = await getBlog(text);
      console.log(data, data.length); 
      if(data.length <= 2) {
        console.log("No Blog Found of that title");
        await processBox(box);
      }
    }
  } catch (error) {
    console.log(error);
  }
  console.log(arr, arr.length);
  await browser.close();
}

module.exports = start;
