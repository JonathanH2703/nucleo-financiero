import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './core/logger/logger.js';
import { apiRouter } from './interfaces/http/routes/index.js';
import { errorHandlerMiddleware } from './interfaces/http/middlewares/error-handler.middleware.js';
import { dbPool, testDbConnection } from './infrastructure/database/connection.js';
import { TenantSchemaManager } from './infrastructure/database/tenant-schema-manager.js';

function getPublicDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'dist/public'),
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, 'public'),
    path.resolve(__dirname, '../../public'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) {
      return c;
    }
  }
  return candidates[0];
}

const publicPath = getPublicDir();

const app = express();

// Middlewares globales de seguridad y parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servidor de archivos estáticos del frontend de desarrollo
app.use(express.static(publicPath));

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

const sendSpaIndex = (_req: express.Request, res: express.Response) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Núcleo Financiero — API & ERP</title></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;">
  <div style="text-align:center;max-width:600px;padding:32px;background:#1e293b;border-radius:12px;">
    <h1>🏛️ Núcleo Financiero</h1>
    <p>API y base de datos multi-tenant activas.</p>
    <p><a href="${env.API_PREFIX}/health" style="color:#60a5fa;">Verificar Healthcheck →</a></p>
  </div>
</body>
</html>`);
};

// Servir frontend SPA en la raíz
app.get('/', sendSpaIndex);

app.get('/api-docs-old', (_req, res) => {
  res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Núcleo Financiero — API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 680px;
      padding: 48px 40px;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
    }
    .logo { font-size: 48px; margin-bottom: 8px; }
    h1 { font-size: 28px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(34, 197, 94, 0.15); color: #4ade80;
      padding: 4px 12px; border-radius: 20px; font-size: 12px;
      font-weight: 600; margin-bottom: 24px;
    }
    .badge::before { content: ''; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 12px; font-weight: 600; }
    .endpoints { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
    .endpoint {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.1); border-radius: 8px;
      font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 13px;
    }
    .method {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 4px; min-width: 36px; text-align: center;
    }
    .get { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .post { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .path { color: #c4b5fd; }
    .desc { margin-left: auto; color: #64748b; font-family: 'Segoe UI', sans-serif; font-size: 11px; }
    .footer { color: #475569; font-size: 12px; text-align: center; margin-top: 20px; }
    a { color: #818cf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🏛️</div>
    <h1>Núcleo Financiero</h1>
    <p class="subtitle">API Multi-Tenant · ERP · POS · Facturación DIAN</p>
    <div class="badge">SERVICIO ACTIVO</div>
    
    <p class="section-title">Endpoints principales</p>
    <div class="endpoints">
      <div class="endpoint">
        <span class="method get">GET</span>
        <a class="path" href="${env.API_PREFIX}/health">${env.API_PREFIX}/health</a>
        <span class="desc">Estado</span>
      </div>
      <div class="endpoint">
        <span class="method post">POST</span>
        <span class="path">${env.API_PREFIX}/auth/login-pin</span>
        <span class="desc">Auth PIN</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">${env.API_PREFIX}/pos/catalogo</span>
        <span class="desc">Catálogo</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">${env.API_PREFIX}/pos/comandas</span>
        <span class="desc">Comandas</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">${env.API_PREFIX}/facturacion/documentos</span>
        <span class="desc">Facturas</span>
      </div>
      <div class="endpoint">
        <span class="method get">GET</span>
        <span class="path">${env.API_PREFIX}/auth/roles</span>
        <span class="desc">RBAC</span>
      </div>
    </div>
    
    <p class="section-title">Header requerido para peticiones</p>
    <div class="endpoint" style="margin-bottom: 24px;">
      <span class="method" style="background:rgba(251,191,36,0.2);color:#fbbf24;">HDR</span>
      <span class="path">x-tenant-slug: restaurante_origen</span>
    </div>
    
    <p class="footer">v1.0.0 · Node.js + Express + PostgreSQL Multi-Tenant · <a href="${env.API_PREFIX}/health">Healthcheck →</a></p>
  </div>
</body>
</html>`);
});

// Rutas de la API
app.use(env.API_PREFIX, apiRouter);

// Fallback SPA: Redirigir cualquier ruta que no sea de la API al frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith(env.API_PREFIX)) {
    return next();
  }
  return sendSpaIndex(req, res);
});

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
