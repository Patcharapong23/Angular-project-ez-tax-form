const express = require("express");
const router = express.Router();
const Invoice = require("../models/invoice");

// POST: เพิ่มรายการใบกำกับภาษี
router.post("/", async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    res.status(201).send(invoice);
  } catch (error) {
    res.status(400).send(error);
  }
});

// GET: แสดงรายละเอียดข้อมูลของใบกำกับภาษีทั้งหมด
router.get("/", async (req, res) => {
  try {
    // เพิ่มการกรองข้อมูลจาก query params ในอนาคตได้ที่นี่
    const invoices = await Invoice.find({ status: { $ne: "cancelled" } }).sort({
      createdAt: -1,
    });
    res.send(invoices);
  } catch (error) {
    res.status(500).send(error);
  }
});

// GET: ดึงข้อมูลใบกำกับภาษีตาม ID (สำหรับหน้าแก้ไข)
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).send();
    }
    res.send(invoice);
  } catch (error) {
    res.status(500).send(error);
  }
});

// PUT: แก้ไขรายละเอียดของใบกำกับภาษี
router.put("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!invoice) {
      return res.status(404).send();
    }
    res.send(invoice);
  } catch (error) {
    res.status(400).send(error);
  }
});

// PUT: ยกเลิกรายการใบกำกับภาษี
router.put("/cancel/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    );
    if (!invoice) {
      return res.status(404).send();
    }
    res.send(invoice);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;
