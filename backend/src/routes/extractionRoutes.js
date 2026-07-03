import { Router } from 'express';
import {
  getExtraction,
  updateExtraction,
  approveExtraction,
  rejectExtraction,
  getApprovals,
} from '../controllers/extractionController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All extraction routes require authentication
router.use(authenticate);

// Admin-only route to list approvals
router.get('/approvals', requireAdmin, getApprovals);

// User/Admin routes for viewing and updating extractions
router.get('/:id', getExtraction);
router.patch('/:id', updateExtraction);
router.post('/:id/approve', approveExtraction);
router.post('/:id/reject', rejectExtraction);

export default router;
