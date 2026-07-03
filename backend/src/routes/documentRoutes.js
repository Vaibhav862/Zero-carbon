import { Router } from 'express';
import {
  uploadDocuments,
  getDocuments,
  getDocument,
  getDocumentStatus,
  deleteDocument,
} from '../controllers/documentController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// All document routes require authentication
router.use(authenticate);

// POST /api/documents/upload  — single or multi file
router.post('/upload', upload.array('files', 10), uploadDocuments);

// GET /api/documents  — user sees own docs, admin sees all
router.get('/', getDocuments);

// GET /api/documents/:id
router.get('/:id', getDocument);

// GET /api/documents/:id/status  — polling endpoint for frontend
router.get('/:id/status', getDocumentStatus);

// DELETE /api/documents/:id  — owner or admin
router.delete('/:id', deleteDocument);

export default router;