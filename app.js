const express = require('express');
const app = express();
const start = require('./utils/scrapHandler.js');
const path = require('path');
const schedule = require('node-schedule');


const port = process.env.PORT || 3000;


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
})

start();
const job = schedule.scheduleJob('0 0 */4 * *', function(){
  start();
});



