import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { assetModel } from '../models/AssetModel';
import { authMiddleware, AuthRequest, isStewardOrAbove } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ASSET_TYPES, SENSITIVITY_LEVELS } from '../config/constants';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { domainId, search, limit } = req.query;

    let assets;
    if (search) {
      assets = await assetModel.search(search as string);
    } else if (domainId) {
      assets = await assetModel.listByDomain(domainId as string);
    } else {
      assets = await assetModel.listAll(limit ? parseInt(limit as string) : undefined);
    }

    res.json({ success: true, data: assets });
  } catch (error) {
    console.error('List assets error:', error);
    res.status(500).json({ success: false, error: 'Failed to list assets' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const asset = await assetModel.getById(req.params.id);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Asset not found' });
      return;
    }
    res.json({ success: true, data: asset });
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ success: false, error: 'Failed to get asset' });
  }
});

router.post(
  '/',
  isStewardOrAbove,
  validate([
    body('name').trim().isLength({ min: 1 }),
    body('description').trim().isLength({ min: 1 }),
    body('type').isIn(Object.values(ASSET_TYPES)),
    body('location').trim().isLength({ min: 1 }),
    body('domainId').trim().isLength({ min: 1 }),
    body('dataOwnerId').optional().trim().isLength({ min: 1 }),
    body('dataStewardId').optional().trim().isLength({ min: 1 }),
    body('sensitivity').optional().isIn(Object.values(SENSITIVITY_LEVELS)),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const asset = await assetModel.create({
        ...req.body,
        dataOwnerId: req.body.dataOwnerId || req.user!.userId,
      });
      res.status(201).json({ success: true, data: asset });
    } catch (error) {
      console.error('Create asset error:', error);
      res.status(500).json({ success: false, error: 'Failed to create asset' });
    }
  }
);

router.put(
  '/:id',
  isStewardOrAbove,
  validate([
    param('id').notEmpty(),
    body('name').optional().trim().isLength({ min: 1 }),
    body('type').optional().isIn(Object.values(ASSET_TYPES)),
    body('sensitivity').optional().isIn(Object.values(SENSITIVITY_LEVELS)),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await assetModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }

      const updated = await assetModel.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Update asset error:', error);
      res.status(500).json({ success: false, error: 'Failed to update asset' });
    }
  }
);

router.delete(
  '/:id',
  isStewardOrAbove,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await assetModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }

      await assetModel.deleteById(req.params.id);
      res.json({ success: true, message: 'Asset deleted' });
    } catch (error) {
      console.error('Delete asset error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete asset' });
    }
  }
);

export default router;
