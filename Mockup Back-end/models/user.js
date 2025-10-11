const mongoose = require("mongoose");
const { Schema } = mongoose;

const CompanySchema = new Schema(
  {
    companyName: { type: String, required: true },
    branchCode: { type: String, required: true },
    branchName: { type: String, required: true },
    taxId: { type: String, required: true },
    businessPhone: { type: String },
    addressTh: {
      buildingNo: { type: String },
      street: { type: String },
      // province, district, subdistrict จะเก็บเป็น object ที่มี code และ name_th
      province: { type: Object },
      district: { type: Object },
      subdistrict: { type: Object },
      postalCode: { type: String },
    },
    addressEn: {
      line1: { type: String },
    },
  },
  { _id: false }
); // _id: false เพื่อไม่ให้ mongoose สร้าง _id ซ้อนใน company

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  // --- Field ที่เพิ่มเข้ามา ---
  fullName: {
    type: String,
    required: true,
  },
  company: {
    type: CompanySchema,
    required: true,
  },
  // -------------------------
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", UserSchema);
