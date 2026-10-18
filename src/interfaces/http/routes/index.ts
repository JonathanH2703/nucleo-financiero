import { Router } from 'express';
import { tenantRouter } from './tenant.routes.js';
import { storageRouter } from './storage.routes.js';
import { posRouter } from './pos.routes.js';
import { facturacionRouter } from './facturacion.routes.js';
import { authRouter } from './auth.routes.js';
import { testDbConnection } from '../../../infrastructure/database/connection.js';
import { S3StorageService } from '../../../infrastructure/storage/s3-storage.service.js';
import { env } from '../../../config/env.js';

export const apiRouter = Router();

// Healthcheck completo del sistema (DB y Bucket)
apiRouter.get('/health', async (_req, res) => {
  const dbOk = await testDbConnection();
  let storageOk = false;
  let storageError: string | undefined;

  try {
    const storageService = new S3StorageService();
    storageOk = Boolean(storageService);
  } catch (err: any) {
    storageError = err.message;
  }

  const status = dbOk && storageOk ? 'UP' : 'DEGRADED';
  const statusCode = status === 'UP' ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbOk ? 'CONNECTED' : 'DISCONNECTED',
        host: env.DB_HOST,
        database: env.DB_NAME,
      },
      storage: {
        status: storageOk ? 'CONNECTED' : 'ERROR',
        provider: env.STORAGE_PROVIDER,
        bucket: env.STORAGE_BUCKET_NAME,
        endpoint: env.STORAGE_ENDPOINT,
        error: storageError,
      },
    },
    version: '1.0.0',
    service: 'Núcleo Financiero Core Storage & Multi-tenant API',
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/tenants', tenantRouter);
apiRouter.use('/storage', storageRouter);
apiRouter.use('/pos', posRouter);
apiRouter.use('/facturacion', facturacionRouter);


