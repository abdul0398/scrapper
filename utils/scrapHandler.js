require("dotenv").config();
const puppeteer = require("puppeteer");
const { sqlHandler } = require("../services/dbHandler.js");
const { changeImgSrcToLocal } = require("./tools.js");
const { postBlog, getBlog } = require("./WpHandler.js");
const {
  isHeadingPresent,
  insertNewHeading,
  cleanAndLowercase,
} = require("./validation.js");
const filePath = "data/heading.json";
async function scrapHandler(saveBlogToDb, isBlogPresent) {
  try {
       const browser = await puppeteer.launch({
      headless: true,
      protocolTimeout: 0,
    });
    const page = await browser.newPage();
    const navigationPromise = page.goto("https://www.propnex.com/picks");

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        _("Navigation timeout");
      }, 10000);
    });

    await Promise.race([navigationPromise, timeoutPromise]);

    const newsListingBoxes = await page.$$(".news-listing-content");
    const arr = [];

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
        const guid = await cleanAndLowercase(heading);
        const data = {
          heading: heading,
          content: res,
          guid: guid,
        };
        console.log("saving blog to database with heading: ", heading);
        await saveBlogToDb(data);
        await newPage.close();
      }
    }

    for (const box of newsListingBoxes) {
      const heading = await box.$(".news-listing-content a");
      const text = await heading.evaluate((element) => element.innerText);
      console.log(
        "Checking if the blog exists in the database with heading: ",
        text
      );
      const guid = cleanAndLowercase(text);
      const flag = await isBlogPresent(guid);
      if (!flag) {
        console.log("Blog doesn't Found in database with heading", text);
        await processBox(box);
      }
    }
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

async function postBlogHandler (getWebsites, postBlog, getBlogsFromDb) {
  const websites = await getWebsites();
  const blogs = await getBlogsFromDb();
  for (const blog of blogs) {
    for (const website of websites) {
      const flag = isHeadingPresent(filePath, blog.heading, website.URL);
      if (!flag) {
        await postBlog(blog, website);
        insertNewHeading(filePath, blog.heading, website.URL);
      }
    }
  }
};

module.exports = {scrapHandler, postBlogHandler};
