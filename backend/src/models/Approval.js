import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema(
  {
    extraction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Extraction',
      required: true,
      unique: true,
    },
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Field-level diff: { vendor: { original: "Tata Power", corrected: "Tata Power Ltd" } }
    corrections: { type: mongoose.Schema.Types.Mixed, default: {} },
    // The final approved output stored for downstream carbon accounting
    final_json: mongoose.Schema.Types.Mixed,
    notes: String,
    reviewed_at: Date,
  },
  { timestamps: false }
);

approvalSchema.index({ document_id: 1 });
approvalSchema.index({ reviewed_by: 1, reviewed_at: -1 });
approvalSchema.index({ status: 1 });

export default mongoose.model('Approval', approvalSchema);