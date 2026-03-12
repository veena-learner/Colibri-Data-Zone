import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

import authRoutes from './routes/auth';
import assetRoutes from './routes/assets';
import domainRoutes from './routes/domains';
import glossaryRoutes from './routes/glossary';
import lineageRoutes from './routes/lineage';
import ontologyRoutes from './routes/ontology';
import statsRoutes from './routes/stats';
import uploadRoutes from './routes/upload';
import usersRoutes from './routes/users';
import dbtRoutes from './routes/dbt';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/glossary', glossaryRoutes);
app.use('/api/lineage', lineageRoutes);
app.use('/api/ontology', ontologyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dbt', dbtRoutes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Colibri Data Zone API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
