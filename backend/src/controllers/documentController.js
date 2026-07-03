import Document from '../models/Document.js';
import Extraction from '../models/Extraction.js';
import Approval from '../models/Approval.js';
import OcrResult from '../models/OcrResult.js';
import { documentQueue } from '../services/queueService.js';
import logger from '../utils/logger.js';

// POST /api/documents/upload  (handles single + multi file)
export const uploadDocuments = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploaded = [];

    for (const file of req.files) {
      const doc = await Document.create({
        user_id: req.user._id,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        file_path: file.path,
        file_size: file.size,
        status: 'queued',
      });

      // Push to BullMQ queue
      const job = await documentQueue.add(
        'process-document',
        { documentId: doc._id.toString(), filePath: file.path, mimeType: file.mimetype },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      );

      await Document.findByIdAndUpdate(doc._id, { job_id: job.id });

      logger.info(`Document queued: ${doc._id} | job: ${job.id}`);
      uploaded.push({ ...doc.toJSON(), job_id: job.id });
    }

    res.status(201).json({
      success: true,
      message: `${uploaded.length} file(s) uploaded and queued`,
      data: uploaded,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents
export const getDocuments = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user_id: req.user._id };
    const { page = 1, limit = 20, status, type } = req.query;

    if (status) filter.status = status;

    const [docs, total] = await Promise.all([
      Document.find(filter)
        .sort({ uploaded_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('user_id', 'name email'),
      Document.countDocuments(filter),
    ]);

    // Attach extraction summary to each doc
    const docIds = docs.map((d) => d._id);
    const extractions = await Extraction.find(
      { document_id: { $in: docIds } },
      'document_id document_type vendor total_amount confidence_score'
    );
    const extMap = Object.fromEntries(extractions.map((e) => [e.document_id.toString(), e]));

    const result = docs.map((d) => ({
      ...d.toJSON(),
      extraction_summary: extMap[d._id.toString()] || null,
    }));

    res.json({
      success: true,
      data: result,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id
export const getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('user_id', 'name email');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role !== 'admin' && doc.user_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [ocr, extraction, approval] = await Promise.all([
      OcrResult.findOne({ document_id: doc._id }),
      Extraction.findOne({ document_id: doc._id }),
      Approval.findOne({ document_id: doc._id }),
    ]);

    res.json({
      success: true,
      data: { document: doc, ocr_result: ocr, extraction, approval },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/status
export const getDocumentStatus = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id, 'status job_id error_message updated_at');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    res.json({ success: true, data: { status: doc.status, job_id: doc.job_id, updated_at: doc.updated_at, error: doc.error_message } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/documents/:id  (admin or owner)
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role !== 'admin' && doc.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Promise.all([
      Document.findByIdAndDelete(doc._id),
      OcrResult.findOneAndDelete({ document_id: doc._id }),
      Extraction.findOneAndDelete({ document_id: doc._id }),
      Approval.findOneAndDelete({ document_id: doc._id }),
    ]);

    res.json({ success: true, message: 'Document and related records deleted' });
  } catch (err) {
    next(err);
  }
};