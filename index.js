require('dotenv').config()
const puppeteer = require("puppeteer");
const sqlHandler = require("./services/db.js");
async function start() {
  
  const { connection, searchQueryBasedOnheading } = await sqlHandler();

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
  } catch (error) {}

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
        const allPara = await html.$$(".news-details-img-box p");
        const content = [];
        for (const para of allPara) {
          if (para && (await para.evaluate((el) => el.innerText)) == "") {
            const img = await para.$("img");
            if (img) {
              const imageUrl = await (await img.getProperty("src")).jsonValue();

              const response = await fetch(imageUrl);
              const imageData = await response.arrayBuffer();

              const base64Image = Buffer.from(imageData).toString("base64");
            
              content.push({
                type: "image",
                src: `data:image/png;base64,${base64Image}`,
              });
            }
          } else {
            content.push(await para.evaluate((el) => el.innerText.trim()));
          }
        }
        await connection.execute(
          "INSERT INTO blogs (heading, date, content) VALUES (?, ?, ?)",
          [heading, date, JSON.stringify(content)]
        );
        arr.push({ heading, date, content });
        await newPage.close();
      }
    }
    for (const box of newsListingBoxes) {
      const titleContainer = await box.$("a");
      const title = await titleContainer.evaluate((el) => el.innerText.trim());
      const [rows] = await connection.query(searchQueryBasedOnheading(title));
      if (rows.length > 0) {
        continue;
      }
      await processBox(box);
    }
  } catch (error) {
    console.log(error);
  }
  console.log(arr, arr.length);
  await browser.close();
}

start();
