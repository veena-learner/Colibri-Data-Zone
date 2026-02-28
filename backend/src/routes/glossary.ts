import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { glossaryModel } from '../models/GlossaryModel';
import { authMiddleware, AuthRequest, isStewardOrAbove } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query;

    let terms;
    if (search) {
      terms = await glossaryModel.search(search as string);
    } else {
      terms = await glossaryModel.listAll();
    }

    res.json({ success: true, data: terms });
  } catch (error) {
    console.error('List glossary terms error:', error);
    res.status(500).json({ success: false, error: 'Failed to list glossary terms' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const term = await glossaryModel.getById(req.params.id);
    if (!term) {
      res.status(404).json({ success: false, error: 'Glossary term not found' });
      return;
    }
    res.json({ success: true, data: term });
  } catch (error) {
    console.error('Get glossary term error:', error);
    res.status(500).json({ success: false, error: 'Failed to get glossary term' });
  }
});

router.post(
  '/',
  isStewardOrAbove,
  validate([
    body('term').trim().isLength({ min: 1 }),
    body('definition').trim().isLength({ min: 1 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const glossaryTerm = await glossaryModel.create({
        ...req.body,
        ownerId: req.user!.userId,
      });
      res.status(201).json({ success: true, data: glossaryTerm });
    } catch (error) {
      console.error('Create glossary term error:', error);
      res.status(500).json({ success: false, error: 'Failed to create glossary term' });
    }
  }
);

router.put(
  '/:id',
  isStewardOrAbove,
  validate([
    param('id').notEmpty(),
    body('term').optional().trim().isLength({ min: 1 }),
    body('definition').optional().trim().isLength({ min: 1 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await glossaryModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Glossary term not found' });
        return;
      }

      const updated = await glossaryModel.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Update glossary term error:', error);
      res.status(500).json({ success: false, error: 'Failed to update glossary term' });
    }
  }
);

router.delete(
  '/:id',
  isStewardOrAbove,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await glossaryModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Glossary term not found' });
        return;
      }

      await glossaryModel.deleteById(req.params.id);
      res.json({ success: true, message: 'Glossary term deleted' });
    } catch (error) {
      console.error('Delete glossary term error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete glossary term' });
    }
  }
);

export default router;
