import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './core/logger/logger.js';
import { apiRouter } from './interfaces/http/routes/index.js';
import { errorHandlerMiddleware } from './interfaces/http/middlewares/error-handler.middleware.js';
import { dbPool, testDbConnection } from './infrastructure/database/connection.js';
import { TenantSchemaManager } from './infrastructure/database/tenant-schema-manager.js';

const app = express();

// Middlewares globales de seguridad y parsing
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging básico de peticiones
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: duration,
        tenant: req.headers['x-tenant-id'] || req.headers['x-tenant-slug'] || 'N/A',
      },
      'HTTP Request'
    );
  });
  next();
});

// Rutas de la API
app.use(env.API_PREFIX, apiRouter);

// Middleware centralizado de errores
app.use(errorHandlerMiddleware);

// Inicialización del servidor
async function bootstrap() {
  try {
    logger.info('🚀 Iniciando Núcleo Financiero - Servicio de Almacenamiento y Multi-Tenancy...');

    // Probar conexión a BD y verificar public.tenants
    const dbConnected = await testDbConnection();
    if (dbConnected) {
      await TenantSchemaManager.initPublicSchema();
    } else {
      logger.warn('⚠️ La base de datos no está disponible aún. Los esquemas se crearán al conectarse.');
    }

    const server = app.listen(env.PORT, () => {
      logger.info(
        `✅ Servidor corriendo exitosamente en el puerto ${env.PORT} (${env.NODE_ENV})`
      );
      logger.info(`📡 Prefijo de API: http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`🩺 Healthcheck: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    });

    // Cierre limpio (Graceful Shutdown)
    const shutdown = async (signal: string) => {
      logger.info(`Recibida señal ${signal}. Cerrando servidor de forma ordenada...`);
      server.close(async () => {
        logger.info('Servidor HTTP cerrado.');
        await dbPool.end();
        logger.info('Pool de conexiones de base de datos cerrado.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Error fatal durante la inicialización del servidor');
    process.exit(1);
  }
}

bootstrap();
