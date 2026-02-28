import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { lineageModel } from '../models/LineageModel';
import { assetModel } from '../models/AssetModel';
import { authMiddleware, AuthRequest, isStewardOrAbove } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const edges = await lineageModel.listAll();
    res.json({ success: true, data: edges });
  } catch (error) {
    console.error('List lineage error:', error);
    res.status(500).json({ success: false, error: 'Failed to list lineage' });
  }
});

router.get(
  '/graph/:assetId',
  validate([
    param('assetId').notEmpty(),
    query('depth').optional().isInt({ min: 1, max: 10 }),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const depth = req.query.depth ? parseInt(req.query.depth as string) : 3;
      const graph = await lineageModel.getLineageGraph(req.params.assetId, depth);

      const nodeDetails = await Promise.all(
        graph.nodes.map(async (nodeId) => {
          const asset = await assetModel.getById(nodeId);
          return asset || { id: nodeId, name: 'Unknown', type: 'Unknown' };
        })
      );

      res.json({
        success: true,
        data: {
          nodes: nodeDetails,
          edges: graph.edges,
        },
      });
    } catch (error) {
      console.error('Get lineage graph error:', error);
      res.status(500).json({ success: false, error: 'Failed to get lineage graph' });
    }
  }
);

router.get(
  '/upstream/:assetId',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const edges = await lineageModel.getUpstream(req.params.assetId);
      res.json({ success: true, data: edges });
    } catch (error) {
      console.error('Get upstream error:', error);
      res.status(500).json({ success: false, error: 'Failed to get upstream lineage' });
    }
  }
);

router.get(
  '/downstream/:assetId',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const edges = await lineageModel.getDownstream(req.params.assetId);
      res.json({ success: true, data: edges });
    } catch (error) {
      console.error('Get downstream error:', error);
      res.status(500).json({ success: false, error: 'Failed to get downstream lineage' });
    }
  }
);

router.post(
  '/',
  isStewardOrAbove,
  validate([
    body('sourceAssetId').notEmpty(),
    body('targetAssetId').notEmpty(),
    body('transformationType').optional().trim(),
    body('description').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { sourceAssetId, targetAssetId } = req.body;

      const [source, target] = await Promise.all([
        assetModel.getById(sourceAssetId),
        assetModel.getById(targetAssetId),
      ]);

      if (!source) {
        res.status(400).json({ success: false, error: 'Source asset not found' });
        return;
      }
      if (!target) {
        res.status(400).json({ success: false, error: 'Target asset not found' });
        return;
      }

      const existing = await lineageModel.getEdge(sourceAssetId, targetAssetId);
      if (existing) {
        res.status(400).json({ success: false, error: 'Lineage edge already exists' });
        return;
      }

      const edge = await lineageModel.create(req.body);
      res.status(201).json({ success: true, data: edge });
    } catch (error) {
      console.error('Create lineage error:', error);
      res.status(500).json({ success: false, error: 'Failed to create lineage' });
    }
  }
);

router.delete(
  '/:sourceAssetId/:targetAssetId',
  isStewardOrAbove,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { sourceAssetId, targetAssetId } = req.params;

      const existing = await lineageModel.getEdge(sourceAssetId, targetAssetId);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Lineage edge not found' });
        return;
      }

      await lineageModel.deleteEdge(sourceAssetId, targetAssetId);
      res.json({ success: true, message: 'Lineage edge deleted' });
    } catch (error) {
      console.error('Delete lineage error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete lineage' });
    }
  }
);

export default router;
