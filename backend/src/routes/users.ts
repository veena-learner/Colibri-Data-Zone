import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { userModel } from '../models/UserModel';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    let users = await userModel.listAll();
    
    if (role) {
      users = users.filter(u => u.role === role);
    }

    const safeUsers = users.map(({ password, ...user }) => user);
    res.json({ success: true, data: safeUsers });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, error: 'Failed to list users' });
  }
});

router.get('/by-role', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await userModel.listAll();
    
    const groupedUsers = {
      domainOwners: users
        .filter(u => u.role === 'DataOwner' || u.role === 'Admin')
        .map(({ password, ...u }) => u),
      dataStewards: users
        .filter(u => u.role === 'DataSteward' || u.role === 'Admin')
        .map(({ password, ...u }) => u),
      dataOwners: users
        .filter(u => u.role === 'DataOwner' || u.role === 'DataSteward' || u.role === 'Admin')
        .map(({ password, ...u }) => u),
    };
    
    res.json({ success: true, data: groupedUsers });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

export default router;
