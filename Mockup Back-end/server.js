require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const mongoURI = process.env.MONGO_URI;

const invoiceRoutes = require("./routes/invoices");

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
  .then(() => console.log("เขื่อมต่อ MongoDB สำเร็จ"))
  .catch((err) => console.log(err));

// --- Define Routes ---
app.get("/", (req, res) => res.send("API Running"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/invoices", invoiceRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`เชื่อมต่อเซิฟเวอร์สำเร็จบน port${PORT}`));
