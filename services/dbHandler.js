const mysql = require("mysql2/promise");

async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DATABASE,
    });
    return connection;
  } catch (error) {
    console.error("Error creating database connection:", error.message);
    throw error;
  }
}

async function createTableIfNotExists(connection) {
  try {
    const createWebsiteTableQuery = `
      CREATE TABLE IF NOT EXISTS websites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        secret VARCHAR(255) NOT NULL,
        URL VARCHAR(255) NOT NULL
      )`;
    await connection.query(createWebsiteTableQuery);
    const createBlogDataTableQuery = `
      CREATE TABLE IF NOT EXISTS blogData (
        id INT PRIMARY KEY AUTO_INCREMENT,
        guid VARCHAR(255) NOT NULL,
        heading VARCHAR(255) NOT NULL,
        content JSON
      )`;
    await connection.query(createBlogDataTableQuery);
  } catch (error) {
    console.error("Error creating table:", error.message);
    throw error;
  }
}

async function addWebsite(connection, secret, website) {
  try {
    const query = `INSERT INTO websites (secret, website) VALUES (?, ?)`;
    const [rows] = await connection.query(query, [secret, website]);
    return rows;
  } catch (error) {
    console.error("Error adding website:", error.message);
    throw error;
  }
}

async function isBlogPresent(connection, guid) {
  try {
    const query = `SELECT COUNT(*) as count FROM blogData WHERE guid = ?`;
    const [rows] = await connection.query(query, [guid]);
    // rows[0].count will contain the number of rows with the specified heading
    return rows[0].count > 0;
  } catch (error) {
    console.error("Error checking if blog is present:", error.message);
    throw error;
  }
}


async function getWebsites(connection) {
  try {
    const query = `SELECT * FROM websites`;
    const [rows] = await connection.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching websites:", error.message);
    throw error;
  }
}
async function saveBlogToDb(connection, obj) {
  try {
    const query = `INSERT INTO blogData (heading, content, guid) VALUES (?, ?, ?)`;
    const [rows] = await connection.query(query, [obj.heading, JSON.stringify(obj.content), obj.guid]);
    return rows;
  } catch (error) {
    console.error("Error adding website:", error.message);
    throw error;
  }
}
async function getBlogsFromDb(connection) {
  try {
    const query = `SELECT * FROM blogData`;
    const [rows] = await connection.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching blogs from the database:", error.message);
    throw error;
  }
}


async function sqlHandler() {
  const connection = await createConnection();
  await createTableIfNotExists(connection);

  return {
    connection,
    addWebsite: async (secret, website) => addWebsite(connection, secret, website),
    getWebsites: async () => getWebsites(connection),
    saveBlogToDb: async (obj) => saveBlogToDb(connection, obj),
    isBlogPresent: async (guid) => isBlogPresent(connection, guid),
    getBlogsFromDb: async () => getBlogsFromDb(connection),
  };
}




module.exports = { sqlHandler };
