const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = 2500;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (CSS, JS, images)

// PostgreSQL connection
const pool = new Pool({
  user: 'avnadmin',
  host: process.env.AVN_HOST,
  
  database: 'defaultdb',
  port: 20108,
  password: process.env.AVN_PASSWORD,
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
});

// Ensure PostgreSQL table exists
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS details (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        num VARCHAR(20),
        mail VARCHAR(220)
      )
    `);
    console.log("Table 'details' is ready.");
  } catch (err) {
    console.error('Error creating table:', err);
  }
}
initDB();

// Serve main form page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Insert data into PostgreSQL
app.post('/insert', async (req, res) => {
  let { name, num, mail } = req.body;

  // Validate: Ensure num is max 20 characters
  num = num.substring(0, 20);

  try {
    await pool.query("INSERT INTO details (name, num, mail) VALUES ($1, $2, $3)", [name, num, mail]);
    res.redirect('/');
  } catch (err) {
    console.error("Error inserting data:", err);
    res.status(500).send("Failed to insert data");
  }
});

// Report page: Display stored data in a table format
app.get('/report', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM details');
    const items = result.rows;
    let tableContent = `
    <html>
    <head>
      <title>Report</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; background-color: #f8f9fa; padding: 20px; }
        table { width: 80%; margin: auto; border-collapse: collapse; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); }
        th, td { border: 1px solid #ddd; padding: 10px; }
        th { background-color: #007bff; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        button { padding: 8px; margin: 5px; cursor: pointer; background-color: #007bff; border: none; color: white; }
        button:hover { background-color: #0056b3; }
        a { color: white; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>Records Table</h1>
      <table>
        <tr>
          <th>Name</th>
          <th>Mobile</th>
          <th>Email</th>
          <th>Update</th>
          <th>Delete</th>
        </tr>`;

    tableContent += items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.num}</td>
        <td>${item.mail}</td>
        <td><button><a href="/change/${item.id}">Update</a></button></td>
        <td><button><a href="/delete/${item.id}">Delete</a></button></td>
      </tr>`).join("");

    tableContent += `
      </table>
      <br><button><a href="/">Back to Form</a></button>
    </body>
    </html>`;

    res.send(tableContent);
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Failed to fetch data");
  }
});

// Handle delete request
app.get('/delete/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM details WHERE id=$1', [req.params.id]);
    res.redirect('/report');
  } catch (err) {
    console.error("Error deleting data:", err);
    res.status(500).send("Failed to delete data");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});