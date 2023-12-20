const express = require('express');
const app = express();
const {scrapHandler, postBlogHandler} = require('./utils/scrapHandler.js');
const path = require('path');
const schedule = require('node-schedule');
const { sqlHandler } = require('./services/dbHandler.js');
const { postBlog } = require('./utils/WpHandler.js');
const port = process.env.PORT || 3000;




app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
  initial();
})



async function initial() {
  try {
    const { getWebsites, saveBlogToDb, isBlogPresent, getBlogsFromDb, createConnection } = await sqlHandler();
    const connection = await createConnection();
    await mainTask(connection,getWebsites, saveBlogToDb, isBlogPresent, getBlogsFromDb);
    await connection.close();
    const job = schedule.scheduleJob('0 0 */4 * *', async function() {
    const connection = await createConnection();
      await mainTask(getWebsites, saveBlogToDb, isBlogPresent, getBlogsFromDb);
      await connection.close();
      
    });
  } catch (error) {
    console.log(error.message);
  }
}


async function mainTask(connection,getWebsites, saveBlogToDb, isBlogPresent, getBlogsFromDb) {
  try {
    await scrapHandler(connection,saveBlogToDb, isBlogPresent)
    await postBlogHandler(connection,getWebsites, postBlog, getBlogsFromDb);
  } catch (error) {
    console.log(error.message);
  }
}






