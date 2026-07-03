import Extraction from '../models/Extraction.js';
import Approval from '../models/Approval.js';
import Document from '../models/Document.js';
import logger from '../utils/logger.js';

// GET /api/extractions/:id
export const getExtraction = async (req, res, next) => {
  try {
    const extraction = await Extraction.findById(req.params.id).populate('document_id');
    if (!extraction) return res.status(404).json({ success: false, message: 'Extraction not found' });
    res.json({ success: true, data: extraction });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/extractions/:id  — human edits fields before approval
export const updateExtraction = async (req, res, next) => {
  try {
    const allowed = ['vendor', 'bill_date', 'billing_period', 'due_date', 'fields', 'total_amount'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const extraction = await Extraction.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!extraction) return res.status(404).json({ success: false, message: 'Extraction not found' });

    logger.info(`Extraction ${req.params.id} updated by user ${req.user._id}`);
    res.json({ success: true, data: extraction });
  } catch (err) {
    next(err);
  }
};

// POST /api/extractions/:id/approve
export const approveExtraction = async (req, res, next) => {
  try {
    const extraction = await Extraction.findById(req.params.id).populate('document_id');
    if (!extraction) return res.status(404).json({ success: false, message: 'Extraction not found' });

    const { notes, corrections } = req.body;

    // Build final_json — merge original fields + any corrections
    const finalJson = {
      document_type: extraction.document_type,
      vendor: extraction.vendor,
      bill_date: extraction.bill_date,
      billing_period: extraction.billing_period,
      due_date: extraction.due_date,
      ...extraction.fields,
      total_amount: extraction.total_amount,
      currency: extraction.currency,
      confidence_score: extraction.confidence_score,
      approved_at: new Date().toISOString(),
      approved_by: req.user._id,
    };

    const approval = await Approval.findOneAndUpdate(
      { extraction_id: extraction._id },
      {
        extraction_id: extraction._id,
        document_id: extraction.document_id._id,
        reviewed_by: req.user._id,
        status: 'approved',
        corrections: corrections || {},
        final_json: finalJson,
        notes: notes || '',
        reviewed_at: new Date(),
      },
      { upsert: true, new: true }
    );

    await Document.findByIdAndUpdate(extraction.document_id._id, { status: 'done' });

    logger.info(`Extraction ${req.params.id} approved by ${req.user.email}`);
    res.json({ success: true, message: 'Extraction approved', data: approval });
  } catch (err) {
    next(err);
  }
};

// POST /api/extractions/:id/reject
export const rejectExtraction = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const extraction = await Extraction.findById(req.params.id);
    if (!extraction) return res.status(404).json({ success: false, message: 'Extraction not found' });

    const approval = await Approval.findOneAndUpdate(
      { extraction_id: extraction._id },
      {
        extraction_id: extraction._id,
        document_id: extraction.document_id,
        reviewed_by: req.user._id,
        status: 'rejected',
        notes: notes || '',
        reviewed_at: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Extraction rejected', data: approval });
  } catch (err) {
    next(err);
  }
};

// GET /api/approvals  — admin only
export const getApprovals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const [approvals, total] = await Promise.all([
      Approval.find(filter)
        .sort({ reviewed_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('reviewed_by', 'name email')
        .populate('document_id', 'original_name'),
      Approval.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: approvals,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};  