import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { domainModel } from '../models/DomainModel';
import { authMiddleware, AuthRequest, isOwnerOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const domains = await domainModel.listAll();
    res.json({ success: true, data: domains });
  } catch (error) {
    console.error('List domains error:', error);
    res.status(500).json({ success: false, error: 'Failed to list domains' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const domain = await domainModel.getById(req.params.id);
    if (!domain) {
      res.status(404).json({ success: false, error: 'Domain not found' });
      return;
    }
    res.json({ success: true, data: domain });
  } catch (error) {
    console.error('Get domain error:', error);
    res.status(500).json({ success: false, error: 'Failed to get domain' });
  }
});

router.post(
  '/',
  isOwnerOrAdmin,
  validate([
    body('name').trim().isLength({ min: 1 }),
    body('description').trim().isLength({ min: 1 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const domain = await domainModel.create({
        ...req.body,
        ownerId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: domain });
    } catch (error) {
      console.error('Create domain error:', error);
      res.status(500).json({ success: false, error: 'Failed to create domain' });
    }
  }
);

router.put(
  '/:id',
  isOwnerOrAdmin,
  validate([
    param('id').notEmpty(),
    body('name').optional().trim().isLength({ min: 1 }),
    body('description').optional().trim().isLength({ min: 1 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await domainModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }

      const updated = await domainModel.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Update domain error:', error);
      res.status(500).json({ success: false, error: 'Failed to update domain' });
    }
  }
);

router.delete(
  '/:id',
  isOwnerOrAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await domainModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }

      await domainModel.deleteById(req.params.id);
      res.json({ success: true, message: 'Domain deleted' });
    } catch (error) {
      console.error('Delete domain error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete domain' });
    }
  }
);

export default router;
