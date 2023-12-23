require("dotenv").config();
const puppeteer = require("puppeteer");
const { sqlHandler } = require("../services/dbHandler.js");
const { changeImgSrcToLocal, createTagsAndCategories, createUserHandler } = require("./tools.js");
const { postBlog, getBlog, postMedia } = require("./WpHandler.js");
const {
  isHeadingPresent,
  insertNewHeading,
  cleanAndLowercase,
} = require("./validation.js");
const filePath = "data/heading.json";
async function scrapHandler(connection, saveBlogToDb, isBlogPresent) {
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

    const newsListingBoxes = await page.$$(".news-listing-box");

    async function processBox(box, feat_img_link) {
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
        const dateHtml = await newPage.$(".news-details-content p");
        const datetext = await dateHtml.evaluate((el) => el.innerText);

        const allPara = await html.$(".news-details-img-box");
        const fullPage = await allPara.evaluate((el) => el.innerHTML);

        const {modifiedHtmlString} = await changeImgSrcToLocal(fullPage);
        const guid = await cleanAndLowercase(heading);
        const data = {
          heading: heading,
          content: modifiedHtmlString,
          guid: guid,
          date:datetext,
          feat_img:feat_img_link
        };
        console.log("saving blog to database with heading: ", heading);
        await saveBlogToDb(connection, data);
        await newPage.close();
      }
    }

    for (const box of newsListingBoxes) {
      const img_Html = await box.$('img');
      const feat_img_link = await img_Html.evaluate(el=> el.getAttribute("data-src"));
     
      const headingHtml = await box.$(".news-listing-content a");      
      const boxHtml = await box.$(".news-listing-content")
      const headingText = await headingHtml.evaluate((element) => element.innerText);
      console.log(
        "Checking if the blog exists in the database with heading: ",
        headingText
      );
      const guid = cleanAndLowercase(headingText);
      const flag = await isBlogPresent(connection, guid);
      if (!flag) {
        console.log("Blog doesn't Found in database with heading", headingText);
        await processBox(boxHtml, feat_img_link);
      }
    }
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

async function postBlogHandler (connection, getWebsites, postBlog, getBlogsFromDb) {
  const websites = await getWebsites(connection);
  const blogs = await getBlogsFromDb(connection);
  let userArr = [];
  for (const website of websites) {
    userArr = await createUserHandler(website);
      for (const blog of blogs) {
        const flag = isHeadingPresent(filePath, blog.heading, website.URL);
        if (!flag) {
        const userId = getRandomElement(userArr);
        const {tagsId, categoriesId} = await createTagsAndCategories(website,blog.heading);
        const res = await postMedia(blog.feat_img, website);
        const data = await postBlog(blog, website, res.id, userId, tagsId, categoriesId);
        insertNewHeading(filePath, blog.heading, website.URL);
      }
    }
  }

  console.log("########## All blogs Posted Successfully ##########")
};


function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
module.exports = {scrapHandler, postBlogHandler};
