import mongoose from 'mongoose';

const extractionSchema = new mongoose.Schema(
  {
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      unique: true,
    },
    document_type: {
      type: String,
      enum: [
        'electricity_bill', 'diesel_invoice', 'coal_invoice',
        'water_bill', 'gas_bill', 'lpg_bill', 'steam_bill',
        'rec', 'transport_invoice', 'material_invoice', 'unknown',
      ],
      required: true,
    },
    vendor: String,
    vendor_confidence: { type: Number, min: 0, max: 1 },
    bill_date: String,
    billing_period: String,
    due_date: String,
    // Dynamic fields — varies per document type
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    total_amount: Number,
    currency: { type: String, default: 'INR' },
    confidence_score: { type: Number, min: 0, max: 1 },
    extraction_mode: { type: String, enum: ['text', 'vision'], default: 'text' },
    validation_warnings: [String],
    // Stores each agent's raw output for debugging / audit
    agent_trace: {
      ocr_cleaner: mongoose.Schema.Types.Mixed,
      classifier:  mongoose.Schema.Types.Mixed,
      vendor:      mongoose.Schema.Types.Mixed,
      extractor:   mongoose.Schema.Types.Mixed,
      validator:   mongoose.Schema.Types.Mixed,
      formatter:   mongoose.Schema.Types.Mixed,
    },
    extracted_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

extractionSchema.index({ document_type: 1 });
extractionSchema.index({ vendor: 1, bill_date: 1 });
extractionSchema.index(
  { 'fields.invoice_number': 1, vendor: 1 },
  { sparse: true, name: 'idx_duplicate_check' }
);
extractionSchema.index(
  { 'fields.invoice_number.value': 1, vendor: 1 },
  { sparse: true, name: 'idx_duplicate_check_value' }
);

export default mongoose.model('Extraction', extractionSchema);