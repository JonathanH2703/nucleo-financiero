import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),

  // Base de datos PostgreSQL
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('nucleo_admin'),
  DB_PASSWORD: z.string().default('nucleo_secure_pass_2026'),
  DB_NAME: z.string().default('nucleo_financiero_db'),
  DB_SSL: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  DB_MAX_CONNECTIONS: z.coerce.number().default(20),

  // Storage Bucket (MinIO / S3 / R2)
  STORAGE_PROVIDER: z.enum(['minio', 's3', 'r2']).default('minio'),
  STORAGE_ENDPOINT: z.string().optional().default('http://localhost:9000'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET_NAME: z.string().default('nucleo-financiero-dev'),
  STORAGE_ACCESS_KEY_ID: z.string().default('minioadmin'),
  STORAGE_SECRET_ACCESS_KEY: z.string().default('minioadmin123'),
  STORAGE_FORCE_PATH_STYLE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  STORAGE_PUBLIC_URL: z.string().optional().default('http://localhost:9000'),

  // Políticas
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(52428800), // 50MB
  PRESIGNED_URL_EXPIRES_SECONDS: z.coerce.number().default(900), // 15 mins
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Error de validación en variables de entorno:', _env.error.format());
  throw new Error('Configuración de entorno inválida');
}

export const env = _env.data;
