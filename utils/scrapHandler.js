require("dotenv").config();
const puppeteer = require("puppeteer");
const {sqlHandler} = require("../services/dbHandler.js");
const {changeImgSrcToLocal} = require("./tools.js");
const {postBlog, getBlog} = require("./WpHandler.js");
const {isHeadingPresent, insertNewHeading} = require("./validation.js");
const filePath = 'data/heading.json';

async function start() {

  // Function to get all the websites from the database
  const {getWebsites} = await sqlHandler();
  const websites = await getWebsites();


  const browser = await puppeteer.launch({
    headless: false,
    protocolTimeout: 0,
  });
  const page = await browser.newPage();
  const navigationPromise = page.goto("https://www.propnex.com/picks");

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      _("Navigation timeout");
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
    async function processBox(box, websitesToPost) {
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
              _("Timeout");
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
          console.log("Posting Blog to " + websitesToPost);
          for (const website of websitesToPost) {
            await postBlog(data, website);
          }
        await newPage.close();
      }
    }
    
    for (const box of newsListingBoxes) {
      const heading = await box.$('.news-listing-content a');
      const text = await heading.evaluate((element) => element.innerText);
      const websitesToPost = [];
      for (const website of websites) {
        const isPresent = await isHeadingPresent(filePath,text,website.URL);
        if(!isPresent) {
          console.log("No Blog Found of that title into " + website.URL+"");
          insertNewHeading(filePath, text, website.URL);
          websitesToPost.push(website);
        }
      }
      if(websitesToPost.length > 0) {
        await processBox(box, websitesToPost);
      }
    }
  } catch (error) {
    console.log(error);
  }
  await browser.close();
}

module.exports = start;
