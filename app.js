const express = require("express");
const mysql = require("mysql2");
const { body, validationResult } = require("express-validator");

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create a MySQL connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root@123",
  database: "educaseinternship",
});

connection.connect((error) => {
  if (error) {
    console.error("Error connecting to MySQL database:", error);
  } else {
    console.log("Connected to MySQL database!");
  }
});

// Function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Add School API
app.post(
  "/addSchool",
  [
    body("name").notEmpty(),
    body("address").notEmpty(),
    body("latitude").isFloat(),
    body("longitude").isFloat(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, name, address, latitude, longitude } = req.body;
    const query =
      "INSERT INTO schools (id,name, address, latitude, longitude) VALUES (?, ?, ?, ?,?)";
    connection.query(query, [id, name, address, latitude, longitude], (err) => {
      if (err) {
        console.error("Error inserting school:", err);
        return res.status(500).json({ error: "Database insertion failed" });
      }
      res.status(201).json({ success: "School added successfully" });
    });
  }
);

// List Schools API
app.get("/listSchools/:lat/:long", (req, res) => {
  const userLat = req.params.lat;
  const userLong = req.params.long;

  if (isNaN(userLat) || isNaN(userLong)) {
    return res.status(400).json({ error: "Invalid latitude or longitude" });
  }

  const query = "SELECT * FROM schools";
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching schools:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    const sortedSchools = results
      .map((school) => {
        const distance = calculateDistance(
          userLat,
          userLong,
          school.latitude,
          school.longitude
        );
        return { ...school, distance };
      })
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json(sortedSchools);
  });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Gracefully close MySQL connection on server shutdown
process.on("SIGINT", () => {
  connection.end((err) => {
    if (err) {
      console.error("Error closing MySQL connection:", err);
    } else {
      console.log("MySQL connection closed.");
    }
    process.exit();
  });
});
