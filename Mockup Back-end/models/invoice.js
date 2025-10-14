const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    documentType: { type: String, required: true },
    documentTemplate: { type: String, required: true },
    documentNumber: { type: String },
    issueDate: { type: Date, required: true },
    seller: {
      name: { type: String },
      taxId: { type: String },
      address: { type: String },
      phone: { type: String },
    },
    customer: {
      name: { type: String, required: true },
      branchCode: { type: String },
      address: { type: String },
      taxId: { type: String, required: true },
    },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 7 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: { type: String, default: "active" }, // 'active', 'cancelled'
  },
  { timestamps: true }
);

// สร้างเลขที่เอกสารอัตโนมัติก่อนบันทึก
invoiceSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastInvoice = await this.constructor
      .findOne()
      .sort({ createdAt: -1 });
    let newNumber = 1;
    if (lastInvoice && lastInvoice.documentNumber) {
      const lastNumber = parseInt(lastInvoice.documentNumber.split("-").pop());
      newNumber = lastNumber + 1;
    }
    this.documentNumber = `INV-${new Date().getFullYear()}-${String(
      newNumber
    ).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);
