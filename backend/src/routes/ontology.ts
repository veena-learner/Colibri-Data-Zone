import { Router, Response } from 'express';
import { ontologyModel } from '../models/OntologyModel';
import { authMiddleware, AuthRequest, isStewardOrAbove } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { model, search, limit } = req.query;

    let items;
    if (search) {
      items = await ontologyModel.search(search as string);
    } else if (model) {
      items = await ontologyModel.listByModel(model as string);
    } else {
      items = await ontologyModel.listAll(limit ? parseInt(limit as string) : undefined);
    }

    res.json({ success: true, data: items, total: items.length });
  } catch (error) {
    console.error('List ontology error:', error);
    res.status(500).json({ success: false, error: 'Failed to list ontology' });
  }
});

router.get('/models', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await ontologyModel.listAll();
    const models = [...new Set(all.map((o) => o.model))].sort();
    res.json({ success: true, data: models });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ success: false, error: 'Failed to list models' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await ontologyModel.getById(req.params.id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Get ontology error:', error);
    res.status(500).json({ success: false, error: 'Failed to get ontology' });
  }
});

router.post(
  '/',
  isStewardOrAbove,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { model, column, description, ontologyDefinition } = req.body;
      if (!model || !column) {
        res.status(400).json({ success: false, error: 'model and column are required' });
        return;
      }
      const item = await ontologyModel.create({
        model: String(model).trim(),
        column: String(column).trim(),
        description: description != null ? String(description).trim() : '',
        ontologyDefinition: ontologyDefinition != null ? String(ontologyDefinition).trim() : undefined,
      });
      res.status(201).json({ success: true, data: item });
    } catch (error: any) {
      console.error('Create ontology error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create' });
    }
  }
);

router.put(
  '/:id',
  isStewardOrAbove,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await ontologyModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      const { description, ontologyDefinition } = req.body;
      const updated = await ontologyModel.update(req.params.id, {
        ...(description !== undefined && { description: String(description).trim() }),
        ...(ontologyDefinition !== undefined && { ontologyDefinition: String(ontologyDefinition).trim() }),
      });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Update ontology error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update' });
    }
  }
);

router.delete(
  '/:id',
  isStewardOrAbove,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const existing = await ontologyModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      await ontologyModel.deleteById(req.params.id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) {
      console.error('Delete ontology error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete' });
    }
  }
);

export default router;
