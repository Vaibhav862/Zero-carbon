import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: { type: String, required: true },
    original_name: { type: String, required: true },
    mime_type: { type: String, required: true },
    file_path: { type: String, required: true },
    file_size: { type: Number, required: true },
    status: {
      type: String,
      enum: ['queued', 'ocr_processing', 'ai_extracting', 'done', 'failed'],
      default: 'queued',
    },
    job_id: { type: String, sparse: true },
    error_message: String,
  },
  {
    timestamps: { createdAt: 'uploaded_at', updatedAt: 'updated_at' },
  }
);

documentSchema.index({ user_id: 1, uploaded_at: -1 });
documentSchema.index({ status: 1 });

export default mongoose.model('Document', documentSchema);