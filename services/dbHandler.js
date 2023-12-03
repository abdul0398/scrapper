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
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS websites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        secret VARCHAR(255) NOT NULL,
        website VARCHAR(255) NOT NULL
      )`;
    await connection.query(createTableQuery);
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

async function sqlHandler() {
  const connection = await createConnection();
  await createTableIfNotExists(connection);

  return {
    connection,
    addWebsite: async (secret, website) => addWebsite(connection, secret, website),
    getWebsites: async () => getWebsites(connection),
  };
}

module.exports = { sqlHandler };
