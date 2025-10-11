require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- เชื่อมต่อ MongoDB Atlas โดยใช้ตัวแปรใหม่ ---
mongoose
  .connect(mongoURI, {
    // <--- ใช้ mongoURI ที่แก้ไขแล้ว
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// --- Define Routes ---
app.get("/", (req, res) => res.send("API Running"));
app.use("/api/auth", require("./routes/auth"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
