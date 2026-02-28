import { Router, Response } from 'express';
import { assetModel } from '../models/AssetModel';
import { domainModel } from '../models/DomainModel';
import { glossaryModel } from '../models/GlossaryModel';
import { lineageModel } from '../models/LineageModel';
import { userModel } from '../models/UserModel';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [assets, domains, glossaryTerms, lineageEdges, users] = await Promise.all([
      assetModel.listAll(),
      domainModel.listAll(),
      glossaryModel.listAll(),
      lineageModel.listAll(),
      userModel.listAll(),
    ]);

    const sensitivityDistribution = assets.reduce((acc, asset) => {
      acc[asset.sensitivity] = (acc[asset.sensitivity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeDistribution = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const domainDistribution = assets.reduce((acc, asset) => {
      acc[asset.domainId] = (acc[asset.domainId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentAssets = assets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        counts: {
          assets: assets.length,
          domains: domains.length,
          glossaryTerms: glossaryTerms.length,
          lineageEdges: lineageEdges.length,
          users: users.length,
        },
        distributions: {
          sensitivity: sensitivityDistribution,
          type: typeDistribution,
          domain: domainDistribution,
        },
        recentAssets,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard stats' });
  }
});

export default router;
