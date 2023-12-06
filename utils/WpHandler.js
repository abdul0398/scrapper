const axios = require('axios');
const https = require('https');
function config(data, website) {
  console.log(website, typeof website);
    return {
        method: 'post',
        maxBodyLength: Infinity,
        url: website.URL + '/wp-json/wp/v2/posts',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Basic ${website.secret}}`
        },
        data : JSON.stringify(data),
        httpsAgent: new https.Agent({  
          rejectUnauthorized: false
        })
    };
}

async function postBlog(data, website) {
  console.log("Posting the blog to wordpress with heading: ", data.heading, " and website: ", website.URL);

  const obj = {
    title: data.heading,
    content: JSON.parse(data.content),
    status: 'publish'
  }
  try {
    const response = await axios.request(config(obj, website));
    return JSON.stringify(response.data);
  }
  catch (error) {
    console.log(error.message);
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


module.exports =  {postBlog, getBlog};
