import { Router } from 'express';
import authRoutes       from './authRoutes.js';
import documentRoutes   from './documentRoutes.js';
import extractionRoutes from './extractionRoutes.js';

const router = Router();

router.use('/auth',        authRoutes);
router.use('/documents',   documentRoutes);
router.use('/extractions', extractionRoutes);

export default router;