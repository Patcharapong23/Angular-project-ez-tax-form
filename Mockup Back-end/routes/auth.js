const express = require("express");
const bcrypt = require("bcryptjs"); // <-- *** แก้ไขบรรทัดนี้ ***
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

// --- (โค้ดส่วน generateUniqueUsername และ /register ไม่ต้องแก้ไข) ---
const generateUniqueUsername = async (email) => {
  let username = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
  let userExists = await User.findOne({ username });
  while (userExists) {
    const randomNum = Math.floor(Math.random() * 1000);
    username = `${username}${randomNum}`;
    userExists = await User.findOne({ username });
  }
  return username;
};
router.post("/register", async (req, res) => {
  console.log("Received registration data:", JSON.stringify(req.body, null, 2));
  try {
    const { fullName, email, passwordGroup, company } = req.body;
    if (!fullName || !email || !passwordGroup || !company) {
      return res.status(400).json({ msg: "ข้อมูลที่ส่งมาไม่ครบถ้วน" });
    }
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "อีเมลนี้มีผู้ใช้งานแล้ว" });
    }
    const username = await generateUniqueUsername(email);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordGroup.password, salt);
    const newUser = new User({
      fullName,
      email,
      username,
      password: hashedPassword,
      company: company,
    });
    await newUser.save();
    res
      .status(201)
      .json({ msg: "สมัครสมาชิกสำเร็จ!", username: newUser.username });
  } catch (err) {
    console.error("Error during registration:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ตอนนี้ bcrypt.compare จะทำงานได้แล้ว
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    const payload = {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        companyName: user.company.companyName,
        branchCode: user.company.branchCode,
        branchName: user.company.branchName,
        taxId: user.company.taxId,
        businessPhone: user.company.businessPhone,
      },
    };
    jwt.sign(payload, "yourSecretKey", { expiresIn: "1h" }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
