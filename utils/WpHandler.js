const axios = require('axios');
const https = require('https');
const fetch = require('node-fetch');
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Bypasses SSL certificate check; use with caution
});
function config(data, website) {
    return {
        method: 'post',
        maxBodyLength: Infinity,
        url: website.URL + '/wp-json/wp/v2/posts',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Basic ${website.secret}`
        },
        data : JSON.stringify(data),
        httpsAgent: httpsAgent
    };
}

async function postBlog(data, website, id) {
  console.log("Posting the blog to wordpress with heading: ", data.heading, " and website: ", website.URL, "with featured_media_id", id);

  const obj = {
    title: data.heading,
    content: data.content,
    status: 'publish',
    date:data.created_at,
    featured_media:id
  }
  try {
    const response = await axios.request(config(obj, website));
    return JSON.stringify(response.data);
  }
  catch (error) {
    console.log(error.message);
    return false;
  }
}

async function getBlog(heading) {
  console.log("Checking if the Blog exists in wordpress with heading: ", heading);
  try {
    const response = await axios.get(`https://janicez124.sg-host.com/wp-json/wp/v2/posts?search=${heading}`, {httpsAgent: new https.Agent({  
      rejectUnauthorized: false
    })});
    return JSON.stringify(response.data);
  }
  catch (error) {
    console.log(error);
  }
}
async function postMedia(media_URL, website) {
  if(!media_URL){
    return {id : 0};
  }
  console.log(media_URL, website);
  const filename = media_URL.split('/').pop();
  const response = await fetch(website.URL + '/wp-json/wp/v2/media', {
      method: 'POST',
      agent: httpsAgent,
      headers: {
          'Authorization': `Basic ${website.secret}`,
          'Content-Disposition': 'attachment; filename="' + filename + '"',
          'Content-Type': 'image/jpeg' 
      },
      body: await fetch(media_URL).then(r => r.blob())
  });

  if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
  }
  return response.json();
}


module.exports =  {postBlog, getBlog, postMedia};
