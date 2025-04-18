require("dotenv").config(); // ✅ Make sure this is at the top
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");

const API_KEY = process.env.OPENWEATHER_API_KEY; // ✅ Correct placement after dotenv
const PORT = process.env.PORT || 5000;


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("✅ Connected to MongoDB");
  console.log("DB name:", mongoose.connection.name); // ← Add this line here
});


const app = express();

app.use(cors());
app.use(express.json());

// ✅ Define the Report schema
const reportSchema = new mongoose.Schema({
  location: String,
  magnitude: Number,
  time: Date,
  description: String,
  latitude: Number,      // 🆕 Added field
  longitude: Number,     // 🆕 Added field
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


const Report = mongoose.model("Report", reportSchema);

// ⚠️ Disaster detection utility
function detectDisaster(weather) {
  if (
    weather.main.pressure < 950 ||
    weather.wind.speed > 40 ||
    weather.main.temp > 45 ||
    weather.main.humidity > 95
  ) {
    return "⚠️ Potential Natural Disaster Detected! Stay alert and take precautions.";
  }
  return null;
}

// 🌦️ Hourly forecast route
app.get("/hourly/:city", async (req, res) => {
  const city = req.params.city;
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
    );
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error fetching hourly forecast:", error.message);
    res.status(500).json({ error: "Error fetching hourly forecast" });
  }
});

// 🌤️ Current weather + basic alert
app.get("/weather/:city", async (req, res) => {
  try {
    const city = req.params.city;
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );

    const weatherData = response.data;
    const alertMessage = detectDisaster(weatherData);

    res.json({ ...weatherData, alertMessage });
  } catch (error) {
    console.error("❌ Error fetching weather data:", error.message);
    res.status(500).json({ error: "Error fetching weather data" });
  }
});

// ✅ GET all earthquake felt reports
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.find();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ POST a new felt report
app.post("/api/reports", async (req, res) => {
  console.log("Received report:", req.body);
  const { location, magnitude, time, description, latitude, longitude } = req.body;
const report = new Report({ location, magnitude, time, description, latitude, longitude });


  try {
    const saved = await report.save();
    console.log("Saved report:", saved);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Error saving report", error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
