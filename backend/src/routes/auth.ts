import { Router, Response } from 'express';
import { body } from 'express-validator';
import { userModel } from '../models/UserModel';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('name').trim().isLength({ min: 2 }),
    body('password').isLength({ min: 6 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, name, password, role } = req.body;

      const existingUser = await userModel.getByEmail(email);
      if (existingUser) {
        res.status(400).json({ success: false, error: 'Email already registered' });
        return;
      }

      const user = await userModel.create({ email, name, password, role });
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          token,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: 'Registration failed' });
    }
  }
);

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await userModel.verifyPassword(email, password);
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  }
);

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await userModel.getByEmail(req.user!.email);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

export default router;
