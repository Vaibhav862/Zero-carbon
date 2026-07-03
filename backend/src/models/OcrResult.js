import mongoose from 'mongoose';

const ocrResultSchema = new mongoose.Schema(
  {
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      unique: true,
    },
    raw_text: { type: String, required: true },
    method: {
      type: String,
      enum: ['pdf-parse', 'tesseract', 'paddle'],
      required: true,
    },
    page_count: Number,
    char_count: Number,
    quality_score: { type: Number, min: 0, max: 1 },
    pages: [String],
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.model('OcrResult', ocrResultSchema);