import { Router } from 'express';
import authRoutes from './auth.routes.js';
import databaseRoutes from './database.routes.js';
import tableRoutes from './table.routes.js';
import queryRoutes from './query.routes.js';
import userRoutes from './user.routes.js';
import schemaRoutes from './schema.routes.js';
import restRoutes from './rest.routes.js';
import backupRoutes from './backup.routes.js';
import performanceRoutes from './performance.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/databases', databaseRoutes);
router.use('/databases', tableRoutes);
router.use('/databases', queryRoutes);
router.use('/databases', backupRoutes);
router.use('/users', userRoutes);
router.use('/schema', schemaRoutes);
router.use('/rest', restRoutes);
router.use('/performance', performanceRoutes);

export default router;
