const mysql = require("mysql2/promise");

async function sqlHandler(params) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DATABASE,
  });

  const createTableQuery = () => {
    return `CREATE TABLE IF NOT EXISTS blogs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      heading VARCHAR(255),
      content JSON,
      date VARCHAR(255)
    )`;
  };

  // Creating Table if it is not present
  await connection.query(createTableQuery());
  
  
  const searchQueryBasedOnheading = (heading) => {
    return `SELECT * FROM blogs
    WHERE heading = '${heading}'`;
  };
  return { connection, searchQueryBasedOnheading };
}


module.exports = sqlHandler;