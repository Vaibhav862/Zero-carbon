import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, refreshToken, logout, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/auth/logout  (protected)
router.post('/logout', authenticate, logout);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, getMe);

export default router;