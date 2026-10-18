import { dbPool } from '../database/connection.js';
import { IFileRepository, ListFilesFilters } from '../../domain/repositories/file.repository.interface.js';
import { StorageFile, FileCategory, FileStatus } from '../../domain/entities/storage-file.entity.js';

export class PostgresFileRepository implements IFileRepository {
  private sanitizeSchema(schemaName: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(schemaName)) {
      throw new Error(`Nombre de esquema no seguro: ${schemaName}`);
    }
    return schemaName;
  }

  private mapRowToFile(row: any): StorageFile {
    return new StorageFile({
      id: row.id,
      tenantId: row.tenant_id,
      originalName: row.original_name,
      storedKey: row.stored_key,
      bucketName: row.bucket_name,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      category: row.category as FileCategory,
      checksumSha256: row.checksum_sha256 || undefined,
      status: row.status as FileStatus,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      uploadedByUserId: row.uploaded_by_user_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  public async findById(schemaName: string, id: string): Promise<StorageFile | null> {
    const schema = this.sanitizeSchema(schemaName);
    const query = `SELECT * FROM "${schema}".archivos WHERE id = $1`;
    const res = await dbPool.query(query, [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToFile(res.rows[0]);
  }

  public async findByKey(schemaName: string, key: string): Promise<StorageFile | null> {
    const schema = this.sanitizeSchema(schemaName);
    const query = `SELECT * FROM "${schema}".archivos WHERE stored_key = $1`;
    const res = await dbPool.query(query, [key]);
    if (res.rows.length === 0) return null;
    return this.mapRowToFile(res.rows[0]);
  }

  public async create(schemaName: string, file: StorageFile): Promise<StorageFile> {
    const schema = this.sanitizeSchema(schemaName);
    const query = `
      INSERT INTO "${schema}".archivos (
        id, tenant_id, original_name, stored_key, bucket_name,
        mime_type, size_bytes, category, checksum_sha256, status,
        metadata, uploaded_by_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;
    const values = [
      file.id,
      file.tenantId,
      file.originalName,
      file.storedKey,
      file.bucketName,
      file.mimeType,
      file.sizeBytes,
      file.category,
      file.checksumSha256 || null,
      file.status,
      JSON.stringify(file.metadata),
      file.uploadedByUserId || null,
      file.createdAt,
      file.updatedAt,
    ];

    const res = await dbPool.query(query, values);
    return this.mapRowToFile(res.rows[0]);
  }

  public async update(schemaName: string, file: StorageFile): Promise<StorageFile> {
    const schema = this.sanitizeSchema(schemaName);
    const query = `
      UPDATE "${schema}".archivos SET
        size_bytes = $1,
        checksum_sha256 = $2,
        status = $3,
        metadata = $4,
        updated_at = $5
      WHERE id = $6
      RETURNING *;
    `;
    const values = [
      file.sizeBytes,
      file.checksumSha256 || null,
      file.status,
      JSON.stringify(file.metadata),
      new Date(),
      file.id,
    ];

    const res = await dbPool.query(query, values);
    return this.mapRowToFile(res.rows[0]);
  }

  public async list(schemaName: string, filters: ListFilesFilters = {}): Promise<{ files: StorageFile[]; total: number }> {
    const schema = this.sanitizeSchema(schemaName);
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(filters.category);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    } else {
      // Por defecto no listar eliminados
      conditions.push(`status != 'DELETED'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM "${schema}".archivos ${whereClause}`;
    const countRes = await dbPool.query(countQuery, values);
    const total = Number(countRes.rows[0]?.total || 0);

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT * FROM "${schema}".archivos
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataValues = [...values, limit, offset];

    const dataRes = await dbPool.query(dataQuery, dataValues);
    const files = dataRes.rows.map((row) => this.mapRowToFile(row));

    return { files, total };
  }

  public async delete(schemaName: string, id: string): Promise<void> {
    const schema = this.sanitizeSchema(schemaName);
    // Soft delete para trazabilidad contable
    const query = `UPDATE "${schema}".archivos SET status = 'DELETED', updated_at = NOW() WHERE id = $1`;
    await dbPool.query(query, [id]);
  }

  public async calculateTotalUsageBytes(schemaName: string): Promise<number> {
    const schema = this.sanitizeSchema(schemaName);
    const query = `SELECT COALESCE(SUM(size_bytes), 0) as total_bytes FROM "${schema}".archivos WHERE status = 'ACTIVE'`;
    const res = await dbPool.query(query);
    return Number(res.rows[0]?.total_bytes || 0);
  }
}
