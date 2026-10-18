import { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketVersioningCommand } from '@aws-sdk/client-s3';
import { env } from '../src/config/env.js';
import { logger } from '../src/core/logger/logger.js';

async function initStorage() {
  const s3Config: ConstructorParameters<typeof S3Client>[0] = {
    region: env.STORAGE_REGION,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
  };

  if (env.STORAGE_ENDPOINT) {
    s3Config.endpoint = env.STORAGE_ENDPOINT;
  }

  const client = new S3Client(s3Config);
  const bucketName = env.STORAGE_BUCKET_NAME;

  logger.info({ bucketName, endpoint: env.STORAGE_ENDPOINT }, 'Verificando bucket de almacenamiento...');

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    logger.info(`✅ El bucket "${bucketName}" ya existe y está accesible.`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      logger.info(`Creando bucket "${bucketName}"...`);
      await client.send(new CreateBucketCommand({ Bucket: bucketName }));
      logger.info(`✅ Bucket "${bucketName}" creado con éxito.`);
    } else {
      logger.error({ error }, 'Error al verificar bucket');
      throw error;
    }
  }

  try {
    logger.info(`Habilitando versionamiento en bucket "${bucketName}"...`);
    await client.send(
      new PutBucketVersioningCommand({
        Bucket: bucketName,
        VersioningConfiguration: { Status: 'Enabled' },
      })
    );
    logger.info('✅ Versionamiento de bucket habilitado.');
  } catch (err) {
    logger.warn({ err }, 'Aviso: No se pudo habilitar versionamiento (puede no ser soportado por la versión de MinIO/S3)');
  }
}

initStorage().catch((err) => {
  logger.error({ err }, 'Fallo en la inicialización del bucket');
  process.exit(1);
});
