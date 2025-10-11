require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors"); // <-- (1) Import cors

const app = express();

// --- Middlewares ---
app.use(cors()); // <-- (2) เปิดใช้งาน CORS สำหรับทุก Route
app.use(express.json()); // ให้ Express อ่าน JSON body ได้

// --- เชื่อมต่อ MongoDB Atlas ---
mongoose
  .connect(process.env.MONGO_URI, {
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
