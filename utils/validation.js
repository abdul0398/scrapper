const fs = require('fs');

// Function to read JSON file and parse its content
function readJsonFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}


function cleanAndLowercase(str) {
    // Remove non-alphanumeric characters and convert to lowercase
    return str.replace(/[^a-zA-Z0-9]/g, '').trim().toLowerCase();
  }

// Function to write JSON data to a file
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Function to insert a new heading into the JSON file
function insertNewHeading(filePath, newHeading, URL) {
  const jsonData = readJsonFile(filePath);
  cleanNewHeading = cleanAndLowercase(newHeading);

  // Check if the heading already exists
  if (jsonData[URL] &&  jsonData[URL].includes(cleanNewHeading)) {
    return;
  }

  if(!jsonData[URL]){
    jsonData[URL] = [];
  }

  // Insert the new heading
  jsonData[URL].push(cleanNewHeading);

  // Write the updated JSON data back to the file
  writeJsonFile(filePath, jsonData);

}

// Function to check if a heading is present in the JSON file
function isHeadingPresent(filePath, targetHeading, URL) {
  const jsonData = readJsonFile(filePath);
    cleanTargetHeading = cleanAndLowercase(targetHeading);
  // Check if the heading exists

  if(!jsonData[URL]){
    return false
  }
  const isPresent = jsonData[URL].includes(cleanTargetHeading);

  if (isPresent) {
    console.log(`Heading "${targetHeading}" is present.`);
    return true;
  } else {
    console.log(`Heading "${targetHeading}" is not present.`);
    return false;
  }

  return isPresent;
}



module.exports = {insertNewHeading, isHeadingPresent}
